const express = require('express');
const { exec, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const allowed = [
    'https://clipai-ten.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
  res.setHeader('Access-Control-Allow-Origin', 'https://clipai-ten.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-filename,x-requested-with,Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Range,Accept-Ranges');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'clipaidownloader.html')));

const YTDLP = path.join(__dirname, 'yt-dlp');
const FFMPEG = path.join(__dirname, 'ffmpeg');
const COOKIES_FILE = '/tmp/yt-cookies.txt';
const DOWNLOAD_DIR = '/tmp/clipai';
const UPLOAD_DIR = '/tmp/clipai-uploads';
const MUSIC_DIR = '/tmp/clipai-music';

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });

// ─── YouTube bypass args ──────────────────────────────────────────────────────
const BYPASS = `--extractor-args "youtube:player_client=android_embedded,ios,android" --no-warnings --format-sort "ext:mp4:m4a"`;

function cookiesArg() {
  return fs.existsSync(COOKIES_FILE) ? `--cookies "${COOKIES_FILE}"` : '';
}

function proxyArg() {
  const proxyUrl = getProxyUrl();
  return proxyUrl ? `--proxy "${proxyUrl}"` : '';
}

function ytArgs() {
  return `${BYPASS} ${cookiesArg()} ${proxyArg()}`;
}

function getProxyUrl() {
  const raw = (process.env.PROXY_URL || '').trim();
  if (!raw || raw.toLowerCase() === 'none' || raw.toLowerCase() === 'false') return '';
  return raw;
}

function describeProxyProblem(stderr) {
  const text = String(stderr || '');
  if (/407|Proxy Authentication Required|Unable to connect to proxy|Tunnel connection failed/i.test(text)) {
    return 'Proxy authentication failed. Your PROXY_URL on Render requires username/password or is invalid. Remove PROXY_URL to download directly, or set it as http://USER:PASS@HOST:PORT.';
  }
  return '';
}

function ytArgList(extra = []) {
  const args = [
    '--extractor-args', 'youtube:player_client=android_embedded,ios,android,web',
    '--no-warnings',
    '--format-sort', 'ext:mp4:m4a',
    '--retries', '3',
    '--fragment-retries', '3'
  ];
  if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
  const proxyUrl = getProxyUrl();
  if (proxyUrl) args.push('--proxy', proxyUrl);
  return args.concat(extra);
}

function publicBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function compactProcessError(stderr, fallback = 'YouTube import failed') {
  const proxyProblem = describeProxyProblem(stderr);
  if (proxyProblem) return proxyProblem;
  const text = String(stderr || '').trim();
  if (!text) return fallback;
  const important = text.split('\n').filter(line =>
    /error|failed|unavailable|sign in|confirm|private|copyright|bot|http error|forbidden/i.test(line)
  );
  return (important.length ? important.join(' | ') : text.split('\n').slice(-4).join(' | ')).slice(0, 600);
}

function streamVideoFile(req, res, filePath, contentType = 'video/mp4') {
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  const chunkSize = 2 * 1024 * 1024;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', stat.size);
    return res.status(200).end();
  }

  if (range) {
    const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startRaw, 10);
    const requestedEnd = endRaw ? parseInt(endRaw, 10) : start + chunkSize - 1;
    const end = Math.min(requestedEnd, stat.size - 1);
    if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size || end >= stat.size) {
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', err => {
      console.error('Video stream error:', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.destroy(err);
    });
    return stream.pipe(res);
  }

  const end = Math.min(chunkSize - 1, stat.size - 1);
  res.status(206);
  res.setHeader('Content-Range', `bytes 0-${end}/${stat.size}`);
  res.setHeader('Content-Length', end + 1);
  const stream = fs.createReadStream(filePath, { start: 0, end });
  stream.on('error', err => {
    console.error('Video stream error:', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.destroy(err);
  });
  stream.pipe(res);
}

function streamAudioFile(req, res, filePath, contentType = 'audio/mpeg') {
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio file not found' });
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'HEAD') {
    res.setHeader('Content-Length', stat.size);
    return res.status(200).end();
  }

  if (range) {
    const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startRaw, 10);
    const end = Math.min(endRaw ? parseInt(endRaw, 10) : stat.size - 1, stat.size - 1);
    if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size || end >= stat.size) {
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.status(200);
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          return reject(new Error(`Request failed with status ${response.statusCode}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error('Provider returned invalid data'));
        }
      });
    }).on('error', reject);
  });
}

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        file.close();
        try { fs.unlinkSync(dest); } catch (err) {}
        return resolve(downloadToFile(response.headers.location, dest));
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        file.close();
        try { fs.unlinkSync(dest); } catch (err) {}
        return reject(new Error(`Download failed with status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
    });
    req.on('error', err => {
      file.close();
      try { fs.unlinkSync(dest); } catch (unlinkErr) {}
      reject(err);
    });
  });
}

function localPreviewUrl(req, localFileId) {
  return `${publicBaseUrl(req)}/api/serve-upload-file/${encodeURIComponent(localFileId)}`;
}

function musicPreviewUrl(req, musicFileId) {
  return `${publicBaseUrl(req)}/api/serve-music/${encodeURIComponent(musicFileId)}`;
}

const MUSIC_LIBRARY = [
  { id: 'viral-pop', title: 'Viral Pop Lift', category: 'Trending', mood: 'Upbeat', bpm: 118, freq: 440, color: '#7c6af7' },
  { id: 'dance-club', title: 'Dance Club Starter', category: 'Trending', mood: 'Dance', bpm: 126, freq: 262, color: '#22d3ee' },
  { id: 'fitness-energy', title: 'Fitness Energy', category: 'Trending', mood: 'Fitness', bpm: 132, freq: 494, color: '#00ff88' },
  { id: 'glitch-future', title: 'Glitch Future Bits', category: 'Trending', mood: 'Glitch', bpm: 128, freq: 311, color: '#2dd4bf' },
  { id: 'hyper-scroll', title: 'Hyper Scroll Pop', category: 'Trending', mood: 'Fast Pop', bpm: 150, freq: 349, color: '#ff4fd8' },
  { id: 'clean-podcast', title: 'Clean Podcast Bed', category: 'Creator', mood: 'Podcast', bpm: 88, freq: 220, color: '#3ecf8e' },
  { id: 'corporate-clean', title: 'Corporate Clean', category: 'Creator', mood: 'Business', bpm: 96, freq: 262, color: '#5eead4' },
  { id: 'news-pulse', title: 'News Pulse', category: 'Creator', mood: 'News', bpm: 110, freq: 233, color: '#f43f5e' },
  { id: 'tutorial-glow', title: 'Tutorial Glow', category: 'Creator', mood: 'Explainer', bpm: 92, freq: 294, color: '#60a5fa' },
  { id: 'luxury-tech', title: 'Luxury Tech Pulse', category: 'Creator', mood: 'Luxury', bpm: 96, freq: 277, color: '#00c8ff' },
  { id: 'cinematic-rise', title: 'Cinematic Rise', category: 'Cinematic', mood: 'Cinematic', bpm: 72, freq: 330, color: '#f0a832' },
  { id: 'suspense-low', title: 'Suspense Low Tension', category: 'Cinematic', mood: 'Suspense', bpm: 64, freq: 147, color: '#94a3b8' },
  { id: 'hero-trailer', title: 'Hero Trailer Hits', category: 'Cinematic', mood: 'Trailer', bpm: 84, freq: 175, color: '#fb923c' },
  { id: 'dark-documentary', title: 'Dark Documentary Bed', category: 'Cinematic', mood: 'Documentary', bpm: 70, freq: 156, color: '#a78bfa' },
  { id: 'soft-story', title: 'Soft Storytelling', category: 'Chill', mood: 'Emotional', bpm: 68, freq: 262, color: '#a394ff' },
  { id: 'lofi-rain', title: 'Lo-fi Rain Keys', category: 'Chill', mood: 'Lo-fi', bpm: 76, freq: 220, color: '#8fb3ff' },
  { id: 'dreamy-air', title: 'Dreamy Air Pads', category: 'Chill', mood: 'Dreamy', bpm: 84, freq: 330, color: '#c084fc' },
  { id: 'ambient-focus', title: 'Ambient Focus Bed', category: 'Chill', mood: 'Ambient', bpm: 60, freq: 220, color: '#38bdf8' },
  { id: 'coffee-shop', title: 'Coffee Shop Rhodes', category: 'Chill', mood: 'Warm', bpm: 82, freq: 247, color: '#c08457' },
  { id: 'afrobeats-sun', title: 'Afrobeats Sun', category: 'Global', mood: 'Afrobeats', bpm: 102, freq: 247, color: '#ff8a00' },
  { id: 'amapiano-log', title: 'Amapiano Log Drum', category: 'Global', mood: 'Amapiano', bpm: 112, freq: 196, color: '#00d4ff' },
  { id: 'reggae-lite', title: 'Reggae Lite Skank', category: 'Global', mood: 'Reggae', bpm: 88, freq: 196, color: '#84cc16' },
  { id: 'latin-pop', title: 'Latin Pop Snap', category: 'Global', mood: 'Latin', bpm: 116, freq: 294, color: '#fb7185' },
  { id: 'dancehall-wave', title: 'Dancehall Wave', category: 'Global', mood: 'Dancehall', bpm: 98, freq: 208, color: '#14b8a6' },
  { id: 'trap-808', title: 'Trap 808 Bounce', category: 'Urban', mood: 'Trap', bpm: 140, freq: 185, color: '#b15cff' },
  { id: 'hiphop-chill', title: 'Hip Hop Chill', category: 'Urban', mood: 'Hip Hop', bpm: 90, freq: 208, color: '#f97316' },
  { id: 'drill-night', title: 'Drill Night Pulse', category: 'Urban', mood: 'Drill', bpm: 144, freq: 165, color: '#818cf8' },
  { id: 'rnb-silk', title: 'R&B Silk Keys', category: 'Urban', mood: 'R&B', bpm: 78, freq: 233, color: '#f472b6' },
  { id: 'funny-bounce', title: 'Funny Bounce', category: 'Playful', mood: 'Comedy', bpm: 124, freq: 523, color: '#ffe600' },
  { id: 'cartoon-pop', title: 'Cartoon Pop', category: 'Playful', mood: 'Cartoon', bpm: 132, freq: 587, color: '#facc15' },
  { id: 'quirky-pluck', title: 'Quirky Pluck', category: 'Playful', mood: 'Quirky', bpm: 108, freq: 392, color: '#34d399' },
  { id: 'motivation-drive', title: 'Motivation Drive', category: 'Motivation', mood: 'Motivation', bpm: 104, freq: 392, color: '#ff5c8a' },
  { id: 'winner-rise', title: 'Winner Rise', category: 'Motivation', mood: 'Inspirational', bpm: 100, freq: 330, color: '#f59e0b' },
  { id: 'acoustic-bright', title: 'Acoustic Bright Pluck', category: 'Organic', mood: 'Acoustic', bpm: 92, freq: 247, color: '#fbbf24' },
  { id: 'ukulele-smile', title: 'Ukulele Smile', category: 'Organic', mood: 'Happy', bpm: 106, freq: 392, color: '#fde047' },
  { id: 'handpan-calm', title: 'Handpan Calm', category: 'Organic', mood: 'Calm', bpm: 72, freq: 220, color: '#67e8f9' },
  { id: 'dark-tech', title: 'Dark Tech Drive', category: 'Tech', mood: 'Tech', bpm: 122, freq: 165, color: '#64748b' },
  { id: 'cyber-runner', title: 'Cyber Runner', category: 'Tech', mood: 'Cyber', bpm: 136, freq: 185, color: '#06b6d4' },
  { id: 'minimal-clicks', title: 'Minimal Clicks', category: 'Tech', mood: 'Minimal', bpm: 118, freq: 262, color: '#94a3b8' },
  { id: 'space-signal', title: 'Space Signal', category: 'Tech', mood: 'Sci-fi', bpm: 80, freq: 311, color: '#8b5cf6' }
];

function getMusicTrack(id) {
  return MUSIC_LIBRARY.find(track => track.id === String(id || '').trim());
}

function musicFilePathForTrack(track) {
  return path.join(MUSIC_DIR, `library_v7_${track.id}.wav`);
}

function clampSample(value) {
  return Math.max(-1, Math.min(1, value));
}

function noteFrequency(root, semitone) {
  return root * Math.pow(2, semitone / 12);
}

