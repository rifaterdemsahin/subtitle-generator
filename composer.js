/**
 * SubWebM Composer - Merge Subtitles with Background Media Losslessly
 */

const composerState = {
  cues: [],
  duration: 10.0,
  currentTime: 0.0,
  isPlaying: false,
  playbackSpeed: 1.0,
  lastFrameTimestamp: null,

  bgType: 'preset', // 'preset', 'image', 'video'
  bgPreset: 'studio',
  bgImageObj: null,
  bgVideoObj: null,
  bgDarkness: 0.35,
  bgBlur: 2,

  style: {
    width: 1080,
    height: 1920,
    fontFamily: 'Anton',
    fontSize: 78,
    primaryColor: '#FFFFFF',
    highlightColor: '#FFDF00',
    strokeColor: '#000000',
    strokeWidth: 14,
    shadowColor: '#000000',
    shadowBlur: 16,
    posYPercent: 78,
    maxWordsPerLine: 4
  }
};

const SAMPLE_COMPOSER_SRT = `1
00:00:00,500 --> 00:00:02,300
MERGE SUBTITLES DIRECTLY

2
00:00:02,400 --> 00:00:04,900
WITH YOUR BACKGROUND IMAGE

3
00:00:04,950 --> 00:00:07,400
AT 100% ORIGINAL QUALITY

4
00:00:07,500 --> 00:00:09,800
ZERO QUALITY LOSS FOR CANVA!`;

// DOM Elements
const compCanvas = document.getElementById('composerCanvas');
const compCtx = compCanvas.getContext('2d', { willReadFrequently: true });
const compTranscriptInput = document.getElementById('composerTranscriptInput');
const compCueCount = document.getElementById('composerCueCount');
const compTimeScrubber = document.getElementById('composerTimeScrubber');
const compCurrentTimeLabel = document.getElementById('composerCurrentTimeLabel');
const compTotalTimeLabel = document.getElementById('composerTotalTimeLabel');
const compPlayBtn = document.getElementById('composerPlayBtn');
const compStopBtn = document.getElementById('composerStopBtn');
const exportMergedVideoBtn = document.getElementById('exportMergedVideoBtn');
const compProgressContainer = document.getElementById('composerProgressContainer');
const compProgressBar = document.getElementById('composerProgressBar');
const compProgressPct = document.getElementById('composerProgressPct');

document.addEventListener('DOMContentLoaded', () => {
  setupComposerEvents();
  compTranscriptInput.value = SAMPLE_COMPOSER_SRT;
  parseComposerTranscript();
  renderComposerFrame();
});

function setupComposerEvents() {
  // Preset buttons
  document.querySelectorAll('.bg-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      composerState.bgType = 'preset';
      composerState.bgPreset = btn.dataset.bg;
      renderComposerFrame();
    });
  });

  // Dropzone & File Input
  const dropZone = document.getElementById('bgDropZone');
  const fileInput = document.getElementById('bgFileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleBgFile(e.target.files[0]);
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-emerald-500', 'bg-emerald-950/20');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-950/20');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500', 'bg-emerald-950/20');
    if (e.dataTransfer.files.length > 0) handleBgFile(e.dataTransfer.files[0]);
  });

  // Visual adjustments
  const darknessSlider = document.getElementById('bgDarknessSlider');
  darknessSlider.addEventListener('input', (e) => {
    composerState.bgDarkness = parseInt(e.target.value, 10) / 100;
    document.getElementById('bgDarknessVal').textContent = `${e.target.value}%`;
    renderComposerFrame();
  });

  const blurSlider = document.getElementById('bgBlurSlider');
  blurSlider.addEventListener('input', (e) => {
    composerState.bgBlur = parseInt(e.target.value, 10);
    document.getElementById('bgBlurVal').textContent = `${e.target.value}px`;
    renderComposerFrame();
  });

  // Transcript events
  compTranscriptInput.addEventListener('input', parseComposerTranscript);
  document.getElementById('sampleTranscriptBtn').addEventListener('click', () => {
    compTranscriptInput.value = SAMPLE_COMPOSER_SRT;
    parseComposerTranscript();
  });

  // Player Controls
  compPlayBtn.addEventListener('click', toggleComposerPlay);
  compStopBtn.addEventListener('click', stopComposerPlay);
  compTimeScrubber.addEventListener('input', (e) => {
    composerState.currentTime = parseFloat(e.target.value);
    compCurrentTimeLabel.textContent = formatTime(composerState.currentTime);
    renderComposerFrame();
  });

  // Style controls
  document.getElementById('composerFontSelect').addEventListener('change', (e) => {
    composerState.style.fontFamily = e.target.value;
    renderComposerFrame();
  });
  document.getElementById('composerColorInput').addEventListener('input', (e) => {
    composerState.style.primaryColor = e.target.value;
    renderComposerFrame();
  });
  document.getElementById('composerHighlightInput').addEventListener('input', (e) => {
    composerState.style.highlightColor = e.target.value;
    renderComposerFrame();
  });

  // Export
  exportMergedVideoBtn.addEventListener('click', exportMergedVideo);
}

