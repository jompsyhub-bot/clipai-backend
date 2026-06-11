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

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', contentType);

  if (range) {
    const [startRaw, endRaw] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startRaw, 10);
    const end = endRaw ? parseInt(endRaw, 10) : stat.size - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start >= stat.size || end >= stat.size) {
      res.setHeader('Content-Range', `bytes */${stat.size}`);
      return res.status(416).end();
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
}

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
    const cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
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

  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
  if (!ASSEMBLYAI_KEY) return res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload/${localFileId}` });

  try {
    const fileData = fs.readFileSync(outputPath);
    const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/octet-stream' },
      body: fileData
    });
    const uploadData = JSON.parse(uploadRes);
    console.log('✅ Uploaded to AssemblyAI:', uploadData.upload_url);
    res.json({ localFileId, uploadUrl: uploadData.upload_url });
  } catch (uploadErr) {
    console.error('AssemblyAI upload error:', uploadErr.message);
    res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload/${localFileId}` });
  }
});

// ─── SERVE UPLOADED FILE ──────────────────────────────────────────────────────
app.get('/api/serve-upload/:id', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.id + '.mp4');
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
    const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
    if (!ASSEMBLYAI_KEY) return res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload-raw/${localFileId}${ext}` });
    try {
      const fileData = fs.readFileSync(outputPath);
      const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { 'authorization': ASSEMBLYAI_KEY, 'content-type': 'application/octet-stream' },
        body: fileData
      });
      const uploadData = JSON.parse(uploadRes);
      console.log('✅ Uploaded to AssemblyAI:', uploadData.upload_url);
      res.json({ localFileId, uploadUrl: uploadData.upload_url });
    } catch (err) {
      console.error('AssemblyAI upload error:', err.message);
      res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload-raw/${localFileId}${ext}` });
    }
  });
  writeStream.on('error', (err) => res.status(500).json({ error: 'Failed to save file' }));
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

function buildVideoFilterScript(captionLines, words, startMs, endMs, requestId, captionStyle, captionPreset, captionSettings, hookOverlay, exportFormat) {
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

  const chunks = buildCaptionChunks(words, startMs, endMs, captionLines, captionSettings);
  chunks.forEach((chunk, index) => {
    const textFilePath = path.join(DOWNLOAD_DIR, `caption_${requestId}_${index}.txt`);
    fs.writeFileSync(textFilePath, style.uppercase ? chunk.text.toUpperCase() : chunk.text, 'utf8');
    cleanupPaths.push(textFilePath);
    filters.push(drawtextFilterForChunk(chunk, textFilePath, style));
  });
  console.log('Caption chunks:', chunks.length);
  console.log('Caption style:', normalizeCaptionStyle(captionStyle, captionPreset));
  console.log('Caption settings:', normalizeCaptionSettings(captionSettings));
  console.log('Export format:', format);
  if (hookText) console.log('Hook overlay:', hookText);
  if (chunks.length) console.log('First caption chunk:', chunks[0]);

  const scriptPath = path.join(DOWNLOAD_DIR, `filter_${requestId}.txt`);
  fs.writeFileSync(scriptPath, `[0:v]${filters.join(',')}[v]`, 'utf8');
  cleanupPaths.push(scriptPath);
  return { scriptPath, cleanupPaths };
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
    exportQuality
  } = req.body;
  if (!localFileId) return res.status(400).json({ error: 'localFileId required' });

  const trycut = () => {
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
    const { scriptPath, cleanupPaths } = buildVideoFilterScript(captionLines, words, startMs, endMs, requestId, captionStyle, captionPreset, captionSettings, hookOverlay, exportFormat);
    const args = [
      '-y',
      '-ss', startSec,
      '-t', durationSec,
      '-i', inputPath,
      '-filter_complex_script', scriptPath,
      '-map', '[v]',
      '-map', '0:a?',
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
  const { sources = [], plan = {}, title = '', quality = '720p' } = req.body || {};
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
      const filter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30`;
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
        model: 'llama-3.3-70b-versatile',
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
        model: 'llama-3.3-70b-versatile',
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
        model: 'llama-3.3-70b-versatile',
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