function musicPresetForTrack(track) {
  const presets = {
    'viral-pop': {
      root: 261.63,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 0, 7, 9, 4, 4, 7, 2],
      melody: [12, 9, 7, 9, 14, 12, 9, 7],
      chord: [0, 4, 7],
      kick: [0, 2],
      snare: [1, 3],
      hatEvery: 0.5,
      swing: 0.03,
      drive: 0.95
    },
    'clean-podcast': {
      root: 196,
      scale: [0, 3, 5, 7, 10, 12],
      bass: [0, 0, 5, 5, 7, 7, 3, 3],
      melody: [7, 10, 12, 10, 7, 5, 3, 5],
      chord: [0, 3, 7],
      kick: [0],
      snare: [2],
      hatEvery: 1,
      swing: 0,
      drive: 0.45
    },
    'cinematic-rise': {
      root: 174.61,
      scale: [0, 2, 3, 7, 8, 12],
      bass: [0, 0, 3, 3, 8, 8, 7, 7],
      melody: [12, 15, 19, 15, 20, 19, 15, 12],
      chord: [0, 3, 7],
      kick: [0, 2.5],
      snare: [3],
      hatEvery: 2,
      swing: 0,
      drive: 0.7
    },
    'luxury-tech': {
      root: 220,
      scale: [0, 2, 5, 7, 11, 12],
      bass: [0, 7, 0, 11, 5, 7, 2, 0],
      melody: [12, 14, 19, 14, 23, 19, 14, 12],
      chord: [0, 5, 11],
      kick: [0, 1.5, 3],
      snare: [2],
      hatEvery: 0.5,
      swing: 0.02,
      drive: 0.65
    },
    'funny-bounce': {
      root: 293.66,
      scale: [0, 2, 4, 5, 7, 9, 12],
      bass: [0, 7, 4, 7, 0, 9, 4, 7],
      melody: [12, 16, 14, 12, 19, 16, 14, 12],
      chord: [0, 4, 7],
      kick: [0, 1, 2, 3],
      snare: [1.5, 3.5],
      hatEvery: 0.5,
      swing: 0.06,
      drive: 0.8
    },
    'motivation-drive': {
      root: 246.94,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 0, 7, 7, 9, 9, 4, 4],
      melody: [7, 9, 12, 14, 16, 14, 12, 9],
      chord: [0, 4, 7],
      kick: [0, 2],
      snare: [1, 3],
      hatEvery: 0.5,
      swing: 0.01,
      drive: 1
    },
    'soft-story': {
      root: 220,
      scale: [0, 2, 3, 7, 10, 12],
      bass: [0, 0, 3, 3, 7, 7, 10, 10],
      melody: [12, 10, 7, 10, 15, 12, 10, 7],
      chord: [0, 3, 7],
      kick: [0],
      snare: [],
      hatEvery: 4,
      swing: 0,
      drive: 0.35
    },
    'fitness-energy': {
      root: 261.63,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 0, 7, 7, 9, 9, 7, 4],
      melody: [12, 14, 16, 19, 21, 19, 16, 14],
      chord: [0, 4, 7],
      kick: [0, 1, 2, 3],
      snare: [1, 3],
      hatEvery: 0.25,
      swing: 0,
      drive: 1.05
    },
    'afrobeats-sun': {
      root: 246.94,
      scale: [0, 2, 4, 7, 9, 11, 12],
      bass: [0, 7, 0, 9, 4, 7, 2, 7],
      melody: [12, 16, 14, 12, 19, 16, 14, 21],
      chord: [0, 4, 9],
      kick: [0, 1.75, 2.5],
      snare: [1, 3],
      hatEvery: 0.5,
      swing: 0.08,
      drive: 0.88
    },
    'amapiano-log': {
      root: 196,
      scale: [0, 3, 5, 7, 10, 12],
      bass: [0, 0, 12, 7, 0, 10, 7, 3],
      melody: [7, 10, 12, 15, 12, 10, 7, 5],
      chord: [0, 3, 10],
      kick: [0, 2],
      snare: [1.5, 3],
      hatEvery: 0.5,
      swing: 0.04,
      drive: 0.9
    },
    'trap-808': {
      root: 146.83,
      scale: [0, 3, 5, 7, 10, 12],
      bass: [0, 0, -12, 7, 0, 10, -5, 0],
      melody: [12, 12, 15, 19, 17, 15, 12, 10],
      chord: [0, 3, 7],
      kick: [0, 0.75, 2.25, 3.25],
      snare: [1, 3],
      hatEvery: 0.25,
      swing: 0.01,
      drive: 1.15
    },
    'lofi-rain': {
      root: 220,
      scale: [0, 2, 3, 7, 10, 12],
      bass: [0, 0, 3, 3, 10, 10, 7, 7],
      melody: [12, 10, 7, 5, 10, 12, 15, 10],
      chord: [0, 3, 7, 10],
      kick: [0, 2.25],
      snare: [1.5, 3.5],
      hatEvery: 1,
      swing: 0.09,
      drive: 0.42
    },
    'corporate-clean': {
      root: 261.63,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 4, 7, 4, 9, 7, 4, 2],
      melody: [12, 14, 16, 14, 19, 16, 14, 12],
      chord: [0, 4, 7],
      kick: [0, 2],
      snare: [1, 3],
      hatEvery: 1,
      swing: 0,
      drive: 0.55
    },
    'news-pulse': {
      root: 233.08,
      scale: [0, 2, 3, 7, 10, 12],
      bass: [0, 0, 7, 0, 10, 7, 3, 0],
      melody: [12, 7, 12, 15, 12, 10, 7, 10],
      chord: [0, 3, 7],
      kick: [0, 1, 2, 3],
      snare: [2],
      hatEvery: 0.5,
      swing: 0,
      drive: 0.75
    },
    'suspense-low': {
      root: 146.83,
      scale: [0, 1, 3, 6, 7, 10, 12],
      bass: [0, -12, 0, 1, 6, 3, 1, 0],
      melody: [12, 13, 15, 18, 15, 13, 12, 10],
      chord: [0, 1, 6],
      kick: [0],
      snare: [],
      hatEvery: 2,
      swing: 0,
      drive: 0.5
    },
    'dreamy-air': {
      root: 329.63,
      scale: [0, 2, 4, 7, 11, 12],
      bass: [0, 0, 7, 7, 11, 11, 4, 4],
      melody: [12, 16, 19, 23, 19, 16, 14, 12],
      chord: [0, 4, 11],
      kick: [0],
      snare: [],
      hatEvery: 4,
      swing: 0.02,
      drive: 0.38
    },
    'dance-club': {
      root: 261.63,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 0, 0, 0, 7, 7, 9, 9],
      melody: [12, 14, 16, 19, 16, 14, 12, 9],
      chord: [0, 4, 7],
      kick: [0, 1, 2, 3],
      snare: [1, 3],
      hatEvery: 0.25,
      swing: 0,
      drive: 1.1
    },
    'reggae-lite': {
      root: 196,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 0, 7, 7, 9, 7, 4, 2],
      melody: [7, 9, 12, 9, 7, 4, 2, 4],
      chord: [0, 4, 7],
      kick: [0, 2],
      snare: [1, 3],
      hatEvery: 1,
      swing: 0.07,
      drive: 0.6
    },
    'latin-pop': {
      root: 293.66,
      scale: [0, 2, 4, 5, 7, 9, 12],
      bass: [0, 7, 9, 7, 5, 7, 4, 2],
      melody: [12, 16, 17, 16, 14, 12, 9, 12],
      chord: [0, 4, 7],
      kick: [0, 1.5, 2.5],
      snare: [1, 3],
      hatEvery: 0.5,
      swing: 0.05,
      drive: 0.9
    },
    'dark-tech': {
      root: 164.81,
      scale: [0, 1, 3, 7, 10, 12],
      bass: [0, 0, 0, 7, 3, 0, 10, 7],
      melody: [12, 13, 15, 19, 15, 13, 10, 12],
      chord: [0, 3, 10],
      kick: [0, 1, 2, 3],
      snare: [1.5, 3.5],
      hatEvery: 0.25,
      swing: 0,
      drive: 0.95
    },
    'acoustic-bright': {
      root: 246.94,
      scale: [0, 2, 4, 7, 9, 12],
      bass: [0, 4, 7, 9, 7, 4, 2, 0],
      melody: [12, 16, 19, 16, 14, 12, 9, 7],
      chord: [0, 4, 7],
      kick: [0],
      snare: [2],
      hatEvery: 2,
      swing: 0.03,
      drive: 0.5
    },
    'ambient-focus': {
      root: 220,
      scale: [0, 2, 5, 7, 10, 12],
      bass: [0, 0, 5, 5, 10, 10, 7, 7],
      melody: [12, 17, 19, 17, 22, 19, 17, 12],
      chord: [0, 5, 10],
      kick: [],
      snare: [],
      hatEvery: 8,
      swing: 0,
      drive: 0.28
    },
    'hiphop-chill': {
      root: 207.65,
      scale: [0, 3, 5, 7, 10, 12],
      bass: [0, 0, 7, 5, 3, 3, 10, 7],
      melody: [12, 10, 7, 10, 15, 12, 10, 7],
      chord: [0, 3, 7, 10],
      kick: [0, 0.75, 2.25],
      snare: [1, 3],
      hatEvery: 0.5,
      swing: 0.08,
      drive: 0.72
    },
    'glitch-future': {
      root: 311.13,
      scale: [0, 1, 5, 7, 11, 12],
      bass: [0, 11, 0, 5, 7, 1, 12, 5],
      melody: [12, 13, 17, 19, 23, 19, 17, 13],
      chord: [0, 5, 11],
      kick: [0, 1.25, 2, 3.5],
      snare: [1, 3],
      hatEvery: 0.25,
      swing: 0.02,
      drive: 1
    }
  };
  const categoryStyles = {
    Trending: { wave: 'bright', bassWave: 'saw', chordWave: 'wide', percussion: 'pop', texture: 'spark', leadGain: 1.1, chordGain: 0.9, bassGain: 1, rhythmGain: 0.72 },
    Creator: { wave: 'soft', bassWave: 'sine', chordWave: 'sine', percussion: 'clean', texture: 'click', leadGain: 0.45, chordGain: 0.72, bassGain: 0.55, rhythmGain: 0.28 },
    Cinematic: { wave: 'brass', bassWave: 'sine', chordWave: 'pad', percussion: 'cinematic', texture: 'rumble', leadGain: 0.55, chordGain: 1.25, bassGain: 1.05, rhythmGain: 0.42 },
    Chill: { wave: 'rhodes', bassWave: 'sine', chordWave: 'warm', percussion: 'lofi', texture: 'vinyl', leadGain: 0.6, chordGain: 1.08, bassGain: 0.62, rhythmGain: 0.24 },
    Global: { wave: 'pluck', bassWave: 'round', chordWave: 'stab', percussion: 'global', texture: 'shaker', leadGain: 0.85, chordGain: 0.78, bassGain: 0.82, rhythmGain: 0.55 },
    Urban: { wave: 'bell', bassWave: '808', chordWave: 'dark', percussion: 'trap', texture: 'hatroll', leadGain: 0.7, chordGain: 0.62, bassGain: 1.35, rhythmGain: 0.62 },
    Playful: { wave: 'toy', bassWave: 'square', chordWave: 'pluck', percussion: 'comedy', texture: 'popcorn', leadGain: 1.08, chordGain: 0.7, bassGain: 0.68, rhythmGain: 0.4 },
    Motivation: { wave: 'anthem', bassWave: 'saw', chordWave: 'wide', percussion: 'drive', texture: 'lift', leadGain: 0.95, chordGain: 1.05, bassGain: 1.05, rhythmGain: 0.58 },
    Organic: { wave: 'string', bassWave: 'round', chordWave: 'pluck', percussion: 'organic', texture: 'wood', leadGain: 0.74, chordGain: 0.92, bassGain: 0.62, rhythmGain: 0.25 },
    Tech: { wave: 'bit', bassWave: 'saw', chordWave: 'digital', percussion: 'tech', texture: 'glitch', leadGain: 0.9, chordGain: 0.78, bassGain: 0.9, rhythmGain: 0.48 }
  };
  const generatedByCategory = {
    Trending: { root: 293.66, scale: [0, 2, 4, 7, 9, 12], bass: [0, 0, 7, 9, 0, 4, 7, 12], melody: [12, 14, 16, 19, 21, 19, 16, 14], chord: [0, 4, 7], kick: [0, 1, 2, 3], snare: [1, 3], hatEvery: 0.25, swing: 0.01, drive: 1.05 },
    Creator: { root: 246.94, scale: [0, 2, 4, 7, 9, 12], bass: [0, 4, 7, 4, 9, 7, 4, 2], melody: [12, 14, 16, 14, 12, 9, 7, 9], chord: [0, 4, 7], kick: [0, 2], snare: [2], hatEvery: 1, swing: 0, drive: 0.45 },
    Cinematic: { root: 164.81, scale: [0, 2, 3, 7, 8, 12], bass: [0, 0, 3, 3, 8, 8, 7, 7], melody: [12, 15, 19, 20, 19, 15, 12, 8], chord: [0, 3, 7], kick: [0, 2.5], snare: [3], hatEvery: 2, swing: 0, drive: 0.72 },
    Chill: { root: 220, scale: [0, 2, 3, 7, 10, 12], bass: [0, 0, 3, 3, 10, 10, 7, 7], melody: [12, 10, 7, 5, 10, 12, 15, 10], chord: [0, 3, 7, 10], kick: [0, 2.25], snare: [1.5, 3.5], hatEvery: 1, swing: 0.08, drive: 0.4 },
    Global: { root: 246.94, scale: [0, 2, 4, 7, 9, 11, 12], bass: [0, 7, 0, 9, 4, 7, 2, 7], melody: [12, 16, 14, 12, 19, 16, 14, 21], chord: [0, 4, 9], kick: [0, 1.75, 2.5], snare: [1, 3], hatEvery: 0.5, swing: 0.08, drive: 0.88 },
    Urban: { root: 146.83, scale: [0, 3, 5, 7, 10, 12], bass: [0, 0, -12, 7, 0, 10, -5, 0], melody: [12, 12, 15, 19, 17, 15, 12, 10], chord: [0, 3, 7], kick: [0, 0.75, 2.25, 3.25], snare: [1, 3], hatEvery: 0.25, swing: 0.02, drive: 1.08 },
    Playful: { root: 392, scale: [0, 2, 4, 5, 7, 9, 12], bass: [0, 7, 4, 7, 0, 9, 4, 7], melody: [12, 16, 14, 12, 19, 16, 21, 19], chord: [0, 4, 7], kick: [0, 1, 2, 3], snare: [1.5, 3.5], hatEvery: 0.5, swing: 0.07, drive: 0.82 },
    Motivation: { root: 246.94, scale: [0, 2, 4, 7, 9, 12], bass: [0, 0, 7, 7, 9, 9, 4, 4], melody: [7, 9, 12, 14, 16, 19, 16, 14], chord: [0, 4, 7], kick: [0, 2], snare: [1, 3], hatEvery: 0.5, swing: 0.01, drive: 1 },
    Organic: { root: 246.94, scale: [0, 2, 4, 7, 9, 12], bass: [0, 4, 7, 9, 7, 4, 2, 0], melody: [12, 16, 19, 16, 14, 12, 9, 7], chord: [0, 4, 7], kick: [0], snare: [2], hatEvery: 2, swing: 0.03, drive: 0.5 },
    Tech: { root: 164.81, scale: [0, 1, 3, 7, 10, 12], bass: [0, 0, 0, 7, 3, 0, 10, 7], melody: [12, 13, 15, 19, 15, 13, 10, 12], chord: [0, 3, 10], kick: [0, 1, 2, 3], snare: [1.5, 3.5], hatEvery: 0.25, swing: 0, drive: 0.95 }
  };
  const base = presets[track.id] || generatedByCategory[track.category] || presets['viral-pop'];
  const style = categoryStyles[track.category] || categoryStyles.Trending;
  const idOffset = String(track.id || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 7;
  return {
    ...style,
    ...base,
    melody: (base.melody || []).map((semi, index) => semi + (index % 3 === 0 ? idOffset % 3 : 0)),
    color: track.color
  };
}

