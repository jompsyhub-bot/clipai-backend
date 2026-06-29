<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>ClipAI — Turn Long Videos Into Viral Clips</title>
  <meta name="description" content="Upload any podcast, Zoom, or YouTube recording. AI transcribes it, finds the best moments, and generates ready-to-post short clips." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>

    :root {
      --bg: #080810;
      --bg2: #0d0c1a;
      --bg3: #11101e;
      --bg4: #161528;
      --border: rgba(255,255,255,0.07);
      --border2: rgba(255,255,255,0.12);
      --accent: #7c6af7;
      --accent2: #a394ff;
      --accent-dim: rgba(124,106,247,0.15);
      --text: #e8e6f5;
      --text2: #8b88b5;
      --text3: #4a4870;
      --green: #3ecf8e;
      --red: #f06464;
      --amber: #f0a832;
      --font: 'Syne', sans-serif;
      --mono: 'DM Mono', monospace;
      --r: 12px;
      --r2: 16px;
    }
    body.light {
      --bg: #f7f7fb;
      --bg2: #ffffff;
      --bg3: #f0f1f7;
      --bg4: #e6e8f2;
      --border: rgba(20,24,40,0.09);
      --border2: rgba(20,24,40,0.16);
      --accent: #6254d9;
      --accent2: #574bd0;
      --accent-dim: rgba(98,84,217,0.12);
      --text: #151622;
      --text2: #52566f;
      --text3: #7a7f98;
      --green: #178a5d;
      --red: #c73c3c;
      --amber: #b97408;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      scroll-behavior: smooth;
    }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      width: 100%;
      max-width: 100%;
      min-height: 100vh;
      min-height: 100dvh;
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
    }
    img, video, canvas, svg { max-width: 100%; }
    input, textarea, select, button { max-width: 100%; }

    /* ── NAV ── */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 28px;
      padding-top: max(14px, env(safe-area-inset-top));
      border-bottom: 1px solid var(--border);
      background: rgba(8,8,16,0.9);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    body.light nav { background: rgba(255,255,255,0.88); }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: -1px; color: #fff; flex: 0 0 auto; }
    body.light .logo { color: var(--text); }
    .logo span { color: var(--accent); }
    .nav-tools {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
    }
    .nav-action {
      font-family: var(--font);
      font-size: 13px;
      font-weight: 600;
      color: var(--text2);
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: 8px;
      padding: 7px 12px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .nav-action:hover { color: var(--text); border-color: rgba(124,106,247,0.45); }
    .nav-action.primary { color: #fff; background: var(--accent); border-color: var(--accent); }
    .nav-action.hidden { display: none; }
    #nav-auth {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    /* ── HERO ── */
    .hero {
      text-align: center;
      padding: 72px 24px 56px;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -120px; left: 50%;
      transform: translateX(-50%);
      width: 600px; height: 400px;
      background: radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-eyebrow {
      font-family: var(--mono);
      font-size: 12px;
      color: var(--accent);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 20px;
      display: inline-block;
      border: 1px solid rgba(124,106,247,0.25);
      padding: 5px 14px;
      border-radius: 20px;
      background: var(--accent-dim);
    }
    .hero h1 {
      font-size: clamp(32px, 5vw, 56px);
      font-weight: 800;
      letter-spacing: -2px;
      line-height: 1.1;
      color: #fff;
      margin-bottom: 16px;
    }
    .hero h1 em { font-style: normal; color: var(--accent); }
    .hero p {
      font-size: 17px;
      color: var(--text2);
      max-width: 500px;
      margin: 0 auto 40px;
      line-height: 1.65;
    }
    .flow-steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      flex-wrap: wrap;
      margin-bottom: 48px;
    }
    .flow-step {
      font-size: 12px;
      color: var(--text3);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .flow-step .fs-icon {
      width: 28px; height: 28px;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
    }
    .flow-step .fs-label { font-size: 11px; }
    .flow-arrow { color: var(--text3); margin: 0 8px; font-size: 12px; }

    /* ── APP SHELL ── */
    .app-shell {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 0 20px 80px;
      overflow: hidden;
    }

    /* ── STAGE TABS ── */
    .stages {
      display: flex;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 6px;
      gap: 4px;
      margin-bottom: 24px;
    }
    .stage-btn {
      flex: 1;
      padding: 10px 6px;
      font-family: var(--font);
      font-size: 13px;
      font-weight: 500;
      color: var(--text3);
      background: transparent;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      white-space: nowrap;
    }
    .stage-btn:hover { color: var(--text2); background: var(--bg3); }
    .stage-btn.active { color: var(--accent2); background: var(--accent-dim); }
    .stage-btn.done { color: var(--green); }
    .stage-btn .snum {
      width: 20px; height: 20px;
      border-radius: 50%;
      background: var(--bg4);
      border: 1px solid var(--border2);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px;
      font-family: var(--mono);
    }
    .stage-btn.active .snum { background: var(--accent); border-color: var(--accent); color: #fff; }
    .stage-btn.done .snum { background: rgba(62,207,142,0.2); border-color: var(--green); color: var(--green); }
    .stage-btn.locked { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
    .stage-btn.locked .snum::after { content: '🔒'; font-size: 9px; }

    /* ── PANELS ── */
    .panel { display: none; animation: fadeIn 0.25s ease; }
    .panel.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

    /* ── CARDS ── */
    .card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 24px;
      margin-bottom: 16px;
    }
    .card-title {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--text3);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    /* ── UPLOAD ── */
    .upload-zone {
      border: 1.5px dashed var(--border2);
      border-radius: var(--r2);
      padding: 60px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s;
      background: var(--bg3);
      position: relative;
      overflow: hidden;
    }
    .upload-zone.drag { border-color: var(--accent); background: var(--accent-dim); }
    .upload-zone:hover { border-color: rgba(124,106,247,0.5); background: rgba(124,106,247,0.05); }
    .upload-icon-wrap {
      width: 60px; height: 60px;
      background: var(--bg4);
      border: 1px solid var(--border2);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 18px;
      font-size: 26px;
      transition: transform 0.2s;
    }
    .upload-zone:hover .upload-icon-wrap { transform: scale(1.05); }
    .upload-zone h3 { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .upload-zone p { font-size: 14px; color: var(--text2); }
    .upload-zone p a { color: var(--accent); cursor: pointer; }
    #file-input { display: none; }
    .formats {
      display: flex; gap: 8px; justify-content: center;
      flex-wrap: wrap; margin-top: 20px;
    }
    .fmt {
      font-family: var(--mono);
      font-size: 11px;
      padding: 3px 10px;
      background: var(--bg4);
      border: 1px solid var(--border);
      color: var(--text3);
      border-radius: 6px;
    }

    /* OR divider */
    .or-divider {
      display: flex; align-items: center; gap: 12px;
      margin: 20px 0; color: var(--text3); font-size: 12px;
    }
    .or-divider::before, .or-divider::after {
      content: ''; flex: 1;
      height: 1px; background: var(--border);
    }

    /* URL input row */
    .url-row { display: flex; gap: 10px; }
    .url-input {
      flex: 1;
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: var(--r);
      padding: 12px 16px;
      font-family: var(--font);
      font-size: 14px;
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }
    .url-input:focus { border-color: var(--accent); }
    .url-input::placeholder { color: var(--text3); }

    /* ── BUTTONS ── */
    .btn {
      font-family: var(--font);
      font-size: 14px;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: var(--r);
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: #9080ff; transform: translateY(-1px); }
    .btn-primary:active { transform: none; }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    .btn-ghost {
      background: transparent;
      color: var(--accent2);
      border: 1px solid rgba(124,106,247,0.3);
    }
    .btn-ghost:hover { background: var(--accent-dim); }
    .btn-full { width: 100%; justify-content: center; }

    /* ── PROGRESS ── */
    .progress-wrap { margin: 20px 0; }
    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      font-size: 13px;
      color: var(--text2);
      margin-bottom: 8px;
    }
    .progress-label > span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .progress-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      flex: 0 0 auto;
    }
    .progress-bar {
      height: 4px;
      background: var(--bg4);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 4px;
      transition: width 0.6s ease;
    }
    .progress-steps {
      display: flex; flex-direction: column; gap: 6px; margin-top: 14px;
    }
    .p-step {
      display: flex; align-items: center; gap: 10px;
      font-size: 13px; color: var(--text3);
    }
    .p-step.done { color: var(--green); }
    .p-step.active { color: var(--text2); }
    .p-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--bg4); border: 1px solid var(--border2);
      flex-shrink: 0;
    }
    .p-step.done .p-dot { background: var(--green); border-color: var(--green); }
    .p-step.active .p-dot { background: var(--accent); border-color: var(--accent); animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* ── STATS ROW ── */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
      text-align: center;
    }
    .stat-val { font-size: 22px; font-weight: 700; color: var(--accent2); }
    .stat-label { font-size: 11px; font-family: var(--mono); color: var(--text3); margin-top: 3px; }

    /* ── TRANSCRIPT ── */
    .transcript-box {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 18px;
      max-height: 260px;
      overflow-y: auto;
      font-family: var(--mono);
      font-size: 13px;
      line-height: 1.8;
      color: var(--text2);
    }
    .transcript-box::-webkit-scrollbar { width: 4px; }
    .transcript-box::-webkit-scrollbar-track { background: transparent; }
    .transcript-box::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
    .t-speaker { color: var(--accent); font-weight: 500; display: block; margin-top: 14px; }
    .t-speaker:first-child { margin-top: 0; }

    /* ── MOMENTS ── */
    .moments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .moment-card {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
      cursor: pointer;
      transition: all 0.18s;
    }
    .moment-card:hover { border-color: rgba(124,106,247,0.4); }
    .moment-card.sel { border-color: var(--accent); background: var(--accent-dim); }
    .moment-time {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .moment-text { font-size: 13px; color: var(--text2); line-height: 1.5; }
    .moment-bar { height: 2px; background: var(--bg4); border-radius: 2px; margin-top: 10px; overflow: hidden; }
    .moment-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; }

    /* ── AI INPUT ── */
    .ai-row { display: flex; gap: 8px; margin-top: 16px; }
    .ai-input {
      flex: 1;
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: var(--r);
      padding: 11px 16px;
      font-family: var(--font);
      font-size: 14px;
      color: var(--text);
      outline: none;
      transition: border-color 0.2s;
    }
    .ai-input:focus { border-color: var(--accent); }
    .ai-input::placeholder { color: var(--text3); }
    .ai-output {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 16px;
      font-size: 14px;
      color: var(--text2);
      line-height: 1.7;
      margin-top: 12px;
      white-space: pre-wrap;
      display: none;
    }

    /* Ghost Editor */
    .ghost-card {
      border-color: rgba(124,106,247,0.28);
      background:
        linear-gradient(135deg, rgba(124,106,247,0.12), transparent 42%),
        var(--bg2);
    }
    .ghost-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
    }
    .ghost-title { font-size: 20px; font-weight: 800; color: var(--text); line-height: 1.2; }
    .ghost-sub { font-size: 13px; color: var(--text2); margin-top: 5px; max-width: 540px; }
    .ghost-badge {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--accent2);
      border: 1px solid rgba(124,106,247,0.32);
      background: var(--accent-dim);
      padding: 4px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .ghost-input {
      width: 100%;
      min-height: 92px;
      resize: vertical;
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: var(--r);
      padding: 14px 16px;
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      line-height: 1.55;
      outline: none;
    }
    .ghost-input:focus { border-color: var(--accent); }
    .ghost-examples { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }
    .ghost-chip {
      border: 1px solid var(--border2);
      background: var(--bg3);
      color: var(--text2);
      border-radius: 999px;
      padding: 7px 10px;
      font-family: var(--font);
      font-size: 12px;
      cursor: pointer;
    }
    .ghost-chip:hover { color: var(--text); border-color: rgba(124,106,247,0.45); }
    .ghost-status {
      display: none;
      margin-top: 14px;
      padding: 14px;
      border-radius: var(--r);
      border: 1px solid var(--border);
      background: var(--bg3);
      color: var(--text2);
      font-size: 13px;
      line-height: 1.65;
    }
    .ghost-status.show { display: block; }
    .ghost-plan {
      margin-top: 12px;
      display: grid;
      gap: 8px;
    }
    .ghost-plan-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid var(--border);
      padding-top: 8px;
    }
    .ghost-plan-row strong { color: var(--text); font-size: 13px; }
    .ghost-plan-row span { color: var(--text3); font-family: var(--mono); font-size: 11px; white-space: nowrap; }

    /* Hook Lab */
    .hook-lab-card {
      border-color: rgba(240,168,50,0.24);
      background:
        linear-gradient(135deg, rgba(240,168,50,0.10), transparent 46%),
        var(--bg2);
      min-width: 0;
      max-width: 100%;
      overflow-x: hidden;
    }
    .hook-lab-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }
    .hook-lab-title { font-size: 18px; font-weight: 800; color: var(--text); line-height: 1.25; }
    .hook-lab-sub { color: var(--text2); font-size: 13px; margin-top: 4px; max-width: 620px; }
    .hook-lab-benefits {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      margin: 12px 0 14px;
    }
    .hook-benefit {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 9px 10px;
      color: var(--text2);
      font-size: 12px;
      line-height: 1.4;
    }
    .hook-benefit strong { display: block; color: var(--text); font-size: 12px; margin-bottom: 2px; }
    .hook-lab-output {
      display: none;
      margin-top: 14px;
      gap: 10px;
    }
    .hook-lab-output.show { display: grid; }
    .hook-lab-output {
      display: none;
      margin-top: 14px;
      gap: 10px;
    }
    .hook-lab-output.show { display: grid; }
    .hook-variant {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
    }
    .hook-variant-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .hook-type {
      font-family: var(--mono);
      font-size: 10px;
      color: var(--amber);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .hook-score {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--text3);
      white-space: nowrap;
    }
    .hook-line { font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.35; margin-bottom: 8px; }
    .hook-applied {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--green);
      font-family: var(--mono);
      font-size: 10px;
      margin-top: 8px;
    }
    .hook-note { color: var(--text2); font-size: 12px; line-height: 1.55; margin-bottom: 10px; }
    .hook-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .hook-mini-btn {
      border: 1px solid rgba(240,168,50,0.34);
      color: var(--amber);
      background: transparent;
      border-radius: 8px;
      padding: 6px 10px;
      font-family: var(--font);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    .hook-mini-btn:hover { background: rgba(240,168,50,0.10); }

    /* Viral Memory */
    .memory-card {
      border-color: rgba(62,207,142,0.24);
      background:
        linear-gradient(135deg, rgba(62,207,142,0.10), transparent 45%),
        var(--bg2);
    }
    .memory-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 12px;
    }
    .memory-title { font-size: 18px; font-weight: 800; color: var(--text); line-height: 1.25; }
    .memory-sub { color: var(--text2); font-size: 13px; margin-top: 4px; max-width: 620px; }
    .memory-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin: 12px 0;
    }
    .memory-stat {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
    }
    .memory-stat strong { display:block; color:var(--text); font-size:17px; line-height:1; }
    .memory-stat span { color:var(--text3); font-family:var(--mono); font-size:10px; text-transform:uppercase; }
    .memory-form {
      display: grid;
      grid-template-columns: 1.3fr repeat(4, minmax(76px, 1fr));
      gap: 8px;
      margin-top: 12px;
    }
    .memory-form input,
    .memory-form select {
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: 8px;
      color: var(--text);
      padding: 10px 11px;
      min-width: 0;
      font-family: var(--font);
      font-size: 12px;
      outline: none;
    }
    .memory-form input:focus,
    .memory-form select:focus { border-color: var(--green); }
    .memory-output {
      display: none;
      margin-top: 14px;
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 14px;
      color: var(--text2);
      font-size: 13px;
      line-height: 1.65;
    }
    .memory-output.show { display:block; }
    .memory-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid rgba(62,207,142,0.28);
      color: var(--green);
      background: rgba(62,207,142,0.08);
      border-radius: 999px;
      padding: 4px 8px;
      font-family: var(--mono);
      font-size: 10px;
      margin-top: 8px;
    }
    @media (max-width: 720px) {
      .memory-form { grid-template-columns: 1fr 1fr; }
      .memory-form input:first-child { grid-column: 1 / -1; }
    }

    /* ── CLIPS ── */
    .clips-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
    }
    .clip-card {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
    }
    .clip-card:hover { border-color: rgba(124,106,247,0.45); transform: translateY(-2px); }
    .clip-card.sel { border-color: var(--accent); }
    .clip-thumb {
      aspect-ratio: 9/16;
      background: linear-gradient(170deg, #161528 0%, #0d0c1a 100%);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      position: relative;
    }
    .clip-play {
      width: 40px; height: 40px;
      background: rgba(124,106,247,0.85);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
      color: #fff;
    }
    .clip-dur {
      position: absolute; bottom: 8px; right: 8px;
      font-family: var(--mono); font-size: 11px;
      background: rgba(0,0,0,0.7); color: var(--accent2);
      padding: 2px 8px; border-radius: 5px;
    }
    .clip-energy {
      position: absolute; top: 8px; left: 8px;
      font-size: 10px; font-family: var(--mono);
      padding: 2px 8px; border-radius: 20px;
    }
    .energy-high { background: rgba(240,100,100,0.25); color: #f09090; }
    .energy-medium { background: rgba(240,168,50,0.2); color: #f0c060; }
    .energy-calm { background: rgba(62,207,142,0.2); color: #70dfa0; }
    .clip-info { padding: 14px; }
    .clip-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .clip-sub { font-size: 12px; color: var(--text3); margin-bottom: 8px; }
    .clip-why { font-size: 12px; color: var(--text2); line-height: 1.5; margin-bottom: 8px; }
    .clip-platforms { display: flex; gap: 5px; flex-wrap: wrap; }
    .plat-tag {
      font-size: 10px; font-family: var(--mono);
      background: var(--bg4); border: 1px solid var(--border);
      color: var(--text3); padding: 2px 7px; border-radius: 5px;
    }
    .clip-captions { margin-top: 8px; }
    .cap-line { font-size: 11px; color: var(--text3); font-style: italic; line-height: 1.5; }
    
      /* ── CLIP PREVIEW ── */
    .clip-preview-wrap {
      aspect-ratio: 9/16;
      background: #050507;
      position: relative;
      overflow: hidden;
    }

    .clip-preview-video,
    .clip-caption-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .clip-preview-video {
      object-fit: cover;
      background: #050507;
    }

    .clip-caption-canvas {
      pointer-events: none;
      z-index: 3;
    }

    .preview-play {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%,-50%);
      z-index: 4;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.35);
      background: rgba(8,8,16,0.72);
      color: #fff;
      cursor: pointer;
      font-size: 16px;
    }

    .caption-presets {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }

    .caption-preset {
      background: var(--bg3);
      border: 1px solid var(--border);
      color: var(--text2);
      border-radius: var(--r);
      padding: 10px 12px;
      cursor: pointer;
      font-family: var(--font);
      font-size: 13px;
    }

    .caption-preset.active {
      border-color: var(--accent);
      color: #fff;
      background: var(--accent-dim);
    }

    /* ── EXPORT ── */
    .export-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .export-card {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 20px 14px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .export-card:hover { border-color: rgba(124,106,247,0.4); background: var(--accent-dim); }
    .ex-icon { font-size: 26px; margin-bottom: 10px; display: block; }
    .ex-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .ex-sub { font-size: 11px; color: var(--text3); font-family: var(--mono); }

    /* ── TOAST ── */
    #toast {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
      background: var(--bg2); border: 1px solid var(--border2);
      color: var(--text); padding: 12px 24px;
      border-radius: 30px; font-size: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      z-index: 999; opacity: 0; pointer-events: none;
      transition: opacity 0.3s;
    }
    #toast.show { opacity: 1; }

    /* ── LOADING SPINNER ── */
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--border2);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── ACTION ROW ── */
    .action-row { display: flex; gap: 10px; margin-top: 16px; }

    /* ── MODE CHOOSER + COMPILATION STUDIO ── */
    .mode-chooser {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }
    .mode-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 18px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-card:hover,
    .mode-card.active {
      border-color: rgba(124,106,247,0.65);
      background: var(--accent-dim);
      transform: translateY(-1px);
    }
    .mode-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .mode-icon {
      width: 38px; height: 38px; border-radius: 12px;
      background: var(--bg4); border: 1px solid var(--border2);
      display: flex; align-items: center; justify-content: center;
      color: var(--accent); font-family: var(--mono); font-size: 13px;
    }
    .mode-badge {
      font-family: var(--mono); font-size: 10px; color: var(--green);
      background: rgba(63, 212, 146, 0.12); border: 1px solid rgba(63, 212, 146, 0.22);
      border-radius: 999px; padding: 4px 8px;
    }
    .mode-title { color: var(--text); font-weight: 800; font-size: 16px; margin-bottom: 6px; }
    .mode-sub { color: var(--text2); font-size: 13px; line-height: 1.55; }
    .compilation-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
      gap: 16px;
    }
    .compilation-links {
      width: 100%; min-height: 180px; resize: vertical;
      background: var(--bg3); border: 1px solid var(--border2);
      color: var(--text); border-radius: var(--r2);
      padding: 14px; font-family: var(--mono); font-size: 13px; line-height: 1.6;
      outline: none;
    }
    .compilation-links:focus { border-color: var(--accent); }
    .compilation-options { display: grid; gap: 10px; }
    .compilation-options label { font-size: 12px; color: var(--text3); font-family: var(--mono); }
    .compilation-options select,
    .compilation-options input {
      width: 100%; background: var(--bg3); color: var(--text);
      border: 1px solid var(--border2); border-radius: 10px;
      padding: 11px 12px; font-family: var(--font); outline: none;
    }
    .compilation-status {
      display: none; margin-top: 14px; padding: 14px;
      background: var(--bg3); border: 1px solid var(--border);
      border-radius: var(--r2); color: var(--text2); font-size: 13px; line-height: 1.7;
    }
    .compilation-status.show { display: block; }
    .compilation-plan { display: grid; gap: 10px; margin-top: 12px; }
    .compilation-segment {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 12px; padding: 12px;
    }
    .compilation-segment strong { color: var(--text); display: block; margin-bottom: 4px; }
    .compilation-segment span { color: var(--text3); font-size: 12px; font-family: var(--mono); }

    /* ── RESPONSIVE ── */
    @media (max-width: 600px) {
      body { min-width: 0; }
      .mode-chooser,
      .compilation-grid { grid-template-columns: 1fr; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .clips-grid { grid-template-columns: 1fr; }
      nav {
        padding: 10px 12px;
        padding-top: max(10px, env(safe-area-inset-top));
        align-items: center;
        gap: 8px;
      }
      .logo { font-size: 18px; line-height: 1; min-height: 34px; display:flex; align-items:center; }
      .nav-tools { gap: 6px; max-width: calc(100% - 82px); flex-wrap: wrap; justify-content:flex-end; }
      .nav-action { font-size: 11px; padding: 6px 8px; border-radius: 7px; line-height: 1.1; }
      .hero { padding: 34px 14px 28px; }
      .stage-btn span.stage-label { display: none; }
      .app-shell { padding: 14px 12px 64px; }
      .card { padding: 16px; border-radius: 14px; }
      .upload-zone { padding: 38px 16px; }
      .url-row,
      .ai-row,
      .action-row,
      .hook-actions { flex-direction: column; }
      .url-row .btn,
      .ai-row .btn,
      .action-row .btn { width: 100%; justify-content: center; }
      .progress-label {
        flex-direction: column;
        align-items: stretch;
      }
      .progress-actions {
        width: 100%;
        justify-content: space-between;
        gap: 10px;
      }
      #cancel-upload-btn {
        min-height: 36px;
        padding: 7px 12px !important;
        white-space: nowrap;
      }
    }

