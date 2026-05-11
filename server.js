const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();

// CORS
app.use((req, res, next) => {
  const allowed = (process.env.CORS_ORIGINS || [
    'https://clipai-ten.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ].join(','))
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowed[0] || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-filename,x-requested-with');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const downloader = path.join(__dirname, 'public', 'clipaidownloader.html');
  const index = path.join(__dirname, 'public', 'index.html');

  if (fs.existsSync(downloader)) return res.sendFile(downloader);
  if (fs.existsSync(index)) return res.sendFile(index);

  res.send('ClipAI backend running');
});

const YTDLP = path.join(__dirname, 'yt-dlp');
const FFMPEG = path.join(__dirname, 'ffmpeg');
const COOKIES_FILE = '/tmp/yt-cookies.txt';
const DOWNLOAD_DIR = '/tmp/clipai';
const UPLOAD_DIR = '/tmp/clipai-uploads';

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const BYPASS = '--extractor-args "youtube:player_client=android_embedded,ios,android" --no-warnings --format-sort "ext:mp4:m4a"';

function cookiesArg() {
  return fs.existsSync(COOKIES_FILE) ? `--cookies "${COOKIES_FILE}"` : '';
}

function proxyArg() {
  return process.env.PROXY_URL ? `--proxy "${process.env.PROXY_URL}"` : '';
}

function ytArgs() {
  return `${BYPASS} ${cookiesArg()} ${proxyArg()}`.trim();
}

function safeExt(filename, fallback = '.mp4') {
  const ext = path.extname(filename || '').toLowerCase();
  return ext && ext.length <= 10 ? ext : fallback;
}

function safeLocalId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function downloadFile(url, dest, callback) {
  const file = fs.createWriteStream(dest);
  const protocol = url.startsWith('https') ? https : http;

  protocol.get(url, (response) => {
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      file.close();
      try { fs.unlinkSync(dest); } catch (e) {}
      downloadFile(response.headers.location, dest, callback);
      return;
    }

    if (response.statusCode !== 200) {
      file.close();
      try { fs.unlinkSync(dest); } catch (e) {}
      callback(new Error(`Download failed with status ${response.statusCode}`));
      return;
    }

    response.pipe(file);
    file.on('finish', () => {
      file.close(() => callback(null));
    });
  }).on('error', (err) => {
    try { fs.unlinkSync(dest); } catch (e) {}
    callback(err);
  });
}

function writeYoutubeCookies() {
  if (!process.env.YT_COOKIES) return;

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
        cookieContent += `${domain}\t${flag}\t${c.path || '/'}\t${secure}\t${expiry}\t${c.name}\t${c.value}\n`;
      });
    } else {
      cookieContent = raw;
    }

    fs.writeFileSync(COOKIES_FILE, cookieContent);
    console.log('YouTube cookies written');
  } catch (e) {
    console.error('Cookie conversion failed:', e.message);
  }
}

function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
    return true;
  } catch (e) {
    console.error(`chmod failed for ${filePath}:`, e.message);
    return false;
  }
}

function setup(callback) {
  callback();
  writeYoutubeCookies();

  if (fs.existsSync(YTDLP)) {
    try { fs.unlinkSync(YTDLP); } catch (e) {}
  }

  console.log('Downloading yt-dlp...');
  downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux', YTDLP, (err) => {
    if (err) {
      console.error('yt-dlp download failed:', err.message);
      return;
    }

    if (makeExecutable(YTDLP)) console.log('yt-dlp ready');
  });

  if (!fs.existsSync(FFMPEG)) {
    console.log('Downloading ffmpeg...');
    downloadFile('https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64', FFMPEG, (err) => {
      if (err) {
        console.error('ffmpeg download failed:', err.message);
        return;
      }

      if (makeExecutable(FFMPEG)) console.log('ffmpeg ready');
    });
  } else {
    makeExecutable(FFMPEG);
    console.log('ffmpeg already exists');
  }
}

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

    const request = protocol.request(reqOptions, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function waitForExecutable(filePath, timeout = 90000) {
  return new Promise((resolve) => {
    let waited = 0;

    const check = () => {
      try {
        fs.accessSync(filePath, fs.constants.X_OK);
        return resolve(true);
      } catch (e) {
        waited += 2000;
        if (waited >= timeout) return resolve(false);
        setTimeout(check, 2000);
      }
    };

    check();
  });
}

function waitForFile(filePath, timeout = 90000) {
  return new Promise((resolve) => {
    if (fs.existsSync(filePath)) return resolve(true);

    let waited = 0;
    const interval = setInterval(() => {
      waited += 2000;

      if (fs.existsSync(filePath)) {
        clearInterval(interval);
        resolve(true);
      } else if (waited >= timeout) {
        clearInterval(interval);
        resolve(false);
      }
    }, 2000);
  });
}

app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: 'No URL provided' });

  const ready = await waitForExecutable(YTDLP);
  if (!ready) return res.status(503).json({ message: 'yt-dlp is not ready yet. Try again shortly.' });

  const cmd = `"${YTDLP}" ${ytArgs()} --no-playlist -f "bestaudio/best" --print "%(title)s|||%(duration_string)s|||%(id)s" "${url}"`;

  exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
    if (err || !stdout.trim()) {
      return res.status(500).json({
        message: 'Could not fetch video info',
        error: (stderr || err?.message || '').substring(0, 500)
      });
    }

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