function oscillator(shape, phase) {
  const p = phase - Math.floor(phase);
  if (shape === 'saw') return 2 * p - 1;
  if (shape === 'square') return p < 0.5 ? 1 : -1;
  if (shape === 'triangle') return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
  if (shape === 'bit') return Math.round(Math.sin(2 * Math.PI * p) * 4) / 4;
  if (shape === 'bell') return Math.sin(2 * Math.PI * p) * 0.68 + Math.sin(2 * Math.PI * p * 2.72) * 0.32;
  if (shape === 'toy') return Math.sin(2 * Math.PI * p) * 0.55 + oscillator('square', p * 2) * 0.22;
  if (shape === 'pluck') return Math.sin(2 * Math.PI * p) * 0.62 + oscillator('triangle', p * 1.5) * 0.3;
  if (shape === 'rhodes') return Math.sin(2 * Math.PI * p) * 0.72 + Math.sin(2 * Math.PI * p * 2.01) * 0.18 + Math.sin(2 * Math.PI * p * 3.01) * 0.08;
  if (shape === 'brass') return oscillator('saw', p) * 0.38 + Math.sin(2 * Math.PI * p) * 0.62;
  if (shape === 'string') return oscillator('triangle', p) * 0.7 + Math.sin(2 * Math.PI * p * 2) * 0.12;
  if (shape === 'anthem') return oscillator('saw', p) * 0.34 + Math.sin(2 * Math.PI * p) * 0.66;
  if (shape === 'bright') return Math.sin(2 * Math.PI * p) * 0.58 + Math.sin(2 * Math.PI * p * 2) * 0.24 + Math.sin(2 * Math.PI * p * 3) * 0.1;
  if (shape === 'wide') return Math.sin(2 * Math.PI * p) * 0.5 + Math.sin(2 * Math.PI * (p * 1.005 + 0.1)) * 0.28;
  if (shape === 'pad' || shape === 'warm') return Math.sin(2 * Math.PI * p) * 0.74 + oscillator('triangle', p * 0.5) * 0.18;
  if (shape === 'dark') return Math.sin(2 * Math.PI * p) * 0.55 + oscillator('saw', p) * 0.18;
  if (shape === 'digital') return oscillator('bit', p) * 0.52 + oscillator('square', p * 0.5) * 0.18;
  if (shape === 'round') return Math.sin(2 * Math.PI * p) * 0.85 + Math.sin(2 * Math.PI * p * 0.5) * 0.1;
  if (shape === '808') return Math.sin(2 * Math.PI * p) * 0.92 + Math.sin(2 * Math.PI * p * 2) * 0.05;
  return Math.sin(2 * Math.PI * p);
}

function writeWavFile(filePath, samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.round(clampSample(samples[i]) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function synthLibraryTrack(track, outputPath) {
  const preset = musicPresetForTrack(track);
  const sampleRate = 22050;
  const duration = 32;
  const samples = new Float32Array(sampleRate * duration);
  const beatDuration = 60 / (track.bpm || 100);
  const masterGain = track.category === 'Cinematic' ? 0.62 : track.category === 'Urban' ? 0.68 : 0.72;
  let noiseSeed = 123456 + String(track.id).split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const noise = () => {
    noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
    return (noiseSeed / 4294967295) * 2 - 1;
  };

  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const beat = t / beatDuration;
    const beatInBar = ((beat % 4) + 4) % 4;
    const eighth = Math.floor(beat * 2) % preset.bass.length;
    const sixteenth = Math.floor(beat * 4) % preset.melody.length;
    const bassSemi = preset.bass[eighth] || 0;
    const melodySemi = preset.melody[sixteenth] || 12;
    const bassFreq = noteFrequency(preset.root / 2, bassSemi);
    const melodyFreq = noteFrequency(preset.root, melodySemi);
    const chordStep = Math.floor(beat / 4) % 4;
    const chordShift = [0, 5, 9, 7][chordStep] || 0;
    const beatFrac = beat - Math.floor(beat);
    const eighthFrac = beat * 2 - Math.floor(beat * 2);
    const sixteenthFrac = beat * 4 - Math.floor(beat * 4);

    let sample = 0;
    const bassDecay = preset.bassWave === '808' ? 1.35 : 3.4;
    const bassEnv = Math.exp(-beatFrac * bassDecay);
    const bassPhase = bassFreq * (t + Math.sin(2 * Math.PI * 2 * t) * 0.0008);
    sample += oscillator(preset.bassWave || 'sine', bassPhase) * 0.3 * bassEnv * (preset.bassGain || 1);
    if (preset.bassWave === '808') {
      sample += Math.sin(2 * Math.PI * bassFreq * 0.5 * t) * 0.24 * bassEnv;
    } else {
      sample += oscillator('sine', bassFreq * 2 * t) * 0.06 * bassEnv;
    }

    const chordEnv = 0.18 + 0.16 * Math.sin(2 * Math.PI * beat / 8);
    for (const semi of preset.chord) {
      const freq = noteFrequency(preset.root, semi + chordShift);
      const slowSwell = preset.chordWave === 'pad' ? (0.55 + 0.45 * Math.sin(2 * Math.PI * t / 8)) : 1;
      sample += oscillator(preset.chordWave || 'sine', freq * t) * 0.058 * chordEnv * slowSwell * (preset.chordGain || 1);
      sample += oscillator(preset.chordWave || 'sine', freq * 2.01 * t + 0.08) * 0.014 * chordEnv * slowSwell;
    }

    if (sixteenthFrac < 0.72) {
      const plucky = ['pluck', 'toy', 'string', 'bit'].includes(preset.wave);
      const leadEnv = Math.exp(-sixteenthFrac * (plucky ? 8.5 : 4.2));
      const wobble = Math.sin(2 * Math.PI * 5.5 * t) * 0.003;
      sample += oscillator(preset.wave || 'sine', melodyFreq * (t + wobble)) * 0.16 * leadEnv * preset.drive * (preset.leadGain || 1);
      sample += oscillator(preset.wave || 'sine', melodyFreq * 2 * t + 0.03) * 0.028 * leadEnv;
    }

    for (const kickBeat of preset.kick) {
      const dist = beatInBar - kickBeat;
      if (dist >= 0 && dist < 0.18) {
        const env = Math.exp(-dist * 24);
        const sweepBase = preset.percussion === 'cinematic' ? 36 : preset.percussion === 'trap' ? 42 : 50;
        const sweep = sweepBase + (preset.percussion === 'trap' ? 130 : 95) * env;
        sample += Math.sin(2 * Math.PI * sweep * t) * (preset.percussion === 'cinematic' ? 0.95 : 0.75) * env * (preset.rhythmGain || 0.5);
      }
    }

    for (const snareBeat of preset.snare) {
      const dist = beatInBar - snareBeat;
      if (dist >= 0 && dist < 0.12) {
        const env = Math.exp(-dist * 28);
        const noiseGain = preset.percussion === 'comedy' ? 0.25 : preset.percussion === 'organic' ? 0.18 : 0.42;
        const tone = preset.percussion === 'global' ? 420 : preset.percussion === 'trap' ? 210 : 190;
        sample += noise() * noiseGain * env * (preset.rhythmGain || 0.5);
        sample += Math.sin(2 * Math.PI * tone * t) * 0.14 * env * (preset.rhythmGain || 0.5);
      }
    }

    const hatInterval = preset.hatEvery || 1;
    const hatPhase = (beat / hatInterval) - Math.floor(beat / hatInterval);
    if (hatPhase < 0.12) {
      const env = Math.exp(-hatPhase * 38);
      const hatGain = preset.texture === 'hatroll' ? 0.08 : preset.texture === 'shaker' ? 0.075 : preset.texture === 'vinyl' ? 0.018 : 0.045;
      sample += noise() * hatGain * env;
      if (preset.texture === 'shaker' && hatPhase < 0.08) sample += Math.sin(2 * Math.PI * 6500 * t) * 0.012 * env;
      if (preset.texture === 'popcorn' && hatPhase < 0.06) sample += oscillator('toy', 1200 * t) * 0.035 * env;
    }

    if (preset.texture === 'vinyl') {
      sample += noise() * 0.018 + Math.sin(2 * Math.PI * 0.35 * t) * 0.015;
    } else if (preset.texture === 'rumble') {
      sample += Math.sin(2 * Math.PI * 42 * t) * 0.045 * (0.7 + 0.3 * Math.sin(2 * Math.PI * t / 6));
    } else if (preset.texture === 'glitch') {
      const glitchGate = (Math.floor(beat * 8) + String(track.id).length) % 13 === 0;
      if (glitchGate) sample += oscillator('bit', melodyFreq * 3 * t) * 0.09 * Math.exp(-sixteenthFrac * 12);
    } else if (preset.texture === 'wood') {
      const tapPhase = (beat * 2) - Math.floor(beat * 2);
      if (tapPhase < 0.08) sample += oscillator('triangle', 780 * t) * 0.055 * Math.exp(-tapPhase * 30);
    } else if (preset.texture === 'lift') {
      sample += noise() * 0.025 * Math.min(1, t / 16) * Math.sin(2 * Math.PI * beat / 16);
    } else if (preset.texture === 'spark') {
      sample += oscillator('bell', noteFrequency(preset.root * 2, preset.melody[(sixteenth + 3) % preset.melody.length] || 12) * t) * 0.018 * Math.exp(-sixteenthFrac * 10);
    }

    const fadeIn = Math.min(1, t / 1.5);
    const fadeOut = Math.min(1, (duration - t) / 1.5);
    samples[i] = clampSample(Math.tanh(sample * 1.08) * masterGain * fadeIn * fadeOut);
  }

  writeWavFile(outputPath, samples, sampleRate);
}

function ensureLibraryMusicTrack(track) {
  return new Promise((resolve, reject) => {
    if (!track) return reject(new Error('Music track not found'));
    const outputPath = musicFilePathForTrack(track);
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1024) return resolve(outputPath);
    try {
      synthLibraryTrack(track, outputPath);
      resolve(outputPath);
    } catch (err) {
      reject(new Error(err.message || 'Music track could not be prepared'));
    }
  });
}

function findMusicUploadPath(musicFileId) {
  const id = String(musicFileId || '').trim();
  if (!/^music_[a-z0-9_]+/i.test(id)) return '';
  const match = fs.readdirSync(MUSIC_DIR).find(file => file.startsWith(id));
  return match ? path.join(MUSIC_DIR, match) : '';
}

function normalizeMusicSettings(body = {}) {
  const enabled = body.musicEnabled !== false && Boolean(body.musicFileId || body.musicTrackId);
  return {
    enabled,
    musicFileId: body.musicFileId || '',
    musicTrackId: body.musicTrackId || '',
    musicVolume: Math.max(0, Math.min(1, Number(body.musicVolume ?? 0.18))),
    voiceVolume: Math.max(0, Math.min(2, Number(body.voiceVolume ?? 1))),
    musicStart: Math.max(0, Number(body.musicStart ?? 0)),
    fadeIn: Math.max(0, Math.min(8, Number(body.musicFadeIn ?? 1))),
    fadeOut: Math.max(0, Math.min(8, Number(body.musicFadeOut ?? 1.5))),
    autoDuck: body.musicAutoDuck !== false
  };
}

async function resolveMusicPath(body = {}) {
  const settings = normalizeMusicSettings(body);
  if (!settings.enabled) return { settings, musicPath: '' };
  if (settings.musicFileId) {
    const uploadPath = findMusicUploadPath(settings.musicFileId);
    if (!uploadPath) throw new Error('Music file not found. Please upload the audio again.');
    return { settings, musicPath: uploadPath };
  }
  const track = getMusicTrack(settings.musicTrackId);
  const musicPath = await ensureLibraryMusicTrack(track);
  return { settings, musicPath };
}