/* CAPTION PRESETS */
.caption-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.preset-btn { background: var(--bg3); border: 2px solid var(--border); border-radius: 10px; padding: 10px 8px; cursor: pointer; transition: all 0.2s; text-align: center; }
.preset-btn:hover { border-color: var(--accent); }
.preset-btn.active { border-color: var(--accent); background: var(--accent-dim); }
.preset-preview { height: 36px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; font-size: 11px; font-weight: bold; overflow: hidden; }
.preset-name { font-size: 11px; color: var(--text2); font-family: var(--mono); }
/* PREVIEW MODAL */
.preview-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 500; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
.preview-modal.open { display: flex; }
.preview-inner { background: var(--bg2); border: 1px solid var(--border2); border-radius: 20px; padding: 24px; max-width: 380px; width: 90%; position: relative; }
.preview-close { position: absolute; top: 16px; right: 16px; background: var(--bg3); border: none; color: var(--text2); width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.preview-phone { width: 180px; height: 320px; background: #000; border-radius: 24px; border: 3px solid #333; margin: 0 auto 16px; overflow: hidden; position: relative; }
.preview-canvas { width: 100%; height: 100%; display: block; }
.preview-controls { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
.preview-btn { background: var(--bg3); border: 1px solid var(--border2); color: var(--text2); padding: 8px 16px; border-radius: 8px; font-family: var(--font); font-size: 13px; cursor: pointer; }
.preview-btn:hover { background: var(--accent-dim); color: var(--accent2); }
    .caption-studio {
      display: grid;
      gap: 16px;
    }
    .caption-control-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .caption-control {
      background: var(--bg3);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 12px;
    }
    .caption-control label {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      font-size: 12px;
      color: var(--text2);
      margin-bottom: 10px;
    }
    .caption-control strong {
      color: var(--text);
      font-size: 12px;
      font-family: var(--mono);
      font-weight: 500;
    }
    .caption-control input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
    }
    .caption-mini-preview {
      min-height: 96px;
      background: #08080d;
      border: 1px solid var(--border2);
      border-radius: var(--r);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      overflow: hidden;
    }
    .caption-mini-text {
      color: #fff;
      text-align: center;
      line-height: 1.2;
      max-width: 92%;
      text-shadow: 2px 2px 0 #000;
    }
    #p3 > .card > .card:first-child {
      display: none;
    }
    @media (max-width: 600px) {
      .caption-control-grid { grid-template-columns: 1fr; }
    }

  
    /* Screen fit fixes */
    .app-shell { padding-top: 18px; }
    .mode-card, .card, .panel, #compilation-studio { min-width: 0; }
    .mode-title, .mode-sub, .card-title { overflow-wrap: anywhere; }
    #compilation-studio { width: 100%; }
    @media (max-width: 420px) {
      .mode-card { padding: 15px; }
      .mode-top { align-items: flex-start; }
      .mode-badge { white-space: normal; text-align: right; }
      .stages { position: sticky; top: 55px; z-index: 40; }
    }
  
    /* Post-login workspace choice */
    body.awaiting-choice .hero { display: none; }
    body.awaiting-choice .app-shell {
      min-height: calc(100dvh - 68px);
      display: grid;
      place-items: center;
      padding: max(28px, env(safe-area-inset-top)) 16px max(36px, env(safe-area-inset-bottom));
    }
    body.awaiting-choice #mode-chooser {
      display: grid;
      width: min(920px, 100%);
      margin: 0 auto;
    }
    body.awaiting-choice #mode-chooser::before {
      content: "Choose your workspace";
      grid-column: 1 / -1;
      color: var(--text);
      font-size: clamp(28px, 7vw, 52px);
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.05em;
      text-align: center;
      margin-bottom: 8px;
    }
    body.awaiting-choice #mode-chooser::after {
      content: "Start with short clips or build a longer compilation. Each opens as its own focused workspace.";
      grid-column: 1 / -1;
      color: var(--text2);
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
      max-width: 560px;
      justify-self: center;
      margin: -2px 0 14px;
      order: -1;
    }
    body.awaiting-choice .stages,
    body.awaiting-choice .panel,
    body.awaiting-choice #compilation-studio { display: none !important; }
    body.workspace-active #mode-chooser { display: none !important; }
    body.workspace-active .hero { display: none; }
    body.workspace-active .app-shell { padding-top: 18px; }
    @media (max-width: 600px) {
      body.awaiting-choice .app-shell { min-height: calc(100dvh - 58px); padding-left: 12px; padding-right: 12px; }
      body.awaiting-choice #mode-chooser::before { font-size: 32px; }
      body.awaiting-choice .mode-card { padding: 18px; }
    }

  

    /* ── DASHBOARD ── */
    #dashboard {
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 20px 80px;
    }
    .dashboard-header {
      margin-bottom: 40px;
    }
    .dashboard-greeting {
      font-size: clamp(22px, 4vw, 32px);
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--text);
      margin-bottom: 6px;
    }
    .dashboard-sub {
      color: var(--text2);
      font-size: 14px;
    }
    .dashboard-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 40px;
    }
    .dash-stat {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 18px;
    }
    .dash-stat-val {
      font-size: 26px;
      font-weight: 800;
      color: var(--accent2);
      line-height: 1;
      margin-bottom: 4px;
    }
    .dash-stat-label {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--text3);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .dashboard-section-title {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--text3);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .workspace-cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }
    .workspace-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 24px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .workspace-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--accent), var(--accent2));
      opacity: 0;
      transition: opacity 0.2s;
    }
    .workspace-card:hover {
      border-color: rgba(124,106,247,0.5);
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
    }
    .workspace-card:hover::before { opacity: 1; }
    .workspace-card-icon {
      width: 48px; height: 48px;
      border-radius: 14px;
      background: var(--accent-dim);
      border: 1px solid rgba(124,106,247,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      margin-bottom: 16px;
    }
    .workspace-card-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 8px;
      letter-spacing: -0.3px;
    }
    .workspace-card-desc {
      font-size: 13px;
      color: var(--text2);
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .workspace-card-features {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .workspace-feature {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text3);
    }
    .workspace-feature::before {
      content: '✓';
      color: var(--green);
      font-size: 11px;
      font-weight: 700;
    }
    .workspace-card-badge {
      position: absolute;
      top: 16px; right: 16px;
      font-family: var(--mono);
      font-size: 10px;
      color: var(--green);
      background: rgba(62,207,142,0.12);
      border: 1px solid rgba(62,207,142,0.22);
      border-radius: 999px;
      padding: 3px 8px;
    }
    .workspace-card-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      color: var(--accent2);
      font-size: 13px;
      font-weight: 600;
    }
    .recent-projects-section { margin-bottom: 40px; }
    .recent-project-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--r);
      margin-bottom: 8px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .recent-project-row:hover { border-color: rgba(124,106,247,0.4); }
    .recent-project-icon {
      width: 36px; height: 36px;
      background: var(--bg3);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .recent-project-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .recent-project-meta {
      font-size: 11px;
      color: var(--text3);
      font-family: var(--mono);
      white-space: nowrap;
    }
    #workspace { display: none; }
    .workspace-topbar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg2);
      margin-bottom: 0;
    }
    .workspace-mode-pills {
      display: flex;
      gap: 6px;
    }
    .workspace-pill {
      font-family: var(--mono);
      font-size: 11px;
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid var(--border2);
      color: var(--text3);
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
    }
    .workspace-pill.active {
      background: var(--accent-dim);
      color: var(--accent2);
      border-color: rgba(124,106,247,0.4);
    }
    @media (max-width: 600px) {
      .workspace-cards { grid-template-columns: 1fr; }
      .dashboard-stats { grid-template-columns: repeat(2, 1fr); }
      #dashboard { padding: 20px 16px 60px; }
    }

  </style>
</head>
<body>

<nav>
  <div class="logo">clip<span>AI</span></div>
  <div class="nav-tools">
    <button class="nav-action" id="theme-toggle" onclick="toggleTheme()" type="button">Light mode</button>
    <button class="nav-action hidden" id="back-to-dashboard-btn" onclick="backToDashboard()" type="button">← Dashboard</button>
    <button class="nav-action primary hidden" id="new-clips-btn" onclick="createNewClips()" type="button">+ New</button>
    <div id="nav-auth">
      <a href="login.html" class="nav-action" style="text-decoration:none">Sign In</a>
    </div>
  </div>
</nav>

<div class="preview-modal" id="preview-modal">
  <div class="preview-inner">
    <button class="preview-close" onclick="closePreview()">✕</button>
    <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:16px" id="preview-title">Clip Preview</div>
    <div class="preview-phone">
      <canvas class="preview-canvas" id="preview-canvas" width="180" height="320"></canvas>
    </div>
    <div class="preview-controls">
      <button class="preview-btn" id="prev-play-btn" onclick="togglePreviewPlay()">▷ Play</button>
      <button class="preview-btn" onclick="closePreview()">Close</button>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center;font-family:var(--mono)" id="preview-time">0:00 / 0:00</div>
  </div>
</div>

<!-- Projects Sidebar -->
<div id="projects-sidebar" style="display:none;position:fixed;top:0;right:0;width:320px;height:100vh;background:var(--bg2);border-left:1px solid var(--border2);z-index:200;overflow-y:auto;padding:24px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div style="font-size:16px;font-weight:700;color:#fff">My Projects</div>
    <button onclick="closeSidebar()" style="background:transparent;border:none;color:var(--text3);font-size:20px;cursor:pointer">✕</button>
  </div>
  <div id="projects-list"><div style="color:var(--text3);font-size:13px">Loading...</div></div>
</div>
<div id="sidebar-overlay" onclick="closeSidebar()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:199"></div>

<!-- ═══ DASHBOARD ═══ -->
<div id="dashboard">
  <div class="dashboard-header">
    <div class="dashboard-greeting" id="dashboard-greeting">Welcome back 👋</div>
    <div class="dashboard-sub">What are you creating today?</div>
  </div>

  <div class="dashboard-stats" id="dashboard-stats">
    <div class="dash-stat">
      <div class="dash-stat-val" id="dash-stat-projects">0</div>
      <div class="dash-stat-label">Projects</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val" id="dash-stat-clips">0</div>
      <div class="dash-stat-label">Clips Made</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val" id="dash-stat-exports">0</div>
      <div class="dash-stat-label">Exports</div>
    </div>
    <div class="dash-stat">
      <div class="dash-stat-val" id="dash-stat-memory">0</div>
      <div class="dash-stat-label">Viral Memories</div>
    </div>
  </div>

  <div class="dashboard-section-title">Choose your workspace</div>
  <div class="workspace-cards">
    <div class="workspace-card" onclick="chooseCreationMode('clips')">
      <span class="workspace-card-badge">Popular</span>
      <div class="workspace-card-icon">✂️</div>
      <div class="workspace-card-title">Short Clip Studio</div>
      <div class="workspace-card-desc">Upload one video or paste a YouTube link. AI transcribes, finds the best viral moments, adds captions, and exports 9:16 clips.</div>
      <div class="workspace-card-features">
        <div class="workspace-feature">AI transcript with speaker detection</div>
        <div class="workspace-feature">5 viral clip suggestions with hooks</div>
        <div class="workspace-feature">Caption styles — TikTok, Karaoke, Neon</div>
        <div class="workspace-feature">Export to MP4, TikTok, Reels, Shorts</div>
      </div>
      <div class="workspace-card-cta">Open Studio →</div>
    </div>
    <div class="workspace-card" onclick="chooseCreationMode('compilation')">
      <span class="workspace-card-badge">New</span>
      <div class="workspace-card-icon">🎬</div>
      <div class="workspace-card-title">Compilation Studio</div>
      <div class="workspace-card-desc">Paste multiple YouTube links and let Ghost Editor build a longer compilation from the best moments across all your sources.</div>
      <div class="workspace-card-features">
        <div class="workspace-feature">Up to 8 YouTube sources at once</div>
        <div class="workspace-feature">Ghost Editor AI builds the plan</div>
        <div class="workspace-feature">Choose style: funny, edu, motivation</div>
        <div class="workspace-feature">Target length up to 45 minutes</div>
      </div>
      <div class="workspace-card-cta">Open Studio →</div>
    </div>
  </div>

  <div class="recent-projects-section" id="recent-projects-section" style="display:none">
    <div class="dashboard-section-title">Recent projects</div>
    <div id="recent-projects-list"></div>
    <button class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:8px" onclick="openSidebar()">View all projects</button>
  </div>
</div>