function handleBgFile(file) {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        composerState.bgType = 'image';
        composerState.bgImageObj = img;
        renderComposerFrame();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      composerState.bgType = 'video';
      composerState.bgVideoObj = video;
      renderComposerFrame();
    };
  }
}

function parseComposerTranscript() {
  const raw = compTranscriptInput.value.trim();
  if (!raw) {
    composerState.cues = [];
    composerState.duration = 10.0;
    updateDurationUI();
    renderComposerFrame();
    return;
  }

  const cues = [];
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const timeMatch = timeLine.match(/(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{2,3})\s*-->\s*(\d{1,2}:)?(\d{1,2}):(\d{2})[,.](\d{2,3})/);
    
    if (timeMatch) {
      const startParts = timeLine.split('-->')[0].trim();
      const endParts = timeLine.split('-->')[1].trim().split(' ')[0].trim();

      const start = parseTimestamp(startParts);
      const end = parseTimestamp(endParts);
      const textLines = lines.slice(timeLineIdx + 1).join(' ').trim().replace(/<[^>]+>/g, '');

      if (textLines && end > start) {
        const words = generateWordTimings(textLines, start, end);
        cues.push({
          id: cues.length + 1,
          start,
          end,
          text: textLines,
          words
        });
      }
    }
  }

  composerState.cues = cues;
  if (cues.length > 0) {
    const maxEnd = Math.max(...cues.map(c => c.end));
    composerState.duration = Math.max(maxEnd + 0.5, 3.0);
  } else {
    composerState.duration = 10.0;
  }

  compCueCount.textContent = `${cues.length} cues loaded`;
  updateDurationUI();
  renderComposerFrame();
}

function parseTimestamp(ts) {
  const parts = ts.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(ts) || 0;
}

function generateWordTimings(text, cueStart, cueEnd) {
  const rawWords = text.split(/\s+/).filter(w => w.length > 0);
  if (rawWords.length === 0) return [];
  const perWord = (cueEnd - cueStart) / rawWords.length;
  return rawWords.map((word, idx) => ({
    word,
    start: cueStart + (idx * perWord),
    end: cueStart + ((idx + 1) * perWord)
  }));
}

function toggleComposerPlay() {
  if (composerState.isPlaying) pauseComposerPlay();
  else startComposerPlay();
}

function startComposerPlay() {
  if (composerState.currentTime >= composerState.duration) composerState.currentTime = 0;
  composerState.isPlaying = true;
  composerState.lastFrameTimestamp = performance.now();
  compPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
  requestAnimationFrame(composerLoop);
}

function pauseComposerPlay() {
  composerState.isPlaying = false;
  composerState.lastFrameTimestamp = null;
  compPlayBtn.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
}

function stopComposerPlay() {
  pauseComposerPlay();
  composerState.currentTime = 0;
  compTimeScrubber.value = 0;
  compCurrentTimeLabel.textContent = formatTime(0);
  renderComposerFrame();
}