function requireJamendoClientId() {
  const clientId = (process.env.JAMENDO_CLIENT_ID || '').trim();
  if (!clientId) throw new Error('Music provider is not configured yet. Add JAMENDO_CLIENT_ID on the backend.');
  return clientId;
}

function jamendoTrackToClipAI(track) {
  const downloadAllowed = track.audiodownload_allowed !== false && Boolean(track.audiodownload);
  return {
    id: String(track.id || ''),
    provider: 'jamendo',
    title: track.name || 'Jamendo track',
    artist: track.artist_name || 'Jamendo artist',
    album: track.album_name || '',
    duration: Number(track.duration || 0),
    image: track.album_image || track.image || '',
    previewUrl: track.audio || '',
    licenseUrl: track.license_ccurl || '',
    pageUrl: track.shareurl || '',
    canDownload: downloadAllowed
  };
}

async function searchJamendoTracks(query) {
  const clientId = requireJamendoClientId();
  const safeQuery = String(query || 'cinematic background').trim().slice(0, 80) || 'cinematic background';
  const url = new URL('https://api.jamendo.com/v3.0/tracks/');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '12');
  url.searchParams.set('audioformat', 'mp32');
  url.searchParams.set('audiodlformat', 'mp32');
  url.searchParams.set('include', 'musicinfo');
  url.searchParams.set('groupby', 'artist_id');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('search', safeQuery);
  const data = await requestJson(url.toString());
  return (data.results || [])
    .map(jamendoTrackToClipAI)
    .filter(track => track.id && track.previewUrl);
}

async function getJamendoTrackForDownload(trackId) {
  const clientId = requireJamendoClientId();
  const id = String(trackId || '').trim();
  if (!/^\d+$/.test(id)) throw new Error('Invalid music track.');
  const url = new URL('https://api.jamendo.com/v3.0/tracks/');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('audioformat', 'mp32');
  url.searchParams.set('audiodlformat', 'mp32');
  url.searchParams.set('id', id);
  const data = await requestJson(url.toString());
  const rawTrack = (data.results || [])[0];
  if (!rawTrack) throw new Error('Track was not found.');
  const track = jamendoTrackToClipAI(rawTrack);
  if (!track.canDownload) throw new Error('This track cannot be downloaded through ClipAI.');
  return { rawTrack, track, downloadUrl: rawTrack.audiodownload };
}

app.get('/api/music-provider/search', async (req, res) => {
  try {
    const provider = String(req.query.provider || 'jamendo').toLowerCase();
    if (provider !== 'jamendo') return res.status(400).json({ error: 'Music provider is not supported yet.' });
    const tracks = await searchJamendoTracks(req.query.q);
    res.json({ provider: 'jamendo', tracks });
  } catch (err) {
    res.status(503).json({ error: err.message || 'Music search is unavailable right now.' });
  }
});

app.post('/api/music-provider/download', async (req, res) => {
  try {
    const provider = String(req.body.provider || 'jamendo').toLowerCase();
    if (provider !== 'jamendo') return res.status(400).json({ error: 'Music provider is not supported yet.' });
    const { track, downloadUrl } = await getJamendoTrackForDownload(req.body.trackId);
    const musicFileId = `music_jamendo_${track.id}`;
    const outputPath = path.join(MUSIC_DIR, `${musicFileId}.mp3`);
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
      await downloadToFile(downloadUrl, outputPath);
    }
    const stat = fs.statSync(outputPath);
    if (stat.size < 2048) {
      try { fs.unlinkSync(outputPath); } catch (err) {}
      throw new Error('The selected music track could not be prepared.');
    }
    const fd = fs.openSync(outputPath, 'r');
    const headerBuffer = Buffer.alloc(64);
    fs.readSync(fd, headerBuffer, 0, headerBuffer.length, 0);
    fs.closeSync(fd);
    if (/^\s*</.test(headerBuffer.toString('utf8'))) {
      try { fs.unlinkSync(outputPath); } catch (err) {}
      throw new Error('The selected music track could not be prepared.');
    }
    res.json({
      musicFileId,
      title: `${track.title} - ${track.artist}`,
      provider: 'jamendo',
      sourceTrackId: track.id,
      previewUrl: musicPreviewUrl(req, musicFileId),
      licenseUrl: track.licenseUrl,
      pageUrl: track.pageUrl
    });
  } catch (err) {
    res.status(503).json({ error: err.message || 'Music could not be added right now.' });
  }
});

app.get('/api/music-library', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  const categories = Array.from(new Set(MUSIC_LIBRARY.map(track => track.category).filter(Boolean)));
  const tracks = MUSIC_LIBRARY
    .filter(track => !category || String(track.category || '').toLowerCase() === category)
    .filter(track => !q || `${track.title} ${track.mood} ${track.category}`.toLowerCase().includes(q))
    .map(track => ({
      id: track.id,
      title: track.title,
      category: track.category,
      mood: track.mood,
      color: track.color,
      previewUrl: `${publicBaseUrl(req)}/api/music-library/${encodeURIComponent(track.id)}`
    }));
  res.json({ categories, tracks });
});

app.get('/api/music-library/:id', async (req, res) => {
  try {
    const track = getMusicTrack(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    const musicPath = await ensureLibraryMusicTrack(track);
    streamAudioFile(req, res, musicPath, 'audio/wav');
  } catch (err) {
    res.status(503).json({ error: err.message || 'Music preview unavailable' });
  }
});

// ─── BINARY DOWNLOADER ───────────────────────────────────────────────────────
function downloadFile(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  const protocol = url.startsWith('https') ? https : http;
  protocol.get(url, (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      file.close();
      try { fs.unlinkSync(dest); } catch(e) {}
      downloadFile(res.headers.location, dest, callback);
    } else {
      res.pipe(file);
      file.on('finish', () => { file.close(); callback(null); });
    }
  }).on('error', (err) => {
    try { fs.unlinkSync(dest); } catch(e) {}
    callback(err);
  });
}

function setup(callback) {
  callback();

  // Convert and write YouTube cookies
  if (process.env.YT_COOKIES) {
    try {
      const raw = process.env.YT_COOKIES.trim();
      let cookieContent = '';
      if (raw.startsWith('[')) {
        const cookies = JSON.parse(raw);
        cookieContent = '# Netscape HTTP Cookie File\n';
        cookies.forEach(c => {
          const domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
          const flag = c.domain.startsWith('.') ? 'TRUE' : 'FALSE';
          const secure = c.secure ? 'TRUE' : 'FALSE';
          const expiry = Math.round(c.expirationDate || 0);
          cookieContent += `${domain}\t${flag}\t${c.path}\t${secure}\t${expiry}\t${c.name}\t${c.value}\n`;
        });
      } else {
        cookieContent = raw;
      }
      fs.writeFileSync(COOKIES_FILE, cookieContent);
      console.log('✅ YouTube cookies written');
    } catch(e) {
      console.error('❌ Cookie conversion failed:', e.message);
    }
  }

  // Always re-download yt-dlp standalone binary
  if (fs.existsSync(YTDLP)) fs.unlinkSync(YTDLP);
  console.log('⬇️ Downloading yt-dlp...');
  downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', YTDLP, (err) => {
    if (err) console.error('❌ yt-dlp failed:', err);
    else { fs.chmodSync(YTDLP, '755'); console.log('✅ yt-dlp ready!'); }
  });

  if (!fs.existsSync(FFMPEG)) {
    console.log('⬇️ Downloading ffmpeg...');
    downloadFile('https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64', FFMPEG, (err) => {
      if (err) console.error('❌ ffmpeg failed:', err);
      else { fs.chmodSync(FFMPEG, '755'); console.log('✅ ffmpeg ready!'); }
    });
  } else {
    console.log('✅ ffmpeg already exists');
  }
}

// ─── HELPER ───────────────────────────────────────────────────────────────────
function fetchWithBuffer(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    if (options.body) reqOptions.headers['content-length'] = options.body.length;
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Wait for binary to be ready
function waitForFile(filePath, timeout = 60000) {
  return new Promise((resolve) => {
    if (fs.existsSync(filePath)) return resolve(true);
    let waited = 0;
    const interval = setInterval(() => {
      waited += 2000;
      if (fs.existsSync(filePath)) { clearInterval(interval); resolve(true); }
      else if (waited >= timeout) { clearInterval(interval); resolve(false); }
    }, 2000);
  });
}

let drawtextSupportPromise = null;
function checkDrawtextSupport() {
  if (drawtextSupportPromise) return drawtextSupportPromise;
  drawtextSupportPromise = new Promise((resolve) => {
    execFile(FFMPEG, ['-hide_banner', '-filters'], { timeout: 15000, maxBuffer: 1024 * 1024 * 5 }, (err, stdout, stderr) => {
      const output = `${stdout || ''}\n${stderr || ''}`;
      const supported = !err && /\sdrawtext\s/.test(output);
      console.log('FFmpeg drawtext support:', supported ? 'yes' : 'no');
      resolve(supported);
    });
  });
  return drawtextSupportPromise;
}

// ─── GET VIDEO INFO ───────────────────────────────────────────────────────────
app.post('/api/info', async (req, res) => {
  console.log('📥 /api/info:', req.body);
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'No URL provided' });

  const ready = await waitForFile(YTDLP);
  if (!ready) return res.status(503).json({ message: 'Server still starting, please try again.' });

  const cmd = `"${YTDLP}" ${ytArgs()} --no-playlist -f "bestaudio/best" --print "%(title)s|||%(duration_string)s|||%(id)s" "${url}"`;
  console.log('Running:', cmd);
  exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    console.log('stdout:', stdout, 'stderr:', stderr);
    if (err || !stdout.trim()) return res.status(500).json({ message: 'Could not fetch video info', error: stderr });
    const parts = stdout.trim().split('|||');
    const videoId = parts[2] || '';
    res.json({
      title: parts[0] || 'Video',
      duration: parts[1] || '',
      thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null,
      videoId
    });
  });
});

// ─── TEST YOUTUBE CLIENTS ─────────────────────────────────────────────────────
app.get('/api/test-yt', (req, res) => {
  const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  const proxy = process.env.PROXY_URL || 'NO PROXY SET';
  const cmd = `"${YTDLP}" ${ytArgs()} --print "%(title)s" "${testUrl}"`;
  exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
    res.json({
      proxy_configured: proxy,
      success: !err && !!stdout.trim(),
      stdout: stdout.trim(),
      stderr: stderr.substring(0, 300),
      error: err ? err.message : null
    });
  });
});

// ─── DOWNLOAD FILE ────────────────────────────────────────────────────────────
app.post('/api/youtube-upload', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });
  console.log('📥 /api/youtube-upload:', url);

  const localFileId = `yt_${Date.now()}`;
  const outputPath = path.join(UPLOAD_DIR, localFileId + '.mp4');

  // Check if it's already a direct download URL (from RapidAPI)
  const isDirectUrl = !url.includes('youtube.com') && !url.includes('youtu.be');

  if (isDirectUrl) {
    // Direct MP4 URL — just download it with curl/https
    console.log('Direct URL detected, downloading directly...');
    try {
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        const protocol = url.startsWith('https') ? require('https') : require('http');
        protocol.get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            file.close();
            const redirectUrl = response.headers.location;
            const redirectProtocol = redirectUrl.startsWith('https') ? require('https') : require('http');
            redirectProtocol.get(redirectUrl, (res2) => {
              res2.pipe(file);
              file.on('finish', () => { file.close(); resolve(); });
            }).on('error', reject);
          } else {
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
          }
        }).on('error', reject);
      });
    } catch (err) {
      return res.status(500).json({ error: 'Direct download failed: ' + err.message });
    }
  } else {
    // YouTube URL — use yt-dlp
    const ready = await waitForFile(YTDLP);
    if (!ready) return res.status(503).json({ error: 'yt-dlp not ready, please try again.' });
    const cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[vcodec^=avc1][ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
    console.log('Running:', cmd);
    await new Promise((resolve) => {
      exec(cmd, { maxBuffer: 1024 * 1024 * 200, timeout: 600000 }, (err, stdout, stderr) => {
        if (err) {
          res.status(500).json({ error: 'YouTube download failed: ' + stderr.substring(0, 200) });
          resolve(false);
        } else resolve(true);
      });
    });
    if (!fs.existsSync(outputPath)) return;
  }

  if (!fs.existsSync(outputPath)) {
    return res.status(500).json({ error: 'Downloaded file not found' });
  }

  console.log('✅ Video ready, size:', fs.statSync(outputPath).size);

  const previewUrl = localPreviewUrl(req, localFileId);
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_KEY) return res.json({ localFileId, uploadUrl: previewUrl, previewUrl });

  try {
    const fileData = fs.readFileSync(outputPath);
    const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/octet-stream' },
      body: fileData
    });
    const uploadData = JSON.parse(uploadRes);
    console.log('✅ Uploaded to AssemblyAI:', uploadData.upload_url);
    res.json({ localFileId, uploadUrl: uploadData.upload_url, previewUrl });
  } catch (uploadErr) {
    console.error('AssemblyAI upload error:', uploadErr.message);
    res.json({ localFileId, uploadUrl: previewUrl, previewUrl });
  }
});