<!-- ═══ WORKSPACE ═══ -->
<div id="workspace">
  <div class="workspace-topbar">
    <div class="workspace-mode-pills">
      <button class="workspace-pill active" id="ws-pill-clips" onclick="chooseCreationMode('clips')">✂️ Short Clips</button>
      <button class="workspace-pill" id="ws-pill-compilation" onclick="chooseCreationMode('compilation')">🎬 Compilation</button>
    </div>
    <div style="flex:1"></div>
    <button class="nav-action primary hidden" id="new-clips-btn2" onclick="createNewClips()" type="button" style="font-size:12px;padding:6px 12px">+ New</button>
  </div>

  <div class="app-shell">
    <div class="mode-chooser" id="mode-chooser" style="display:none">
      <div class="mode-card active" id="mode-clips" onclick="chooseCreationMode('clips')">
        <div class="mode-top"><div class="mode-icon">9:16</div><span class="mode-badge">Fast clips</span></div>
        <div class="mode-title">Create Short Clips</div>
        <div class="mode-sub">Upload one video or paste one YouTube link.</div>
      </div>
      <div class="mode-card" id="mode-compilation" onclick="chooseCreationMode('compilation')">
        <div class="mode-top"><div class="mode-icon">30m</div><span class="mode-badge">New</span></div>
        <div class="mode-title">Compilation Studio</div>
        <div class="mode-sub">Paste multiple YouTube links for a longer compilation.</div>
      </div>
    </div>

    <!-- STAGE TABS -->
    <div class="stages" role="tablist">
      <button class="stage-btn active" id="tab0" onclick="goStage(0)">
        <span class="snum">1</span>
        <span class="stage-label">Upload</span>
      </button>
      <button class="stage-btn locked" id="tab1" onclick="goStage(1)">
        <span class="snum">2</span>
        <span class="stage-label">Transcribe</span>
      </button>
      <button class="stage-btn locked" id="tab2" onclick="goStage(2)">
        <span class="snum">3</span>
        <span class="stage-label">Clips</span>
      </button>
      <button class="stage-btn locked" id="tab3" onclick="goStage(3)">
        <span class="snum">4</span>
        <span class="stage-label">Export</span>
      </button>
    </div>

    <div id="compilation-studio" style="display:none">
      <div class="card">
        <div class="card-title">Compilation Studio</div>
        <p style="color:var(--text2);font-size:14px;line-height:1.7;margin-bottom:16px">
          Build a long-form compilation from multiple YouTube videos. Start by creating the AI edit plan.
        </p>
        <div class="compilation-grid">
          <div>
            <label style="display:block;color:var(--text3);font-family:var(--mono);font-size:12px;margin-bottom:8px">YouTube links, one per line</label>
            <textarea id="compilation-links" class="compilation-links" placeholder="https://www.youtube.com/watch?v=...&#10;https://youtu.be/...&#10;https://www.youtube.com/shorts/..."></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
              <button class="ghost-chip" type="button" onclick="useCompilationExample('funny')">Funny moments</button>
              <button class="ghost-chip" type="button" onclick="useCompilationExample('educational')">Educational breakdown</button>
              <button class="ghost-chip" type="button" onclick="useCompilationExample('motivation')">Motivation mix</button>
            </div>
          </div>
          <div class="compilation-options">
            <div>
              <label for="compilation-style">Compilation style</label>
              <select id="compilation-style">
                <option value="funniest">Funniest moments</option>
                <option value="educational">Educational explainer</option>
                <option value="controversial">Controversial takes</option>
                <option value="motivational">Motivational story</option>
                <option value="documentary">Documentary flow</option>
              </select>
            </div>
            <div>
              <label for="compilation-length">Target length</label>
              <select id="compilation-length">
                <option value="10">10 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30" selected>30 minutes</option>
                <option value="45">45 minutes</option>
              </select>
            </div>
            <div>
              <label for="compilation-brief">Ghost Editor instruction</label>
              <input id="compilation-brief" placeholder="Start with the strongest hook, remove boring parts..." />
            </div>
            <button class="btn btn-full" type="button" onclick="createCompilationPlan()">Create Compilation Plan</button>
            <button class="btn btn-ghost btn-full" type="button" onclick="buildCompilationVideo()">Build Final Video</button>
          </div>
        </div>
        <div class="compilation-status" id="compilation-status"></div>
      </div>
    </div>

    <!-- ═══ PANEL 0: UPLOAD ═══ -->
    <div class="panel active" id="p0">
      <div class="card">
        <div class="card-title">Upload your video</div>
        <div class="upload-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
          <input type="file" id="file-input" accept="video/*,audio/*" />
          <div class="upload-icon-wrap">⬆</div>
          <h3>Drop your video here</h3>
          <p>or <a>browse files</a> to select from your device</p>
          <div class="formats">
            <span class="fmt">MP4</span><span class="fmt">MOV</span><span class="fmt">MKV</span>
            <span class="fmt">WEBM</span><span class="fmt">AVI</span><span class="fmt">MP3</span>
            <span class="fmt">M4A</span>
          </div>
        </div>
        <div class="or-divider">or paste a public URL</div>
        <div class="url-row">
          <input class="url-input" id="url-input" type="url" placeholder="https://example.com/video.mp4  or  YouTube/podcast URL" />
          <button class="btn btn-primary" onclick="submitUrl()">Analyze</button>
        </div>
        <div id="upload-progress" style="display:none" class="progress-wrap">
          <div class="progress-label">
            <span id="upload-status">Uploading...</span>
            <div class="progress-actions">
              <span id="upload-pct">0%</span>
              <button id="cancel-upload-btn" onclick="cancelUpload()" style="background:transparent;border:1px solid var(--red);color:var(--red);font-family:var(--font);font-size:12px;padding:3px 10px;border-radius:6px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='rgba(240,100,100,0.15)'" onmouseout="this.style.background='transparent'">✕ Cancel</button>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="upload-bar" style="width:0%"></div></div>
          <div id="upload-size" style="font-size:12px;color:var(--text3);margin-top:6px;font-family:var(--mono)"></div>
        </div>
      </div>
      <div class="card ghost-card">
        <div class="ghost-head">
          <div>
            <div class="ghost-title">Ghost Editor Mode</div>
            <div class="ghost-sub">Describe the edit once. ClipAI will pick the moment, set the length, choose captions, and prepare the export plan after transcription.</div>
          </div>
          <div class="ghost-badge">Autopilot</div>
        </div>
        <textarea class="ghost-input" id="ghost-brief" oninput="setGhostBrief(this.value)" placeholder="Find the funniest moment, make it 30 seconds, add yellow captions, start with the punchline."></textarea>
        <div class="ghost-examples">
          <button class="ghost-chip" type="button" onclick="useGhostExample('Find the funniest moment, make it 30 seconds, add yellow captions, start with the punchline.')">Funny punchline</button>
          <button class="ghost-chip" type="button" onclick="useGhostExample('Find the most controversial 45 seconds, make it high energy, and use bold TikTok captions.')">Controversial take</button>
          <button class="ghost-chip" type="button" onclick="useGhostExample('Create 3 motivational clips under 35 seconds each with clean white captions for Instagram Reels.')">3 motivational clips</button>
        </div>
        <button class="btn btn-ghost btn-full" type="button" onclick="rememberGhostBrief()">Use this Ghost brief</button>
        <div class="ghost-status" id="ghost-upload-status">Ghost brief saved. Upload or paste a video URL and ClipAI will run this automatically after transcription.</div>
      </div>
    </div>

    <!-- ═══ PANEL 1: TRANSCRIBE ═══ -->
    <div class="panel" id="p1">
      <div id="transcribe-progress" class="card">
        <div class="card-title">Processing your video</div>
        <div class="progress-wrap">
          <div class="progress-label">
            <span id="trans-status">Preparing your video...</span>
            <span id="trans-pct">0%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="trans-bar" style="width:0%"></div></div>
        </div>
        <div class="progress-steps">
          <div class="p-step active" id="step-upload"><div class="p-dot"></div>Uploading media</div>
          <div class="p-step" id="step-transcribe"><div class="p-dot"></div>Reading your video</div>
          <div class="p-step" id="step-speakers"><div class="p-dot"></div>Understanding the speakers</div>
          <div class="p-step" id="step-moments"><div class="p-dot"></div>Analyzing key moments</div>
          <div class="p-step" id="step-done"><div class="p-dot"></div>Ready</div>
        </div>
      </div>
      <div id="transcribe-results" style="display:none">
        <div class="stats-row" id="stats-row"></div>
        <div class="card">
          <div class="card-title">Transcript</div>
          <div class="transcript-box" id="transcript-content"></div>
        </div>
        <div class="card ghost-card">
          <div class="ghost-head">
            <div>
              <div class="ghost-title">Ghost Editor</div>
              <div class="ghost-sub">Give the AI editor a plain-English command and it will build the clips, captions, and export setup for you.</div>
            </div>
            <div class="ghost-badge">No timestamps</div>
          </div>
          <textarea class="ghost-input" id="ghost-brief-results" oninput="setGhostBrief(this.value)" placeholder="Example: Find the best 30-second hot take, start with the strongest line, add yellow pop captions."></textarea>
          <div class="ghost-examples">
            <button class="ghost-chip" type="button" onclick="useGhostExample('Find the best 30-second hot take, start with the strongest line, add yellow pop captions.')">Hot take</button>
            <button class="ghost-chip" type="button" onclick="useGhostExample('Make one calm educational clip under 40 seconds with minimal white captions.')">Educational</button>
            <button class="ghost-chip" type="button" onclick="useGhostExample('Find the most emotional story moment and make it feel like a TikTok confession.')">Emotional story</button>
          </div>
          <button class="btn btn-primary btn-full" id="ghost-run-btn" type="button" onclick="runGhostEditor()">Create Ghost Edit</button>
          <div class="ghost-status" id="ghost-status"></div>
        </div>
        <div class="card">
          <div class="card-title">Key moments — click to select</div>
          <div class="moments-grid" id="moments-grid"></div>
          <div class="ai-row">
            <input class="ai-input" id="moments-query" placeholder="Ask AI: find moments about fundraising, product launches..." />
            <button class="btn btn-primary" id="moments-ask-btn" onclick="askMomentsAI()">Ask</button>
          </div>
          <div class="ai-output" id="moments-ai-out"></div>
        </div>
        <button class="btn btn-primary btn-full" onclick="goToClips()">Generate clips from selected moments →</button>
      </div>
    </div>

    <!-- ═══ PANEL 2: CLIPS ═══ -->
    <div class="panel" id="p2">
      <div class="card">
        <div class="card-title">AI clip suggestions — 9:16 vertical format</div>
        <div id="clips-loading" style="display:flex;align-items:center;gap:12px;padding:20px 0;color:var(--text2);font-size:14px">
          <div class="spinner"></div> Analyzing transcript and generating clip ideas...
        </div>
        <div class="clips-grid" id="clips-grid" style="display:none"></div>
        <div class="ai-row" style="margin-top:20px">
          <input class="ai-input" id="clip-query" placeholder="Generate a clip about a specific topic or moment..." />
          <button class="btn btn-primary" id="clip-ask-btn" onclick="askClipAI()">Generate</button>
        </div>
        <div class="ai-output" id="clip-ai-out"></div>
      </div>
      <div class="card hook-lab-card">
        <div class="hook-lab-head">
          <div>
            <div class="hook-lab-title">Hook Lab</div>
            <div class="hook-lab-sub">Create and apply the first 2 seconds that make people stop scrolling.</div>
          </div>
          <div class="ghost-badge">Premium</div>
        </div>
        <div class="hook-lab-benefits">
          <div class="hook-benefit"><strong>Visible in export</strong>Burns the chosen hook into the start of the MP4.</div>
          <div class="hook-benefit"><strong>Better retention</strong>Tests curiosity, conflict, pain, story, and comment angles.</div>
          <div class="hook-benefit"><strong>One-click apply</strong>Updates title, hook overlay, first caption, and filename.</div>
        </div>
        <button class="btn btn-ghost btn-full" id="hook-lab-btn" type="button" onclick="runHookLab()">Generate Hook Variants</button>
        <div class="hook-lab-output" id="hook-lab-output"></div>
      </div>
      <div class="card memory-card">
        <div class="memory-head">
          <div>
            <div class="memory-title">Viral Memory Engine</div>
            <div class="memory-sub">ClipAI remembers which clips performed for you, then scores new clips against your audience patterns.</div>
          </div>
          <div class="ghost-badge">Learning</div>
        </div>
        <div class="memory-stats" id="memory-stats"></div>
        <div class="memory-form">
          <input id="memory-title" placeholder="Clip title or topic" />
          <select id="memory-platform">
            <option value="tiktok">TikTok</option>
            <option value="reels">Reels</option>
            <option value="shorts">Shorts</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <input id="memory-views" type="number" min="0" placeholder="Views" />
          <input id="memory-likes" type="number" min="0" placeholder="Likes" />
          <input id="memory-comments" type="number" min="0" placeholder="Comments" />
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-ghost" type="button" onclick="saveMemoryEntry()">Save Result</button>
          <button class="btn btn-ghost" id="memory-analyze-btn" type="button" onclick="runViralMemory()">Score Current Clips</button>
          <button class="btn btn-ghost" type="button" onclick="prefillMemoryFromSelectedClip()">Use Selected Clip</button>
        </div>
        <div class="memory-output" id="memory-output"></div>
      </div>
      <div class="action-row">
        <div style="display:flex;gap:10px;margin-top:16px;width:100%">
          <button class="btn btn-ghost" onclick="saveProject()" style="flex:1">💾 Save Project</button>
          <button class="btn btn-primary" onclick="goStage(3)" style="flex:2">Continue to export →</button>
        </div>
      </div>
    </div>

    <!-- ═══ PANEL 3: EXPORT ═══ -->
    <div class="panel" id="p3">
      <div class="card">
        <div class="card-title">Caption style — pick a preset or describe your own</div>
        <div class="caption-presets" id="caption-presets"></div>
        <div class="caption-control-grid">
          <div class="caption-control">
            <label for="caption-size-range">Size <strong id="caption-size-value">100%</strong></label>
            <input id="caption-size-range" type="range" min="80" max="125" value="100" oninput="updateCaptionSetting('size', this.value)" />
          </div>
          <div class="caption-control">
            <label for="caption-position-range">Position <strong id="caption-position-value">78%</strong></label>
            <input id="caption-position-range" type="range" min="62" max="88" value="78" oninput="updateCaptionSetting('position', this.value)" />
          </div>
          <div class="caption-control">
            <label for="caption-density-range">Words <strong id="caption-density-value">3</strong></label>
            <input id="caption-density-range" type="range" min="2" max="4" value="3" oninput="updateCaptionSetting('words', this.value)" />
          </div>
        </div>
        <div class="caption-mini-preview">
          <div class="caption-mini-text" id="caption-mini-text">Make every clip feel ready to post</div>
        </div>
        <div class="ai-row">
          <input class="ai-input" id="cap-query" placeholder="Optional: describe a custom caption style..." />
          <button class="btn btn-primary" id="cap-btn" onclick="generateCaptions()">Preview</button>
        </div>
        <div class="ai-output" id="cap-ai-out"></div>
      </div>
      <div class="card">
        <div class="card-title">Export &amp; share</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:14px">
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--text)">Captions in export</div>
            <div id="caption-export-status" style="font-size:12px;color:var(--text3);line-height:1.5;margin-top:3px">Generated captions will be burned into downloaded clips.</div>
          </div>
          <button class="btn btn-primary" id="caption-export-toggle-btn" type="button" onclick="toggleExportCaptions()" style="padding:9px 12px;white-space:nowrap">On</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:14px">
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--text)">ClipAI watermark</div>
            <div id="watermark-status" style="font-size:12px;color:var(--text3);line-height:1.5;margin-top:3px">Free exports include a small ClipAI watermark.</div>
          </div>
          <button class="btn btn-ghost" id="watermark-toggle-btn" type="button" onclick="toggleWatermarkRemoval()" style="padding:9px 12px;white-space:nowrap">Remove</button>
        </div>
        <div class="export-grid">
          <div class="export-card" onclick="exportTo('mp4')">
            <span class="ex-icon">⬇</span>
            <div class="ex-name">Download MP4</div>
            <div class="ex-sub">9:16 · 1080×1920</div>
          </div>
          <div class="export-card" onclick="exportTo('tiktok')">
            <span class="ex-icon">▶</span>
            <div class="ex-name">TikTok</div>
            <div class="ex-sub">Share from phone</div>
          </div>
          <div class="export-card" onclick="exportTo('reels')">
            <span class="ex-icon">◈</span>
            <div class="ex-name">Instagram Reels</div>
            <div class="ex-sub">Share from phone</div>
          </div>
          <div class="export-card" onclick="exportTo('shorts')">
            <span class="ex-icon">▷</span>
            <div class="ex-name">YouTube Shorts</div>
            <div class="ex-sub">Share from phone</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Selected clips summary</div>
        <div id="export-summary" style="color:var(--text2);font-size:14px;line-height:1.7"></div>
        <button class="btn btn-ghost btn-full" onclick="createNewClips()" style="margin-top:16px">+ Create New Clips</button>
      </div>
    </div>

  </div><!-- /app-shell -->
</div><!-- /workspace -->

<div id="toast"></div>

<script>
// ═══ AUTH GUARD ═══
// Redirect to login if not signed in
(function() {
  const token = localStorage.getItem('clipai_token');
  const user = JSON.parse(localStorage.getItem('clipai_user') || 'null');
  if (!token || !user) {
    window.location.href = 'login.html';
  }
})();

// ═══ CONFIG ═══
// Railway handles video cutting (FFmpeg). Vercel handles everything else.
const API_URL = 'https://clipai-ten.vercel.app';
const RAILWAY_URL = 'https://clipai-backend-nvwq.onrender.com';
let currentCreationMode = 'clips';

// ═══ STATE ═══
const state = {
  transcriptId: null,
  transcript: null,
  utterances: [],
  highlights: [],
  words: [],
  duration: 0,
  clips: [],
  selectedClips: new Set(),
  selectedMoments: new Set(),
  sourceVideoUrl: '',
  transcriptionUrl: '',
  localFileId: null,
  localPreviewUrl: '',
  captionStyle: 'tiktok',
  captionSettings: {
    size: 100,
    position: 78,
    words: 3
  },
  burnCaptions: true,
  removeWatermark: false,
  ghostBrief: '',
  ghostPlan: null,
  ghostAutoRun: false,
  ghostBusy: false,
  hookVariants: [],
  hookBusy: false,
  viralMemory: [],
  memoryProfile: null,
  memoryBusy: false,
  clipsReadyNotified: false,
  lastSavedProjectKey: ''
};

const compilationState = {
  links: [],
  sources: [],
  plan: null,
  busy: false
};

const billingState = {
  status: null,
  busy: false
};

const REVENUECAT_ANDROID_API_KEY = 'test_RzckjKbyUxDDEzZWeKEdPGvkapF';
const REVENUECAT_ENTITLEMENT_ID = 'pro';
const REVENUECAT_PRODUCT_IDS = {
  weekly: 'clipai_pro_weekly',
  monthly: 'clipai_pro_monthly',
  yearly: 'clipai_pro_yearly'
};

const revenueCatState = {
  configured: false,
  offerings: null,
  busy: false
};

// ═══ UTILS ═══
function formatUserError(error, fallback = 'Something went wrong. Please try again.') {
  const raw = String(error?.message || error || '').trim();
  if (!raw) return fallback;
  const text = raw.replace(/\s+/g, ' ');
  const lower = text.toLowerCase();

  if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('unexpected token') || lower.includes('invalid response') || lower.includes('instead of json')) {
    return 'We could not complete that request. Please check your connection and try again.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch') || lower.includes('load failed') || lower.includes('offline')) {
    return 'You appear to be offline. Reconnect and try again.';
  }
  if (lower.includes('youtube') || lower.includes('download link') || lower.includes('video id') || lower.includes('private') || lower.includes('unavailable')) {
    return 'One of the video links could not be opened. Please use a public YouTube link and try again.';
  }
  if (lower.includes('transcript') || lower.includes('transcrib') || lower.includes('assemblyai')) {
    return 'We could not read the audio from this video. Please try again or use another video.';
  }
  if (lower.includes('ffmpeg') || lower.includes('cut') || lower.includes('concat') || lower.includes('renderer') || lower.includes('render') || lower.includes('source file')) {
    return 'We could not finish creating the video. Please try again with shorter clips or rebuild the project.';
  }
  if (lower.includes('auth') || lower.includes('login') || lower.includes('signup') || lower.includes('password') || lower.includes('email') || lower.includes('invalid credentials')) {
    return 'We could not sign you in with those details. Please check and try again.';
  }
  if (text.length > 140 || /https?:\/\//i.test(text) || /[{}[\]<>]/.test(text)) {
    return fallback;
  }
  return text;
}

function professionalMessage(message) {
  const raw = String(message || '').trim();
  if (/error|failed|doctype|html|ffmpeg|invalid response|server error|exception|trace/i.test(raw)) {
    return formatUserError(raw);
  }
  return raw;
}

function toast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = professionalMessage(msg);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function getClipAINative() {
  return window.Capacitor?.Plugins?.ClipAINative || null;
}

async function notifyNative(title, body) {
  const native = getClipAINative();
  if (!native?.notify) return;
  try {
    await native.notify({ title, body });
  } catch (err) {
    console.warn('[ClipAI] Native notification failed:', err);
  }
}

async function requestNativeNotifications() {
  const native = getClipAINative();
  if (!native?.requestNotificationPermission) return;
  try {
    await native.requestNotificationPermission();
  } catch (err) {
    console.warn('[ClipAI] Notification permission request failed:', err);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read exported video'));
    reader.readAsDataURL(blob);
  });
}

async function saveExportedVideo(blob, filename) {
  const native = getClipAINative();
  if (native?.saveVideo) {
    const base64 = await blobToBase64(blob);
    await native.saveVideo({ base64, filename });
    await notifyNative('ClipAI download complete', filename + ' was saved to your Gallery.');
    return { native: true };
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { native: false };
}

function socialPlatformName(platform) {
  const names = {
    tiktok: 'TikTok',
    reels: 'Instagram Reels',
    shorts: 'YouTube Shorts'
  };
  return names[platform] || 'your app';
}

async function shareExportedVideo(blob, filename, platform) {
  const native = getClipAINative();
  const platformName = socialPlatformName(platform);

  if (native?.shareVideo) {
    const base64 = await blobToBase64(blob);
    await native.shareVideo({ base64, filename, platform });
    await notifyNative('ClipAI clip ready to share', 'Choose ' + platformName + ' from the share sheet.');
    return { native: true, shared: true };
  }

  await saveExportedVideo(blob, filename);
  toast('Clip downloaded. Open ' + platformName + ' and upload it from your device.', 6000);
  return { native: false, shared: false };
}

function getAuthToken() {
  return localStorage.getItem('clipai_token') || '';
}

function getClipAIDeviceId() {
  let deviceId = localStorage.getItem('clipai_device_id');
  if (!deviceId) {
    const randomId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'clipai_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    deviceId = randomId;
    localStorage.setItem('clipai_device_id', deviceId);
  }
  return deviceId;
}

function handleExpiredSession() {
  localStorage.removeItem('clipai_token');
  localStorage.removeItem('clipai_user');
  sessionStorage.setItem('clipai_login_notice', 'Your session expired. Please sign in again.');
  window.location.href = 'login.html';
}

async function readBillingJson(res) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return { error: raw };
  }
}

async function requestBilling(action) {
  const token = getAuthToken();
  if (!token) throw new Error('Please sign in again');
  const options = {
    method: action ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + token,
      'x-clipai-device-id': getClipAIDeviceId()
    }
  };
  if (action) options.body = JSON.stringify({ action, deviceId: getClipAIDeviceId() });
  const res = await fetch(API_URL + '/api/billing', options);
  const data = await readBillingJson(res);
  if (res.status === 401) {
    handleExpiredSession();
    throw new Error('Please sign in again');
  }
  if (!res.ok && res.status !== 402) throw new Error(data.error || 'Billing could not be checked');
  billingState.status = data;
  return data;
}

function billingSummaryText(status) {
  if (!status) return 'Checking your plan...';
  if (status.isSubscribed) return 'ClipAI Pro active';
  const remaining = Math.max(0, Number(status.exportsRemaining || 0));
  return remaining === 1 ? '1 free export left' : remaining + ' free exports left';
}

function getRevenueCatPlugin() {
  return window.Capacitor?.Plugins?.Purchases || null;
}

function isNativeRevenueCatAvailable() {
  return Boolean(getRevenueCatPlugin() && window.Capacitor?.isNativePlatform?.());
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('clipai_user') || 'null');
  } catch (err) {
    return null;
  }
}

async function initRevenueCat() {
  const Purchases = getRevenueCatPlugin();
  const user = getCurrentUser();
  if (!Purchases || !window.Capacitor?.isNativePlatform?.() || !user?.id) return false;
  if (revenueCatState.configured) return true;

  try {
    if (Purchases.setLogLevel) await Purchases.setLogLevel({ level: 'DEBUG' });
    await Purchases.configure({
      apiKey: REVENUECAT_ANDROID_API_KEY,
      appUserID: user.id
    });
    if (user.email && Purchases.setEmail) await Purchases.setEmail({ email: user.email });
    revenueCatState.configured = true;
    return true;
  } catch (err) {
    console.warn('[ClipAI] RevenueCat configure failed:', err);
    return false;
  }
}

async function getRevenueCatOffering() {
  if (!(await initRevenueCat())) return null;
  if (revenueCatState.offerings?.current) return revenueCatState.offerings.current;

  const Purchases = getRevenueCatPlugin();
  const offerings = await Purchases.getOfferings();
  revenueCatState.offerings = offerings;
  return offerings?.current || offerings?.all?.default || null;
}

function productIdentifierForPackage(pkg) {
  return pkg?.product?.identifier || pkg?.product?.productIdentifier || pkg?.identifier || '';
}

function revenueCatPackageForPlan(offering, plan) {
  const directKey = plan === 'yearly' ? 'annual' : plan;
  const expectedProductId = REVENUECAT_PRODUCT_IDS[plan];
  const direct = offering?.[directKey];
  if (direct && productIdentifierForPackage(direct) === expectedProductId) return direct;
  const packages = Array.isArray(offering?.availablePackages) ? offering.availablePackages : [];
  return packages.find(pkg => productIdentifierForPackage(pkg) === expectedProductId)
    || packages.find(pkg => String(pkg?.packageType || '').toLowerCase() === directKey)
    || direct
    || null;
}

function planPriceLabel(plan, pkg) {
  const price = pkg?.product?.priceString || pkg?.product?.price?.formatted || '';
  const suffix = plan === 'weekly' ? ' / week' : plan === 'monthly' ? ' / month' : ' / year';
  return price ? price + suffix : plan.charAt(0).toUpperCase() + plan.slice(1);
}