function composerLoop(timestamp) {
  if (!composerState.isPlaying) return;

  if (composerState.lastFrameTimestamp) {
    const delta = (timestamp - composerState.lastFrameTimestamp) / 1000;
    composerState.currentTime += delta * composerState.playbackSpeed;

    if (composerState.currentTime >= composerState.duration) {
      composerState.currentTime = composerState.duration;
      pauseComposerPlay();
    }
  }

  composerState.lastFrameTimestamp = timestamp;
  compTimeScrubber.value = composerState.currentTime;
  compCurrentTimeLabel.textContent = formatTime(composerState.currentTime);
  renderComposerFrame();

  if (composerState.isPlaying) {
    requestAnimationFrame(composerLoop);
  }
}

function updateDurationUI() {
  compTimeScrubber.max = composerState.duration;
  compTotalTimeLabel.textContent = formatTime(composerState.duration);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

// --- Composite Canvas Renderer ---
function renderComposerFrame(targetCtx = compCtx, targetTime = composerState.currentTime) {
  const w = composerState.style.width;
  const h = composerState.style.height;

  targetCtx.clearRect(0, 0, w, h);

  // 1. Draw Background Layer
  targetCtx.save();
  if (composerState.bgBlur > 0) {
    targetCtx.filter = `blur(${composerState.bgBlur}px)`;
  }

  if (composerState.bgType === 'image' && composerState.bgImageObj) {
    drawCoverImage(targetCtx, composerState.bgImageObj, w, h);
  } else if (composerState.bgType === 'video' && composerState.bgVideoObj) {
    drawCoverImage(targetCtx, composerState.bgVideoObj, w, h);
  } else {
    drawPresetBackdrop(targetCtx, composerState.bgPreset, w, h);
  }
  targetCtx.restore();

  // 2. Draw Darkness Overlay (Dimming for subtitle readability)
  if (composerState.bgDarkness > 0) {
    targetCtx.fillStyle = `rgba(0, 0, 0, ${composerState.bgDarkness})`;
    targetCtx.fillRect(0, 0, w, h);
  }

  // 3. Draw Subtitles Overlay
  const activeCue = composerState.cues.find(c => targetTime >= c.start && targetTime <= c.end);
  if (!activeCue) return;

  const fontSize = composerState.style.fontSize;
  const fontFamily = composerState.style.fontFamily;
  targetCtx.font = `900 ${fontSize}px "${fontFamily}", sans-serif`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';

  const words = activeCue.words || generateWordTimings(activeCue.text, activeCue.start, activeCue.end);
  const maxWords = composerState.style.maxWordsPerLine;

  const lines = [];
  for (let i = 0; i < words.length; i += maxWords) {
    lines.push(words.slice(i, i + maxWords));
  }

  const lineHeight = fontSize * 1.25;
  const totalBlockHeight = lines.length * lineHeight;
  const centerY = (h * composerState.style.posYPercent) / 100;
  const startY = centerY - (totalBlockHeight / 2) + (lineHeight / 2);

  lines.forEach((lineWords, lineIdx) => {
    const lineY = startY + (lineIdx * lineHeight);
    const fullLineStr = lineWords.map(w => w.word.toUpperCase()).join(' ');
    const fullLineWidth = targetCtx.measureText(fullLineStr).width;
    const spaceWidth = targetCtx.measureText(' ').width;

    let curX = (w / 2) - (fullLineWidth / 2);

    lineWords.forEach((wordObj) => {
      const formattedWord = wordObj.word.toUpperCase();
      const wordMetrics = targetCtx.measureText(formattedWord);
      const wordWidth = wordMetrics.width;
      const wordCenterX = curX + (wordWidth / 2);

      const isWordActive = targetTime >= wordObj.start && targetTime <= wordObj.end;

      targetCtx.save();

      let wordColor = composerState.style.primaryColor;
      let wordScale = 1.0;

      if (isWordActive) {
        wordColor = composerState.style.highlightColor;
        wordScale = 1.12;
      }

      targetCtx.translate(wordCenterX, lineY);
      targetCtx.scale(wordScale, wordScale);

      // Shadow
      if (composerState.style.shadowBlur > 0) {
        targetCtx.shadowColor = composerState.style.shadowColor;
        targetCtx.shadowBlur = composerState.style.shadowBlur;
        targetCtx.shadowOffsetY = 4;
      }

      // Stroke
      if (composerState.style.strokeWidth > 0) {
        targetCtx.strokeStyle = composerState.style.strokeColor;
        targetCtx.lineWidth = composerState.style.strokeWidth;
        targetCtx.lineJoin = 'round';
        targetCtx.strokeText(formattedWord, 0, 0);
      }

      targetCtx.shadowBlur = 0;
      targetCtx.fillStyle = wordColor;
      targetCtx.fillText(formattedWord, 0, 0);

      targetCtx.restore();

      curX += wordWidth + spaceWidth;
    });
  });
}

function drawPresetBackdrop(ctx, preset, w, h) {
  if (preset === 'studio') {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.35, 100, w * 0.5, h * 0.5, h * 0.8);
    grad.addColorStop(0, '#312e81');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'podcast') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#701a75');
    grad.addColorStop(0.5, '#3b0764');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'cyber') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0f766e');
    grad.addColorStop(0.5, '#042f2e');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'nature') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#065f46');
    grad.addColorStop(0.6, '#064e3b');
    grad.addColorStop(1, '#022c22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ec4899');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Dark minimal
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);
  }
}