app.get('/api/test-yt', async (req, res) => {
  const ready = await waitForExecutable(YTDLP);
  if (!ready) {
    return res.status(503).json({
      proxy_configured: process.env.PROXY_URL || 'NO PROXY SET',
      success: false,
      stdout: '',
      stderr: '',
      error: 'yt-dlp is not executable yet. Try again after Render finishes startup.'
    });
  }

  const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  const proxy = process.env.PROXY_URL || 'NO PROXY SET';
  const cmd = `"${YTDLP}" ${ytArgs()} --print "%(title)s" "${testUrl}"`;

  exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
    res.json({
      proxy_configured: proxy,
      success: !err && !!stdout.trim(),
      stdout: (stdout || '').trim(),
      stderr: (stderr || '').substring(0, 500),
      error: err ? err.message : null
    });
  });
});

app.get('/api/download', async (req, res) => {
  const { url, format, quality } = req.query;
  if (!url) return res.status(400).send('No URL');

  const ytdlpReady = await waitForExecutable(YTDLP);
  const ffmpegReady = await waitForExecutable(FFMPEG);
  if (!ytdlpReady || !ffmpegReady) {
    return res.status(503).json({ message: 'Server tools still starting. Try again shortly.' });
  }

  const filename = `clipai_${Date.now()}`;
  let outputPath;
  let cmd;
  let dlFilename;
  let contentType;

  if (format === 'mp3') {
    const bitrate = quality ? String(quality).replace(' kbps', '') : '192';
    outputPath = path.join(DOWNLOAD_DIR, filename + '.mp3');
    dlFilename = 'audio.mp3';
    contentType = 'audio/mpeg';
    cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -x --audio-format mp3 --audio-quality ${bitrate}K -o "${outputPath}" "${url}"`;
  } else {
    const heights = { '480p': 480, '720p': 720, '1080p': 1080, '4K': 2160 };
    const h = heights[quality] || 720;
    outputPath = path.join(DOWNLOAD_DIR, filename + '.mp4');
    dlFilename = 'video.mp4';
    contentType = 'video/mp4';
    cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${h}][ext=mp4]/best[height<=${h}]" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
  }

  exec(cmd, { maxBuffer: 1024 * 1024 * 100, timeout: 600000 }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ message: 'Conversion failed', error: (stderr || '').substring(0, 1000) });
    if (!fs.existsSync(outputPath)) return res.status(500).json({ message: 'File not created' });

    const stat = fs.statSync(outputPath);
    res.setHeader('Content-Disposition', `attachment; filename="${dlFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('close', () => {
      setTimeout(() => {
        try { fs.unlinkSync(outputPath); } catch (e) {}
      }, 5000);
    });
  });
});

app.post('/api/youtube-upload', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const ytdlpReady = await waitForExecutable(YTDLP);
  const ffmpegReady = await waitForExecutable(FFMPEG);
  if (!ytdlpReady || !ffmpegReady) {
    return res.status(503).json({ error: 'Server tools still starting. Try again shortly.' });
  }

  const localFileId = safeLocalId('yt');
  const outputPath = path.join(UPLOAD_DIR, localFileId + '.mp4');
  const cmd = `"${YTDLP}" ${ytArgs()} --ffmpeg-location "${FFMPEG}" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 200, timeout: 600000 }, async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: 'YouTube download failed: ' + (stderr || err.message).substring(0, 500) });
    }

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Downloaded file not found' });
    }

    const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
    if (!ASSEMBLYAI_KEY) {
      return res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload/${localFileId}` });
    }

    try {
      const fileData = fs.readFileSync(outputPath);
      const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          authorization: ASSEMBLYAI_KEY,
          'content-type': 'application/octet-stream'
        },
        body: fileData
      });

      const uploadData = JSON.parse(uploadRes);
      if (!uploadData.upload_url) throw new Error(uploadData.error || 'AssemblyAI upload failed');

      res.json({ localFileId, uploadUrl: uploadData.upload_url });
    } catch (uploadErr) {
      console.error('AssemblyAI upload error:', uploadErr.message);
      res.json({ localFileId, uploadUrl: `https://${req.headers.host}/api/serve-upload/${localFileId}` });
    }
  });
});