function customerHasPro(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  return Boolean(active[REVENUECAT_ENTITLEMENT_ID]?.isActive ?? active[REVENUECAT_ENTITLEMENT_ID]);
}

async function waitForSupabaseSubscription() {
  for (let i = 0; i < 5; i++) {
    const status = await requestBilling();
    if (status.isSubscribed) return status;
    await new Promise(resolve => setTimeout(resolve, 1600));
  }
  return billingState.status;
}

async function refreshPaywallPlans() {
  const note = document.getElementById('paywall-note');
  if (!isNativeRevenueCatAvailable()) {
    if (note) note.textContent = 'Google Play purchases are available inside the Android app. Web checkout will be added separately.';
    return;
  }

  try {
    const offering = await getRevenueCatOffering();
    ['weekly', 'monthly', 'yearly'].forEach(plan => {
      const btn = document.getElementById('paywall-' + plan);
      const pkg = revenueCatPackageForPlan(offering, plan);
      if (!btn) return;
      btn.disabled = !pkg;
      if (pkg) btn.textContent = planPriceLabel(plan, pkg);
    });
    if (note) note.textContent = offering
      ? 'Secure checkout is handled by Google Play. You can cancel anytime in your Play Store subscriptions.'
      : 'No RevenueCat offering was found. Check that the default offering has weekly, monthly, and yearly packages.';
  } catch (err) {
    console.warn('[ClipAI] RevenueCat offerings unavailable:', err);
    if (note) note.textContent = 'Plans could not be loaded. Check your RevenueCat product and offering setup.';
  }
}

function showPaywall(status) {
  let modal = document.getElementById('paywall-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'paywall-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.78);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px';
    modal.innerHTML =
      '<div style="width:min(440px,100%);background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:22px;box-shadow:0 24px 80px rgba(0,0,0,0.45)">' +
        '<div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px">' +
          '<div><div style="font-size:20px;font-weight:800;color:var(--text);line-height:1.2">Unlock ClipAI Pro</div>' +
          '<div id="paywall-sub" style="font-size:13px;color:var(--text2);line-height:1.6;margin-top:6px">Your free exports are complete.</div></div>' +
          '<button type="button" onclick="closePaywall()" style="background:var(--bg3);border:1px solid var(--border);color:var(--text2);width:32px;height:32px;border-radius:50%;cursor:pointer">x</button>' +
        '</div>' +
        '<div style="display:grid;gap:9px;margin:16px 0">' +
          '<button id="paywall-weekly" type="button" class="btn btn-ghost btn-full" onclick="purchaseProPlan(&quot;weekly&quot;)">Weekly - flexible access</button>' +
          '<button id="paywall-monthly" type="button" class="btn btn-ghost btn-full" onclick="purchaseProPlan(&quot;monthly&quot;)">Monthly - best for regular creators</button>' +
          '<button id="paywall-yearly" type="button" class="btn btn-primary btn-full" onclick="purchaseProPlan(&quot;yearly&quot;)">Yearly - best value</button>' +
          '<button type="button" class="btn btn-ghost btn-full" onclick="restoreProPurchases()">Restore purchases</button>' +
        '</div>' +
        '<div id="paywall-note" style="font-size:12px;color:var(--text3);line-height:1.6;text-align:center">Loading secure checkout...</div>' +
      '</div>';
    document.body.appendChild(modal);
  }
  const sub = document.getElementById('paywall-sub');
  if (sub) {
    if (status?.trialBlocked) {
      sub.textContent = 'A free trial has already been used on this device or network. Choose a plan to continue.';
    } else if (status?.requiresPayment) {
      sub.textContent = 'You have used your ' + String(status.freeExportsLimit || 3) + ' free exports. Choose a plan to continue exporting.';
    } else {
      sub.textContent = 'Choose a plan to continue exporting without limits.';
    }
  }
  modal.style.display = 'flex';
  refreshPaywallPlans();
}

function closePaywall() {
  const modal = document.getElementById('paywall-modal');
  if (modal) modal.style.display = 'none';
}

async function purchaseProPlan(plan) {
  if (revenueCatState.busy) return;
  if (!getAuthToken()) { window.location.href = 'login.html'; return; }
  if (!isNativeRevenueCatAvailable()) {
    toast('Open ClipAI in the Android app to subscribe with Google Play.', 5000);
    return;
  }

  const Purchases = getRevenueCatPlugin();
  const note = document.getElementById('paywall-note');
  const button = document.getElementById('paywall-' + plan);
  revenueCatState.busy = true;
  if (button) button.disabled = true;
  if (note) note.textContent = 'Opening Google Play checkout...';

  try {
    const offering = await getRevenueCatOffering();
    const pkg = revenueCatPackageForPlan(offering, plan);
    if (!pkg) throw new Error('This plan is not available yet.');

    const result = await Purchases.purchasePackage({ aPackage: pkg });
    if (!customerHasPro(result?.customerInfo)) {
      throw new Error('Purchase completed, but Pro entitlement is not active yet.');
    }

    if (note) note.textContent = 'Payment confirmed. Updating your ClipAI account...';
    const status = await waitForSupabaseSubscription();
    if (status?.isSubscribed) {
      closePaywall();
      updateDashboardBilling(status);
      toast('ClipAI Pro unlocked. You can keep exporting.', 3500);
    } else {
      toast('Purchase confirmed. Account update is still syncing; try export again in a moment.', 6000);
    }
  } catch (err) {
    if (err?.userCancelled) {
      toast('Purchase cancelled.');
    } else {
      toast(formatUserError(err, 'We could not complete the purchase. Please try again.'), 6000);
      console.warn('[ClipAI] Purchase failed:', err);
    }
  } finally {
    revenueCatState.busy = false;
    if (button) button.disabled = false;
    refreshPaywallPlans();
  }
}

async function restoreProPurchases() {
  if (!isNativeRevenueCatAvailable()) {
    toast('Restore is available inside the Android app.', 5000);
    return;
  }
  try {
    const Purchases = getRevenueCatPlugin();
    await initRevenueCat();
    const result = await Purchases.restorePurchases();
    if (customerHasPro(result?.customerInfo)) {
      const status = await waitForSupabaseSubscription();
      updateDashboardBilling(status);
      closePaywall();
      toast('Purchase restored. ClipAI Pro is active.', 3500);
    } else {
      toast('No active ClipAI Pro subscription was found.');
    }
  } catch (err) {
    toast(formatUserError(err, 'We could not restore purchases. Please try again.'), 6000);
  }
}

async function ensureExportAllowed() {
  try {
    const status = await requestBilling('check_export');
    if (status.canExport) return true;
    showPaywall(status);
    return false;
  } catch (err) {
    toast(formatUserError(err, 'We could not check your plan. Please try again.'));
    return false;
  }
}

async function recordSuccessfulExport() {
  try {
    const status = await requestBilling('record_export');
    toast(billingSummaryText(status), 2500);
    updateDashboardBilling(status);
  } catch (err) {
    console.warn('[ClipAI] Billing usage update failed:', err);
  }
  await autoSaveProjectAfterExport();
  loadDashboardStats();
}

function updateDashboardBilling(status) {
  const exportsEl = document.getElementById('dash-stat-exports');
  if (exportsEl && status) {
    exportsEl.textContent = status.isSubscribed
      ? String(status.exportsUsed || 0)
      : String(status.exportsUsed || 0) + '/' + String(status.freeExportsLimit || 1);
  }
  renderWatermarkControls();
}

function isProUser() {
  return Boolean(billingState.status?.isSubscribed);
}

function renderWatermarkControls() {
  const statusEl = document.getElementById('watermark-status');
  const btn = document.getElementById('watermark-toggle-btn');
  if (!statusEl || !btn) return;

  if (isProUser()) {
    statusEl.textContent = state.removeWatermark
      ? 'Watermark removed for this Pro export.'
      : 'Pro users can export with or without the ClipAI watermark.';
    btn.textContent = state.removeWatermark ? 'Keep watermark' : 'Remove';
    btn.className = state.removeWatermark ? 'btn btn-primary' : 'btn btn-ghost';
    return;
  }

  state.removeWatermark = false;
  statusEl.textContent = 'Free exports include a small ClipAI watermark. Upgrade to remove it.';
  btn.textContent = 'Remove';
  btn.className = 'btn btn-ghost';
}

async function toggleWatermarkRemoval() {
  let status = billingState.status;
  if (!status) {
    try { status = await requestBilling(); } catch (err) {}
  }

  if (!status?.isSubscribed) {
    showPaywall(status || { requiresPayment: true });
    toast('Upgrade to ClipAI Pro to remove the watermark.', 4000);
    return;
  }

  state.removeWatermark = !state.removeWatermark;
  renderWatermarkControls();
}

function shouldRemoveWatermark() {
  return Boolean(state.removeWatermark && isProUser());
}

function renderCaptionExportControls() {
  const statusEl = document.getElementById('caption-export-status');
  const btn = document.getElementById('caption-export-toggle-btn');
  if (!statusEl || !btn) return;

  const enabled = state.burnCaptions !== false;
  statusEl.textContent = enabled
    ? 'Generated captions will be burned into downloaded clips.'
    : 'Downloaded clips will keep the original video clean with no generated captions.';
  btn.textContent = enabled ? 'On' : 'Off';
  btn.className = enabled ? 'btn btn-primary' : 'btn btn-ghost';
}

function toggleExportCaptions() {
  state.burnCaptions = state.burnCaptions === false;
  renderCaptionExportControls();
  drawAllVisibleCaptions();
  renderExportSummary();
  toast(state.burnCaptions === false ? 'Captions turned off for export.' : 'Captions turned on for export.');
}

function shouldBurnCaptions() {
  return state.burnCaptions !== false;
}

function chooseCreationMode(mode) {
  currentCreationMode = mode === 'compilation' ? 'compilation' : 'clips';
  const isCompilation = currentCreationMode === 'compilation';

  // Hide dashboard, show workspace
  const dashboard = document.getElementById('dashboard');
  const workspace = document.getElementById('workspace');
  if (dashboard) dashboard.style.display = 'none';
  if (workspace) workspace.style.display = 'block';

  document.body.classList.remove('awaiting-choice');
  document.body.classList.add('workspace-active');

  const stages = document.querySelector('.stages');
  const studio = document.getElementById('compilation-studio');

  document.getElementById('mode-clips')?.classList.toggle('active', !isCompilation);
  document.getElementById('mode-compilation')?.classList.toggle('active', isCompilation);

  if (stages) stages.style.display = isCompilation ? 'none' : 'flex';
  document.querySelectorAll('.panel').forEach(panel => {
    panel.style.display = isCompilation ? 'none' : '';
  });
  if (studio) studio.style.display = isCompilation ? 'block' : 'none';

  // Show back button
  const backBtn = document.getElementById('back-to-dashboard-btn');
  if (backBtn) backBtn.classList.remove('hidden');

  if (!isCompilation) {
    goStage(state.currentStage || 0);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToDashboard() {
  const dashboard = document.getElementById('dashboard');
  const workspace = document.getElementById('workspace');
  if (dashboard) dashboard.style.display = 'block';
  if (workspace) workspace.style.display = 'none';
  document.body.classList.remove('workspace-active');
  // dashboard handles mode selection
  const backBtn = document.getElementById('back-to-dashboard-btn');
  if (backBtn) backBtn.classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function parseCompilationLinks() {
  const raw = document.getElementById('compilation-links')?.value || '';
  return raw
    .split(/\r?\n/)
    .map(link => link.trim())
    .filter(Boolean)
    .filter((link, index, arr) => arr.indexOf(link) === index);
}

function useCompilationExample(kind) {
  const examples = {
    funny: {
      style: 'funniest',
      brief: 'Find the funniest moments, start with punchlines, keep pacing fast, remove dead air.'
    },
    educational: {
      style: 'educational',
      brief: 'Turn the best explanations into a clear learning compilation with smooth topic order.'
    },
    motivation: {
      style: 'motivational',
      brief: 'Find emotional and inspiring moments, build a story arc, end with the strongest quote.'
    }
  };
  const selected = examples[kind] || examples.funny;
  document.getElementById('compilation-style').value = selected.style;
  document.getElementById('compilation-brief').value = selected.brief;
  toast('Compilation style loaded');
}

async function getYouTubeDirectUrl(url) {
  const RAPIDAPI_KEY = '2739c1edfcmsh6e763515222fb6bp1b7684jsne1a821094a00';
  const RAPIDAPI_HOST = 'youtube-video-fast-downloader-24-7.p.rapidapi.com';
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&\n?#]+)/);
  const videoId = match ? match[1] : null;
  if (!videoId) throw new Error('Could not extract video ID from URL');

  const rapidRes = await fetch(`https://${RAPIDAPI_HOST}/download_video/${videoId}?quality=247`, {
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY
    }
  });
  const rapidData = await rapidRes.json();
  const directUrl = rapidData?.file || rapidData?.url || rapidData?.link;
  if (!directUrl) throw new Error('Could not get download link from RapidAPI');
  return directUrl;
}

async function uploadYouTubeSource(url) {
  const directUrl = await getYouTubeDirectUrl(url);
  const res = await fetch(RAILWAY_URL + '/api/youtube-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: directUrl, originalUrl: url })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'YouTube download failed');
  return { ...data, originalUrl: url, directUrl };
}

async function createTranscriptJob(videoUrl) {
  const res = await fetch(API_URL + '/api/transcribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoUrl })
  });
  const rawText = await res.text();
  let data;
  try { data = JSON.parse(rawText); } catch(e) { throw new Error('Transcription server returned an invalid response'); }
  if (!res.ok) throw new Error(data.error || 'Transcription failed');
  const transcriptId = data.transcriptId || data.id;
  if (!transcriptId) throw new Error('No transcript ID returned');
  return transcriptId;
}

async function waitForCompilationTranscript(transcriptId, onStatus) {
  const maxAttempts = 180;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (onStatus) onStatus(attempt);
    await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 1800 : 4000));
    const res = await fetch(API_URL + '/api/transcript-status?id=' + encodeURIComponent(transcriptId));
    if (!res.ok) throw new Error('Transcript status failed');
    const data = await res.json();
    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error(data.error || 'Audio processing failed');
  }
  throw new Error('Transcription timed out');
}

function renderCompilationPlan(plan) {
  const out = document.getElementById('compilation-status');
  if (!out) return;
  const segments = Array.isArray(plan.segments) ? plan.segments : [];
  const totalSeconds = Math.round(segments.reduce((sum, segment) => {
    const start = Number(segment.start_ms || segment.startMs || 0);
    const end = Number(segment.end_ms || segment.endMs || 0);
    const seconds = end > start ? (end - start) / 1000 : Number(segment.target_seconds || 0);
    return sum + Math.max(0, seconds || 0);
  }, 0));
  const segmentHtml = segments.map((segment, index) => `
    <div class="compilation-segment">
      <strong>${index + 1}. ${escapeHTML(segment.title || 'Source segment')}</strong>
      <span>${escapeHTML(segment.source || '')}${segment.start_ms !== undefined ? ' · ' + formatTime(segment.start_ms) + ' → ' + formatTime(segment.end_ms || segment.start_ms) : ''}</span>
      <div style="margin-top:6px;color:var(--text2)">${escapeHTML(segment.direction || segment.reason || '')}</div>
      ${segment.reason ? `<div style="margin-top:6px;color:var(--text3);font-size:12px">${escapeHTML(segment.reason)}</div>` : ''}
      ${segment.transition || segment.energy ? `<div style="margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--accent2)">${escapeHTML([segment.energy, segment.transition].filter(Boolean).join(' · '))}</div>` : ''}
    </div>
  `).join('');
  out.classList.add('show');
  out.innerHTML = `
    <strong style="color:var(--text);display:block;margin-bottom:6px">${escapeHTML(plan.title || 'Compilation plan ready')}</strong>
    <div>${escapeHTML(plan.summary || 'ClipAI created the first compilation blueprint.')}</div>
    <div style="margin-top:10px;font-family:var(--mono);font-size:12px;color:var(--text3)">
      ${plan.source_count || compilationState.links.length} sources · ${plan.target_minutes || '?'} min target · ${escapeHTML(plan.style || 'custom')}
    </div>
    <div style="margin-top:6px;font-family:var(--mono);font-size:12px;color:var(--accent2)">
      Planned runtime: ${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}
    </div>
    <div class="compilation-plan">${segmentHtml}</div>
    <div style="margin-top:12px;color:${plan.renderer_ready ? 'var(--green)' : 'var(--amber)'};font-size:13px">
      ${plan.renderer_ready ? 'Your compilation is ready to build.' : 'Your plan is ready, but a few moments may need another pass before building.'}
    </div>
  `;
}

async function createCompilationPlan() {
  if (compilationState.busy) return;
  const links = parseCompilationLinks();
  if (links.length < 2) {
    toast('Paste at least two YouTube links for a compilation', 5000);
    return;
  }
  if (links.length > 8) {
    toast('Start with 2 to 8 links. We can raise this after the downloader is stable.', 5000);
    return;
  }

  const out = document.getElementById('compilation-status');
  compilationState.busy = true;
  compilationState.links = links;
  compilationState.sources = [];
  if (out) {
    out.classList.add('show');
    out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Preparing YouTube sources for Compilation Studio...</div>';
  }

  try {
    const sources = [];
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (out) {
        out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Importing video ' + (i + 1) + ' of ' + links.length + '...</div>' +
          '<div style="margin-top:10px;color:var(--text3);font-family:var(--mono);font-size:11px;overflow-wrap:anywhere">' + escapeHTML(link) + '</div>';
      }

      const uploaded = await uploadYouTubeSource(link);

      if (out) {
        out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Reading video ' + (i + 1) + ' of ' + links.length + '...</div>' +
          '<div style="margin-top:10px;color:var(--text3);font-family:var(--mono);font-size:11px;overflow-wrap:anywhere">' + escapeHTML(link) + '</div>';
      }

      const transcriptId = await createTranscriptJob(uploaded.uploadUrl);
      const transcript = await waitForCompilationTranscript(transcriptId, attempt => {
        if (!out || attempt % 2 !== 0) return;
        out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Reading video ' + (i + 1) + ' of ' + links.length + '...</div>' +
          '<div style="margin-top:10px;color:var(--text3);font-family:var(--mono);font-size:11px;overflow-wrap:anywhere">' + escapeHTML(link) + '</div>';
      });

      sources.push({
        index: i,
        originalUrl: link,
        localFileId: uploaded.localFileId,
        uploadUrl: uploaded.uploadUrl,
        previewUrl: uploaded.previewUrl || uploaded.videoUrl || uploaded.localVideoUrl || '',
        transcriptId,
        transcript: transcript.text || '',
        utterances: transcript.utterances || [],
        words: transcript.words || [],
        duration: transcript.duration || 0
      });
      compilationState.sources = sources;
    }

    if (out) {
      out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Preparing your compilation plan...</div>';
    }

    const res = await fetch(API_URL + '/api/compilation-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        links,
        sources: sources.map(source => ({
          index: source.index,
          originalUrl: source.originalUrl,
          transcript: source.transcript,
          utterances: source.utterances.slice(0, 80),
          words: source.words.slice(0, 1000),
          duration: source.duration
        })),
        style: document.getElementById('compilation-style').value,
        targetMinutes: Number(document.getElementById('compilation-length').value || 30),
        brief: document.getElementById('compilation-brief').value.trim()
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not create compilation plan');
    compilationState.plan = data;
    renderCompilationPlan(data);
    toast('Compilation plan ready');
  } catch (err) {
    if (out) out.innerHTML = '<span style="color:var(--red)">' + escapeHTML(formatUserError(err, 'We could not prepare this compilation. Please check the links and try again.')) + '</span>';
    toast(formatUserError(err, 'We could not prepare this compilation. Please check the links and try again.'), 6000);
  } finally {
    compilationState.busy = false;
  }
}