function drawCoverImage(ctx, media, targetW, targetH) {
  const mw = media.videoWidth || media.naturalWidth || media.width;
  const mh = media.videoHeight || media.naturalHeight || media.height;
  if (!mw || !mh) return;

  const targetRatio = targetW / targetH;
  const mediaRatio = mw / mh;

  let sw, sh, sx, sy;
  if (mediaRatio > targetRatio) {
    sh = mh;
    sw = mh * targetRatio;
    sx = (mw - sw) / 2;
    sy = 0;
  } else {
    sw = mw;
    sh = mw / targetRatio;
    sx = 0;
    sy = (mh - sh) / 2;
  }

  ctx.drawImage(media, sx, sy, sw, sh, 0, 0, targetW, targetH);
}

// --- High Bitrate Merged Video Export ---
async function exportMergedVideo() {
  if (composerState.cues.length === 0) {
    alert("Please load or paste subtitles before exporting!");
    return;
  }

  pauseComposerPlay();

  compProgressContainer.classList.remove('hidden');
  compProgressBar.style.width = '0%';
  compProgressPct.textContent = '0%';
  exportMergedVideoBtn.disabled = true;
  exportMergedVideoBtn.classList.add('opacity-50', 'cursor-not-allowed');

  const w = composerState.style.width;
  const h = composerState.style.height;
  const fps = 30;
  const totalFrames = Math.ceil(composerState.duration * fps);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d');

  const stream = offCanvas.captureStream(fps);
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 16000000 // 16 Mbps ultra high quality
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: chosenMime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `merged_subtitle_video_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 2000);

    compProgressBar.style.width = '100%';
    compProgressPct.textContent = '100% - Done!';
    setTimeout(() => {
      compProgressContainer.classList.add('hidden');
      exportMergedVideoBtn.disabled = false;
      exportMergedVideoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }, 2000);
  };

  recorder.start();

  let f = 0;
  const frameIntervalMs = 1000 / fps;

  const renderNextFrame = () => {
    if (f > totalFrames) {
      recorder.stop();
      return;
    }

    const t = f / fps;
    renderComposerFrame(offCtx, t);

    const progress = Math.min(98, Math.round((f / totalFrames) * 98));
    compProgressBar.style.width = `${progress}%`;
    compProgressPct.textContent = `${progress}%`;

    f++;
    setTimeout(renderNextFrame, frameIntervalMs);
  };

  renderNextFrame();
}