// ─── SERVE UPLOADED FILE ──────────────────────────────────────────────────────
app.get('/api/serve-upload/:id', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.id + '.mp4');
  streamVideoFile(req, res, filePath, 'video/mp4');
});

app.get('/api/serve-upload-file/:id', (req, res) => {
  const filePath = findUploadPath(req.params.id);
  streamVideoFile(req, res, filePath, 'video/mp4');
});

// ─── LOCAL FILE UPLOAD ────────────────────────────────────────────────────────
app.post('/api/upload-local', async (req, res) => {
  const filename = decodeURIComponent(req.headers['x-filename'] || 'upload.mp4');
  const localFileId = `upload_${Date.now()}`;
  const ext = path.extname(filename) || '.mp4';
  const outputPath = path.join(UPLOAD_DIR, localFileId + ext);
  console.log('📥 /api/upload-local:', filename);

  const writeStream = fs.createWriteStream(outputPath);
  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    console.log('✅ File saved, size:', fs.statSync(outputPath).size);
    const previewUrl = localPreviewUrl(req, localFileId);
    const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
    if (!ASSEMBLYAI_KEY) return res.json({ localFileId, uploadUrl: previewUrl, previewUrl });
    try {
      const fileData = fs.readFileSync(outputPath);
      const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/octet-stream' },
        body: fileData
      });
      const uploadData = JSON.parse(uploadRes);
      console.log('✅ Uploaded to AssemblyAI:', uploadData.upload_url);
      res.json({ localFileId, uploadUrl: uploadData.upload_url, previewUrl });
    } catch (err) {
      console.error('AssemblyAI upload error:', err.message);
      res.json({ localFileId, uploadUrl: previewUrl, previewUrl });
    }
  });
  writeStream.on('error', (err) => res.status(500).json({ error: 'Failed to save file' }));
});

app.post('/api/upload-music', async (req, res) => {
  const filename = decodeURIComponent(req.headers['x-filename'] || 'music.mp3');
  const ext = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus'].includes(path.extname(filename).toLowerCase())
    ? path.extname(filename).toLowerCase()
    : '.mp3';
  const musicFileId = `music_${Date.now()}`;
  const outputPath = path.join(MUSIC_DIR, musicFileId + ext);
  console.log('Music upload:', filename);

  const writeStream = fs.createWriteStream(outputPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    const stat = fs.statSync(outputPath);
    if (stat.size < 256) return res.status(400).json({ error: 'Audio file is empty' });
    res.json({
      musicFileId,
      filename,
      size: stat.size,
      previewUrl: `${publicBaseUrl(req)}/api/serve-music/${encodeURIComponent(musicFileId)}`
    });
  });
  writeStream.on('error', () => res.status(500).json({ error: 'Failed to save audio file' }));
});

app.get('/api/serve-music/:id', (req, res) => {
  const filePath = findMusicUploadPath(req.params.id);
  if (!filePath) return res.status(404).json({ error: 'Music file not found' });
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.wav'
    ? 'audio/wav'
    : ext === '.m4a' || ext === '.aac'
      ? 'audio/mp4'
      : ext === '.ogg' || ext === '.opus'
        ? 'audio/ogg'
        : 'audio/mpeg';
  streamAudioFile(req, res, filePath, type);
});

app.get('/api/serve-upload-raw/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.filename);
  streamVideoFile(req, res, filePath, 'video/mp4');
});

function escapeDrawtextText(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, ' ');
}

function buildCaptionText(captionLines) {
  const lines = Array.isArray(captionLines) ? captionLines : [];
  const text = lines
    .map(line => typeof line === 'string' ? line : (line && (line.text || line.caption || line.line)))
    .filter(Boolean)
    .join(' ')
    .trim();
  return text.replace(/\s+/g, ' ').slice(0, 120);
}

function splitCaptionRows(text, maxLineChars = 18) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const rows = [];
  let row = '';

  words.forEach(word => {
    const next = row ? `${row} ${word}` : word;
    if (next.length <= maxLineChars || !row) {
      row = next;
    } else {
      rows.push(row);
      row = word;
    }
  });
  if (row) rows.push(row);

  return rows.slice(0, 2).join('\n');
}

function chunkTranscriptWords(transcriptWords, maxWords = 3, maxChars = 22) {
  const chunks = [];
  let group = [];

  const flush = () => {
    if (!group.length) return;
    chunks.push(group);
    group = [];
  };

  transcriptWords.forEach(word => {
    const next = group.concat(word);
    const nextText = next.map(w => w.text).join(' ');
    if (group.length && (next.length > maxWords || nextText.length > maxChars)) {
      flush();
    }
    group.push(word);
  });

  flush();
  return chunks;
}

function normalizeCaptionTimeline(chunks, clipDurationSec) {
  const duration = Number(clipDurationSec) || 0;
  const gap = 0.08;
  return chunks
    .filter(chunk => chunk && chunk.text && Number.isFinite(chunk.start) && Number.isFinite(chunk.end))
    .sort((a, b) => a.start - b.start)
    .map((chunk, index, list) => {
      const next = list[index + 1];
      const start = Math.max(0, chunk.start);
      const naturalEnd = Math.max(start + 0.35, chunk.end);
      const nextLimitedEnd = next ? Math.min(naturalEnd, Math.max(start + 0.35, next.start - gap)) : naturalEnd;
      const boundedEnd = duration ? Math.min(nextLimitedEnd, duration) : nextLimitedEnd;
      return {
        ...chunk,
        start,
        end: Math.max(start + 0.25, boundedEnd)
      };
    })
    .filter((chunk, index, list) => {
      const next = list[index + 1];
      return !next || chunk.end <= next.start - 0.01;
    });
}

function getDrawtextFontOption() {
  const fontPaths = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'
  ];
  const fontPath = fontPaths.find(p => fs.existsSync(p));
  return fontPath ? `:fontfile=${fontPath}` : '';
}

function normalizeCaptionSettings(captionSettings) {
  const settings = captionSettings && typeof captionSettings === 'object' ? captionSettings : {};
  const size = Math.max(80, Math.min(125, Number(settings.size) || 100));
  const position = Math.max(62, Math.min(88, Number(settings.position) || 78));
  const words = Math.max(2, Math.min(4, Math.round(Number(settings.words) || 3)));
  return { size, position, words };
}

function buildCaptionChunks(words, startMs, endMs, captionLines, captionSettings) {
  const settings = normalizeCaptionSettings(captionSettings);
  const clipStart = Number(startMs) || 0;
  const clipEnd = Number(endMs) || clipStart + 45000;
  const transcriptWords = Array.isArray(words) ? words
    .map(w => ({
      text: String(w.text || w.word || '').trim(),
      start: Number(w.start),
      end: Number(w.end)
    }))
    .filter(w => w.text && Number.isFinite(w.start) && w.start >= clipStart && w.start <= clipEnd)
    .slice(0, 120) : [];

  if (transcriptWords.length) {
    const chunks = [];
    chunkTranscriptWords(transcriptWords, settings.words, settings.words * 8).forEach(group => {
      const text = splitCaptionRows(group.map(w => w.text).join(' '), settings.words <= 2 ? 16 : 18);
      const start = Math.max(0, (group[0].start - clipStart) / 1000);
      const lastEnd = Number.isFinite(group[group.length - 1].end) ? group[group.length - 1].end : group[group.length - 1].start + 900;
      const end = Math.max(start + 0.8, Math.min((lastEnd - clipStart) / 1000 + 0.35, (clipEnd - clipStart) / 1000));
      chunks.push({ text, start, end });
    });
    return normalizeCaptionTimeline(chunks, (clipEnd - clipStart) / 1000);
  }

  const fallbackText = buildCaptionText(captionLines);
  if (!fallbackText) return [];
  const wordsFromCaption = fallbackText.split(/\s+/).filter(Boolean);
  const duration = Math.max(1, (clipEnd - clipStart) / 1000);
  const chunks = [];
  for (let i = 0; i < wordsFromCaption.length; i += settings.words) {
    const group = wordsFromCaption.slice(i, i + settings.words);
    const start = (i / Math.max(wordsFromCaption.length, 1)) * duration;
    const end = Math.min(duration, start + 1.8);
    chunks.push({ text: splitCaptionRows(group.join(' '), settings.words <= 2 ? 16 : 18), start, end });
  }
  return normalizeCaptionTimeline(chunks, duration);
}

function normalizeCaptionStyle(captionStyle, captionPreset) {
  const presetMap = {
    'tiktok-bold': 'tiktok',
    'yellow-pop': 'mrbeast',
    'minimal-white': 'minimal',
    karaoke: 'karaoke',
    neon: 'neon',
    subtitle: 'subtitle'
  };
  return presetMap[captionPreset] || captionStyle || 'tiktok';
}

function normalizeExportFormat(exportPreset, exportQuality) {
  const presetRaw = String(exportPreset || '').toLowerCase();
  const qualityRaw = String(exportQuality || '').toLowerCase();
  const preset = ['square', 'landscape'].includes(presetRaw) ? presetRaw : 'vertical';
  const quality = /1080/.test(qualityRaw) ? '1080p' : '720p';

  const formats = {
    vertical: {
      label: 'Vertical',
      filenameTag: '9x16',
      width: quality === '1080p' ? 1080 : 720,
      height: quality === '1080p' ? 1920 : 1280
    },
    square: {
      label: 'Square',
      filenameTag: '1x1',
      width: quality === '1080p' ? 1080 : 720,
      height: quality === '1080p' ? 1080 : 720
    },
    landscape: {
      label: 'Landscape',
      filenameTag: '16x9',
      width: quality === '1080p' ? 1920 : 1280,
      height: quality === '1080p' ? 1080 : 720
    }
  };

  const format = formats[preset];
  return {
    ...format,
    preset,
    quality,
    fontScale: Math.max(0.85, format.height / 1280),
    crf: quality === '1080p' ? '23' : '25',
    audioBitrate: quality === '1080p' ? '128k' : '96k'
  };
}

function getDrawtextStyle(captionStyle, captionPreset, captionSettings, exportFormat) {
  const key = normalizeCaptionStyle(captionStyle, captionPreset);
  const settings = normalizeCaptionSettings(captionSettings);
  const format = exportFormat || normalizeExportFormat();
  const styles = {
    tiktok: {
      color: 'white',
      size: 26,
      box: true,
      boxcolor: 'black@0.45',
      boxborderw: 10,
      shadowcolor: 'black',
      shadowx: 2,
      shadowy: 2,
      y: 'h-text_h-96',
      uppercase: false
    },
    mrbeast: {
      color: '0xFFE600',
      size: 28,
      box: true,
      boxcolor: 'black@0.25',
      boxborderw: 10,
      shadowcolor: 'black',
      shadowx: 3,
      shadowy: 3,
      y: 'h-text_h-110',
      uppercase: true
    },
    minimal: {
      color: 'white',
      size: 22,
      box: false,
      boxcolor: 'black@0',
      boxborderw: 0,
      shadowcolor: 'black',
      shadowx: 1,
      shadowy: 1,
      y: 'h-text_h-78',
      uppercase: false
    },
    karaoke: {
      color: '0x3ECF8E',
      size: 26,
      box: true,
      boxcolor: 'black@0.42',
      boxborderw: 10,
      shadowcolor: 'black',
      shadowx: 2,
      shadowy: 2,
      y: 'h-text_h-96',
      uppercase: false
    },
    neon: {
      color: '0x00FF88',
      size: 25,
      box: false,
      boxcolor: 'black@0',
      boxborderw: 0,
      shadowcolor: '0x00FF88',
      shadowx: 0,
      shadowy: 0,
      y: 'h-text_h-96',
      uppercase: true
    },
    subtitle: {
      color: 'white',
      size: 21,
      box: true,
      boxcolor: 'black@0.75',
      boxborderw: 10,
      shadowcolor: 'black',
      shadowx: 0,
      shadowy: 0,
      y: 'h-text_h-70',
      uppercase: false
    }
  };
  const style = { ...(styles[key] || styles.tiktok) };
  style.size = Math.round(style.size * settings.size / 100 * format.fontScale);
  style.boxborderw = Math.round(style.boxborderw * format.fontScale);
  style.shadowx = Math.round(style.shadowx * format.fontScale);
  style.shadowy = Math.round(style.shadowy * format.fontScale);
  style.y = 'h*' + (settings.position / 100).toFixed(2) + '-text_h/2';
  return style;
}

function escapeFilterPath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:');
}

function drawtextFilterForChunk(chunk, textFilePath, style) {
  const start = chunk.start.toFixed(2);
  const end = chunk.end.toFixed(2);
  return 'drawtext=textfile=' + escapeFilterPath(textFilePath) +
    getDrawtextFontOption() +
    ':fontcolor=' + style.color +
    ':fontsize=' + style.size +
    ':line_spacing=6' +
    ':box=' + (style.box ? '1' : '0') +
    ':boxcolor=' + style.boxcolor +
    ':boxborderw=' + style.boxborderw +
    ':x=(w-text_w)/2' +
    ':y=' + style.y +
    ':shadowcolor=' + style.shadowcolor +
    ':shadowx=' + style.shadowx +
    ':shadowy=' + style.shadowy +
    `:enable=between(t\\,${start}\\,${end})`;
}