async function buildCompilationVideo() {
  const out = document.getElementById('compilation-status');
  if (compilationState.busy) {
    toast('Compilation Studio is already working');
    return;
  }
  if (!compilationState.plan || !Array.isArray(compilationState.plan.segments) || !compilationState.plan.segments.length) {
    toast('Create a compilation plan first', 5000);
    return;
  }
  if (!Array.isArray(compilationState.sources) || compilationState.sources.length < 2) {
    toast('Please prepare the compilation again before building the final video.', 6000);
    return;
  }
  if (!(await ensureExportAllowed())) return;

  compilationState.busy = true;
  if (out) {
    out.classList.add('show');
    out.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Building final compilation video...</div>' +
      '<div style="margin-top:10px;color:var(--text3);font-size:12px;line-height:1.6">ClipAI is cutting selected moments from ' +
      compilationState.sources.length + ' sources and joining them into one MP4. This can take several minutes.</div>';
  }

  try {
    const res = await fetch(RAILWAY_URL + '/api/build-compilation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: compilationState.plan.title || 'ClipAI Compilation',
        quality: '720p',
        removeWatermark: shouldRemoveWatermark(),
        plan: compilationState.plan,
        sources: compilationState.sources.map(source => ({
          index: source.index,
          originalUrl: source.originalUrl,
          localFileId: source.localFileId,
          duration: source.duration
        }))
      })
    });

    if (!res.ok) {
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch(e) {}
      throw new Error(data.error || raw.slice(0, 220) || 'Compilation build failed');
    }

    const blob = await res.blob();
    const safeTitle = (compilationState.plan.title || 'clipai_compilation').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = safeTitle + '_720p.mp4';
    const saved = await saveExportedVideo(blob, filename);

    if (out) {
      out.innerHTML =
        '<strong style="color:var(--green);display:block;margin-bottom:6px">Final compilation ready</strong>' +
        '<div style="color:var(--text2);font-size:13px;line-height:1.7">' +
        (saved.native ? 'Saved to your phone Gallery in Movies/ClipAI.' : 'Downloaded in your browser.') +
        '</div>';
    }
    toast('Final compilation ' + (saved.native ? 'saved to Gallery' : 'downloaded'), 5000);
    notifyNative('ClipAI compilation ready', 'Your final compilation video is ready.');
    await recordSuccessfulExport();
  } catch (err) {
    if (out) out.innerHTML = '<span style="color:var(--red)">' + escapeHTML(formatUserError(err, 'We could not create the final video. Please try again with fewer or shorter sources.')) + '</span>';
    toast(formatUserError(err, 'We could not create the final video. Please try again with fewer or shorter sources.'), 7000);
  } finally {
    compilationState.busy = false;
  }
}

function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.body.classList.toggle('light', nextTheme === 'light');
  localStorage.setItem('clipai_theme', nextTheme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = nextTheme === 'light' ? 'Dark mode' : 'Light mode';
}

function toggleTheme() {
  applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
}

function initTheme() {
  applyTheme(localStorage.getItem('clipai_theme') || 'dark');
}

function updateNewClipsButton() {
  const btn = document.getElementById('new-clips-btn');
  if (!btn) return;
  btn.classList.toggle('hidden', state.unlockedStage === 0 && !state.transcript && state.clips.length === 0);
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function setBtn(id, loading, loadingText = '...') {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.origText = btn.dataset.origText || btn.textContent;
  btn.textContent = loading ? loadingText : btn.dataset.origText;
}

// ═══ STAGES ═══
// Track how far the user has legitimately progressed
state.unlockedStage = 0;

function unlockStage(n) {
  if (n > state.unlockedStage) state.unlockedStage = n;
  // Re-render tab lock states without changing active tab
  document.querySelectorAll('.stage-btn').forEach((b, i) => {
    if (i <= state.unlockedStage) {
      b.style.pointerEvents = '';
      b.classList.remove('locked');
    }
  });
  updateNewClipsButton();
}

function goStage(n) {
  // Block navigation to stages not yet unlocked
  if (n > state.unlockedStage) {
    const messages = [
      '',
      'Upload a video first to continue.',
      'Let ClipAI finish reading the video first.',
      'Generate clips first to unlock Export.'
    ];
    toast(messages[n] || 'Complete the previous step first.');
    return;
    if (n === 3) renderCaptionPresets();
    drawAllVisibleCaptions();

  }

  document.querySelectorAll('.stage-btn').forEach((b, i) => {
    b.className = 'stage-btn' +
      (i === n ? ' active' : i < n ? ' done' : i <= state.unlockedStage ? '' : ' locked');
  });
  document.querySelectorAll('.panel').forEach((p, i) => {
    p.className = 'panel' + (i === n ? ' active' : '');
  });
  if (n === 3) {
    renderCaptionPresets();
    renderCaptionControls();
    renderCaptionExportControls();
    renderWatermarkControls();
    requestBilling().then(updateDashboardBilling).catch(() => renderWatermarkControls());
    renderExportSummary();
    setTimeout(() => drawAllVisibleCaptions(), 150);
  }
  updateNewClipsButton();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetProgressSteps() {
  ['step-upload', 'step-transcribe', 'step-speakers', 'step-moments', 'step-done'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'p-step' + (i === 0 ? ' active' : '');
  });
}

function createNewClips() {
  if (activeXHR) {
    activeXHR.abort();
    activeXHR = null;
  }
  if (state.localPreviewUrl && state.localPreviewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(state.localPreviewUrl);
  }
  if (activePreviewIndex !== null) {
    const activeVideo = document.getElementById('preview-video-' + activePreviewIndex);
    if (activeVideo) activeVideo.pause();
  }
  activePreviewIndex = null;
  exportInProgress = false;

  Object.assign(state, {
    transcriptId: null,
    transcript: null,
    utterances: [],
    highlights: [],
    words: [],
    duration: 0,
    clips: [],
    selectedClips: new Set(),
    selectedMoments: new Set(),
    sourceVideoUrl: '',
    transcriptionUrl: '',
    localFileId: null,
    localPreviewUrl: '',
    captionSettings: { size: 100, position: 78, words: 3 },
    burnCaptions: true,
    removeWatermark: false,
    ghostBrief: '',
    ghostPlan: null,
    ghostAutoRun: false,
    ghostBusy: false,
    hookVariants: [],
    hookBusy: false,
    memoryProfile: null,
    memoryBusy: false,
    clipsReadyNotified: false,
    unlockedStage: 0
  });

  const idsToClear = ['url-input', 'moments-query', 'clip-query', 'cap-query', 'ghost-brief', 'ghost-brief-results'];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['ghost-status', 'ghost-upload-status', 'hook-lab-output', 'memory-output'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('show'); el.textContent = ''; }
  });

  const fileEl = document.getElementById('file-input');
  if (fileEl) fileEl.value = '';
  const uploadProgress = document.getElementById('upload-progress');
  if (uploadProgress) uploadProgress.style.display = 'none';
  const uploadBar = document.getElementById('upload-bar');
  if (uploadBar) uploadBar.style.width = '0%';
  const uploadPct = document.getElementById('upload-pct');
  if (uploadPct) uploadPct.textContent = '0%';
  const uploadSize = document.getElementById('upload-size');
  if (uploadSize) uploadSize.textContent = '';
  const transBar = document.getElementById('trans-bar');
  if (transBar) transBar.style.width = '0%';
  const transPct = document.getElementById('trans-pct');
  if (transPct) transPct.textContent = '0%';
  const transStatus = document.getElementById('trans-status');
  if (transStatus) {
    transStatus.textContent = 'Preparing your video...';
    transStatus.style.color = '';
  }

  const transProgress = document.getElementById('transcribe-progress');
  if (transProgress) transProgress.style.display = 'block';
  const transResults = document.getElementById('transcribe-results');
  if (transResults) transResults.style.display = 'none';
  const clipsLoading = document.getElementById('clips-loading');
  if (clipsLoading) clipsLoading.style.display = 'flex';
  const clipsGrid = document.getElementById('clips-grid');
  if (clipsGrid) {
    clipsGrid.style.display = 'none';
    clipsGrid.innerHTML = '';
  }
  ['stats-row', 'transcript-content', 'moments-grid', 'moments-ai-out', 'clip-ai-out', 'cap-ai-out', 'export-summary'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = '';
      if (el.classList.contains('ai-output') || id === 'cap-ai-out') el.style.display = 'none';
    }
  });

  resetProgressSteps();
  goStage(0);
  updateNewClipsButton();
  toast('Ready for a new video.');
}

// ═══ UPLOAD ═══
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) uploadFile(fileInput.files[0]);
});

// Active XHR so we can cancel it
let activeXHR = null;

function cancelUpload() {
  if (activeXHR) {
    activeXHR.abort();
    activeXHR = null;
  }
  document.getElementById('upload-progress').style.display = 'none';
  document.getElementById('upload-bar').style.width = '0%';
  toast('Upload cancelled.');
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function setPreviewVideoUrl(url) {
  if (state.localPreviewUrl && state.localPreviewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(state.localPreviewUrl);
  }
  state.localPreviewUrl = url || '';
  state.sourceVideoUrl = state.localPreviewUrl;
}

function getBackendPreviewUrl(localFileId = state.localFileId) {
  return localFileId ? RAILWAY_URL + '/api/serve-upload-file/' + encodeURIComponent(localFileId) : '';
}

function getPreviewSource() {
  return state.sourceVideoUrl || state.localPreviewUrl || getBackendPreviewUrl();
}

async function uploadFile(file) {
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) { toast('File too large. Max 500MB.'); return; }

  setPreviewVideoUrl(URL.createObjectURL(file));

  document.getElementById('upload-progress').style.display = 'block';
  document.getElementById('upload-status').textContent = 'Uploading ' + file.name + '...';
  document.getElementById('upload-bar').style.width = '0%';
  document.getElementById('upload-pct').textContent = '0%';
  document.getElementById('upload-size').textContent = '0 B / ' + formatBytes(file.size);

  // Upload via our local server (saves file locally for FFmpeg cutting + uploads to AssemblyAI)
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    activeXHR = xhr;
    // Send as raw binary — simpler, faster, no multipart parsing needed
    // Upload goes to Railway (needs local storage for FFmpeg cutting)
    xhr.open('POST', RAILWAY_URL + '/api/upload-local', true);
    xhr.setRequestHeader('content-type', 'application/octet-stream');
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        document.getElementById('upload-bar').style.width = pct + '%';
        document.getElementById('upload-pct').textContent = pct + '%';
        document.getElementById('upload-size').textContent = formatBytes(e.loaded) + ' / ' + formatBytes(e.total);
        if (pct === 100) {
          document.getElementById('upload-status').textContent = 'Processing upload...';
        }
      }
    });

    xhr.addEventListener('load', async () => {
      activeXHR = null;
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        document.getElementById('upload-bar').style.width = '100%';
        document.getElementById('upload-pct').textContent = '100%';
        document.getElementById('upload-status').textContent = 'Upload complete!';
        document.getElementById('upload-size').textContent = formatBytes(file.size) + ' uploaded';
        state.localFileId = data.localFileId;
        state.transcriptionUrl = data.uploadUrl;
        if (data.previewUrl || data.videoUrl || data.localVideoUrl) {
          setPreviewVideoUrl(data.previewUrl || data.videoUrl || data.localVideoUrl);
        } else if (!getPreviewSource()) {
          setPreviewVideoUrl(getBackendPreviewUrl(data.localFileId));
        }
        notifyNative('ClipAI upload complete', 'Your video uploaded successfully. Transcription is starting now.');
        await startTranscription(state.transcriptionUrl);
      } else {
        let errMsg = 'Upload failed';
        try { errMsg = JSON.parse(xhr.responseText).error || errMsg; } catch(e) {}
        toast(formatUserError(errMsg, 'We could not upload this file. Please try again.'), 6000);
        document.getElementById('upload-progress').style.display = 'none';
      }
      resolve();
    });

    xhr.addEventListener('error', () => {
      activeXHR = null;
      toast('Upload error — check your internet connection.');
      document.getElementById('upload-progress').style.display = 'none';
      resolve();
    });

    xhr.addEventListener('abort', () => {
      activeXHR = null;
      resolve();
    });

    xhr.send(file);
  });
}

async function submitUrl() {
  const url = document.getElementById('url-input').value.trim();
  if (!url) { toast('Please enter a video URL'); return; }

  const isYouTube = /youtube\.com|youtu\.be|youtube-nocookie\.com/.test(url);

  if (isYouTube) {
    document.getElementById('upload-progress').style.display = 'block';
    document.getElementById('upload-status').textContent = 'Downloading YouTube audio... (1-2 minutes)';
    document.getElementById('upload-bar').style.width = '5%';
    document.getElementById('upload-pct').textContent = '5%';
    document.getElementById('upload-size').textContent = 'Connecting to YouTube...';

    let fakePct = 5;
    const fakeTimer = setInterval(() => {
      if (fakePct < 85) {
        fakePct += (85 - fakePct) * 0.02;
        document.getElementById('upload-bar').style.width = fakePct.toFixed(1) + '%';
        document.getElementById('upload-pct').textContent = Math.round(fakePct) + '%';
      }
    }, 500);

    try {
      // Step 1: Get direct download URL from the same helper Compilation Studio uses.
      document.getElementById('upload-size').textContent = 'Getting download link...';
      const directUrl = await getYouTubeDirectUrl(url);

      document.getElementById('upload-size').textContent = 'Preparing your video...';

      // Step 2: Send direct URL to backend for download + AssemblyAI upload
      const res = await fetch(RAILWAY_URL + '/api/youtube-upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: directUrl, originalUrl: url })
      });
      const data = await res.json();
      clearInterval(fakeTimer);

      if (!res.ok) throw new Error(data.error || 'YouTube download failed');

      document.getElementById('upload-bar').style.width = '100%';
      document.getElementById('upload-pct').textContent = '100%';
      document.getElementById('upload-status').textContent = 'YouTube video ready!';
      document.getElementById('upload-size').textContent = 'Video ready. Starting analysis...';

      state.localFileId = data.localFileId;
      state.transcriptionUrl = data.uploadUrl;
      setPreviewVideoUrl(data.previewUrl || data.videoUrl || data.localVideoUrl || getBackendPreviewUrl(data.localFileId));
      notifyNative('ClipAI upload complete', 'Your video is ready. Analysis is starting now.');
      if (!state.sourceVideoUrl) {
        toast('Video imported, but preview URL was not returned by backend.', 5000);
      }
      await startTranscription(state.transcriptionUrl);
    } catch (err) {
      clearInterval(fakeTimer);
      document.getElementById('upload-progress').style.display = 'none';
      toast(formatUserError(err, 'We could not open that YouTube link. Please check the link and try again.'), 6000);
    }
    return;
  }

  state.transcriptionUrl = url;
  setPreviewVideoUrl(url);
  await startTranscription(state.transcriptionUrl);
}

// YouTube help removed — yt-dlp now handles YouTube directly

async function startTranscription(videoUrl) {
  // Make sure workspace is visible
  const dashboard = document.getElementById('dashboard');
  const workspace = document.getElementById('workspace');
  if (dashboard) dashboard.style.display = 'none';
  if (workspace) workspace.style.display = 'block';
  document.body.classList.remove('awaiting-choice');
  document.body.classList.add('workspace-active');
  currentCreationMode = 'clips';
  document.querySelector('.stages')?.style.setProperty('display', 'flex');
  document.getElementById('compilation-studio')?.style.setProperty('display', 'none');
  document.querySelectorAll('.panel').forEach(panel => { panel.style.display = ''; });
  const backBtn = document.getElementById('back-to-dashboard-btn');
  if (backBtn) backBtn.classList.remove('hidden');
  // Unlock FIRST so goStage can navigate
  unlockStage(1);
  goStage(1);

  // Now set up the UI (panel is visible now)
  document.getElementById('transcribe-progress').style.display = 'block';
  document.getElementById('transcribe-results').style.display = 'none';
  updateStep('step-upload', 'done');
  updateStep('step-transcribe', 'active');
  document.getElementById('trans-bar').style.width = '10%';
  document.getElementById('trans-pct').textContent = '10%';
  document.getElementById('trans-status').textContent = 'Preparing your video...';

  try {
    console.log('[ClipAI] Submitting video URL to transcribe API:', videoUrl.substring(0, 80));
    const res = await fetch(API_URL + '/api/transcribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ videoUrl })
    });

    let data;
    const rawText = await res.text();
    console.log('[ClipAI] Transcribe API raw response:', rawText.substring(0, 300));
    try { data = JSON.parse(rawText); } catch(e) { throw new Error('Server returned invalid response: ' + rawText.substring(0, 100)); }

    if (!res.ok) throw new Error(data.error || 'Server error ' + res.status);

    state.transcriptId = data.transcriptId || data.id;
    if (!state.transcriptId) throw new Error('No transcript ID in response: ' + JSON.stringify(data));

    console.log('[ClipAI] Got transcript ID:', state.transcriptId);
    document.getElementById('trans-bar').style.width = '18%';
    document.getElementById('trans-pct').textContent = '18%';
    document.getElementById('trans-status').textContent = 'Queued — waiting for processing...';
    pollTranscript();
  } catch (err) {
    console.error('[ClipAI] Transcription failed:', err.message);
    // Show error on the transcribe page instead of silently going back
    document.getElementById('trans-status').textContent = formatUserError(err, 'We could not process this video. Please try again.');
    document.getElementById('trans-status').style.color = 'var(--red)';
    document.getElementById('trans-bar').style.width = '0%';
    document.getElementById('trans-bar').style.background = 'var(--red)';
    toast(formatUserError(err, 'We could not process this video. Please try again.'), 6000);
    // Stay on transcribe page so user can see the error
  }
}

function updateStep(id, status) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'p-step ' + status;
}

function setProgress(barId, pctId, pct, label) {
  document.getElementById(barId).style.width = pct + '%';
  document.getElementById(pctId).textContent = pct + '%';
  if (label) document.getElementById('trans-status').textContent = label;
}

async function pollTranscript() {
  let attempts = 0;
  const maxAttempts = 180;
  let simulatedPct = 18;

  // Smoothly creep the bar forward while we wait so it never looks frozen
  const animator = setInterval(() => {
    if (simulatedPct < 85) {
      simulatedPct += (85 - simulatedPct) * 0.03; // ease toward 85%
      document.getElementById('trans-bar').style.width = simulatedPct.toFixed(1) + '%';
      document.getElementById('trans-pct').textContent = Math.round(simulatedPct) + '%';
    }
  }, 500);

  const setStatus = (text) => {
    const el = document.getElementById('trans-status');
    if (el) el.textContent = text;
    console.log('[ClipAI]', text);
  };

  const showError = (msg) => {
    clearInterval(animator);
    console.error('[ClipAI] Error:', msg);
    const el = document.getElementById('trans-status');
    if (el) { el.textContent = formatUserError(msg, 'We could not process this video. Please try again.'); el.style.color = 'var(--red)'; }
    setTimeout(() => { toast(formatUserError(msg, 'We could not process this video. Please try again.')); goStage(0); }, 2000);
  };

  const poll = async () => {
    try {
      console.log('[ClipAI] Polling transcript ID:', state.transcriptId, 'attempt', attempts + 1);
      const res = await fetch(API_URL + '/api/transcript-status?id=' + state.transcriptId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error('Server error ' + res.status + ': ' + text);
      }

      const data = await res.json();
      console.log('[ClipAI] Poll response:', data.status);

      if (data.status === 'queued') {
        setStatus('Queued — waiting for processing slot...');
        updateStep('step-upload', 'done');
        updateStep('step-transcribe', 'active');

      } else if (data.status === 'processing') {
        setStatus('Reading your video...');
        updateStep('step-upload', 'done');
        updateStep('step-transcribe', 'active');
        if (attempts > 3) {
          setStatus('Detecting speakers...');
          updateStep('step-speakers', 'active');
        }

      } else if (data.status === 'completed') {
        clearInterval(animator);
        updateStep('step-transcribe', 'done');
        updateStep('step-speakers', 'done');
        updateStep('step-moments', 'active');
        document.getElementById('trans-bar').style.width = '92%';
        document.getElementById('trans-pct').textContent = '92%';
        setStatus('Analyzing key moments...');

        state.transcript = data.text;
        state.utterances = data.utterances || [];
        state.highlights = data.highlights || [];
        state.words = data.words || [];
        state.duration = data.duration || 0;

        setTimeout(() => {
          updateStep('step-moments', 'done');
          updateStep('step-done', 'done');
          document.getElementById('trans-bar').style.width = '100%';
          document.getElementById('trans-pct').textContent = '100%';
          setStatus('Complete!');
          setTimeout(showTranscriptResults, 700);
        }, 900);
        return;

      } else if (data.status === 'error') {
        showError(data.error || 'Audio processing failed');
        return;
      } else {
        setStatus('Status: ' + data.status + '...');
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 4000);
      } else {
        showError('Timed out after 12 minutes. Please try again.');
      }
    } catch (err) {
      showError(err.message);
    }
  };

  // Start first poll after 2s
  setTimeout(poll, 2000);
}

function showTranscriptResults() {
  document.getElementById('transcribe-progress').style.display = 'none';
  document.getElementById('transcribe-results').style.display = 'block';
  unlockStage(2);
  toast('Video analysis complete. Showing results...');

  // Stats
  const words = state.transcript ? state.transcript.split(' ').length : 0;
  const speakers = new Set(state.utterances.map(u => u.speaker)).size;
  const dur = state.duration ? formatTime(state.duration * 1000) : '--:--';

  document.getElementById('stats-row').innerHTML = `
    <div class="stat"><div class="stat-val">${dur}</div><div class="stat-label">duration</div></div>
    <div class="stat"><div class="stat-val">${words.toLocaleString()}</div><div class="stat-label">words</div></div>
    <div class="stat"><div class="stat-val">${speakers}</div><div class="stat-label">speakers</div></div>
    <div class="stat"><div class="stat-val">${state.highlights.length}</div><div class="stat-label">key moments</div></div>
  `;

  // Transcript
  const tcEl = document.getElementById('transcript-content');
  if (state.utterances.length > 0) {
    tcEl.innerHTML = state.utterances.slice(0, 40).map(u =>
      `<span class="t-speaker">[Speaker ${u.speaker} · ${formatTime(u.start)}]</span>${u.text}`
    ).join('\n');
  } else {
    tcEl.textContent = (state.transcript || '').substring(0, 3000);
  }

  // Moments
  renderMoments();
  syncGhostBriefInputs(state.ghostBrief || '');
  if (state.ghostAutoRun && state.ghostBrief && !state.ghostBusy) {
    setTimeout(() => runGhostEditor({ auto: true }), 500);
  }
}