app.get('/api/serve-upload/:id', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.params.id) + '.mp4');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
});

app.post('/api/upload-local', async (req, res) => {
  const filename = decodeURIComponent(req.headers['x-filename'] || 'upload.mp4');
  const localFileId = safeLocalId('upload');
  const ext = safeExt(filename, '.mp4');
  const outputPath = path.join(UPLOAD_DIR, localFileId + ext);

  const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 500 * 1024 * 1024);
  let received = 0;
  let tooLarge = false;

  const writeStream = fs.createWriteStream(outputPath);

  req.on('data', chunk => {
    received += chunk.length;
    if (received > maxBytes && !tooLarge) {
      tooLarge = true;
      writeStream.destroy();
      try { fs.unlinkSync(outputPath); } catch (e) {}
      res.status(413).json({ error: 'File too large' });
      req.destroy();
    }
  });

  req.pipe(writeStream);

  writeStream.on('finish', async () => {
    if (tooLarge || res.headersSent) return;

    const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;
    if (!ASSEMBLYAI_KEY) {
      return res.json({
        localFileId,
        uploadUrl: `https://${req.headers.host}/api/serve-upload-raw/${localFileId}${ext}`
      });
    }

    try {
      const fileData = fs.readFileSync(outputPath);
      const uploadRes = await fetchWithBuffer('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          authorization: ASSEMBLYAI_KEY,
          'content-type': 'application/octet-stream'
        },
        body: fileData
      });

      const uploadData = JSON.parse(uploadRes);
      if (!uploadData.upload_url) throw new Error(uploadData.error || 'AssemblyAI upload failed');

      res.json({ localFileId, uploadUrl: uploadData.upload_url });
    } catch (err) {
      console.error('AssemblyAI upload error:', err.message);
      res.json({
        localFileId,
        uploadUrl: `https://${req.headers.host}/api/serve-upload-raw/${localFileId}${ext}`
      });
    }
  });

  writeStream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to save file' });
  });
});

app.get('/api/serve-upload-raw/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(filePath).pipe(res);
});

app.post('/api/cut-clip', async (req, res) => {
  const { localFileId, startMs, endMs, clipTitle } = req.body;
  if (!localFileId) return res.status(400).json({ error: 'localFileId required' });

  const ffmpegReady = await waitForExecutable(FFMPEG);
  if (!ffmpegReady) return res.status(503).json({ error: 'ffmpeg is not ready yet. Try again shortly.' });

  const files = fs.readdirSync(UPLOAD_DIR);
  const safeId = path.basename(localFileId);
  const match = files.find(f => f.startsWith(safeId));
  if (!match) return res.status(404).json({ error: 'Source file not found. Please re-upload.' });

  const inputPath = path.join(UPLOAD_DIR, match);
  const outputPath = path.join(DOWNLOAD_DIR, `clip_${Date.now()}.mp4`);

  const start = Math.max(0, Number(startMs || 0));
  const end = Math.max(start + 1000, Number(endMs || start + 45000));
  const startSec = (start / 1000).toFixed(3);
  const durationSec = Math.min(90, Math.max(1, (end - start) / 1000)).toFixed(3);

  const cmd = `"${FFMPEG}" -y -ss ${startSec} -t ${durationSec} -i "${inputPath}" ` +
    `-vf "scale=480:854:force_original_aspect_ratio=decrease,pad=480:854:(ow-iw)/2:(oh-ih)/2:black" ` +
    `-c:v libx264 -preset ultrafast -crf 30 -tune fastdecode ` +
    `-c:a aac -b:a 64k -ac 1 ` +
    `-movflags +faststart -threads 1 ` +
    `"${outputPath}"`;

  console.log('Cutting clip:', clipTitle || 'Untitled clip');

  exec(cmd, { maxBuffer: 1024 * 1024 * 500, timeout: 300000 }, (err, stdout, stderr) => {
    if (err || !fs.existsSync(outputPath)) {
      const lines = (stderr || '').split('\n').filter(l => l.trim());
      const errorLines = lines.filter(l =>
        l.includes('Error') ||
        l.includes('error') ||
        l.includes('Invalid') ||
        l.includes('No such') ||
        l.includes('failed') ||
        l.includes('Cannot')
      );

      const realError = errorLines.length > 0
        ? errorLines.join(' | ').substring(0, 500)
        : (stderr || err?.message || '').split('\n').slice(-5).join(' | ').substring(0, 500);

      console.error('FFmpeg error:', realError);
      return res.status(500).json({ error: 'Cut failed: ' + realError });
    }

    const stat = fs.statSync(outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on('close', () => {
      setTimeout(() => {
        try { fs.unlinkSync(outputPath); } catch (e) {}
      }, 5000);
    });
  });
});

setup(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('ClipAI backend running on port ' + PORT));
});
