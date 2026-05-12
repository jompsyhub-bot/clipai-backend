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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-filename,x-requested-with');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  next();
});

app.use(express.json());
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
  return process.env.PROXY_URL ? `--proxy "${process.env.PROXY_URL}"` : '';
}

function ytArgs() {
  return `${BYPASS} ${cookiesArg()} ${proxyArg()}`;
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
app.get('/api/download', async (req, res) => {
  const { url, format, quality } = req.query;
  if (!url) return res.status(400).send('No URL');

  const ready = await waitForFile(YTDLP);
  if (!ready) return res.status(503).json({ message: 'Server still starting, try again in 30 seconds.' });

  const filename = `clipai_${Date.now()}`;
  let outputPath, cmd, dlFilename, contentType;

  if (format === 'mp3') {
    const bitrate = quality ? quality.replace(' kbps', '') : '192';
    outputPath = path.join(DOWNLOAD_DIR, filename + '.mp3');
    dlFilename = 'audio.mp3'; contentType = 'audio/mpeg';
    cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -x --audio-format mp3 --audio-quality ${bitrate}K -o "${outputPath}" "${url}"`;
  } else {
    const heights = { '480p': 480, '720p': 720, '1080p': 1080, '4K': 2160 };
    const h = heights[quality] || 720;
    outputPath = path.join(DOWNLOAD_DIR, filename + '.mp4');
    dlFilename = 'video.mp4'; contentType = 'video/mp4';
    cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${h}][ext=mp4]/best[height<=${h}]" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
  }

  exec(cmd, { maxBuffer: 1024 * 1024 * 100, timeout: 600000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ message: 'Conversion failed', error: stderr });
    if (!fs.existsSync(outputPath)) return res.status(500).json({ message: 'File not created' });
    const stat = fs.statSync(outputPath);
    res.setHeader('Content-Disposition', `attachment; filename="${dlFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('close', () => { setTimeout(() => { try { fs.unlinkSync(outputPath); } catch(e) {} }, 5000); });
  });
});

// ─── YOUTUBE UPLOAD (for clipai-ten.vercel.app) ───────────────────────────────
app.post('/api/youtube-upload', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });
  console.log('📥 /api/youtube-upload:', url);

  const ready = await waitForFile(YTDLP);
  if (!ready) return res.status(503).json({ error: 'yt-dlp not ready, please try again.' });

  const localFileId = `yt_${Date.now()}`;
  const outputPath = path.join(UPLOAD_DIR, localFileId + '.mp4');
  const cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
  console.log('Running:', cmd);

  exec(cmd, { maxBuffer: 1024 * 1024 * 200, timeout: 600000 }, async (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: 'YouTube download failed: ' + stderr.substring(0, 200) });
    if (!fs.existsSync(outputPath)) return res.status(500).json({ error: 'Downloaded file not found' });
    console.log('✅ YouTube downloaded, size:', fs.statSync(outputPath).size);

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
});

// ─── SERVE UPLOADED FILE ──────────────────────────────────────────────────────
app.get('/api/serve-upload/:id', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.id + '.mp4');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
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
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
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

function getDrawtextFontOption() {
  const fontPaths = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'
  ];
  const fontPath = fontPaths.find(p => fs.existsSync(p));
  return fontPath ? `:fontfile=${fontPath}` : '';
}

function buildCaptionChunks(words, startMs, endMs, captionLines) {
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
    for (let i = 0; i < transcriptWords.length; i += 4) {
      const group = transcriptWords.slice(i, i + 4);
      const text = group.map(w => w.text).join(' ');
      const start = Math.max(0, (group[0].start - clipStart) / 1000);
      const lastEnd = Number.isFinite(group[group.length - 1].end) ? group[group.length - 1].end : group[group.length - 1].start + 900;
      const end = Math.max(start + 0.8, Math.min((lastEnd - clipStart) / 1000 + 0.35, (clipEnd - clipStart) / 1000));
      chunks.push({ text, start, end });
    }
    return chunks;
  }

  const fallbackText = buildCaptionText(captionLines);
  if (!fallbackText) return [];
  const wordsFromCaption = fallbackText.split(/\s+/).filter(Boolean);
  const duration = Math.max(1, (clipEnd - clipStart) / 1000);
  const chunks = [];
  for (let i = 0; i < wordsFromCaption.length; i += 4) {
    const group = wordsFromCaption.slice(i, i + 4);
    const start = (i / Math.max(wordsFromCaption.length, 1)) * duration;
    const end = Math.min(duration, start + 1.8);
    chunks.push({ text: group.join(' '), start, end });
  }
  return chunks;
}