function drawtextHookOverlayFilter(textFilePath, exportFormat) {
  const scale = (exportFormat || normalizeExportFormat()).fontScale;
  return 'drawtext=textfile=' + escapeFilterPath(textFilePath) +
    getDrawtextFontOption() +
    ':fontcolor=white' +
    ':fontsize=' + Math.round(32 * scale) +
    ':line_spacing=' + Math.round(8 * scale) +
    ':box=1' +
    ':boxcolor=black@0.58' +
    ':boxborderw=' + Math.round(16 * scale) +
    ':x=(w-text_w)/2' +
    ':y=h*0.18' +
    ':shadowcolor=black' +
    ':shadowx=' + Math.round(3 * scale) +
    ':shadowy=' + Math.round(3 * scale) +
    ':enable=between(t\\,0\\,2.8)';
}

function normalizeHookOverlayText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 95);
}

function drawtextWatermarkFilter(textFilePath, exportFormat) {
  const format = exportFormat || normalizeExportFormat();
  const scale = format.fontScale || 1;
  const margin = Math.round(30 * scale);
  const fontSize = Math.max(22, Math.round(26 * scale));
  const shadowOffset = Math.max(2, Math.round(2 * scale));
  const xExpr = `if(lt(mod(t\\,8)\\,4)\\,${margin}\\,w-text_w-${margin})`;
  const yExpr = `if(lt(mod(t\\,8)\\,4)\\,${margin}\\,h-text_h-${margin})`;
  return 'drawtext=textfile=' + escapeFilterPath(textFilePath) +
    getDrawtextFontOption() +
    ':fontcolor=white@0.92' +
    ':fontsize=' + fontSize +
    ':box=0' +
    ':x=' + xExpr +
    ':y=' + yExpr +
    ':shadowcolor=black@0.9' +
    ':shadowx=' + shadowOffset +
    ':shadowy=' + shadowOffset;
}

function buildWatermarkFilterPart(requestId, exportFormat, cleanupPaths) {
  const watermarkFilePath = path.join(DOWNLOAD_DIR, `watermark_${requestId}.txt`);
  fs.writeFileSync(watermarkFilePath, '@ClipAI', 'utf8');
  cleanupPaths.push(watermarkFilePath);
  return drawtextWatermarkFilter(watermarkFilePath, exportFormat);
}

function buildAudioMixFilter(durationSec, musicSettings) {
  const duration = Math.max(0.1, Number(durationSec) || 1);
  const fadeIn = Math.min(Number(musicSettings.fadeIn) || 0, duration / 2);
  const fadeOut = Math.min(Number(musicSettings.fadeOut) || 0, duration / 2);
  const fadeOutStart = Math.max(0, duration - fadeOut);
  const musicVolume = Math.max(0, Math.min(1, Number(musicSettings.musicVolume) || 0.22)) * (musicSettings.autoDuck ? 0.85 : 1);
  const voiceVolume = Math.max(0, Math.min(2, Number(musicSettings.voiceVolume) || 1));
  const musicStart = Math.max(0, Number(musicSettings.musicStart) || 0);
  const parts = [
    `[0:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${voiceVolume.toFixed(2)},asetpts=PTS-STARTPTS[a0]`,
    `[1:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start=${musicStart.toFixed(3)}:duration=${duration.toFixed(3)},asetpts=PTS-STARTPTS,apad=pad_dur=${duration.toFixed(3)},atrim=duration=${duration.toFixed(3)},volume=${musicVolume.toFixed(3)}` +
      (fadeIn > 0 ? `,afade=t=in:st=0:d=${fadeIn.toFixed(2)}` : '') +
      (fadeOut > 0 ? `,afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fadeOut.toFixed(2)}` : '') +
      `[a1]`,
    '[a0][a1]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[a]'
  ];
  return parts.join(';\n');
}

function buildVideoFilterScript(captionLines, words, startMs, endMs, requestId, captionStyle, captionPreset, captionSettings, hookOverlay, exportFormat, removeWatermark, burnCaptions = true, musicConfig = null) {
  const format = exportFormat || normalizeExportFormat();
  const filters = [
    `scale=${format.width}:${format.height}:force_original_aspect_ratio=decrease`,
    `pad=${format.width}:${format.height}:(ow-iw)/2:(oh-ih)/2:black`,
    'setsar=1',
    'setpts=PTS-STARTPTS'
  ];
  const cleanupPaths = [];
  const style = getDrawtextStyle(captionStyle, captionPreset, captionSettings, format);
  const hookText = normalizeHookOverlayText(hookOverlay);

  if (hookText) {
    const hookFilePath = path.join(DOWNLOAD_DIR, `hook_${requestId}.txt`);
    fs.writeFileSync(hookFilePath, splitCaptionRows(hookText.toUpperCase(), 18), 'utf8');
    cleanupPaths.push(hookFilePath);
    filters.push(drawtextHookOverlayFilter(hookFilePath, format));
  }

  const chunks = burnCaptions ? buildCaptionChunks(words, startMs, endMs, captionLines, captionSettings) : [];
  if (burnCaptions) {
    chunks.forEach((chunk, index) => {
      const textFilePath = path.join(DOWNLOAD_DIR, `caption_${requestId}_${index}.txt`);
      fs.writeFileSync(textFilePath, style.uppercase ? chunk.text.toUpperCase() : chunk.text, 'utf8');
      cleanupPaths.push(textFilePath);
      filters.push(drawtextFilterForChunk(chunk, textFilePath, style));
    });
  }
  if (!removeWatermark) {
    filters.push(buildWatermarkFilterPart(requestId, format, cleanupPaths));
  }
  console.log('Caption chunks:', chunks.length);
  console.log('Captions:', burnCaptions ? 'enabled' : 'disabled');
  console.log('Caption style:', normalizeCaptionStyle(captionStyle, captionPreset));
  console.log('Caption settings:', normalizeCaptionSettings(captionSettings));
  console.log('Export format:', format);
  if (hookText) console.log('Hook overlay:', hookText);
  console.log('Watermark:', removeWatermark ? 'removed' : 'enabled');
  if (chunks.length) console.log('First caption chunk:', chunks[0]);

  const scriptLines = [`[0:v]${filters.join(',')}[v]`];
  if (musicConfig?.musicPath) {
    scriptLines.push(buildAudioMixFilter(musicConfig.durationSec, musicConfig.settings));
    console.log('Background music:', musicConfig.settings.musicTrackId || musicConfig.settings.musicFileId);
  }

  const scriptPath = path.join(DOWNLOAD_DIR, `filter_${requestId}.txt`);
  fs.writeFileSync(scriptPath, scriptLines.join(';\n'), 'utf8');
  cleanupPaths.push(scriptPath);
  return { scriptPath, cleanupPaths, hasMixedAudio: Boolean(musicConfig?.musicPath) };
}

// ─── CUT CLIP ─────────────────────────────────────────────────────────────────
app.post('/api/cut-clip', (req, res) => {
  const {
    localFileId,
    startMs,
    endMs,
    clipTitle,
    captionLines,
    words,
    captionStyle,
    captionPreset,
    captionSettings,
    hookOverlay,
    exportPreset,
    exportQuality,
    burnCaptions,
    removeWatermark,
    musicEnabled,
    musicFileId,
    musicTrackId,
    musicVolume,
    voiceVolume,
    musicStart,
    musicFadeIn,
    musicFadeOut,
    musicAutoDuck
  } = req.body;
  if (!localFileId) return res.status(400).json({ error: 'localFileId required' });

  const trycut = async () => {
    if (!fs.existsSync(FFMPEG)) {
      console.log('⏳ Waiting for ffmpeg...');
      return setTimeout(trycut, 2000);
    }
    checkDrawtextSupport();

    const files = fs.readdirSync(UPLOAD_DIR);
    const match = files.find(f => f.startsWith(localFileId));
    if (!match) return res.status(404).json({ error: 'Source file not found. Please re-upload.' });

    const inputPath = path.join(UPLOAD_DIR, match);
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const outputPath = path.join(DOWNLOAD_DIR, `clip_${requestId}.mp4`);
    const startSec = (startMs / 1000).toFixed(3);
    const durationSec = ((endMs - startMs) / 1000).toFixed(3);
    const exportFormat = normalizeExportFormat(exportPreset, exportQuality);
    let musicPath = '';
    let musicSettings = null;
    try {
      const resolvedMusic = await resolveMusicPath({ musicEnabled, musicFileId, musicTrackId, musicVolume, voiceVolume, musicStart, musicFadeIn, musicFadeOut, musicAutoDuck });
      musicPath = resolvedMusic.musicPath;
      musicSettings = resolvedMusic.settings;
      if (musicPath) {
        const musicStat = fs.statSync(musicPath);
        console.log('Resolved background music:', path.basename(musicPath), `${musicStat.size} bytes`);
      }
    } catch (musicErr) {
      return res.status(400).json({ error: musicErr.message || 'Background music could not be loaded' });
    }
    const { scriptPath, cleanupPaths, hasMixedAudio } = buildVideoFilterScript(
      captionLines,
      words,
      startMs,
      endMs,
      requestId,
      captionStyle,
      captionPreset,
      captionSettings,
      hookOverlay,
      exportFormat,
      Boolean(removeWatermark),
      burnCaptions !== false,
      musicPath ? { musicPath, settings: musicSettings, durationSec } : null
    );
    const args = [
      '-y',
      '-ss', startSec,
      '-t', durationSec,
      '-i', inputPath,
      ...(musicPath ? ['-stream_loop', '-1', '-i', musicPath] : []),
      '-filter_complex_script', scriptPath,
      '-map', '[v]',
      ...(hasMixedAudio ? ['-map', '[a]'] : ['-map', '0:a?']),
      '-s', `${exportFormat.width}x${exportFormat.height}`,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', exportFormat.crf,
      '-profile:v', 'main',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', exportFormat.audioBitrate,
      '-ac', '2',
      '-movflags', '+faststart',
      '-threads', '1',
      outputPath
    ];

    console.log('Cutting clip:', clipTitle);
    console.log('Filter script:', scriptPath);
    execFile(FFMPEG, args, { maxBuffer: 1024 * 1024 * 500, timeout: 900000 }, (err, stdout, stderr) => {
      const cleanupTempFiles = () => cleanupPaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
      if (err || !fs.existsSync(outputPath)) {
        cleanupTempFiles();
        const timeoutMessage = err && (err.killed || err.signal === 'SIGTERM' || /timed out/i.test(err.message || ''))
          ? `FFmpeg timed out while rendering ${exportFormat.filenameTag} ${exportFormat.quality}. Try 720p, a shorter clip, or upgrade the Render instance for 1080p exports.`
          : '';
        const lines = (stderr || '').split('\n').filter(l => l.trim());
        const errorLines = lines.filter(l =>
          l.includes('Error') || l.includes('error') ||
          l.includes('Invalid') || l.includes('No such') ||
          l.includes('failed') || l.includes('Cannot')
        );
        const realError = timeoutMessage || (errorLines.length > 0
          ? errorLines.join(' | ').substring(0, 400)
          : (err && err.message) || (stderr || '').split('\n').slice(-5).join(' | ').substring(0, 400));
        console.error('FFmpeg error:', realError);
        return res.status(500).json({ error: 'Cut failed: ' + realError });
      }

      const stat = fs.statSync(outputPath);
      console.log('✅ Clip cut, size:', stat.size);
      res.setHeader('Content-Type', 'video/mp4');
      const safeName = String(clipTitle || 'clip').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'clip';
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_${exportFormat.filenameTag}_${exportFormat.quality}.mp4"`);
      res.setHeader('Content-Length', stat.size);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);
      stream.on('close', () => {
        cleanupTempFiles();
        setTimeout(() => { try { fs.unlinkSync(outputPath); } catch(e) {} }, 5000);
      });
    });
  };

  trycut();
});

// ─── GHOST EDITOR ─────────────────────────────────────────────────────────────
function runProcess(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      maxBuffer: options.maxBuffer || 1024 * 1024 * 500,
      timeout: options.timeout || 900000
    }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function compactFfmpegError(stderr, fallback) {
  const lines = String(stderr || '').split('\n').filter(line => line.trim());
  const errorLines = lines.filter(line => /error|invalid|no such|failed|cannot|unable/i.test(line));
  return (errorLines.length ? errorLines : lines.slice(-6)).join(' | ').slice(0, 500) || fallback || 'FFmpeg failed';
}

function findUploadPath(localFileId) {
  const id = String(localFileId || '').trim();
  if (!id) return '';
  const files = fs.readdirSync(UPLOAD_DIR);
  const match = files.find(file => file === id || file.startsWith(id));
  return match ? path.join(UPLOAD_DIR, match) : '';
}

function safeCompilationName(value) {
  return String(value || 'clipai_compilation')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'clipai_compilation';
}