function renderMoments() {
  const grid = document.getElementById('moments-grid');
  const moments = state.highlights.length > 0
    ? state.highlights.slice(0, 9)
    : buildMomentsFromUtterances();

  grid.innerHTML = moments.map((m, i) => {
    const ts = m.timestamps?.[0] || { start: m.start_ms || 0, end: m.end_ms || 0 };
    const rankPct = Math.round((m.rank || 0.7) * 100);
    return `
      <div class="moment-card" id="mc${i}" onclick="toggleMoment(${i})">
        <div class="moment-time">${formatTime(ts.start)} – ${formatTime(ts.end)}</div>
        <div class="moment-text">"${m.text.slice(0, 90)}${m.text.length > 90 ? '...' : ''}"</div>
        <div class="moment-bar"><div class="moment-bar-fill" style="width:${rankPct}%"></div></div>
      </div>
    `;
  }).join('');
}

function buildMomentsFromUtterances() {
  return state.utterances
    .filter(u => u.text.length > 50)
    .slice(0, 9)
    .map(u => ({
      text: u.text,
      rank: u.confidence || 0.7,
      timestamps: [{ start: u.start, end: u.end }]
    }));
}

function toggleMoment(i) {
  const el = document.getElementById('mc' + i);
  if (state.selectedMoments.has(i)) {
    state.selectedMoments.delete(i);
    el.classList.remove('sel');
  } else {
    state.selectedMoments.add(i);
    el.classList.add('sel');
  }
}

async function askMomentsAI() {
  const q = document.getElementById('moments-query').value.trim();
  if (!q) { toast('Enter a question first'); return; }
  setBtn('moments-ask-btn', true, '...');
  const out = document.getElementById('moments-ai-out');
  out.style.display = 'block';
  out.textContent = 'Analyzing...';

  try {
    const res = await fetch(API_URL + '/api/suggest-clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: state.transcript,
        utterances: state.utterances.slice(0, 50),
        highlights: state.highlights.slice(0, 8),
        duration: state.duration,
        customPrompt: q
      })
    });
    const data = await res.json();
    if (data.clips?.length > 0) {
      out.textContent = data.clips.map((c, i) =>
        `Clip ${i + 1}: "${c.title}" (${c.start_ms ? formatTime(c.start_ms) : '?'} – ${c.end_ms ? formatTime(c.end_ms) : '?'})\n${c.why}`
      ).join('\n\n');
    } else {
      out.textContent = data.error ? formatUserError(data.error, 'We could not find matching moments. Try a simpler request.') : 'No matching moments found.';
    }
  } catch (err) {
    out.textContent = formatUserError(err, 'We could not search the moments right now. Please try again.');
  }
  setBtn('moments-ask-btn', false);
}

// Ghost Editor turns a plain-English brief into ready-to-export clips.
function syncGhostBriefInputs(value) {
  ['ghost-brief', 'ghost-brief-results'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== value) el.value = value;
  });
}

function setGhostBrief(value) {
  state.ghostBrief = (value || '').trim();
  state.ghostAutoRun = !!state.ghostBrief;
  syncGhostBriefInputs(value || '');
}

function useGhostExample(value) {
  setGhostBrief(value);
  rememberGhostBrief();
}

function rememberGhostBrief() {
  const brief = state.ghostBrief || (document.getElementById('ghost-brief')?.value || '').trim();
  if (!brief) { toast('Describe the Ghost edit first'); return; }
  state.ghostBrief = brief;
  state.ghostAutoRun = true;
  syncGhostBriefInputs(brief);
  const status = document.getElementById('ghost-upload-status');
  if (status) {
    status.textContent = 'Ghost brief saved. Upload or paste a video URL and ClipAI will apply it after analysis.';
    status.classList.add('show');
  }
  toast('Ghost brief saved');
}

function setGhostStatus(message, showPlan) {
  const el = document.getElementById('ghost-status') || document.getElementById('ghost-upload-status');
  if (!el) return;
  el.classList.add('show');
  el.innerHTML = message;
  if (showPlan && state.ghostPlan) {
    el.innerHTML += renderGhostPlan(state.ghostPlan);
  }
}

function renderGhostPlan(plan) {
  const clips = plan.clips || [];
  const rows = clips.map((clip, i) =>
    '<div class="ghost-plan-row">' +
      '<strong>' + escapeHTML((i + 1) + '. ' + (clip.title || 'Ghost clip')) + '</strong>' +
      '<span>' + escapeHTML(formatTime(clip.start_ms || 0) + ' - ' + formatTime(clip.end_ms || 0)) + '</span>' +
    '</div>'
  ).join('');
  return '<div class="ghost-plan">' +
    '<div style="color:var(--accent2);font-family:var(--mono);font-size:11px">Ghost edit plan</div>' +
    rows +
    '<div style="color:var(--text3);font-size:12px;margin-top:4px">' + escapeHTML(plan.plan_summary || 'Ready to preview and export.') + '</div>' +
  '</div>';
}

function applyGhostPlan(plan) {
  state.ghostPlan = plan;
  state.clips = (plan.clips || []).map((clip, i) => ({
    title: clip.title || ('Ghost Edit ' + (i + 1)),
    hook: clip.hook || clip.title || '',
    start_ms: clip.start_ms || 0,
    end_ms: clip.end_ms || 0,
    duration_s: clip.duration_s || Math.max(1, Math.round(((clip.end_ms || 0) - (clip.start_ms || 0)) / 1000)),
    speaker: clip.speaker || '?',
    caption_lines: clip.caption_lines || [],
    why: clip.why || plan.plan_summary || 'Selected by Ghost Editor from your brief.',
    platform_fit: clip.platform_fit || [plan.platform || 'tiktok', 'reels', 'shorts'],
    energy: clip.energy || plan.energy || 'high'
  }));
  state.selectedClips.clear();
  state.clips.forEach((_, i) => state.selectedClips.add(i));
  const preset = plan.caption_preset || CAPTION_STYLE_TO_PRESET[plan.caption_style] || 'tiktok-bold';
  selectedPreset = preset;
  state.captionStyle = PRESET_TO_CAPTION_STYLE[preset] || plan.caption_style || state.captionStyle;
  state.captionSettings = {
    size: plan.caption_settings?.size || 100,
    position: plan.caption_settings?.position || 78,
    words: plan.caption_settings?.words || 3
  };
}

async function runGhostEditor(options = {}) {
  const brief = state.ghostBrief || (document.getElementById('ghost-brief-results')?.value || '').trim() || (document.getElementById('ghost-brief')?.value || '').trim();
  if (!brief) { toast('Describe the Ghost edit first'); return; }
  if (!state.transcript) {
    state.ghostBrief = brief;
    state.ghostAutoRun = true;
    rememberGhostBrief();
    return;
  }
  if (state.ghostBusy) return;

  state.ghostBrief = brief;
  syncGhostBriefInputs(brief);
  state.ghostBusy = true;
  setBtn('ghost-run-btn', true, 'Editing...');
  setGhostStatus('<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div><span>Ghost Editor is reading the transcript and building your edit...</span></div>');

  try {
    const res = await fetch(RAILWAY_URL + '/api/ghost-edit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brief,
        transcript: state.transcript,
        utterances: state.utterances.slice(0, 90),
        highlights: state.highlights.slice(0, 12),
        words: state.words.slice(0, 1200),
        duration: state.duration
      })
    });
    const plan = await res.json();
    if (!res.ok) throw new Error(plan.error || 'Ghost Editor failed');
    applyGhostPlan(plan);
    unlockStage(3);
    goStage(2);
    renderClips();
    const clipOut = document.getElementById('clip-ai-out');
    if (clipOut) {
      clipOut.style.display = 'block';
      clipOut.innerHTML = '<strong style="color:var(--accent2)">Ghost edit ready.</strong> All clips are selected, caption settings are applied, and the export tab is unlocked.' + renderGhostPlan(plan);
    }
    setGhostStatus('Ghost edit ready. The clips are selected and caption settings are applied.', true);
    toast(options.auto ? 'Ghost edit created automatically' : 'Ghost edit created');
  } catch (err) {
    setGhostStatus('<span style="color:var(--red)">' + escapeHTML(formatUserError(err, 'We could not create that edit. Please try again.')) + '</span>');
    toast(formatUserError(err, 'We could not create that edit. Please try again.'), 6000);
  }

  state.ghostBusy = false;
  setBtn('ghost-run-btn', false);
}

const CAPTION_STYLES = {
  tiktok: {
    label: 'TikTok bold',
    font: '800 28px Syne, Arial',
    color: '#ffffff',
    stroke: '#000000',
    bg: 'rgba(0,0,0,0.35)',
    highlight: '#7c6af7',
    y: 0.78,
    uppercase: false
  },
  mrbeast: {
    label: 'MrBeast yellow',
    font: '900 30px Arial Black, Arial',
    color: '#ffe600',
    stroke: '#000000',
    bg: 'rgba(0,0,0,0.15)',
    highlight: '#ff3b30',
    y: 0.76,
    uppercase: true
  },
  minimal: {
    label: 'Minimal white',
    font: '600 24px Arial',
    color: '#ffffff',
    stroke: 'rgba(0,0,0,0.55)',
    bg: 'transparent',
    highlight: '#ffffff',
    y: 0.82,
    uppercase: false
  },
  karaoke: {
    label: 'Karaoke highlight',
    font: '800 27px Syne, Arial',
    color: '#ffffff',
    stroke: '#000000',
    bg: 'rgba(0,0,0,0.35)',
    highlight: '#3ecf8e',
    y: 0.78,
    uppercase: false,
    karaoke: true
  },
  neon: {
    label: 'Neon glow',
    font: '800 26px Arial',
    color: '#00ff88',
    stroke: '#00331f',
    bg: 'transparent',
    highlight: '#00ff88',
    y: 0.78,
    uppercase: true
  },
  subtitle: {
    label: 'Subtitle box',
    font: '500 22px Arial',
    color: '#ffffff',
    stroke: 'transparent',
    bg: 'rgba(0,0,0,0.75)',
    highlight: '#ffffff',
    y: 0.82,
    uppercase: false
  }
};

const PRESET_TO_CAPTION_STYLE = {
  'tiktok-bold': 'tiktok',
  'yellow-pop': 'mrbeast',
  'minimal-white': 'minimal',
  karaoke: 'karaoke',
  neon: 'neon',
  subtitle: 'subtitle'
};

const CAPTION_STYLE_TO_PRESET = {
  tiktok: 'tiktok-bold',
  mrbeast: 'yellow-pop',
  minimal: 'minimal-white',
  karaoke: 'karaoke',
  neon: 'neon',
  subtitle: 'subtitle'
};

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function renderCaptionPresets() {
  const el = document.getElementById('caption-presets');
  if (!el) return;

  el.innerHTML = Object.entries(CAPTION_STYLES).map(([key, style]) =>
    '<button class="caption-preset ' + (state.captionStyle === key ? 'active' : '') + '" onclick="setCaptionStyle(\'' + key + '\')">' +
      escapeHTML(style.label) +
    '</button>'
  ).join('');
}

function setCaptionStyle(key) {
  state.captionStyle = key;
  selectedPreset = CAPTION_STYLE_TO_PRESET[key] || selectedPreset;
  renderCaptionPresets();
  renderCaptionControls();
  drawAllVisibleCaptions();
}

function renderCaptionControls() {
  const settings = state.captionSettings || { size: 100, position: 78, words: 3 };
  const size = document.getElementById('caption-size-range');
  const position = document.getElementById('caption-position-range');
  const words = document.getElementById('caption-density-range');
  const sizeValue = document.getElementById('caption-size-value');
  const positionValue = document.getElementById('caption-position-value');
  const wordsValue = document.getElementById('caption-density-value');
  const preview = document.getElementById('caption-mini-text');
  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.tiktok;

  if (size) size.value = settings.size;
  if (position) position.value = settings.position;
  if (words) words.value = settings.words;
  if (sizeValue) sizeValue.textContent = settings.size + '%';
  if (positionValue) positionValue.textContent = settings.position + '%';
  if (wordsValue) wordsValue.textContent = settings.words;
  if (preview) {
    preview.style.color = style.color;
    preview.style.font = style.font.replace(/(\d+)px/, (_, px) => Math.round(Number(px) * settings.size / 100) + 'px');
    preview.style.textTransform = style.uppercase ? 'uppercase' : 'none';
    preview.style.textShadow = style.stroke === 'transparent' ? 'none' : '2px 2px 0 ' + style.stroke;
    preview.style.background = style.bg === 'transparent' ? 'transparent' : style.bg;
    preview.style.padding = style.bg === 'transparent' ? '0' : '8px 12px';
    preview.style.borderRadius = '8px';
  }
}

function updateCaptionSetting(key, value) {
  const next = Number(value);
  if (!state.captionSettings) state.captionSettings = { size: 100, position: 78, words: 3 };
  if (key === 'size') state.captionSettings.size = Math.max(80, Math.min(125, next));
  if (key === 'position') state.captionSettings.position = Math.max(62, Math.min(88, next));
  if (key === 'words') state.captionSettings.words = Math.max(2, Math.min(4, Math.round(next)));
  renderCaptionControls();
  drawAllVisibleCaptions();
}


// ═══ CLIPS ═══
async function goToClips() {
  goStage(2);
  document.getElementById('clips-loading').style.display = 'flex';
  document.getElementById('clips-grid').style.display = 'none';

  try {
    const res = await fetch(API_URL + '/api/suggest-clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: state.transcript,
        utterances: state.utterances.slice(0, 60),
        highlights: state.highlights.slice(0, 10),
        duration: state.duration
      })
    });
    const data = await res.json();
    state.clips = data.clips || [];
    renderClips();
    // Auto-advance toast
    toast('Clips ready! Review and select, then continue to export.');
  } catch (err) {
    toast(formatUserError(err, 'We could not generate clips from this video. Please try again.'));
    state.clips = [];
    renderClips();
  }
}

function renderClips() {
  document.getElementById('clips-loading').style.display = 'none';
  const grid = document.getElementById('clips-grid');
  grid.style.display = 'grid';

  if (state.clips.length === 0) {
    grid.innerHTML = '<p style="color:var(--text2);padding:20px 0">No clips generated. Try entering a custom prompt below.</p>';
    return;
  }

  grid.innerHTML = state.clips.map((c, i) => {
    const energyClass = 'energy-' + (c.energy || 'medium');
    const dur = c.duration_s ? c.duration_s + 's' : '?s';
    const platforms = (c.platform_fit || ['tiktok', 'reels']).map(p =>
      '<span class="plat-tag">' + escapeHTML(p) + '</span>').join('');
    const start = c.start_ms ? formatTime(c.start_ms) : '?';
    const end = c.end_ms ? formatTime(c.end_ms) : '?';
    const hookBadge = c.hook_overlay
      ? '<div class="hook-applied">Hook overlay: ' + escapeHTML(c.hook_overlay.slice(0, 52)) + (c.hook_overlay.length > 52 ? '...' : '') + '</div>'
      : '';
    const memoryBadge = c.memory_score
      ? '<div class="memory-pill">Memory fit ' + escapeHTML(String(c.memory_score)) + '/100' + (c.memory_reason ? ' · ' + escapeHTML(c.memory_reason.slice(0, 42)) : '') + '</div>'
      : '';

    return '<div class="clip-card sel" id="clip' + i + '">' +
      '<div class="clip-preview-wrap">' +
        '<video class="clip-preview-video" id="preview-video-' + i + '" muted playsinline preload="metadata" src="' + escapeHTML(getPreviewSource()) + '"></video>' +
        '<canvas class="clip-caption-canvas" id="preview-canvas-' + i + '"></canvas>' +
        '<button class="preview-play" onclick="event.stopPropagation(); toggleClipPreview(' + i + ')">▶</button>' +
        '<div class="clip-dur">' + dur + '</div>' +
        '<div class="clip-energy ' + energyClass + '">' + escapeHTML(c.energy || 'medium') + '</div>' +
      '</div>' +
      '<div class="clip-info">' +
 	'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
    	'<div onclick="toggleClip(' + i + ')" style="flex:1;cursor:pointer">' +
        '<div class="clip-title">' + escapeHTML(c.title || 'Clip ' + (i+1)) + '</div>' +
	'</div>' +
	'<button onclick="openPreview(' + i + ')" style="background:var(--accent-dim);border:1px solid rgba(124,106,247,0.3);color:var(--accent2);padding:4px 10px;border-radius:6px;font-		family:var(--font);font-size:11px;cursor:pointer;white-space:nowrap">▷ Preview</button>' +
	'</div>' +
        '<div class="clip-sub">Speaker ' + escapeHTML(c.speaker || '?') + ' · ' + escapeHTML(start + ' → ' + end) + '</div>' +
        '<div class="clip-why">' + escapeHTML(c.why ? c.why.slice(0,90) + '...' : '') + '</div>' +
        hookBadge +
        memoryBadge +
        '<div class="clip-platforms" style="margin-top:6px">' + platforms + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  state.selectedClips.clear();
  state.clips.forEach((_, i) => state.selectedClips.add(i));
  unlockStage(3);
  renderCaptionPresets();
  renderCaptionControls();
  if (!state.clipsReadyNotified) {
    state.clipsReadyNotified = true;
    notifyNative('ClipAI clips ready', 'Your clips are ready for captions and export.');
  }

  setTimeout(() => drawAllVisibleCaptions(), 300);
}


function toggleClip(i) {
  const el = document.getElementById('clip' + i);
  if (state.selectedClips.has(i)) {
    state.selectedClips.delete(i);
    el.classList.remove('sel');
  } else {
    state.selectedClips.add(i);
    el.classList.add('sel');
  }
}

async function askClipAI() {
  const q = document.getElementById('clip-query').value.trim();
  if (!q) { toast('Describe what clip you want'); return; }
  setBtn('clip-ask-btn', true, '...');
  const out = document.getElementById('clip-ai-out');
  out.style.display = 'block';
  out.textContent = 'Generating...';

  try {
    const res = await fetch(API_URL + '/api/suggest-clips', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: state.transcript,
        utterances: state.utterances.slice(0, 60),
        highlights: state.highlights.slice(0, 10),
        duration: state.duration,
        customPrompt: q
      })
    });
    const data = await res.json();
    if (data.clips?.length > 0) {
      const c = data.clips[0];
      out.textContent = `"${c.title}"\n${formatTime(c.start_ms || 0)} – ${formatTime(c.end_ms || 0)} (${c.duration_s}s)\n\n${c.why}\n\nHook: "${c.hook}"\n\nCaptions:\n${(c.caption_lines || []).join('\n')}`;
    } else {
      out.textContent = data.error ? formatUserError(data.error, 'No clip found for that request.') : 'No clip found for that request.';
    }
  } catch (err) {
    out.textContent = formatUserError(err, 'We could not create a clip from that request. Please try another prompt.');
  }
  setBtn('clip-ask-btn', false);
}

function getSelectedHookLabClips() {
  const selected = Array.from(state.selectedClips).map(i => ({
    index: i,
    clip: state.clips[i]
  })).filter(item => item.clip);
  if (selected.length) return selected;
  return state.clips.slice(0, 3).map((clip, index) => ({ index, clip }));
}

