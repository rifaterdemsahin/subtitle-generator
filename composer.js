/**
 * SubWebM 3-Layer Video Composer v2.3
 * Layer 1: Background Image / Backdrop
 * Layer 2: Chroma Keyed Video (WebM / MP4 Green Screen Removal)
 * Layer 3: Subtitles / Captions Overlay
 * Export: Universal MP4 (H.264) & WebM (VP9) with Frame-Accurate Video Sync
 */

const composerState = {
  cues: [],
  duration: 10.0,
  currentTime: 0.0,
  isPlaying: false,
  playbackSpeed: 1.0,
  lastFrameTimestamp: null,

  // Layer 1: Background Image
  bgPreset: 'studio',
  bgImageObj: null,
  bgDarkness: 0.35,
  bgBlur: 2,

  // Layer 2: Chroma Keyed Video
  videoObj: null,
  isSampleVideo: false,
  chromaEnabled: true,
  chromaKeyColor: '#00FF00',
  chromaThreshold: 45,
  chromaSoftness: 15,
  videoScale: 1.0,
  videoPosYPercent: 50,

  // Layer 3: Subtitles
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
LAYER 1: BACKGROUND IMAGE

2
00:00:02,400 --> 00:00:04,900
LAYER 2: CHROMA KEYED VIDEO

3
00:00:04,950 --> 00:00:07,400
LAYER 3: ANIMATED SUBTITLES

4
00:00:07,500 --> 00:00:09,800
EXPORTED AS UNIVERSAL MP4!`;

// DOM Elements
const compCanvas = document.getElementById('composerCanvas');
const compCtx = compCanvas.getContext('2d', { willReadFrequently: true });
const compTranscriptInput = document.getElementById('composerTranscriptInput');
const compTimeScrubber = document.getElementById('composerTimeScrubber');
const compCurrentTimeLabel = document.getElementById('composerCurrentTimeLabel');
const compTotalTimeLabel = document.getElementById('composerTotalTimeLabel');
const compPlayBtn = document.getElementById('composerPlayBtn');
const compStopBtn = document.getElementById('composerStopBtn');
const exportMergedVideoBtn = document.getElementById('exportMergedVideoBtn');
const composerExportFormat = document.getElementById('composerExportFormat');
const compProgressContainer = document.getElementById('composerProgressContainer');
const compProgressBar = document.getElementById('composerProgressBar');
const compProgressPct = document.getElementById('composerProgressPct');

// Offscreen buffer for chroma key processing
const offVideoCanvas = document.createElement('canvas');
const offVideoCtx = offVideoCanvas.getContext('2d', { willReadFrequently: true });

document.addEventListener('DOMContentLoaded', () => {
  setupComposerEvents();
  compTranscriptInput.value = SAMPLE_COMPOSER_SRT;
  parseComposerTranscript();
  loadSampleSpeakerVideo();
  renderComposerFrame();
});

function setupComposerEvents() {
  // Layer 1: Preset Backgrounds
  document.querySelectorAll('.bg-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      composerState.bgImageObj = null;
      composerState.bgPreset = btn.dataset.bg;
      renderComposerFrame();
    });
  });

  // Layer 1: Image Upload
  const bgDropZone = document.getElementById('bgDropZone');
  const bgFileInput = document.getElementById('bgFileInput');
  bgDropZone.addEventListener('click', () => bgFileInput.click());
  bgFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleBgImageFile(e.target.files[0]);
  });
  bgDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    bgDropZone.classList.add('border-blue-500', 'bg-blue-950/20');
  });
  bgDropZone.addEventListener('dragleave', () => {
    bgDropZone.classList.remove('border-blue-500', 'bg-blue-950/20');
  });
  bgDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    bgDropZone.classList.remove('border-blue-500', 'bg-blue-950/20');
    if (e.dataTransfer.files.length > 0) handleBgImageFile(e.dataTransfer.files[0]);
  });

  // Layer 1: Dimming & Blur
  document.getElementById('bgDarknessSlider').addEventListener('input', (e) => {
    composerState.bgDarkness = parseInt(e.target.value, 10) / 100;
    document.getElementById('bgDarknessVal').textContent = `${e.target.value}%`;
    renderComposerFrame();
  });
  document.getElementById('bgBlurSlider').addEventListener('input', (e) => {
    composerState.bgBlur = parseInt(e.target.value, 10);
    document.getElementById('bgBlurVal').textContent = `${e.target.value}px`;
    renderComposerFrame();
  });

  // Layer 2: Video Upload & Sample
  const videoDropZone = document.getElementById('videoDropZone');
  const videoFileInput = document.getElementById('videoFileInput');
  videoDropZone.addEventListener('click', () => videoFileInput.click());
  videoFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleVideoFile(e.target.files[0]);
  });
  videoDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoDropZone.classList.add('border-emerald-500', 'bg-emerald-950/20');
  });
  videoDropZone.addEventListener('dragleave', () => {
    videoDropZone.classList.remove('border-emerald-500', 'bg-emerald-950/20');
  });
  videoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    videoDropZone.classList.remove('border-emerald-500', 'bg-emerald-950/20');
    if (e.dataTransfer.files.length > 0) handleVideoFile(e.dataTransfer.files[0]);
  });

  document.getElementById('loadSampleGreenVideoBtn').addEventListener('click', loadSampleSpeakerVideo);

  // Layer 2: Chroma Key Controls
  document.getElementById('chromaKeyEnabled').addEventListener('change', (e) => {
    composerState.chromaEnabled = e.target.checked;
    renderComposerFrame();
  });
  document.getElementById('chromaKeyColor').addEventListener('input', (e) => {
    composerState.chromaKeyColor = e.target.value;
    renderComposerFrame();
  });
  document.getElementById('chromaThresholdSlider').addEventListener('input', (e) => {
    composerState.chromaThreshold = parseInt(e.target.value, 10);
    document.getElementById('chromaThresholdVal').textContent = e.target.value;
    renderComposerFrame();
  });
  document.getElementById('chromaSoftnessSlider').addEventListener('input', (e) => {
    composerState.chromaSoftness = parseInt(e.target.value, 10);
    document.getElementById('chromaSoftnessVal').textContent = e.target.value;
    renderComposerFrame();
  });
  document.getElementById('videoScaleSlider').addEventListener('input', (e) => {
    composerState.videoScale = parseInt(e.target.value, 10) / 100;
    document.getElementById('videoScaleVal').textContent = `${e.target.value}%`;
    renderComposerFrame();
  });
  document.getElementById('videoPosYSlider').addEventListener('input', (e) => {
    composerState.videoPosYPercent = parseInt(e.target.value, 10);
    document.getElementById('videoPosYVal').textContent = `${e.target.value}%`;
    renderComposerFrame();
  });

  // Layer 3: Subtitle Inputs
  compTranscriptInput.addEventListener('input', parseComposerTranscript);
  document.getElementById('sampleTranscriptBtn').addEventListener('click', () => {
    compTranscriptInput.value = SAMPLE_COMPOSER_SRT;
    parseComposerTranscript();
  });
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

  // Player Controls
  compPlayBtn.addEventListener('click', toggleComposerPlay);
  compStopBtn.addEventListener('click', stopComposerPlay);
  compTimeScrubber.addEventListener('input', (e) => {
    composerState.currentTime = parseFloat(e.target.value);
    compCurrentTimeLabel.textContent = formatTime(composerState.currentTime);
    if (composerState.videoObj && !composerState.isSampleVideo) {
      composerState.videoObj.currentTime = composerState.currentTime % (composerState.videoObj.duration || 1);
    }
    renderComposerFrame();
  });

  // Export
  exportMergedVideoBtn.addEventListener('click', exportMergedVideo);
}

// --- Layer 1: Image Loader ---
function handleBgImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      composerState.bgImageObj = img;
      renderComposerFrame();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Layer 2: Video Loader ---
function handleVideoFile(file) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.loop = true;
  video.onloadeddata = () => {
    composerState.videoObj = video;
    composerState.isSampleVideo = false;
    offVideoCanvas.width = video.videoWidth || 1080;
    offVideoCanvas.height = video.videoHeight || 1920;
    renderComposerFrame();
  };
}

function loadSampleSpeakerVideo() {
  composerState.isSampleVideo = true;
  composerState.videoObj = null;
  offVideoCanvas.width = 720;
  offVideoCanvas.height = 1280;
  renderComposerFrame();
}

// --- Layer 3: Subtitle Parsing ---
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

// --- Playback Engine ---
function toggleComposerPlay() {
  if (composerState.isPlaying) pauseComposerPlay();
  else startComposerPlay();
}

function startComposerPlay() {
  if (composerState.currentTime >= composerState.duration) composerState.currentTime = 0;
  composerState.isPlaying = true;
  composerState.lastFrameTimestamp = performance.now();
  compPlayBtn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
  if (composerState.videoObj && !composerState.isSampleVideo) {
    composerState.videoObj.play();
  }
  requestAnimationFrame(composerLoop);
}

function pauseComposerPlay() {
  composerState.isPlaying = false;
  composerState.lastFrameTimestamp = null;
  compPlayBtn.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
  if (composerState.videoObj && !composerState.isSampleVideo) {
    composerState.videoObj.pause();
  }
}

function stopComposerPlay() {
  pauseComposerPlay();
  composerState.currentTime = 0;
  compTimeScrubber.value = 0;
  compCurrentTimeLabel.textContent = formatTime(0);
  if (composerState.videoObj && !composerState.isSampleVideo) {
    composerState.videoObj.currentTime = 0;
  }
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

// ============================================================================
// --- 3-LAYER COMPOSITE RENDERING PIPELINE ---
// ============================================================================

function renderComposerFrame(targetCtx = compCtx, targetTime = composerState.currentTime) {
  const w = composerState.style.width;
  const h = composerState.style.height;

  targetCtx.clearRect(0, 0, w, h);

  // -------------------------------------------------------------
  // LAYER 1: Background Image / Backdrop
  // -------------------------------------------------------------
  targetCtx.save();
  if (composerState.bgBlur > 0) {
    targetCtx.filter = `blur(${composerState.bgBlur}px)`;
  }

  if (composerState.bgImageObj) {
    drawCover(targetCtx, composerState.bgImageObj, w, h);
  } else {
    drawPresetBackdrop(targetCtx, composerState.bgPreset, w, h);
  }
  targetCtx.restore();

  // Dimming Tint
  if (composerState.bgDarkness > 0) {
    targetCtx.fillStyle = `rgba(0, 0, 0, ${composerState.bgDarkness})`;
    targetCtx.fillRect(0, 0, w, h);
  }

  // -------------------------------------------------------------
  // LAYER 2: Video with Real-Time Chroma Keying
  // -------------------------------------------------------------
  renderChromaKeyVideoLayer(targetCtx, targetTime, w, h);

  // -------------------------------------------------------------
  // LAYER 3: Animated Subtitles Overlay (Top)
  // -------------------------------------------------------------
  renderSubtitleOverlayLayer(targetCtx, targetTime, w, h);
}

function renderChromaKeyVideoLayer(targetCtx, targetTime, w, h) {
  const vw = offVideoCanvas.width || 720;
  const vh = offVideoCanvas.height || 1280;

  // Step A: Draw raw video frame onto offscreen buffer
  if (composerState.isSampleVideo || !composerState.videoObj) {
    drawSamplePresenterFrame(offVideoCtx, targetTime, vw, vh);
  } else {
    offVideoCtx.drawImage(composerState.videoObj, 0, 0, vw, vh);
  }

  // Step B: Process Chroma Keying if enabled
  if (composerState.chromaEnabled) {
    const frameData = offVideoCtx.getImageData(0, 0, vw, vh);
    applyChromaKey(frameData, composerState.chromaKeyColor, composerState.chromaThreshold, composerState.chromaSoftness);
    offVideoCtx.putImageData(frameData, 0, 0);
  }

  // Step C: Draw keyed video frame onto composite target canvas
  const scale = composerState.videoScale || 1.0;
  const drawW = w * scale;
  const drawH = (drawW / vw) * vh;
  const posX = (w - drawW) / 2;
  const posY = (h * (composerState.videoPosYPercent || 50) / 100) - (drawH / 2);

  targetCtx.drawImage(offVideoCanvas, posX, posY, drawW, drawH);
}

function applyChromaKey(imageData, keyHex, threshold, softness) {
  const data = imageData.data;
  const len = data.length;
  const keyRGB = hexToRgb(keyHex);
  const isGreenKey = keyRGB.g > keyRGB.r && keyRGB.g > keyRGB.b;

  const thresh = threshold * 2.2;
  const soft = Math.max(1, softness * 1.8);

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isGreenKey) {
      const maxRB = Math.max(r, b);
      const diff = g - maxRB;

      if (diff > thresh) {
        data[i + 3] = 0;
      } else if (diff > (thresh - soft)) {
        const edge = (diff - (thresh - soft)) / soft;
        data[i + 3] = Math.round(255 * (1 - edge));
        data[i + 1] = maxRB;
      }
    } else {
      const dist = Math.sqrt((r - keyRGB.r) ** 2 + (g - keyRGB.g) ** 2 + (b - keyRGB.b) ** 2);
      if (dist < thresh) {
        data[i + 3] = 0;
      } else if (dist < (thresh + soft)) {
        const edge = (dist - thresh) / soft;
        data[i + 3] = Math.round(255 * edge);
      }
    }
  }
}

function drawSamplePresenterFrame(ctx, t, w, h) {
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  const bounceY = Math.sin(t * 4) * 8;
  const centerX = w / 2;
  const centerY = (h * 0.55) + bounceY;

  // Presenter Body (Shoulders / Torso)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 220, 180, 260, 0, 0, Math.PI * 2);
  ctx.fill();

  // Presenter Head (Skin Tone)
  ctx.fillStyle = '#f5d0b5';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
  ctx.fill();

  // Hair (Dark)
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(centerX, centerY - 25, 102, Math.PI, Math.PI * 2);
  ctx.fill();

  // Glasses / Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(centerX - 55, centerY - 15, 38, 24);
  ctx.fillRect(centerX + 17, centerY - 15, 38, 24);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0f172a';
  ctx.strokeRect(centerX - 55, centerY - 15, 38, 24);
  ctx.strokeRect(centerX + 17, centerY - 15, 38, 24);

  // Animated Speaking Mouth (Frame-accurate synchronized with t)
  const mouthOpen = Math.abs(Math.sin(t * 12)) * 14;
  ctx.fillStyle = '#881337';
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 45, 20, Math.max(3, mouthOpen), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderSubtitleOverlayLayer(targetCtx, targetTime, w, h) {
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
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);
  }
}

function drawCover(ctx, media, targetW, targetH) {
  const mw = media.naturalWidth || media.width;
  const mh = media.naturalHeight || media.height;
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

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Frame-accurate video seek helper with event listener and safety timeout
 */
function seekVideo(video, targetTime) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - targetTime) < 0.02) {
      resolve();
      return;
    }
    let timeoutId;
    const onSeeked = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    timeoutId = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    }, 120);
    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;
  });
}

// ============================================================================
// --- EXPORT ENGINES: Universal MP4 (H.264) & WebM (VP9) ---
// ============================================================================

async function exportMergedVideo() {
  if (composerState.cues.length === 0) {
    alert("Please load or paste subtitles before exporting!");
    return;
  }

  pauseComposerPlay();

  const chosenFormat = (composerExportFormat ? composerExportFormat.value : 'mp4');

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

  // Check if MP4 WebCodecs is supported
  if (chosenFormat === 'mp4' && typeof VideoEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined') {
    try {
      await exportMp4WebCodecs(offCanvas, offCtx, w, h, fps, totalFrames);
      return;
    } catch (mp4Err) {
      console.warn("WebCodecs MP4 encoding failed, falling back to WebM:", mp4Err);
    }
  } else if (chosenFormat === 'webm' && typeof VideoEncoder !== 'undefined' && typeof WebMMuxer !== 'undefined') {
    try {
      await exportWebmWebCodecs(offCanvas, offCtx, w, h, fps, totalFrames);
      return;
    } catch (webmErr) {
      console.warn("WebCodecs WebM encoding failed, falling back to MediaRecorder:", webmErr);
    }
  }

  // Fallback MediaRecorder
  await exportMediaRecorderFallback(offCanvas, offCtx, w, h, fps, totalFrames);
}

/**
 * 1. UNIVERSAL MP4 EXPORT (H.264 / AVC)
 * Plays natively on macOS QuickTime Player, Windows Media Player, iOS, Android, Canva!
 */
async function exportMp4WebCodecs(canvas, ctx, w, h, fps, totalFrames) {
  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: w,
      height: h
    },
    fastStart: 'in-memory'
  });

  let encodedCount = 0;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      console.error("VideoEncoder Error:", e);
    }
  });

  encoder.configure({
    codec: 'avc1.4d002a', // Main Profile Level 4.2
    width: w,
    height: h,
    bitrate: 16000000 // 16 Mbps ultra crisp
  });

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;

    // Frame-accurate video seek to guarantee video is NOT static
    if (composerState.videoObj && !composerState.isSampleVideo) {
      const targetTime = t % (composerState.videoObj.duration || 1);
      await seekVideo(composerState.videoObj, targetTime);
    }

    renderComposerFrame(ctx, t);

    const frameTimestampMicros = Math.round(t * 1000000);
    const videoFrame = new VideoFrame(canvas, { timestamp: frameTimestampMicros });
    encoder.encode(videoFrame, { keyFrame: f % 30 === 0 });
    videoFrame.close();

    encodedCount++;
    const progress = Math.min(96, Math.round((encodedCount / totalFrames) * 94));
    compProgressBar.style.width = `${progress}%`;
    compProgressPct.textContent = `${progress}%`;

    if (f % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  await encoder.flush();
  muxer.finalize();

  const { buffer } = muxer.target;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  triggerDownload(blob, `composed_video_${Date.now()}.mp4`);
  finishExport();
}

/**
 * 2. WEBM VP9 EXPORT
 */
async function exportWebmWebCodecs(canvas, ctx, w, h, fps, totalFrames) {
  const muxer = new WebMMuxer.Muxer({
    target: new WebMMuxer.ArrayBufferTarget(),
    video: {
      codec: 'V_VP9',
      width: w,
      height: h
    }
  });

  let encodedCount = 0;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: console.error
  });

  encoder.configure({
    codec: 'vp09.00.10.08',
    width: w,
    height: h,
    bitrate: 16000000
  });

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;

    if (composerState.videoObj && !composerState.isSampleVideo) {
      const targetTime = t % (composerState.videoObj.duration || 1);
      await seekVideo(composerState.videoObj, targetTime);
    }

    renderComposerFrame(ctx, t);

    const frameTimestampMicros = Math.round(t * 1000000);
    const videoFrame = new VideoFrame(canvas, { timestamp: frameTimestampMicros });
    encoder.encode(videoFrame, { keyFrame: f % 30 === 0 });
    videoFrame.close();

    encodedCount++;
    const progress = Math.min(96, Math.round((encodedCount / totalFrames) * 94));
    compProgressBar.style.width = `${progress}%`;
    compProgressPct.textContent = `${progress}%`;

    if (f % 5 === 0) await new Promise(r => setTimeout(r, 0));
  }

  await encoder.flush();
  muxer.finalize();

  const { buffer } = muxer.target;
  const blob = new Blob([buffer], { type: 'video/webm' });
  triggerDownload(blob, `composed_video_${Date.now()}.webm`);
  finishExport();
}

/**
 * 3. FALLBACK MEDIA RECORDER
 */
async function exportMediaRecorderFallback(canvas, ctx, w, h, fps, totalFrames) {
  const stream = canvas.captureStream(fps);
  const mimeTypes = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 16000000
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const ext = chosenMime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: chosenMime });
    triggerDownload(blob, `composed_video_${Date.now()}.${ext}`);
    finishExport();
  };

  recorder.start();

  let f = 0;
  const frameIntervalMs = 1000 / fps;

  const renderNext = async () => {
    if (f > totalFrames) {
      recorder.stop();
      return;
    }
    const t = f / fps;

    if (composerState.videoObj && !composerState.isSampleVideo) {
      const targetTime = t % (composerState.videoObj.duration || 1);
      await seekVideo(composerState.videoObj, targetTime);
    }

    renderComposerFrame(ctx, t);

    const progress = Math.min(98, Math.round((f / totalFrames) * 98));
    compProgressBar.style.width = `${progress}%`;
    compProgressPct.textContent = `${progress}%`;

    f++;
    setTimeout(renderNext, frameIntervalMs);
  };

  renderNext();
}

function finishExport() {
  compProgressBar.style.width = '100%';
  compProgressPct.textContent = '100% - Ready!';
  setTimeout(() => {
    compProgressContainer.classList.add('hidden');
    exportMergedVideoBtn.disabled = false;
    exportMergedVideoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }, 2000);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