function normalizeCompilationSegments(plan, sources) {
  const sourceList = Array.isArray(sources) ? sources : [];
  const sourceByIndex = new Map(sourceList.map((source, index) => [
    Number.isFinite(Number(source.index)) ? Number(source.index) : index,
    source
  ]));
  const rawSegments = Array.isArray(plan?.segments) && plan.segments.length
    ? plan.segments
    : sourceList.map((source, index) => ({
        source_index: Number.isFinite(Number(source.index)) ? Number(source.index) : index,
        title: `Source ${index + 1}`,
        start_ms: 0,
        end_ms: Math.min(120000, Math.max(30000, Number(source.duration || 0) * 1000 || 90000)),
        target_seconds: 90
      }));

  return rawSegments.slice(0, 30).map((segment, index) => {
    const sourceIndex = Number.isFinite(Number(segment.source_index ?? segment.sourceIndex)) ? Number(segment.source_index ?? segment.sourceIndex) : index;
    const source = sourceByIndex.get(sourceIndex) || sourceList[sourceIndex] || sourceList[index];
    const localFileId = source?.localFileId || segment.localFileId || '';
    let startMs = segment.start_ms ?? segment.startMs;
    let endMs = segment.end_ms ?? segment.endMs;
    if (startMs === undefined && segment.start_seconds !== undefined) startMs = Number(segment.start_seconds) * 1000;
    if (endMs === undefined && segment.end_seconds !== undefined) endMs = Number(segment.end_seconds) * 1000;
    startMs = Math.max(0, Number(startMs ?? 0) || 0);
    endMs = Math.max(0, Number(endMs ?? 0) || 0);
    const fallbackDurationMs = Math.max(10000, Math.min(360000, Number(segment.target_seconds ?? segment.duration_seconds ?? segment.duration_s ?? 90) * 1000));
    if (!endMs || endMs <= startMs + 1000) endMs = startMs + fallbackDurationMs;
    const sourceDurationMs = Number(source?.duration || 0) * 1000;
    if (sourceDurationMs > 0) {
      startMs = Math.min(startMs, Math.max(0, sourceDurationMs - 1000));
      endMs = Math.min(endMs, sourceDurationMs);
    }
    const durationMs = Math.max(3000, endMs - startMs);
    return {
      index,
      sourceIndex,
      localFileId,
      title: segment.title || `Segment ${index + 1}`,
      startMs,
      durationMs
    };
  }).filter(segment => segment.localFileId && segment.durationMs > 0);
}

function concatFileLine(filePath) {
  return `file '${String(filePath).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`;
}

app.post('/api/build-compilation', async (req, res) => {
  const { sources = [], plan = {}, title = '', quality = '720p', removeWatermark = false } = req.body || {};
  if (!Array.isArray(sources) || sources.length < 2) {
    return res.status(400).json({ error: 'At least two downloaded sources are required.' });
  }
  if (!plan || !Array.isArray(plan.segments) || !plan.segments.length) {
    return res.status(400).json({ error: 'Create a compilation plan before building the final video.' });
  }
  if (!fs.existsSync(FFMPEG)) {
    return res.status(503).json({ error: 'FFmpeg is still preparing. Please try again in a moment.' });
  }

  const requestId = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const buildDir = path.join(DOWNLOAD_DIR, requestId);
  fs.mkdirSync(buildDir, { recursive: true });
  const tempFiles = [];
  const width = quality === '1080p' ? 1920 : 1280;
  const height = quality === '1080p' ? 1080 : 720;
  const crf = quality === '1080p' ? '23' : '25';
  const compilationFormat = { width, height, fontScale: quality === '1080p' ? 1.25 : 1 };
  const segments = normalizeCompilationSegments(plan, sources);

  if (!segments.length) {
    try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch(e) {}
    return res.status(400).json({ error: 'No valid renderable segments found in this compilation plan.' });
  }

  try {
    console.log('Building compilation:', requestId, 'segments:', segments.length);
    for (const segment of segments) {
      const inputPath = findUploadPath(segment.localFileId);
      if (!inputPath) throw new Error(`Source file missing for segment ${segment.index + 1}. Rebuild the compilation plan.`);

      const outputPath = path.join(buildDir, `segment_${String(segment.index).padStart(3, '0')}.mp4`);
      tempFiles.push(outputPath);
      const startSec = (segment.startMs / 1000).toFixed(3);
      const durationSec = (segment.durationMs / 1000).toFixed(3);
      const filterParts = [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        'setsar=1',
        'fps=30'
      ];
      if (!removeWatermark) {
        const watermarkFilePath = path.join(buildDir, 'watermark.txt');
        if (!fs.existsSync(watermarkFilePath)) fs.writeFileSync(watermarkFilePath, '@ClipAI', 'utf8');
        filterParts.push(drawtextWatermarkFilter(watermarkFilePath, compilationFormat));
      }
      const filter = filterParts.join(',');
      const args = [
        '-y',
        '-ss', startSec,
        '-t', durationSec,
        '-i', inputPath,
        '-vf', filter,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', crf,
        '-profile:v', 'main',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-threads', '1',
        outputPath
      ];
      await runProcess(FFMPEG, args, { timeout: 900000 });
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
        throw new Error(`Segment ${segment.index + 1} was not created.`);
      }
    }

    const concatPath = path.join(buildDir, 'concat.txt');
    fs.writeFileSync(concatPath, tempFiles.map(concatFileLine).join('\n'), 'utf8');
    const outputPath = path.join(DOWNLOAD_DIR, `${requestId}.mp4`);
    try {
      await runProcess(FFMPEG, [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        outputPath
      ], { timeout: 900000 });
    } catch (copyErr) {
      console.log('Concat copy failed, retrying with re-encode:', compactFfmpegError(copyErr.stderr, copyErr.message));
      await runProcess(FFMPEG, [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatPath,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', crf,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-threads', '1',
        outputPath
      ], { timeout: 1200000 });
    }

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
      throw new Error('Final compilation file was not created.');
    }

    const stat = fs.statSync(outputPath);
    const safeName = safeCompilationName(title || plan.title || 'clipai_compilation');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_${quality}.mp4"`);
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(outputPath).pipe(res).on('close', () => {
      try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch(e) {}
      setTimeout(() => { try { fs.unlinkSync(outputPath); } catch(e) {} }, 5000);
    });
  } catch (err) {
    console.error('Compilation build error:', err.message, compactFfmpegError(err.stderr, ''));
    try { fs.rmSync(buildDir, { recursive: true, force: true }); } catch(e) {}
    return res.status(500).json({
      error: 'Compilation build failed: ' + (err.message || compactFfmpegError(err.stderr, 'Unknown FFmpeg error'))
    });
  }
});

const GHOST_CAPTION_PRESETS = new Set([
  'tiktok-bold',
  'yellow-pop',
  'minimal-white',
  'karaoke',
  'neon',
  'subtitle'
]);

const GHOST_PRESET_TO_STYLE = {
  'tiktok-bold': 'tiktok',
  'yellow-pop': 'mrbeast',
  'minimal-white': 'minimal',
  karaoke: 'karaoke',
  neon: 'neon',
  subtitle: 'subtitle'
};

function stripGhostCodeFence(text) {
  return String(text || '').replace(/```json|```/g, '').trim();
}

function parseGhostJson(text) {
  const cleaned = stripGhostCodeFence(text);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw err;
    return JSON.parse(match[0]);
  }
}

function clampGhostNumber(num, min, max) {
  return Math.min(max, Math.max(min, Number(num) || 0));
}

function normalizeGhostPreset(value, brief) {
  const raw = String(value || '').toLowerCase().trim();
  if (GHOST_CAPTION_PRESETS.has(raw)) return raw;
  const b = String(brief || '').toLowerCase();
  if (b.includes('yellow') || b.includes('mrbeast')) return 'yellow-pop';
  if (b.includes('minimal') || b.includes('clean') || b.includes('white')) return 'minimal-white';
  if (b.includes('karaoke') || b.includes('word by word')) return 'karaoke';
  if (b.includes('neon') || b.includes('glow')) return 'neon';
  if (b.includes('subtitle')) return 'subtitle';
  return 'tiktok-bold';
}

function ghostWordsAround(words, startMs, endMs, maxWords) {
  return (words || [])
    .filter(w => (w.start || 0) >= startMs && (w.start || 0) <= endMs)
    .slice(0, maxWords)
    .map(w => w.text)
    .filter(Boolean);
}

function fallbackGhostPlan({ brief, utterances, words, duration }) {
  const durationSec = Number(duration) || 0;
  const requested = String(brief || '').match(/(\d+)\s*(sec|second|seconds|s)\b/i);
  const clipLen = clampGhostNumber(requested ? Number(requested[1]) : 30, 20, 60);
  const source = (utterances || []).find(u => String(u.text || '').length > 80) || (utterances || [])[0] || {};
  let startMs = Math.max(0, Number(source.start) || 0);
  let endMs = startMs + clipLen * 1000;
  const maxMs = durationSec > 0 ? durationSec * 1000 : endMs;
  if (endMs > maxMs) {
    endMs = maxMs;
    startMs = Math.max(0, endMs - clipLen * 1000);
  }
  const preset = normalizeGhostPreset('', brief);
  const captionWords = ghostWordsAround(words, startMs, endMs, 18);
  const text = captionWords.length ? captionWords.join(' ') : String(source.text || 'Ghost edit').slice(0, 140);

  return {
    mode: 'ghost',
    plan_summary: 'Fallback Ghost edit created from the strongest available transcript segment.',
    platform: /shorts/i.test(brief) ? 'shorts' : /reels|instagram/i.test(brief) ? 'reels' : 'tiktok',
    caption_preset: preset,
    caption_style: GHOST_PRESET_TO_STYLE[preset],
    caption_settings: { size: preset === 'minimal-white' ? 92 : 108, position: 78, words: 3 },
    clips: [{
      title: 'Ghost Edit',
      hook: text.split(/[.!?]/)[0].slice(0, 90),
      start_ms: Math.round(startMs),
      end_ms: Math.round(endMs),
      duration_s: Math.round((endMs - startMs) / 1000),
      speaker: source.speaker || '?',
      caption_lines: [text.slice(0, 42), text.slice(42, 84), text.slice(84, 126)].filter(Boolean),
      why: 'This segment is clear, self-contained, and closest to the Ghost brief.',
      platform_fit: ['tiktok', 'reels', 'shorts'],
      energy: /calm|educational|minimal/i.test(brief) ? 'calm' : 'high'
    }]
  };
}

function normalizeGhostPlan(plan, context) {
  const totalMs = Math.max(0, (Number(context.duration) || 0) * 1000);
  const preset = normalizeGhostPreset(plan.caption_preset || plan.captionStyle, context.brief);
  const clipCount = clampGhostNumber(Number(plan.clip_count || (plan.clips || []).length || 1), 1, 5);
  let clips = Array.isArray(plan.clips) ? plan.clips.slice(0, clipCount) : [];
  if (!clips.length) clips = fallbackGhostPlan(context).clips;

  clips = clips.map((clip, i) => {
    let startMs = clip.start_ms;
    let endMs = clip.end_ms;
    if (startMs === undefined && clip.start_seconds !== undefined) startMs = Number(clip.start_seconds) * 1000;
    if (endMs === undefined && clip.end_seconds !== undefined) endMs = Number(clip.end_seconds) * 1000;
    startMs = Math.max(0, Math.round(Number(startMs) || 0));

    const requestedDur = Number(clip.duration_s || plan.duration_seconds || 30);
    const targetMs = clampGhostNumber(requestedDur, 20, 60) * 1000;
    endMs = Math.round(Number(endMs) || (startMs + targetMs));
    if (endMs <= startMs) endMs = startMs + targetMs;
    if ((endMs - startMs) < 15000) endMs = startMs + targetMs;
    if ((endMs - startMs) > 65000) endMs = startMs + 60000;
    if (totalMs && endMs > totalMs) {
      endMs = totalMs;
      startMs = Math.max(0, endMs - targetMs);
    }

    const fallbackCaption = ghostWordsAround(context.words, startMs, endMs, 18).join(' ');
    const captionLines = Array.isArray(clip.caption_lines) && clip.caption_lines.length
      ? clip.caption_lines.slice(0, 5).map(line => String(line).slice(0, 70))
      : (fallbackCaption.match(/.{1,42}(\s|$)/g) || [clip.title || 'Ghost edit']);

    return {
      title: String(clip.title || `Ghost Edit ${i + 1}`).slice(0, 80),
      hook: String(clip.hook || clip.title || '').slice(0, 120),
      start_ms: startMs,
      end_ms: endMs,
      duration_s: Math.round((endMs - startMs) / 1000),
      speaker: String(clip.speaker || '?').slice(0, 12),
      caption_lines: captionLines.map(line => String(line).trim()).filter(Boolean).slice(0, 5),
      why: String(clip.why || 'Selected by Ghost Editor from your brief.').slice(0, 240),
      platform_fit: Array.isArray(clip.platform_fit) && clip.platform_fit.length ? clip.platform_fit.slice(0, 4) : ['tiktok', 'reels', 'shorts'],
      energy: ['high', 'medium', 'calm'].includes(clip.energy) ? clip.energy : 'high'
    };
  });

  return {
    mode: 'ghost',
    brief: context.brief,
    plan_summary: String(plan.plan_summary || plan.summary || 'Ghost Editor created a ready-to-export edit from your brief.').slice(0, 300),
    platform: String(plan.platform || 'tiktok').toLowerCase(),
    caption_preset: preset,
    caption_style: GHOST_PRESET_TO_STYLE[preset],
    caption_settings: {
      size: clampGhostNumber(plan.caption_settings?.size || (preset === 'yellow-pop' ? 112 : 100), 80, 125),
      position: clampGhostNumber(plan.caption_settings?.position || 78, 62, 88),
      words: clampGhostNumber(plan.caption_settings?.words || 3, 2, 4)
    },
    clips
  };
}