function renderHookLab(variants) {
  const out = document.getElementById('hook-lab-output');
  if (!out) return;
  state.hookVariants = variants || [];
  if (!state.hookVariants.length) {
    out.classList.add('show');
    out.innerHTML = '<div class="hook-variant"><div class="hook-note">No hook variants returned. Try generating clips first.</div></div>';
    return;
  }

  out.classList.add('show');
  out.innerHTML = state.hookVariants.map((variant, i) => {
    const clip = state.clips[variant.clip_index];
    const clipTitle = clip?.title || ('Clip ' + (variant.clip_index + 1));
    const applied = clip?.hook_overlay && clip.hook_overlay === variant.hook;
    return '<div class="hook-variant">' +
      '<div class="hook-variant-top">' +
        '<div><div class="hook-type">' + escapeHTML(variant.angle || 'hook') + '</div>' +
        '<div class="hook-score">For ' + escapeHTML(clipTitle) + '</div></div>' +
        '<div class="hook-score">' + escapeHTML(variant.predicted_reaction || 'strong opener') + '</div>' +
      '</div>' +
      '<div class="hook-line">' + escapeHTML(variant.hook || '') + '</div>' +
      '<div class="hook-note">' + escapeHTML(variant.why || '') + '</div>' +
      (applied ? '<div class="hook-applied">Applied to export overlay</div>' : '') +
      '<div class="hook-actions">' +
        '<button class="hook-mini-btn" type="button" onclick="applyHookVariant(' + i + ')">Apply to export</button>' +
        '<button class="hook-mini-btn" type="button" onclick="copyHookVariant(' + i + ')">Copy hook</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function runHookLab() {
  const selected = getSelectedHookLabClips();
  if (!selected.length) { toast('Generate clips first'); return; }
  if (state.hookBusy) return;
  state.hookBusy = true;
  setBtn('hook-lab-btn', true, 'Generating...');
  const out = document.getElementById('hook-lab-output');
  if (out) {
    out.classList.add('show');
    out.innerHTML = '<div class="hook-variant"><div style="display:flex;align-items:center;gap:10px;color:var(--text2)"><div class="spinner"></div>Building hook variants from your selected clips...</div></div>';
  }

  try {
    const res = await fetch(RAILWAY_URL + '/api/hook-lab', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transcript: state.transcript,
        words: state.words.slice(0, 1000),
        clips: selected.map(item => ({
          index: item.index,
          title: item.clip.title,
          hook: item.clip.hook,
          why: item.clip.why,
          caption_lines: item.clip.caption_lines || [],
          start_ms: item.clip.start_ms,
          end_ms: item.clip.end_ms,
          duration_s: item.clip.duration_s,
          speaker: item.clip.speaker
        }))
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hook Lab failed');
    renderHookLab(data.variants || []);
    toast('Hook variants ready');
  } catch (err) {
    if (out) out.innerHTML = '<div class="hook-variant"><div class="hook-note" style="color:var(--red)">' + escapeHTML(formatUserError(err, 'We could not create hook ideas right now. Please try again.')) + '</div></div>';
    toast(formatUserError(err, 'We could not create hook ideas right now. Please try again.'), 6000);
  }

  state.hookBusy = false;
  setBtn('hook-lab-btn', false);
}

function applyHookVariant(i) {
  const variant = state.hookVariants[i];
  if (!variant) return;
  const clip = state.clips[variant.clip_index];
  if (!clip) { toast('Clip not found for this hook'); return; }

  clip.hook = variant.hook || clip.hook;
  clip.hook_overlay = variant.hook || clip.hook_overlay;
  clip.hook_angle = variant.angle || clip.hook_angle;
  clip.title = variant.title || variant.hook || clip.title;
  clip.why = variant.why || clip.why;
  clip.caption_lines = [
    variant.first_caption || variant.hook,
    ...(clip.caption_lines || []).slice(0, 3)
  ].filter(Boolean).slice(0, 4);
  if (variant.energy) clip.energy = variant.energy;
  renderClips();
  renderHookLab(state.hookVariants);
  renderExportSummary();
  toast('Hook will appear at the start of exported video');
}

async function copyHookVariant(i) {
  const variant = state.hookVariants[i];
  if (!variant?.hook) return;
  try {
    await navigator.clipboard.writeText(variant.hook);
    toast('Hook copied');
  } catch (err) {
    toast('Copy was not available on this device.');
  }
}

// Viral Memory Engine keeps creator-specific performance memory in localStorage.
const MEMORY_KEY = 'clipai_viral_memory_v1';

function loadViralMemory() {
  try {
    state.viralMemory = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]').filter(Boolean).slice(-80);
  } catch (err) {
    state.viralMemory = [];
  }
  renderMemoryStats();
}

function persistViralMemory() {
  localStorage.setItem(MEMORY_KEY, JSON.stringify((state.viralMemory || []).slice(-80)));
  renderMemoryStats();
}

function memoryEngagementScore(item) {
  const views = Math.max(1, Number(item.views) || 0);
  const likes = Number(item.likes) || 0;
  const comments = Number(item.comments) || 0;
  const shares = Number(item.shares) || 0;
  return Math.round(((likes + comments * 3 + shares * 4) / views) * 10000) / 100;
}

function summarizeViralMemory() {
  const memory = state.viralMemory || [];
  const best = memory.slice().sort((a, b) => memoryEngagementScore(b) - memoryEngagementScore(a)).slice(0, 5);
  const platforms = {};
  memory.forEach(item => { platforms[item.platform || 'unknown'] = (platforms[item.platform || 'unknown'] || 0) + 1; });
  const topPlatform = Object.entries(platforms).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  const avgScore = memory.length
    ? Math.round(memory.reduce((sum, item) => sum + memoryEngagementScore(item), 0) / memory.length * 10) / 10
    : 0;
  return { count: memory.length, best, topPlatform, avgScore };
}

function renderMemoryStats() {
  const el = document.getElementById('memory-stats');
  if (!el) return;
  const summary = summarizeViralMemory();
  el.innerHTML =
    '<div class="memory-stat"><strong>' + summary.count + '</strong><span>saved results</span></div>' +
    '<div class="memory-stat"><strong>' + escapeHTML(summary.topPlatform) + '</strong><span>top platform</span></div>' +
    '<div class="memory-stat"><strong>' + summary.avgScore + '%</strong><span>avg signal</span></div>';
}

function prefillMemoryFromSelectedClip() {
  const idx = Array.from(state.selectedClips)[0] ?? 0;
  const clip = state.clips[idx];
  if (!clip) { toast('Select or generate a clip first'); return; }
  const title = document.getElementById('memory-title');
  if (title) title.value = clip.title || clip.hook || 'Clip result';
  toast('Selected clip loaded into memory form');
}

function saveMemoryEntry() {
  const title = (document.getElementById('memory-title')?.value || '').trim();
  const platform = document.getElementById('memory-platform')?.value || 'tiktok';
  const views = Number(document.getElementById('memory-views')?.value || 0);
  const likes = Number(document.getElementById('memory-likes')?.value || 0);
  const comments = Number(document.getElementById('memory-comments')?.value || 0);
  if (!title) { toast('Add the clip title or topic first'); return; }
  if (!views) { toast('Add view count so memory can learn'); return; }

  state.viralMemory.push({
    id: Date.now(),
    title,
    platform,
    views,
    likes,
    comments,
    shares: 0,
    saved_at: new Date().toISOString()
  });
  persistViralMemory();
  ['memory-title', 'memory-views', 'memory-likes', 'memory-comments'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  toast('Performance saved to Viral Memory');
}

function renderMemoryProfile(profile) {
  const out = document.getElementById('memory-output');
  if (!out) return;
  out.classList.add('show');
  const scores = profile.clip_scores || [];
  const topLessons = (profile.audience_patterns || []).map(p => '<li>' + escapeHTML(p) + '</li>').join('');
  const recommendations = (profile.recommendations || []).map(p => '<li>' + escapeHTML(p) + '</li>').join('');
  const scoreRows = scores.map(score =>
    '<div class="ghost-plan-row"><strong>' + escapeHTML((score.clip_index + 1) + '. ' + (state.clips[score.clip_index]?.title || 'Clip')) + '</strong><span>' + escapeHTML(score.score + '/100') + '</span></div>' +
    '<div style="color:var(--text2);font-size:12px;margin-bottom:8px">' + escapeHTML(score.reason || '') + '</div>'
  ).join('');
  out.innerHTML =
    '<div style="color:var(--green);font-family:var(--mono);font-size:11px;margin-bottom:8px">Creator memory profile</div>' +
    '<div style="color:var(--text);font-weight:700;margin-bottom:8px">' + escapeHTML(profile.summary || 'Memory analysis ready.') + '</div>' +
    (topLessons ? '<div style="margin-top:8px"><strong style="color:var(--text)">Audience patterns</strong><ul style="margin:6px 0 0 18px">' + topLessons + '</ul></div>' : '') +
    (recommendations ? '<div style="margin-top:10px"><strong style="color:var(--text)">Next edits</strong><ul style="margin:6px 0 0 18px">' + recommendations + '</ul></div>' : '') +
    (scoreRows ? '<div class="ghost-plan" style="margin-top:12px">' + scoreRows + '</div>' : '');
}

function applyMemoryScores(profile) {
  (profile.clip_scores || []).forEach(score => {
    const clip = state.clips[score.clip_index];
    if (!clip) return;
    clip.memory_score = Math.max(0, Math.min(100, Number(score.score) || 0));
    clip.memory_reason = score.reason || '';
    if (score.suggested_hook && !clip.hook_overlay) {
      clip.hook_overlay = score.suggested_hook;
      clip.hook = score.suggested_hook;
    }
  });
}

async function runViralMemory() {
  if (!state.clips.length) { toast('Generate clips first'); return; }
  if (!state.viralMemory.length) { toast('Save at least one past result first'); return; }
  if (state.memoryBusy) return;
  state.memoryBusy = true;
  setBtn('memory-analyze-btn', true, 'Scoring...');
  const out = document.getElementById('memory-output');
  if (out) {
    out.classList.add('show');
    out.innerHTML = '<div style="display:flex;align-items:center;gap:10px"><div class="spinner"></div>Comparing current clips to your saved audience memory...</div>';
  }

  try {
    const res = await fetch(RAILWAY_URL + '/api/viral-memory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        memory: state.viralMemory.slice(-40),
        clips: state.clips.map((clip, index) => ({
          index,
          title: clip.title,
          hook: clip.hook_overlay || clip.hook,
          why: clip.why,
          caption_lines: clip.caption_lines || [],
          platform_fit: clip.platform_fit || [],
          energy: clip.energy,
          duration_s: clip.duration_s
        }))
      })
    });
    const profile = await res.json();
    if (!res.ok) throw new Error(profile.error || 'Viral Memory failed');
    state.memoryProfile = profile;
    applyMemoryScores(profile);
    renderClips();
    renderMemoryProfile(profile);
    renderExportSummary();
    toast('Viral Memory scored your clips');
  } catch (err) {
    if (out) out.innerHTML = '<span style="color:var(--red)">' + escapeHTML(formatUserError(err, 'We could not score these clips right now. Please try again.')) + '</span>';
    toast(formatUserError(err, 'We could not score these clips right now. Please try again.'), 6000);
  }

  state.memoryBusy = false;
  setBtn('memory-analyze-btn', false);
}

let activePreviewIndex = null;
let previewRaf = null;

function getClipCaptionText(clip) {
  const lines = clip.caption_lines || [];
  if (lines.length) return lines.join(' ');
  return clip.hook || clip.title || 'Preview caption';
}

function getWordsForClip(clip) {
  const start = clip.start_ms || 0;
  const end = clip.end_ms || start + 45000;
  const words = (state.words || [])
    .filter(w => w.start >= start && w.start <= end)
    .slice(0, 80);

  if (words.length) return words;

  return getClipCaptionText(clip).split(/\s+/).filter(Boolean).map((text, i) => ({
    text,
    start: start + i * 420,
    end: start + (i + 1) * 420
  }));
}

function getCaptionLine(clip, currentMs) {
  const words = getWordsForClip(clip);
  const activeIndex = Math.max(0, words.findIndex(w => currentMs >= w.start && currentMs <= w.end));
  const density = Math.max(2, Math.min(4, state.captionSettings?.words || 3));
  const start = Math.max(0, activeIndex - Math.floor(density / 2));
  const visible = words.slice(start, start + density);

  return {
    words: visible,
    activeWord: words[activeIndex]?.text || ''
  };
}

function drawCaption(canvas, clip, currentMs) {
  if (!canvas || !clip) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!shouldBurnCaptions()) return;

  const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.tiktok;
  const settings = state.captionSettings || { size: 100, position: Math.round(style.y * 100), words: 3 };
  const relativeMs = Math.max(0, currentMs - (clip.start_ms || 0));
  const hookOverlay = relativeMs <= 2800 ? (clip.hook_overlay || '') : '';
  const line = getCaptionLine(clip, currentMs);
  let text = line.words.map(w => w.text).join(' ') || getClipCaptionText(clip);
  if (style.uppercase) text = text.toUpperCase();

  const x = rect.width / 2;
  const y = rect.height * ((settings.position || Math.round(style.y * 100)) / 100);
  const maxWidth = rect.width * 0.86;

  ctx.font = style.font.replace(/(\d+)px/, (_, px) => Math.round(Number(px) * (settings.size || 100) / 100) + 'px');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const wrapped = wrapCanvasText(ctx, text, maxWidth).slice(0, 2);
  const lineHeight = 34;
  const blockHeight = wrapped.length * lineHeight + 14;

  if (style.bg !== 'transparent') {
    ctx.fillStyle = style.bg;
    roundRect(ctx, rect.width * 0.07, y - blockHeight / 2, rect.width * 0.86, blockHeight, 10);
    ctx.fill();
  }

  wrapped.forEach((row, idx) => {
    const yy = y + (idx - (wrapped.length - 1) / 2) * lineHeight;
    ctx.lineWidth = 7;
    ctx.strokeStyle = style.stroke;
    ctx.strokeText(row, x, yy);
    ctx.fillStyle = style.color;
    ctx.fillText(row, x, yy);
  });

  if (style.karaoke && line.activeWord) {
    ctx.font = style.font.replace(/(\d+)px/, (_, px) => Math.round(Number(px) * (settings.size || 100) / 100) + 'px');
    ctx.fillStyle = style.highlight;
    ctx.fillText(style.uppercase ? line.activeWord.toUpperCase() : line.activeWord, x, y + lineHeight);
  }

  if (hookOverlay) {
    ctx.font = '900 26px Syne, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hookRows = wrapCanvasText(ctx, hookOverlay.toUpperCase(), rect.width * 0.82).slice(0, 3);
    const hookLineHeight = 31;
    const hookBlockHeight = hookRows.length * hookLineHeight + 18;
    const hookY = rect.height * 0.18;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    roundRect(ctx, rect.width * 0.07, hookY - hookBlockHeight / 2, rect.width * 0.86, hookBlockHeight, 10);
    ctx.fill();
    hookRows.forEach((row, idx) => {
      const yy = hookY + (idx - (hookRows.length - 1) / 2) * hookLineHeight;
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000';
      ctx.strokeText(row, x, yy);
      ctx.fillStyle = '#fff';
      ctx.fillText(row, x, yy);
    });
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawAllVisibleCaptions() {
  state.clips.forEach((clip, i) => {
    const canvas = document.getElementById('preview-canvas-' + i);
    if (!canvas) return;
    drawCaption(canvas, clip, clip.start_ms || 0);
  });
}

async function toggleClipPreview(i) {
  const clip = state.clips[i];
  const video = document.getElementById('preview-video-' + i);
  const canvas = document.getElementById('preview-canvas-' + i);
  const previewSource = getPreviewSource();
  if (!clip || !video || !previewSource) {
    toast('Preview source not available. Re-upload the video first.');
    return;
  }

  if (video.getAttribute('src') !== previewSource) {
    video.setAttribute('src', previewSource);
    video.load();
  }

  if (activePreviewIndex !== null && activePreviewIndex !== i) {
    const previous = document.getElementById('preview-video-' + activePreviewIndex);
    if (previous) previous.pause();
  }

  activePreviewIndex = i;
  const start = (clip.start_ms || 0) / 1000;
  const end = (clip.end_ms || ((clip.start_ms || 0) + 45000)) / 1000;

  if (video.paused) {
    try {
      if (Math.abs(video.currentTime - start) > 0.5 || video.currentTime >= end) {
        video.currentTime = start;
      }
      await video.play();
      runPreviewLoop(video, canvas, clip, end);
    } catch (err) {
      toast('Preview is not available for this video right now.', 5000);
    }
  } else {
    video.pause();
    if (previewRaf) cancelAnimationFrame(previewRaf);
  }
}

function runPreviewLoop(video, canvas, clip, endSec) {
  if (previewRaf) cancelAnimationFrame(previewRaf);

  const tick = () => {
    if (video.paused) return;

    if (video.currentTime >= endSec) {
      video.pause();
      video.currentTime = (clip.start_ms || 0) / 1000;
      drawCaption(canvas, clip, clip.start_ms || 0);
      return;
    }

    drawCaption(canvas, clip, video.currentTime * 1000);
    previewRaf = requestAnimationFrame(tick);
  };

  tick();
}


// ═══ EXPORT ═══
async function generateCaptions() {
  const q = document.getElementById('cap-query').value.trim();
  const out = document.getElementById('cap-ai-out');
  const selectedClip = state.clips[Array.from(state.selectedClips)[0]] || null;

  out.style.display = 'block';

  if (!q) {
    const style = CAPTION_STYLES[state.captionStyle] || CAPTION_STYLES.tiktok;
    out.textContent = 'Using preset: ' + style.label + '. Play a clip preview to see it live.';
    drawAllVisibleCaptions();
    renderExportSummary();
    return;
  }

  setBtn('cap-btn', true, '...');
  out.textContent = 'Generating caption style...';

  try {
    const res = await fetch(API_URL + '/api/caption-style', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clipText: selectedClip ? (selectedClip.caption_lines || []).join(' ') : (state.transcript || '').slice(0, 200),
        words: state.words.slice(0, 50),
        stylePrompt: q,
        startMs: selectedClip?.start_ms || 0
      })
    });

    const data = await res.json();
    out.textContent = data.description || 'Custom caption style ready. Play a clip preview to see it live.';
    drawAllVisibleCaptions();
  } catch (err) {
    out.textContent = formatUserError(err, 'We could not preview that caption style. Please try again.');
  }

  setBtn('cap-btn', false);
  renderExportSummary();
}


function renderExportSummary() {
  const selected = Array.from(state.selectedClips).map(i => state.clips[i]).filter(Boolean);
  const el = document.getElementById('export-summary');
  if (selected.length === 0) {
    el.textContent = 'No clips selected. Go back to Clips tab to select clips.';
    return;
  }
  const captionStatus = shouldBurnCaptions() ? 'captions on' : 'captions off';
  el.innerHTML = selected.map((c, i) =>
    `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <strong style="color:var(--text)">${i + 1}. ${c.title}</strong>
      <span style="color:var(--text3);font-size:12px;margin-left:8px">${c.duration_s}s · Speaker ${c.speaker}</span>
      <div style="color:var(--text2);font-size:13px;margin-top:4px">${c.why}</div>
      ${c.hook_overlay ? `<div style="color:var(--green);font-size:12px;margin-top:6px;font-family:var(--mono)">Hook overlay: ${escapeHTML(c.hook_overlay)}</div>` : ''}
    </div>`
  ).join('') + `<div style="padding-top:12px;color:var(--text3);font-size:13px">${selected.length} clip${selected.length !== 1 ? 's' : ''} ready to export · ${captionStatus}</div>`;
}

// Track ongoing export so we can show progress
let exportInProgress = false;

async function exportTo(platform) {
  const selected = Array.from(state.selectedClips).map(i => state.clips[i]).filter(Boolean);
  if (selected.length === 0) { toast('Select at least one clip first'); return; }
  if (exportInProgress) { toast('Export already in progress...'); return; }

  // The backend cuts from its saved local file, not the AssemblyAI upload URL.
  if (!state.localFileId) {
    toast('This project needs the original video again. Please re-upload and try export.', 5000);
    return;
  }

  exportInProgress = true;
  const summaryEl = document.getElementById('export-summary');

  // Cut each selected clip one by one
  for (let idx = 0; idx < selected.length; idx++) {
    const clip = selected[idx];
    const label = clip.title || ('Clip ' + (idx + 1));
    if (!(await ensureExportAllowed())) break;

    summaryEl.innerHTML = '<div style="padding:16px;color:var(--text2);font-size:14px;display:flex;align-items:center;gap:12px">' +
      '<div class="spinner"></div> Cutting "' + label + '" (' + (idx+1) + '/' + selected.length + ')... this may take a minute</div>';

    try {
      if (!state.localFileId) {
        throw new Error('Original video is no longer available for this project.');
      }
      const res = await fetch(RAILWAY_URL + '/api/cut-clip', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          localFileId: state.localFileId,
          startMs: clip.start_ms || 0,
          endMs: clip.end_ms || 0,
          clipTitle: label,
          clipIndex: idx,
          captionLines: clip.caption_lines || [],
          captionStyle: state.captionStyle,
          captionPreset: selectedPreset,
          captionSettings: state.captionSettings,
          burnCaptions: shouldBurnCaptions(),
          hookOverlay: clip.hook_overlay || clip.hook || '',
          hookAngle: clip.hook_angle || '',
          removeWatermark: shouldRemoveWatermark(),
          words: state.words ? state.words.filter(w => w.start >= (clip.start_ms || 0) && w.start <= (clip.end_ms || 0)).slice(0, 300) : []
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Cut failed');
      }

      // Stream the blob and trigger download
      const blob = await res.blob();
      const safeTitle = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const filename = safeTitle + '_9x16.mp4';
      const isSocialShare = platform !== 'mp4';
      const saved = isSocialShare
        ? await shareExportedVideo(blob, filename, platform)
        : await saveExportedVideo(blob, filename);

      toast('"' + label + '" ' + (saved.shared ? 'ready to share!' : (saved.native ? 'saved to Gallery!' : 'downloaded!')), 3000);
      await recordSuccessfulExport();

    } catch (err) {
      toast(formatUserError(err, 'We could not export "' + label + '". Please try again.'), 6000);
      console.error('[ClipAI] Export error:', err);
    }
  }

  exportInProgress = false;

  if (platform !== 'mp4') {
    const platformName = socialPlatformName(platform);
    summaryEl.innerHTML = '<div style="background:#0f1a10;border:1px solid #2a4030;border-radius:10px;padding:16px;color:#80c090;font-size:13px;line-height:1.8">' +
      '<strong style="color:#a0e0b0;display:block;margin-bottom:6px">Clip ready to share</strong>' +
      'Choose ' + platformName + ' from your phone share sheet. If it does not appear, the clip is saved/downloaded so you can upload it manually.' +
      '</div>';
  } else {
    renderExportSummary();
  }
}