function escapeFilterPath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:');
}

function drawtextFilterForChunk(chunk, textFilePath) {
  const start = chunk.start.toFixed(2);
  const end = chunk.end.toFixed(2);
  return 'drawtext=textfile=' + escapeFilterPath(textFilePath) +
    getDrawtextFontOption() +
    ':fontcolor=white' +
    ':fontsize=30' +
    ':line_spacing=8' +
    ':box=1' +
    ':boxcolor=black@0.50' +
    ':boxborderw=14' +
    ':x=(w-text_w)/2' +
    ':y=h-text_h-96' +
    ':shadowcolor=black' +
    ':shadowx=2' +
    ':shadowy=2' +
    `:enable=between(t\\,${start}\\,${end})`;
}

function buildVideoFilterScript(captionLines, words, startMs, endMs, requestId) {
  const filters = [
    'scale=480:854:force_original_aspect_ratio=decrease',
    'pad=480:854:(ow-iw)/2:(oh-ih)/2:black',
    'setpts=PTS-STARTPTS'
  ];
  const cleanupPaths = [];

  const chunks = buildCaptionChunks(words, startMs, endMs, captionLines);
  chunks.forEach((chunk, index) => {
    const textFilePath = path.join(DOWNLOAD_DIR, `caption_${requestId}_${index}.txt`);
    fs.writeFileSync(textFilePath, chunk.text, 'utf8');
    cleanupPaths.push(textFilePath);
    filters.push(drawtextFilterForChunk(chunk, textFilePath));
  });
  console.log('Caption chunks:', chunks.length);
  if (chunks.length) console.log('First caption chunk:', chunks[0]);

  const scriptPath = path.join(DOWNLOAD_DIR, `filter_${requestId}.txt`);
  fs.writeFileSync(scriptPath, `[0:v]${filters.join(',')}[v]`, 'utf8');
  cleanupPaths.push(scriptPath);
  return { scriptPath, cleanupPaths };
}

// ─── CUT CLIP ─────────────────────────────────────────────────────────────────
app.post('/api/cut-clip', (req, res) => {
  const { localFileId, startMs, endMs, clipTitle, captionLines, words } = req.body;
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
    const { scriptPath, cleanupPaths } = buildVideoFilterScript(captionLines, words, startMs, endMs, requestId);
    const args = [
      '-y',
      '-ss', startSec,
      '-t', durationSec,
      '-i', inputPath,
      '-filter_complex_script', scriptPath,
      '-map', '[v]',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '30',
      '-tune', 'fastdecode',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-ac', '1',
      '-movflags', '+faststart',
      '-threads', '1',
      outputPath
    ];

    console.log('Cutting clip:', clipTitle);
    console.log('Filter script:', scriptPath);
    execFile(FFMPEG, args, { maxBuffer: 1024 * 1024 * 500, timeout: 300000 }, (err, stdout, stderr) => {
      const cleanupTempFiles = () => cleanupPaths.forEach(p => { try { fs.unlinkSync(p); } catch(e) {} });
      if (err || !fs.existsSync(outputPath)) {
        cleanupTempFiles();
        const lines = (stderr || '').split('\n').filter(l => l.trim());
        const errorLines = lines.filter(l =>
          l.includes('Error') || l.includes('error') ||
          l.includes('Invalid') || l.includes('No such') ||
          l.includes('failed') || l.includes('Cannot')
        );
        const realError = errorLines.length > 0
          ? errorLines.join(' | ').substring(0, 400)
          : (stderr || '').split('\n').slice(-5).join(' | ').substring(0, 400);
        console.error('FFmpeg error:', realError);
        return res.status(500).json({ error: 'Cut failed: ' + realError });
      }

      const stat = fs.statSync(outputPath);
      console.log('✅ Clip cut, size:', stat.size);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
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

// ─── START ────────────────────────────────────────────────────────────────────
setup(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('✅ Clipai backend running on port ' + PORT));
});