app.post('/api/ghost-edit', async (req, res) => {
  const { brief, transcript, utterances = [], highlights = [], words = [], duration = 0 } = req.body || {};
  if (!brief) return res.status(400).json({ error: 'Ghost brief required' });
  if (!transcript && !utterances.length) return res.status(400).json({ error: 'Transcript required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

  const utteranceSummary = (utterances || []).slice(0, 90).map(u => {
    const startSec = Math.round((u.start || 0) / 1000);
    const endSec = Math.round((u.end || 0) / 1000);
    return `[${u.speaker || 'S'} ${startSec}s-${endSec}s]: ${String(u.text || '').slice(0, 260)}`;
  }).join('\n');

  const highlightSummary = (highlights || []).slice(0, 12).map(h => {
    const ts = h.timestamps && h.timestamps[0];
    const sec = ts ? Math.round(ts.start / 1000) : Math.round((h.start_ms || 0) / 1000);
    return `"${String(h.text || '').slice(0, 140)}" at ${sec}s`;
  }).join('\n');

  const systemPrompt = 'You are Ghost Editor, a world-class short-form video editor. Convert natural language editing briefs into precise JSON edit plans. Return valid JSON only.';
  const userPrompt = `User brief:
"${brief}"

Video duration: ${Math.round(Number(duration) || 0)} seconds

Highlights:
${highlightSummary || 'None'}

Transcript with timestamps in seconds:
${utteranceSummary || String(transcript).slice(0, 9000)}

Interpret instructions like "funniest", "controversial", "emotional", "educational", "start with the punchline", "best quote", platform, clip count, duration, and caption style.

Return one JSON object:
{
  "plan_summary": "short explanation",
  "clip_count": 1,
  "duration_seconds": 30,
  "platform": "tiktok|reels|shorts|linkedin",
  "caption_preset": "tiktok-bold|yellow-pop|minimal-white|karaoke|neon|subtitle",
  "caption_settings": { "size": 100, "position": 78, "words": 3 },
  "clips": [
    {
      "title": "max 8 words",
      "hook": "opening hook",
      "start_seconds": 0,
      "end_seconds": 30,
      "speaker": "A",
      "caption_lines": ["short", "caption", "lines"],
      "why": "why this matches the brief",
      "platform_fit": ["tiktok", "reels", "shorts"],
      "energy": "high|medium|calm"
    }
  ]
}

Rules:
- start_seconds and end_seconds must be real video timestamps.
- Honor requested duration when possible, 20-60 seconds per clip.
- If asked to start with the punchline, begin at the strongest payoff line, not the earlier setup.
- Pick self-contained moments that make sense without the full video.
- JSON only.`;

  const context = { brief, transcript, utterances, highlights, words, duration };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 2400,
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.error || 'Groq Ghost Editor failed' });
    }

    const raw = data.choices?.[0]?.message?.content || '{}';
    let plan;
    try {
      plan = parseGhostJson(raw);
    } catch (err) {
      plan = fallbackGhostPlan(context);
    }

    return res.status(200).json(normalizeGhostPlan(plan, context));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── HOOK LAB ─────────────────────────────────────────────────────────────────
function stripHookFence(text) {
  return String(text || '').replace(/```json|```/g, '').trim();
}

function parseHookJson(text) {
  const cleaned = stripHookFence(text);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw err;
    return JSON.parse(match[0]);
  }
}

function fallbackHookVariants(clips) {
  const angles = ['curiosity gap', 'contrarian', 'pain point', 'story', 'comment magnet'];
  return (clips || []).slice(0, 3).flatMap(item => {
    const idx = item.index ?? 0;
    const base = item.hook || item.title || 'This moment changes everything';
    return angles.map(angle => ({
      clip_index: idx,
      angle,
      title: base.slice(0, 64),
      hook: angle === 'contrarian' ? 'Most people get this completely wrong.' :
        angle === 'pain point' ? 'If this keeps happening to you, watch this.' :
        angle === 'story' ? 'I did not expect this lesson to matter so much.' :
        angle === 'comment magnet' ? 'Would you agree with this take?' :
        'The part nobody talks about is this.',
      first_caption: angle === 'comment magnet' ? 'Agree or disagree?' : base.slice(0, 42),
      why: `Uses a ${angle} opening to make the clip feel more clickable.`,
      predicted_reaction: 'more retention',
      energy: angle === 'story' ? 'medium' : 'high'
    }));
  }).slice(0, 12);
}

function normalizeHookVariants(rawVariants, clips) {
  const maxClipIndex = Math.max(0, ...clips.map(c => Number(c.index) || 0));
  const variants = Array.isArray(rawVariants) ? rawVariants : rawVariants?.variants;
  const list = Array.isArray(variants) && variants.length ? variants : fallbackHookVariants(clips);

  return list.slice(0, 18).map((v, i) => {
    const clipIndex = Math.max(0, Math.min(maxClipIndex, Number(v.clip_index ?? v.clipIndex ?? clips[i % clips.length]?.index ?? 0)));
    const hook = String(v.hook || v.opening || v.title || 'This is the moment to watch.').trim().slice(0, 120);
    return {
      clip_index: clipIndex,
      angle: String(v.angle || v.type || 'curiosity gap').slice(0, 40),
      title: String(v.title || hook).slice(0, 80),
      hook,
      first_caption: String(v.first_caption || v.caption || hook).slice(0, 80),
      why: String(v.why || v.reason || 'This hook gives the clip a stronger opening.').slice(0, 220),
      predicted_reaction: String(v.predicted_reaction || v.reaction || 'higher retention').slice(0, 80),
      energy: ['high', 'medium', 'calm'].includes(v.energy) ? v.energy : 'high'
    };
  });
}

app.post('/api/hook-lab', async (req, res) => {
  const { clips = [], transcript = '', words = [] } = req.body || {};
  if (!Array.isArray(clips) || !clips.length) return res.status(400).json({ error: 'Clips required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

  const clipSummary = clips.slice(0, 5).map(item => {
    const captionText = (item.caption_lines || []).join(' ');
    return `Clip index ${item.index}
Title: ${item.title || ''}
Current hook: ${item.hook || ''}
Why: ${item.why || ''}
Time: ${Math.round((item.start_ms || 0) / 1000)}s-${Math.round((item.end_ms || 0) / 1000)}s
Captions: ${captionText}`;
  }).join('\n\n');

  const wordContext = (words || []).slice(0, 160).map(w => w.text).filter(Boolean).join(' ');
  const prompt = `You are Hook Lab, a short-form retention strategist.

Create multiple alternate opening hooks for each selected clip. These hooks should be used as first caption lines, clip titles, and first-frame overlays.

Selected clips:
${clipSummary}

Transcript context:
${wordContext || String(transcript || '').slice(0, 4500)}

Return JSON only:
{
  "variants": [
    {
      "clip_index": 0,
      "angle": "curiosity gap|contrarian|pain point|story|comment magnet|direct promise",
      "title": "short title, max 8 words",
      "hook": "first 1-2 seconds overlay, max 14 words",
      "first_caption": "caption line to put first",
      "why": "why this angle should improve performance",
      "predicted_reaction": "what viewers will feel/do",
      "energy": "high|medium|calm"
    }
  ]
}

Rules:
- Generate 4-5 variants per clip.
- Hooks must sound natural, not spammy.
- Do not invent facts that are not implied by the clip.
- Make each angle meaningfully different.
- JSON only.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 2200,
        temperature: 0.65,
        messages: [
          { role: 'system', content: 'Return valid JSON only. You are a world-class short-form hook strategist.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.error || 'Groq Hook Lab failed' });
    }

    let parsed;
    try {
      parsed = parseHookJson(data.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      parsed = { variants: fallbackHookVariants(clips) };
    }

    return res.status(200).json({ variants: normalizeHookVariants(parsed, clips) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
// Viral Memory Engine learns from saved creator performance and scores new clips.
function viralMemoryPerformanceScore(item) {
  const views = Math.max(1, Number(item.views) || 0);
  const likes = Number(item.likes) || 0;
  const comments = Number(item.comments) || 0;
  const shares = Number(item.shares) || 0;
  return Math.round(((likes + comments * 3 + shares * 4) / views) * 10000) / 100;
}

function stripMemoryFence(text) {
  return String(text || '').replace(/```json|```/g, '').trim();
}

function parseMemoryJson(text) {
  const cleaned = stripMemoryFence(text);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw err;
    return JSON.parse(match[0]);
  }
}

function fallbackMemoryProfile(memory, clips) {
  const sorted = memory.slice().sort((a, b) => viralMemoryPerformanceScore(b) - viralMemoryPerformanceScore(a));
  const top = sorted.slice(0, 5);
  const topWords = top.flatMap(item => String(item.title || '').toLowerCase().split(/\W+/)).filter(w => w.length > 3);
  const wordSet = new Set(topWords);
  return {
    summary: top.length ? 'Your strongest saved clips share recognizable topic and hook patterns. Current clips were scored against those saved winners.' : 'Add past performance to improve future clip scoring.',
    audience_patterns: [
      top[0] ? `Best saved result: ${top[0].title} on ${top[0].platform || 'unknown'}` : 'No strong pattern yet',
      'Clips with clear hooks and comment-worthy angles should be prioritized',
      'Keep adding results after posting to make this memory sharper'
    ],
    recommendations: [
      'Apply Hook Lab to the highest memory-fit clip',
      'Export one high-energy and one educational variant for comparison',
      'Save performance after posting so ClipAI learns your audience'
    ],
    clip_scores: clips.map((clip, index) => {
      const text = `${clip.title || ''} ${clip.hook || ''} ${(clip.caption_lines || []).join(' ')}`.toLowerCase();
      const overlap = Array.from(wordSet).filter(word => text.includes(word)).length;
      return {
        clip_index: Number(clip.index ?? index),
        score: Math.max(45, Math.min(92, 55 + overlap * 8 + (clip.hook ? 8 : 0))),
        reason: overlap ? 'Matches language from your stronger saved results.' : 'Usable baseline, but not strongly tied to saved winners yet.',
        suggested_hook: clip.hook || clip.title || ''
      };
    })
  };
}

function normalizeMemoryProfile(profile, memory, clips) {
  const fallback = fallbackMemoryProfile(memory, clips);
  const scores = Array.isArray(profile.clip_scores) && profile.clip_scores.length ? profile.clip_scores : fallback.clip_scores;
  return {
    summary: String(profile.summary || fallback.summary).slice(0, 300),
    audience_patterns: (Array.isArray(profile.audience_patterns) ? profile.audience_patterns : fallback.audience_patterns).slice(0, 5).map(x => String(x).slice(0, 180)),
    recommendations: (Array.isArray(profile.recommendations) ? profile.recommendations : fallback.recommendations).slice(0, 5).map(x => String(x).slice(0, 180)),
    clip_scores: scores.slice(0, clips.length).map((score, i) => ({
      clip_index: Math.max(0, Math.min(clips.length - 1, Number(score.clip_index ?? clips[i]?.index ?? i))),
      score: Math.max(0, Math.min(100, Number(score.score) || 50)),
      reason: String(score.reason || 'Scored against your saved audience memory.').slice(0, 180),
      suggested_hook: String(score.suggested_hook || '').slice(0, 110)
    }))
  };
}

app.post('/api/viral-memory', async (req, res) => {
  const { memory = [], clips = [] } = req.body || {};
  if (!Array.isArray(memory) || !memory.length) return res.status(400).json({ error: 'Saved memory required' });
  if (!Array.isArray(clips) || !clips.length) return res.status(400).json({ error: 'Clips required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq API key not configured' });

  const memorySummary = memory.slice(-40).map(item => ({
    title: item.title,
    platform: item.platform,
    views: Number(item.views) || 0,
    likes: Number(item.likes) || 0,
    comments: Number(item.comments) || 0,
    shares: Number(item.shares) || 0,
    performance_score: viralMemoryPerformanceScore(item)
  }));
  const clipSummary = clips.slice(0, 8).map(clip => ({
    index: clip.index,
    title: clip.title,
    hook: clip.hook,
    why: clip.why,
    captions: clip.caption_lines,
    platforms: clip.platform_fit,
    energy: clip.energy,
    duration_s: clip.duration_s
  }));
  const prompt = `You are Viral Memory Engine for ClipAI.

You are given a creator's saved past clip performance and their current generated clips. Learn what this creator's audience responds to, then score current clips for audience fit.

Past performance memory:
${JSON.stringify(memorySummary)}

Current clips:
${JSON.stringify(clipSummary)}

Return JSON only:
{
  "summary": "one concise profile insight",
  "audience_patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "recommendations": ["edit recommendation 1", "posting recommendation 2"],
  "clip_scores": [
    {
      "clip_index": 0,
      "score": 85,
      "reason": "why this clip matches the creator's memory",
      "suggested_hook": "optional stronger hook based on memory"
    }
  ]
}

Rules:
- Scores must be 0-100.
- Be specific to this creator's saved results, not generic.
- Prefer clips that resemble high-engagement saved examples.
- If data is thin, say that and give cautious recommendations.
- JSON only.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 1800,
        temperature: 0.35,
        messages: [
          { role: 'system', content: 'Return valid JSON only. You are a creator analytics strategist.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || data.error || 'Groq Viral Memory failed' });
    }

    let parsed;
    try {
      parsed = parseMemoryJson(data.choices?.[0]?.message?.content || '{}');
    } catch (err) {
      parsed = fallbackMemoryProfile(memory, clips);
    }
    return res.status(200).json(normalizeMemoryProfile(parsed, memory, clips));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

setup(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('✅ Clipai backend running on port ' + PORT));
});