// ═══ AUTH ═══
function initAuth() {
  const token = localStorage.getItem('clipai_token');
  const user = JSON.parse(localStorage.getItem('clipai_user') || 'null');
  const navAuth = document.getElementById('nav-auth');

  // Update dashboard greeting
  const greeting = document.getElementById('dashboard-greeting');
  if (greeting && user) {
    const name = (user.email || '').split('@')[0];
    greeting.textContent = 'Welcome back, ' + name + ' 👋';
  }

  if (token && user) {
    navAuth.innerHTML =
      '<button onclick="doLogout()" class="nav-action" type="button">Sign out</button>';
  }
}

function doLogout() {
  localStorage.removeItem('clipai_token');
  localStorage.removeItem('clipai_user');
  window.location.reload();
}


async function openSidebar() {
  const token = localStorage.getItem('clipai_token');
  if (!token) { window.location.href = 'login.html'; return; }
  document.getElementById('projects-sidebar').style.display = 'block';
  document.getElementById('sidebar-overlay').style.display = 'block';
  const listEl = document.getElementById('projects-list');
  listEl.innerHTML = '<div style="color:var(--text3);font-size:13px">Loading...</div>';
  try {
    const res = await fetch(API_URL + '/api/projects', { headers: { 'authorization': 'Bearer ' + token, 'x-requested-with': 'clipai' } });
    if (res.status === 401) {
      handleExpiredSession();
      return;
    }
    const projects = await res.json();
    if (!res.ok) throw new Error('Could not load projects');
    if (!projects.length) {
      listEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px 0;text-align:center">No saved projects yet.<br>Process a video and save it!</div>';
      return;
    }
    // Store projects in window map to avoid JSON escaping issues in onclick
    window._projectsMap = {};
    projects.forEach((p, i) => { window._projectsMap[i] = p; });

    listEl.innerHTML = projects.map((p, i) => {
      const dateStr = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const clipCount = Array.isArray(p.clips) ? p.clips.length : 0;
      const wordCount = p.transcript ? p.transcript.split(' ').length.toLocaleString() : '0';
      return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:10px" id="proj-card-' + i + '">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">' +
          '<div style="font-size:14px;font-weight:600;color:var(--text);line-height:1.4">' + (p.title || 'Untitled') + '</div>' +
          '<div style="display:flex;gap:6px;flex-shrink:0">' +
            '<button onclick="loadProjectByIndex(' + i + ')" style="background:var(--accent);color:#fff;border:none;padding:6px 14px;border-radius:8px;font-family:var(--font);font-size:12px;font-weight:600;cursor:pointer">Open →</button>' +
            '<button onclick="deleteProject(this,\'' + p.id + '\',' + i + ')" style="background:transparent;color:var(--red);border:1px solid rgba(240,100,100,0.3);padding:6px 10px;border-radius:8px;font-family:var(--font);font-size:12px;cursor:pointer">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
          '<span style="font-size:11px;color:var(--text3);font-family:var(--mono)">📅 ' + dateStr + '</span>' +
          '<span style="font-size:11px;color:var(--text3);font-family:var(--mono)">✦ ' + clipCount + ' clips</span>' +
          '<span style="font-size:11px;color:var(--text3);font-family:var(--mono)">◎ ' + wordCount + ' words</span>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch(e) {
    listEl.innerHTML = '<div style="color:var(--red);font-size:13px">Error loading projects</div>';
  }
}

function loadProjectByIndex(i) {
  const p = window._projectsMap[i];
  if (!p) { toast('Project not found'); return; }
  loadProject(p);
}

async function deleteProject(btn, id, i) {
  const token = localStorage.getItem('clipai_token');
  if (!confirm('Delete this project? This cannot be undone.')) return;
  try {
    const res = await fetch(API_URL + '/api/projects?id=' + id, {
      method: 'DELETE',
      headers: { 'authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const card = document.getElementById('proj-card-' + i);
      if (card) card.style.display = 'none';
      toast('Project deleted');
    } else {
      toast('Delete failed');
    }
  } catch(e) {
    toast('We could not delete that project. Please try again.');
  }
}

function loadProject(p) {
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch (err) { toast('Could not load project'); return; }
  }

  // Restore full state
  state.transcript = p.transcript || '';
  state.clips = p.clips || [];
  state.duration = p.duration || 0;
  state.utterances = p.utterances || [];
  state.highlights = p.highlights || [];
  state.words = p.words || [];
  state.localFileId = p.localFileId || p.videoFilename || state.localFileId || null;
  if (!getPreviewSource() && state.localFileId) {
    setPreviewVideoUrl(getBackendPreviewUrl(state.localFileId));
  }

  closeSidebar();

  if (state.clips.length > 0) {
    // Unlock all stages
    unlockStage(1); unlockStage(2); unlockStage(3);

    // Restore transcript view
    const statsEl = document.getElementById('stats-row');
    if (statsEl) {
      const words = state.transcript ? state.transcript.split(' ').length : 0;
      const dur = state.duration ? formatTime(state.duration * 1000) : '--:--';
      statsEl.innerHTML =
        '<div class="stat"><div class="stat-val">' + dur + '</div><div class="stat-label">duration</div></div>' +
        '<div class="stat"><div class="stat-val">' + words.toLocaleString() + '</div><div class="stat-label">words</div></div>' +
        '<div class="stat"><div class="stat-val">' + state.clips.length + '</div><div class="stat-label">clips</div></div>' +
        '<div class="stat"><div class="stat-val">' + (state.highlights.length || '?') + '</div><div class="stat-label">moments</div></div>';
    }

    const tcEl = document.getElementById('transcript-content');
    if (tcEl && state.transcript) {
      tcEl.textContent = state.transcript.substring(0, 3000) + (state.transcript.length > 3000 ? '...' : '');
    }

    // Show transcript results panel
    const progressEl = document.getElementById('transcribe-progress');
    const resultsEl = document.getElementById('transcribe-results');
    if (progressEl) progressEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'block';

    // Go to clips page and render
    goStage(2);
    renderClips();
    toast('✓ Project loaded: "' + (p.title || 'Untitled') + '"', 3000);
  } else if (state.transcript) {
    // Has transcript but no clips — go to transcribe page
    unlockStage(1); unlockStage(2);
    const progressEl = document.getElementById('transcribe-progress');
    const resultsEl = document.getElementById('transcribe-results');
    if (progressEl) progressEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'block';
    goStage(1);
    showTranscriptResults();
    toast('✓ Project loaded — generate clips to continue', 3000);
  } else {
    toast('This project has no data to restore', 4000);
  }
}

function closeSidebar() {
  document.getElementById('projects-sidebar').style.display = 'none';
  document.getElementById('sidebar-overlay').style.display = 'none';
}

function projectTitleFromState() {
  const firstClip = state.clips.find(Boolean);
  const fromClip = firstClip?.title || firstClip?.hook || '';
  if (fromClip) return fromClip.slice(0, 70);
  const transcriptWords = String(state.transcript || '').trim().split(/\s+/).filter(Boolean).slice(0, 7).join(' ');
  return transcriptWords || 'Untitled Project';
}

function getProjectSaveKey(payload) {
  return [
    state.transcriptId || '',
    state.localFileId || '',
    payload.title || '',
    payload.clips.length,
    payload.duration || 0
  ].join('|');
}

function buildProjectPayload() {
  return {
    title: projectTitleFromState(),
    transcript: state.transcript || '',
    clips: (state.clips || []).map((clip, index) => ({
      ...clip,
      selected: state.selectedClips.has(index)
    })),
    utterances: state.utterances || [],
    highlights: state.highlights || [],
    duration: state.duration || 0,
    localFileId: state.localFileId || '',
    videoFilename: state.localFileId || state.transcriptId || ''
  };
}

async function saveProject(options = {}) {
  const token = getAuthToken();
  if (!token) {
    if (!options.silent) window.location.href = 'login.html';
    return false;
  }
  if (!state.transcript && !state.clips.length) {
    if (!options.silent) toast('Create clips before saving this project.');
    return false;
  }

  const payload = buildProjectPayload();
  const saveKey = getProjectSaveKey(payload);
  if (options.auto && state.lastSavedProjectKey === saveKey) {
    loadDashboardStats();
    return true;
  }

  try {
    if (!options.silent) toast('Saving project...');
    const res = await fetch(API_URL + '/api/projects', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + token,
        'x-requested-with': 'clipai'
      },
      body: JSON.stringify(payload)
    });
    const data = await readBillingJson(res);
    if (res.status === 401) {
      handleExpiredSession();
      return false;
    }
    if (res.status === 409 || data?.error === 'duplicate') {
      state.lastSavedProjectKey = saveKey;
      loadDashboardStats();
      if (!options.silent) toast('Project is already saved.');
      return true;
    }
    if (!res.ok) throw new Error(data.error || data.message || 'Project could not be saved');

    state.lastSavedProjectKey = saveKey;
    loadDashboardStats();
    if (!options.silent) toast('Project saved.');
    return true;
  } catch (err) {
    if (!options.silent) toast(formatUserError(err, 'We could not save this project. Please try again.'), 6000);
    console.warn('[ClipAI] save project failed:', err);
    return false;
  }
}

async function autoSaveProjectAfterExport() {
  if (!state.transcript && !state.clips.length) return false;
  return saveProject({ auto: true, silent: true });
}

// Init
state.unlockedStage = 0;
// dashboard handles mode selection
initTheme();
loadViralMemory();
requestNativeNotifications();
initRevenueCat();
goStage(0);
initAuth();


// ═══ CAPTION PRESETS ═══
const CAPTION_PRESETS = {
  'tiktok-bold': { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', fontWeight: '900', color: '#ffffff', backgroundColor: 'transparent', textShadow: '2px 2px 0px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000', position: 'bottom', animation: 'word-by-word', description: 'TikTok Bold — thick black outline' },
  'yellow-pop': { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '18px', fontWeight: '800', color: '#FFE600', backgroundColor: 'transparent', textShadow: '2px 2px 4px rgba(0,0,0,0.9)', position: 'bottom', animation: 'pop', description: 'MrBeast Yellow — bold yellow pop' },
  'minimal-white': { fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: '15px', fontWeight: '400', color: '#ffffff', backgroundColor: 'transparent', textShadow: '1px 1px 3px rgba(0,0,0,0.8)', position: 'bottom', animation: 'fade', description: 'Minimal White — clean and simple' },
  'karaoke': { fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', color: '#ffffff', backgroundColor: 'transparent', textShadow: '1px 1px 3px #000', position: 'bottom', animation: 'karaoke', accentColor: '#7c6af7', description: 'Karaoke — highlight each word' },
  'neon': { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '16px', fontWeight: '700', color: '#00ff88', backgroundColor: 'transparent', textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88', position: 'bottom', animation: 'word-by-word', description: 'Neon Glow — electric green glow' },
  'subtitle': { fontFamily: 'Arial, sans-serif', fontSize: '14px', fontWeight: '400', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.75)', textShadow: 'none', position: 'bottom', animation: 'fade', description: 'Subtitle Box — classic dark background' }
};

let selectedPreset = 'tiktok-bold';

function selectPreset(el, preset) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  selectedPreset = preset;
  state.captionStyle = PRESET_TO_CAPTION_STYLE[preset] || state.captionStyle;
  renderCaptionPresets();
  renderCaptionControls();
  drawAllVisibleCaptions();
  previewCaptionStyle(CAPTION_PRESETS[preset]);
  toast('Style: ' + CAPTION_PRESETS[preset].description);
}

function previewCaptionStyle(style) {
  const out = document.getElementById('cap-ai-out');
  out.style.display = 'block';
  const clip = state.clips[Array.from(state.selectedClips)[0]] || null;
  const captionLines = clip ? (clip.caption_lines || [clip.title || 'Sample caption text']) : ['Sample caption text'];
  const allWords = captionLines.join(' ').split(' ').filter(Boolean);
  const wordSpans = allWords.map((word, i) =>
    '<span style="display:inline-block;margin:0 2px;animation:capWordIn 0.15s ease forwards;animation-delay:' + (i * 0.1) + 's;opacity:0;color:' + style.color + (style.animation === 'karaoke' && i === 0 ? ';font-weight:900' : '') + '">' + word + '</span>'
  ).join(' ');
  out.innerHTML =
    '<div style="font-size:12px;color:var(--accent);font-family:var(--mono);margin-bottom:12px">' + style.description + '</div>' +
    '<div style="position:relative;background:#111;border-radius:16px;overflow:hidden;width:160px;height:284px;margin:0 auto 14px;border:2px solid #333">' +
      '<div style="position:absolute;inset:0;background:linear-gradient(160deg,#1a1a2e,#16213e,#0f3460)"></div>' +
      '<div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;padding:8px 10px;' +
        (style.backgroundColor !== 'transparent' ? 'background:' + style.backgroundColor + ';margin:0 8px;border-radius:4px;' : '') +
        'font-family:' + style.fontFamily + ';font-size:14px;font-weight:' + style.fontWeight + ';text-shadow:' + style.textShadow + ';line-height:1.5">' + wordSpans + '</div>' +
      '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-70%);width:32px;height:32px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff">▷</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">' +
      '<span style="font-size:11px;font-family:var(--mono);background:var(--bg3);border:1px solid var(--border);color:var(--text3);padding:3px 8px;border-radius:6px">' + style.fontFamily.split(',')[0] + '</span>' +
      '<span style="font-size:11px;font-family:var(--mono);background:var(--bg3);border:1px solid var(--border);color:var(--text3);padding:3px 8px;border-radius:6px">' + style.animation + '</span>' +
    '</div>';
  if (!document.getElementById('cap-anim-style')) {
    const s = document.createElement('style');
    s.id = 'cap-anim-style';
    s.textContent = '@keyframes capWordIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }';
    document.head.appendChild(s);
  }
}

// ═══ CLIP PREVIEW ═══
let previewAnim = null, previewPlaying = false, previewClip = null, previewFrame = 0;

function openPreview(clipIndex) {
  previewClip = state.clips[clipIndex];
  if (!previewClip) return;
  previewFrame = 0; previewPlaying = false;
  document.getElementById('preview-title').textContent = previewClip.title || 'Clip Preview';
  document.getElementById('preview-modal').classList.add('open');
  document.getElementById('prev-play-btn').textContent = '▷ Play';
  drawPreviewFrame(0);
}

function closePreview() {
  document.getElementById('preview-modal').classList.remove('open');
  if (previewAnim) { cancelAnimationFrame(previewAnim); previewAnim = null; }
  previewPlaying = false;
}

function togglePreviewPlay() {
  previewPlaying = !previewPlaying;
  document.getElementById('prev-play-btn').textContent = previewPlaying ? '⏸ Pause' : '▷ Play';
  if (previewPlaying) animatePreview();
  else if (previewAnim) { cancelAnimationFrame(previewAnim); previewAnim = null; }
}

function animatePreview() {
  if (!previewPlaying) return;
  previewFrame++;
  if (previewFrame > 300) previewFrame = 0;
  drawPreviewFrame(previewFrame);
  previewAnim = requestAnimationFrame(animatePreview);
}

function drawPreviewFrame(frame) {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const clip = previewClip;
  if (!clip) return;
  const style = CAPTION_PRESETS[selectedPreset] || CAPTION_PRESETS['tiktok-bold'];
  const dur = clip.duration_s || 30;
  const progress = (frame % 300) / 300;
  const currentSec = progress * dur;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(0.5, '#16213e'); grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

  // Waveform bars
  const bars = 20;
  ctx.fillStyle = style.color || '#7c6af7';
  ctx.globalAlpha = 0.5;
  for (let b = 0; b < bars; b++) {
    const h = 8 + Math.abs(Math.sin(b * 0.4 + frame * 0.08)) * 28;
    const x = 10 + b * ((W - 20) / bars);
    ctx.fillRect(x, H * 0.45 - h / 2, 3, h);
  }
  ctx.globalAlpha = 1;

  // Progress bar
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(14, H - 18, W - 28, 3);
  ctx.fillStyle = style.color || '#7c6af7'; ctx.fillRect(14, H - 18, (W - 28) * progress, 3);

  // Time
  const e = Math.floor(currentSec), t = Math.floor(dur);
  document.getElementById('preview-time').textContent = Math.floor(e/60) + ':' + String(e%60).padStart(2,'0') + ' / ' + Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');

  // Captions
  const captions = clip.caption_lines || [clip.title || ''];
  const allWords = captions.join(' ').split(' ').filter(Boolean);
  const wordIndex = Math.floor(progress * allWords.length);
  const displayText = allWords.slice(Math.max(0, wordIndex - 2), wordIndex + 3).join(' ');

  if (style.backgroundColor && style.backgroundColor !== 'transparent') {
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(8, H - 52, W - 16, 24);
  }
  ctx.textAlign = 'center';
  ctx.font = style.fontWeight + ' 12px ' + style.fontFamily;
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
  ctx.fillStyle = style.color || '#fff';
  ctx.fillText(displayText, W / 2, H - 34);
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Pause overlay
  if (!previewPlaying) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.moveTo(W/2 - 10, H/2 - 14); ctx.lineTo(W/2 + 14, H/2); ctx.lineTo(W/2 - 10, H/2 + 14); ctx.closePath(); ctx.fill();
  }
}

// ── DASHBOARD EXTRAS ──
function loadDashboardStats() {
  const token = localStorage.getItem('clipai_token');
  if (!token) return;

  // Load viral memory count
  try {
    const mem = JSON.parse(localStorage.getItem('clipai_viral_memory') || '[]');
    document.getElementById('dash-stat-memory').textContent = mem.length;
  } catch(e) {}

  requestBilling()
    .then(updateDashboardBilling)
    .catch(err => console.warn('[ClipAI] dashboard billing unavailable:', err));

  fetch(API_URL + '/api/projects', { headers: { 'authorization': 'Bearer ' + token, 'x-requested-with': 'clipai' } })
    .then(async r => {
      if (r.status === 401) {
        handleExpiredSession();
        return [];
      }
      return r.json();
    })
    .then(projects => {
      if (!Array.isArray(projects)) return;
      document.getElementById('dash-stat-projects').textContent = projects.length;

      // Count total clips across projects
      const totalClips = projects.reduce((sum, p) => sum + (p.clips?.length || 0), 0);
      document.getElementById('dash-stat-clips').textContent = totalClips;

      window._dashboardProjectsMap = {};
      if (projects.length > 0) {
        const section = document.getElementById('recent-projects-section');
        const list = document.getElementById('recent-projects-list');
        if (section) section.style.display = 'block';
        if (list) {
          list.innerHTML = projects.slice(0, 3).map((p, index) => {
            window._dashboardProjectsMap[index] = p;
            return `
            <div class="recent-project-row" onclick="loadProjectFromDashboard(${index})" >
              <div class="recent-project-icon">🎬</div>
              <div class="recent-project-title">${escapeHTML(p.title || 'Untitled Project')}</div>
              <div class="recent-project-meta">${p.clips?.length || 0} clips · ${new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          `;
          }).join('');
        }
      } else {
        const section = document.getElementById('recent-projects-section');
        const list = document.getElementById('recent-projects-list');
        if (section) section.style.display = 'none';
        if (list) list.innerHTML = '';
      }
    })
    .catch(() => {});
}

function loadProjectFromDashboard(projectRef) {
  try {
    const p = typeof projectRef === 'number'
      ? window._dashboardProjectsMap?.[projectRef]
      : typeof projectRef === 'string'
        ? JSON.parse(projectRef)
        : projectRef;
    if (!p) throw new Error('Project not found');
    chooseCreationMode('clips');
    setTimeout(() => loadProject(p), 100);
  } catch(e) {
    toast('Could not load project');
  }
}

// Update workspace pills when mode changes
const origChoose = chooseCreationMode;
function updateWorkspacePills(mode) {
  document.getElementById('ws-pill-clips')?.classList.toggle('active', mode !== 'compilation');
  document.getElementById('ws-pill-compilation')?.classList.toggle('active', mode === 'compilation');
  document.getElementById('new-clips-btn2')?.classList.toggle('hidden', state.unlockedStage === 0 && !state.transcript);
}

// Hook into chooseCreationMode to update pills
const _origChoose = chooseCreationMode;

// Call dashboard stats on load
window.addEventListener('DOMContentLoaded', () => {
  loadDashboardStats();
});
</script>
</body>
</html>
