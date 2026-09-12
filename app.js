/**
 * SubWebM Alpha v2.1 - Transparent Video Generator for Canva
 * Pure Transparent Video Exports (.webm VP9 Alpha and .mov 32-bit Alpha)
 */

// --- State Management ---
const state = {
  cues: [], // [{ id, start, end, text, words: [{word, start, end}] }]
  duration: 10.0,
  currentTime: 0.0,
  isPlaying: false,
  playbackSpeed: 1.0,
  lastFrameTimestamp: null,
  activeFormatTab: 'srt',
  exportFormat: 'webm_vp9', // 'webm_vp9', 'mov_alpha', 'green_screen'
  
  // Style settings
  style: {
    aspectRatio: '9:16', // 9:16, 16:9, 1:1, 4:5
    width: 1080,
    height: 1920,
    fontFamily: 'Anton',
    fontSize: 76,
    textCase: 'uppercase', // uppercase, original, lowercase, title
    primaryColor: '#FFFFFF',
    highlightColor: '#FFDF00',
    strokeColor: '#000000',
    strokeWidth: 14,
    shadowColor: '#000000',
    shadowBlur: 16,
    bgColor: '#000000',
    bgOpacity: 0,
    posYPercent: 80, // 10% to 95%
    animationMode: 'karaoke', // karaoke, pop, fade, static
    maxWordsPerLine: 4
  }
};

// --- Sample Datasets ---
const SAMPLES = {
  viralSrt: `1
00:00:00,500 --> 00:00:02,200
THIS IS HOW YOU CREATE

2
00:00:02,300 --> 00:00:04,800
ANIMATED SUBTITLE VIDEOS

3
00:00:04,900 --> 00:00:07,100
WITH A TRANSPARENT BACKGROUND

4
00:00:07,200 --> 00:00:09,800
READY FOR CANVA VIDEO TIMELINE!`,

  wordTimestampsJson: JSON.stringify([
    {
      start: 0.5,
      end: 2.8,
      text: "Transform your video captions effortlessly",
      words: [
        { word: "Transform", start: 0.5, end: 1.0 },
        { word: "your", start: 1.0, end: 1.3 },
        { word: "video", start: 1.3, end: 1.9 },
        { word: "captions", start: 1.9, end: 2.4 },
        { word: "effortlessly", start: 2.4, end: 2.8 }
      ]
    },
    {
      start: 3.1,
      end: 5.6,
      text: "Export as transparent WebM video",
      words: [
        { word: "Export", start: 3.1, end: 3.6 },
        { word: "as", start: 3.6, end: 3.9 },
        { word: "transparent", start: 3.9, end: 4.7 },
        { word: "WebM", start: 4.7, end: 5.1 },
        { word: "video", start: 5.1, end: 5.6 }
      ]
    },
    {
      start: 6.0,
      end: 8.8,
      text: "Drag and drop straight into Canva!",
      words: [
        { word: "Drag", start: 6.0, end: 6.5 },
        { word: "and", start: 6.5, end: 6.8 },
        { word: "drop", start: 6.8, end: 7.3 },
        { word: "straight", start: 7.3, end: 7.8 },
        { word: "into", start: 7.8, end: 8.2 },
        { word: "Canva!", start: 8.2, end: 8.8 }
      ]
    }
  ], null, 2)
};

// --- DOM Elements ---
const canvas = document.getElementById('subtitleCanvas');
const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
const canvasViewport = document.getElementById('canvasViewport');
const transcriptInput = document.getElementById('transcriptInput');
const cueCountLabel = document.getElementById('cueCountLabel');
const timeScrubber = document.getElementById('timeScrubber');
const currentTimeLabel = document.getElementById('currentTimeLabel');
const totalTimeLabel = document.getElementById('totalTimeLabel');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const exportWebmBtn = document.getElementById('exportWebmBtn');
const exportProgressContainer = document.getElementById('exportProgressContainer');
const exportProgressBar = document.getElementById('exportProgressBar');
const exportProgressPct = document.getElementById('exportProgressPct');
const exportStatusText = document.getElementById('exportStatusText');
const noCueNotice = document.getElementById('noCueNotice');
const exportFormatSelect = document.getElementById('exportFormatSelect');
const formatDesc = document.getElementById('formatDesc');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadSample('viralSrt');
  updateCanvasDimensions();
  renderFrame();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  document.getElementById('sampleSrtBtn').addEventListener('click', () => {
    setTab('srt');
    loadSample('viralSrt');
  });
  document.getElementById('sampleWordBtn').addEventListener('click', () => {
    setTab('json');
    loadSample('wordTimestampsJson');
  });

  document.getElementById('tabSrt').addEventListener('click', () => setTab('srt'));
  document.getElementById('tabJson').addEventListener('click', () => setTab('json'));
  document.getElementById('tabPlain').addEventListener('click', () => setTab('plain'));

  transcriptInput.addEventListener('input', parseCurrentInput);
  document.getElementById('clearTranscriptBtn').addEventListener('click', () => {
    transcriptInput.value = '';
    parseCurrentInput();
  });

  document.getElementById('generateAutoTimingsBtn').addEventListener('click', generatePlainTimings);

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
  });
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-950/20');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-950/20');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('bgCheckerBtn').addEventListener('click', (e) => setPreviewBg('checkerboard', e.target));
  document.getElementById('bgDarkBtn').addEventListener('click', (e) => setPreviewBg('dark', e.target));
  document.getElementById('bgLightBtn').addEventListener('click', (e) => setPreviewBg('light', e.target));
  document.getElementById('bgGreenBtn').addEventListener('click', (e) => setPreviewBg('green', e.target));

  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', stopPlayback);
  timeScrubber.addEventListener('input', (e) => {
    state.currentTime = parseFloat(e.target.value);
    currentTimeLabel.textContent = formatTime(state.currentTime);
    renderFrame();
  });

  if (exportFormatSelect) {
    exportFormatSelect.addEventListener('change', (e) => {
      state.exportFormat = e.target.value;
      if (e.target.value === 'webm_vp9') {
        formatDesc.textContent = "Exports a genuine video file (.webm) with Matroska AlphaMode=1 container. Canva natively recognizes this as a video in the Videos tab!";
        formatDesc.className = "text-[11px] text-purple-400 leading-relaxed";
      } else if (e.target.value === 'mov_alpha') {
        formatDesc.textContent = "Exports a 32-bit QuickTime Video file (.mov). Apple & Canva native video format with 100% true alpha transparency!";
        formatDesc.className = "text-[11px] text-cyan-400 leading-relaxed";
      } else if (e.target.value === 'green_screen') {
        formatDesc.textContent = "High-bitrate video with pure #00FF00 Green background for traditional 1-click chroma keying.";
        formatDesc.className = "text-[11px] text-emerald-400 leading-relaxed";
      }
    });
  }

  bindControl('aspectRatioSelect', (val) => {
    state.style.aspectRatio = val;
    updateCanvasDimensions();
    renderFrame();
  });

  bindControl('fontFamilySelect', (val) => {
    state.style.fontFamily = val;
    renderFrame();
  });

  bindControl('animationModeSelect', (val) => {
    state.style.animationMode = val;
    renderFrame();
  });

  bindControl('fontSizeSlider', (val) => {
    state.style.fontSize = parseInt(val, 10);
    document.getElementById('fontSizeVal').textContent = `${val}px`;
    renderFrame();
  });

  bindControl('posYSlider', (val) => {
    state.style.posYPercent = parseInt(val, 10);
    document.getElementById('posYVal').textContent = `${val}%`;
    renderFrame();
  });

  bindControl('textCaseSelect', (val) => {
    state.style.textCase = val;
    renderFrame();
  });

  bindColorControl('primaryColorInput', 'primaryColorHex', (val) => {
    state.style.primaryColor = val;
    renderFrame();
  });

  bindColorControl('highlightColorInput', 'highlightColorHex', (val) => {
    state.style.highlightColor = val;
    renderFrame();
  });

  bindControl('strokeWidthSlider', (val) => {
    state.style.strokeWidth = parseInt(val, 10);
    document.getElementById('strokeWidthVal').textContent = `${val}px`;
    renderFrame();
  });

  bindColorControl('strokeColorInput', null, (val) => {
    state.style.strokeColor = val;
    renderFrame();
  });

  bindControl('shadowBlurSlider', (val) => {
    state.style.shadowBlur = parseInt(val, 10);
    document.getElementById('shadowBlurVal').textContent = `${val}px`;
    renderFrame();
  });

  bindColorControl('shadowColorInput', null, (val) => {
    state.style.shadowColor = val;
    renderFrame();
  });

  bindControl('bgOpacitySlider', (val) => {
    state.style.bgOpacity = parseInt(val, 10) / 100;
    document.getElementById('bgOpacityVal').textContent = `${val}%`;
    renderFrame();
  });

  bindColorControl('bgColorInput', null, (val) => {
    state.style.bgColor = val;
    renderFrame();
  });

  bindControl('maxWordsSlider', (val) => {
    state.style.maxWordsPerLine = parseInt(val, 10);
    document.getElementById('maxWordsVal').textContent = val;
    renderFrame();
  });

  exportWebmBtn.addEventListener('click', handleExport);

  const modal = document.getElementById('canvaModal');
  document.getElementById('quickHelpBtn').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('closeModalBtn').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('gotItBtn').addEventListener('click', () => modal.classList.add('hidden'));
}

function bindControl(id, callback) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', (e) => callback(e.target.value));
    el.addEventListener('change', (e) => callback(e.target.value));
  }
}

function bindColorControl(pickerId, hexId, callback) {
  const picker = document.getElementById(pickerId);
  const hex = hexId ? document.getElementById(hexId) : null;
  if (picker) {
    picker.addEventListener('input', (e) => {
      if (hex) hex.value = e.target.value.toUpperCase();
      callback(e.target.value);
    });
  }
  if (hex) {
    hex.addEventListener('input', (e) => {
      let val = e.target.value;
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        picker.value = val;
        callback(val);
      }
    });
  }
}

function setPreviewBg(mode, targetBtn) {
  canvasViewport.className = 'relative max-h-[440px] shadow-2xl rounded-lg overflow-hidden flex items-center justify-center';
  
  if (mode === 'checkerboard') canvasViewport.classList.add('preview-checkerboard');
  else if (mode === 'dark') canvasViewport.classList.add('preview-dark');
  else if (mode === 'light') canvasViewport.classList.add('preview-light');
  else if (mode === 'green') canvasViewport.classList.add('preview-green');

  const parent = targetBtn.parentElement;
  Array.from(parent.children).forEach(btn => {
    btn.className = 'px-2.5 py-1 rounded-md text-[11px] text-slate-400 hover:text-white';
  });
  targetBtn.className = 'px-2.5 py-1 rounded-md text-[11px] bg-slate-800 text-white font-medium';
}

function setTab(tab) {
  state.activeFormatTab = tab;
  const tabSrt = document.getElementById('tabSrt');
  const tabJson = document.getElementById('tabJson');
  const tabPlain = document.getElementById('tabPlain');
  const plainControls = document.getElementById('plainTextControls');

  [tabSrt, tabJson, tabPlain].forEach(t => {
    t.className = 'flex-1 py-1.5 rounded-lg font-medium transition text-center text-slate-400 hover:text-white';
  });

  plainControls.classList.add('hidden');

  if (tab === 'srt') {
    tabSrt.className = 'flex-1 py-1.5 rounded-lg font-medium transition text-center bg-indigo-600 text-white';
    transcriptInput.placeholder = "Paste your SRT or VTT format subtitles here...";
  } else if (tab === 'json') {
    tabJson.className = 'flex-1 py-1.5 rounded-lg font-medium transition text-center bg-indigo-600 text-white';
    transcriptInput.placeholder = "Paste your Whisper JSON array with timestamps here...";
  } else if (tab === 'plain') {
    tabPlain.className = 'flex-1 py-1.5 rounded-lg font-medium transition text-center bg-indigo-600 text-white';
    transcriptInput.placeholder = "Type or paste lines of plain text here to automatically generate subtitle cues...";
    plainControls.classList.remove('hidden');
  }
}

function loadSample(key) {
  transcriptInput.value = SAMPLES[key] || '';
  parseCurrentInput();
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    transcriptInput.value = text;
    if (file.name.endsWith('.json')) setTab('json');
    else if (file.name.endsWith('.srt') || file.name.endsWith('.vtt')) setTab('srt');
    else setTab('plain');
    parseCurrentInput();
  };
  reader.readAsText(file);
}

function parseCurrentInput() {
  const raw = transcriptInput.value.trim();
  if (!raw) {
    state.cues = [];
    state.duration = 10.0;
    updateDurationUI();
    renderFrame();
    return;
  }

  try {
    if (raw.startsWith('[') || raw.startsWith('{')) {
      state.cues = parseWhisperJson(raw);
    } else if (raw.includes('-->')) {
      state.cues = parseSrtOrVtt(raw);
    } else {
      state.cues = parsePlainText(raw);
    }
  } catch (err) {
    console.warn("Parse error:", err);
    state.cues = parsePlainText(raw);
  }

  if (state.cues.length > 0) {
    const maxEnd = Math.max(...state.cues.map(c => c.end));
    state.duration = Math.max(maxEnd + 0.5, 3.0);
  } else {
    state.duration = 10.0;
  }

  cueCountLabel.textContent = `${state.cues.length} cues detected`;
  updateDurationUI();
  renderFrame();
}

function parseSrtOrVtt(text) {
  const cues = [];
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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

  return cues;
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

function parseWhisperJson(jsonStr) {
  const data = JSON.parse(jsonStr);
  const cues = [];
  const list = Array.isArray(data) ? data : (data.segments || data.subtitles || [data]);

  for (const item of list) {
    const start = parseFloat(item.start ?? item.startTime ?? 0);
    const end = parseFloat(item.end ?? item.endTime ?? (start + 2.0));
    const text = (item.text || item.caption || "").trim();

    let words = [];
    if (Array.isArray(item.words) && item.words.length > 0) {
      words = item.words.map(w => ({
        word: (w.word || w.text || "").trim(),
        start: parseFloat(w.start ?? start),
        end: parseFloat(w.end ?? end)
      }));
    } else if (text) {
      words = generateWordTimings(text, start, end);
    }

    if (text) {
      cues.push({
        id: cues.length + 1,
        start,
        end,
        text,
        words
      });
    }
  }
  return cues;
}

function parsePlainText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const cues = [];
  let curTime = 0.5;

  for (const line of lines) {
    const wordCount = line.split(/\s+/).length;
    const dur = Math.max(1.5, wordCount * 0.4);
    const start = curTime;
    const end = curTime + dur;
    const words = generateWordTimings(line, start, end);

    cues.push({
      id: cues.length + 1,
      start,
      end,
      text,
      words
    });

    curTime = end + 0.3;
  }
  return cues;
}

function generateWordTimings(text, cueStart, cueEnd) {
  const rawWords = text.split(/\s+/).filter(w => w.length > 0);
  if (rawWords.length === 0) return [];

  const totalDuration = cueEnd - cueStart;
  const perWord = totalDuration / rawWords.length;

  return rawWords.map((word, idx) => ({
    word,
    start: cueStart + (idx * perWord),
    end: cueStart + ((idx + 1) * perWord)
  }));
}

function generatePlainTimings() {
  const wordsPerChunk = parseInt(document.getElementById('wordsPerChunk').value, 10) || 3;
  const secPerWord = parseFloat(document.getElementById('secPerWord').value) || 0.35;
  const raw = transcriptInput.value.trim();

  if (!raw) return;

  const allWords = raw.replace(/\n+/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const cues = [];
  let curTime = 0.5;

  for (let i = 0; i < allWords.length; i += wordsPerChunk) {
    const chunkWords = allWords.slice(i, i + wordsPerChunk);
    const text = chunkWords.join(' ');
    const dur = chunkWords.length * secPerWord;
    const start = curTime;
    const end = curTime + dur;

    const words = chunkWords.map((w, idx) => ({
      word: w,
      start: start + (idx * secPerWord),
      end: start + ((idx + 1) * secPerWord)
    }));

    cues.push({
      id: cues.length + 1,
      start,
      end,
      text,
      words
    });

    curTime = end + 0.2;
  }

  let srtOutput = '';
  cues.forEach(c => {
    srtOutput += `${c.id}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n\n`;
  });

  transcriptInput.value = srtOutput.trim();
  setTab('srt');
  parseCurrentInput();
}

function formatSrtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function updateCanvasDimensions() {
  const ratio = state.style.aspectRatio;
  let w = 1080, h = 1920;

  if (ratio === '16:9') {
    w = 1920; h = 1080;
    canvasViewport.style.aspectRatio = "16/9";
  } else if (ratio === '1:1') {
    w = 1080; h = 1080;
    canvasViewport.style.aspectRatio = "1/1";
  } else if (ratio === '4:5') {
    w = 1080; h = 1350;
    canvasViewport.style.aspectRatio = "4/5";
  } else {
    w = 1080; h = 1920;
    canvasViewport.style.aspectRatio = "9/16";
  }

  state.style.width = w;
  state.style.height = h;
  canvas.width = w;
  canvas.height = h;
}

function applyPreset(presetName) {
  if (presetName === 'mrbeast') {
    state.style.fontFamily = 'Anton';
    state.style.fontSize = 76;
    state.style.primaryColor = '#FFFFFF';
    state.style.highlightColor = '#FFDF00';
    state.style.strokeColor = '#000000';
    state.style.strokeWidth = 14;
    state.style.shadowColor = '#000000';
    state.style.shadowBlur = 18;
    state.style.bgOpacity = 0;
    state.style.textCase = 'uppercase';
    state.style.animationMode = 'karaoke';
  } else if (presetName === 'minimal') {
    state.style.fontFamily = 'Inter';
    state.style.fontSize = 54;
    state.style.primaryColor = '#FFFFFF';
    state.style.highlightColor = '#60A5FA';
    state.style.strokeColor = '#000000';
    state.style.strokeWidth = 0;
    state.style.shadowColor = '#000000';
    state.style.shadowBlur = 6;
    state.style.bgColor = '#0F172A';
    state.style.bgOpacity = 0.75;
    state.style.textCase = 'original';
    state.style.animationMode = 'fade';
  } else if (presetName === 'cinema') {
    state.style.fontFamily = 'Bebas Neue';
    state.style.fontSize = 80;
    state.style.primaryColor = '#FDE047';
    state.style.highlightColor = '#FFFFFF';
    state.style.strokeColor = '#000000';
    state.style.strokeWidth = 8;
    state.style.shadowColor = '#000000';
    state.style.shadowBlur = 12;
    state.style.bgOpacity = 0;
    state.style.textCase = 'uppercase';
    state.style.animationMode = 'static';
  } else if (presetName === 'cyber') {
    state.style.fontFamily = 'Montserrat';
    state.style.fontSize = 68;
    state.style.primaryColor = '#38BDF8';
    state.style.highlightColor = '#F43F5E';
    state.style.strokeColor = '#030712';
    state.style.strokeWidth = 10;
    state.style.shadowColor = '#06B6D4';
    state.style.shadowBlur = 24;
    state.style.bgOpacity = 0;
    state.style.textCase = 'uppercase';
    state.style.animationMode = 'karaoke';
  }

  syncInputsWithState();
  renderFrame();
}

function syncInputsWithState() {
  document.getElementById('fontFamilySelect').value = state.style.fontFamily;
  document.getElementById('fontSizeSlider').value = state.style.fontSize;
  document.getElementById('fontSizeVal').textContent = `${state.style.fontSize}px`;
  document.getElementById('textCaseSelect').value = state.style.textCase;
  document.getElementById('animationModeSelect').value = state.style.animationMode;

  document.getElementById('primaryColorInput').value = state.style.primaryColor;
  document.getElementById('primaryColorHex').value = state.style.primaryColor;
  document.getElementById('highlightColorInput').value = state.style.highlightColor;
  document.getElementById('highlightColorHex').value = state.style.highlightColor;

  document.getElementById('strokeWidthSlider').value = state.style.strokeWidth;
  document.getElementById('strokeWidthVal').textContent = `${state.style.strokeWidth}px`;
  document.getElementById('strokeColorInput').value = state.style.strokeColor;

  document.getElementById('shadowBlurSlider').value = state.style.shadowBlur;
  document.getElementById('shadowBlurVal').textContent = `${state.style.shadowBlur}px`;
  document.getElementById('shadowColorInput').value = state.style.shadowColor;

  document.getElementById('bgOpacitySlider').value = Math.round(state.style.bgOpacity * 100);
  document.getElementById('bgOpacityVal').textContent = `${Math.round(state.style.bgOpacity * 100)}%`;
  document.getElementById('bgColorInput').value = state.style.bgColor;
}

function togglePlay() {
  if (state.isPlaying) pausePlayback();
  else startPlayback();
}

function startPlayback() {
  if (state.currentTime >= state.duration) state.currentTime = 0;
  state.isPlaying = true;
  state.lastFrameTimestamp = performance.now();
  playBtn.innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
  requestAnimationFrame(playbackLoop);
}

function pausePlayback() {
  state.isPlaying = false;
  state.lastFrameTimestamp = null;
  playBtn.innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
}

function stopPlayback() {
  pausePlayback();
  state.currentTime = 0;
  timeScrubber.value = 0;
  currentTimeLabel.textContent = formatTime(0);
  renderFrame();
}

function playbackLoop(timestamp) {
  if (!state.isPlaying) return;

  if (state.lastFrameTimestamp) {
    const delta = (timestamp - state.lastFrameTimestamp) / 1000;
    state.currentTime += delta * state.playbackSpeed;

    if (state.currentTime >= state.duration) {
      state.currentTime = state.duration;
      pausePlayback();
    }
  }

  state.lastFrameTimestamp = timestamp;
  timeScrubber.value = state.currentTime;
  currentTimeLabel.textContent = formatTime(state.currentTime);
  renderFrame();

  if (state.isPlaying) {
    requestAnimationFrame(playbackLoop);
  }
}

function updateDurationUI() {
  timeScrubber.max = state.duration;
  totalTimeLabel.textContent = formatTime(state.duration);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
}

// --- Canvas Subtitle Rendering Engine ---
function renderFrame(targetCtx = ctx, targetTime = state.currentTime, isGreenScreen = false) {
  const w = state.style.width;
  const h = state.style.height;

  if (isGreenScreen) {
    targetCtx.fillStyle = '#00FF00';
    targetCtx.fillRect(0, 0, w, h);
  } else {
    targetCtx.clearRect(0, 0, w, h);
  }

  const activeCue = state.cues.find(c => targetTime >= c.start && targetTime <= c.end);

  if (!activeCue) {
    if (targetCtx === ctx) noCueNotice.classList.remove('hidden');
    return;
  }

  if (targetCtx === ctx) noCueNotice.classList.add('hidden');

  const formatText = (txt) => {
    if (state.style.textCase === 'uppercase') return txt.toUpperCase();
    if (state.style.textCase === 'lowercase') return txt.toLowerCase();
    if (state.style.textCase === 'title') {
      return txt.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    }
    return txt;
  };

  const fontSize = state.style.fontSize;
  const fontFamily = state.style.fontFamily;
  targetCtx.font = `900 ${fontSize}px "${fontFamily}", sans-serif`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';

  const words = activeCue.words || generateWordTimings(activeCue.text, activeCue.start, activeCue.end);
  const maxWords = state.style.maxWordsPerLine;

  const lines = [];
  for (let i = 0; i < words.length; i += maxWords) {
    lines.push(words.slice(i, i + maxWords));
  }

  const lineHeight = fontSize * 1.25;
  const totalBlockHeight = lines.length * lineHeight;
  const centerY = (h * state.style.posYPercent) / 100;
  const startY = centerY - (totalBlockHeight / 2) + (lineHeight / 2);

  let globalAlpha = 1.0;
  let globalScale = 1.0;

  if (state.style.animationMode === 'fade') {
    const fadeInDur = 0.25;
    const elapsed = targetTime - activeCue.start;
    if (elapsed < fadeInDur) globalAlpha = Math.min(1.0, elapsed / fadeInDur);
  } else if (state.style.animationMode === 'pop') {
    const popDur = 0.2;
    const elapsed = targetTime - activeCue.start;
    if (elapsed < popDur) {
      const p = elapsed / popDur;
      globalScale = 0.7 + (0.3 * Math.sin(p * Math.PI / 2));
    }
  }

  targetCtx.save();
  targetCtx.globalAlpha = globalAlpha;

  // Background Box / Pill
  if (state.style.bgOpacity > 0) {
    let maxLineWidth = 0;
    lines.forEach(lineWords => {
      const lineStr = lineWords.map(w => formatText(w.word)).join(' ');
      const lineMetrics = targetCtx.measureText(lineStr);
      if (lineMetrics.width > maxLineWidth) maxLineWidth = lineMetrics.width;
    });

    const paddingX = fontSize * 0.6;
    const paddingY = fontSize * 0.4;
    const bgBoxW = maxLineWidth + (paddingX * 2);
    const bgBoxH = totalBlockHeight + (paddingY * 1.2);
    const bgBoxX = (w / 2) - (bgBoxW / 2);
    const bgBoxY = centerY - (bgBoxH / 2);
    const borderRadius = 18;

    targetCtx.fillStyle = hexToRgba(state.style.bgColor, state.style.bgOpacity);
    drawRoundedRect(targetCtx, bgBoxX, bgBoxY, bgBoxW, bgBoxH, borderRadius);
    targetCtx.fill();
  }

  // Draw Lines & Words
  lines.forEach((lineWords, lineIdx) => {
    const lineY = startY + (lineIdx * lineHeight);
    const fullLineStr = lineWords.map(w => formatText(w.word)).join(' ');
    const fullLineWidth = targetCtx.measureText(fullLineStr).width;
    const spaceWidth = targetCtx.measureText(' ').width;

    let curX = (w / 2) - (fullLineWidth / 2);

    lineWords.forEach((wordObj) => {
      const formattedWord = formatText(wordObj.word);
      const wordMetrics = targetCtx.measureText(formattedWord);
      const wordWidth = wordMetrics.width;
      const wordCenterX = curX + (wordWidth / 2);

      const isWordActive = targetTime >= wordObj.start && targetTime <= wordObj.end;

      targetCtx.save();

      let wordColor = state.style.primaryColor;
      let wordScale = 1.0;

      if (state.style.animationMode === 'karaoke') {
        if (isWordActive) {
          wordColor = state.style.highlightColor;
          wordScale = 1.12;
        }
      }

      targetCtx.translate(wordCenterX, lineY);
      targetCtx.scale(globalScale * wordScale, globalScale * wordScale);

      // Shadow / Glow
      if (state.style.shadowBlur > 0) {
        targetCtx.shadowColor = state.style.shadowColor;
        targetCtx.shadowBlur = state.style.shadowBlur;
        targetCtx.shadowOffsetX = 0;
        targetCtx.shadowOffsetY = 4;
      }

      // Stroke / Outline
      if (state.style.strokeWidth > 0) {
        targetCtx.strokeStyle = state.style.strokeColor;
        targetCtx.lineWidth = state.style.strokeWidth;
        targetCtx.lineJoin = 'round';
        targetCtx.miterLimit = 2;
        targetCtx.strokeText(formattedWord, 0, 0);
      }

      targetCtx.shadowBlur = 0;
      targetCtx.fillStyle = wordColor;
      targetCtx.fillText(formattedWord, 0, 0);

      targetCtx.restore();

      curX += wordWidth + spaceWidth;
    });
  });

  targetCtx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
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

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================================
// --- VIDEO EXPORT ENGINES: Transparent WebM VP9 Video & QuickTime MOV Video ---
// ============================================================================

async function handleExport() {
  if (state.cues.length === 0) {
    alert("Please add or paste subtitles before exporting!");
    return;
  }

  pausePlayback();

  const format = state.exportFormat || 'webm_vp9';
  if (format === 'webm_vp9') {
    await exportWebmVP9AlphaVideo();
  } else if (format === 'mov_alpha') {
    await exportQuickTimeAlphaVideo();
  } else if (format === 'green_screen') {
    await exportGreenScreenVideo();
  }
}

/**
 * 1. TRANSPARENT WEBM VIDEO EXPORT (WebCodecs & WebMMuxer)
 * Writes a genuine Matroska WebM video file (.webm) with AlphaMode=1 container header.
 * Directly importable into Canva's Videos tab!
 */
async function exportWebmVP9AlphaVideo() {
  showExportUI("Rendering Transparent WebM Video (.webm) for Canva...");

  const w = state.style.width;
  const h = state.style.height;
  const fps = 30;
  const totalFrames = Math.ceil(state.duration * fps);

  const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof WebMMuxer !== 'undefined';

  if (hasWebCodecs) {
    try {
      const muxer = new WebMMuxer.Muxer({
        target: new WebMMuxer.ArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width: w,
          height: h,
          alpha: true
        }
      });

      let encodedFrames = 0;
      const encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          console.error("WebCodecs VideoEncoder Error:", e);
        }
      });

      encoder.configure({
        codec: 'vp09.00.10.08',
        width: w,
        height: h,
        bitrate: 12000000, // 12 Mbps
        alpha: 'keep'
      });

      const offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      const offCtx = offCanvas.getContext('2d', { alpha: true });

      for (let f = 0; f < totalFrames; f++) {
        const t = f / fps;
        renderFrame(offCtx, t, false);

        const frameTimestampMicros = Math.round(t * 1000000);
        const videoFrame = new VideoFrame(offCanvas, {
          timestamp: frameTimestampMicros,
          alpha: 'keep'
        });

        encoder.encode(videoFrame, { keyFrame: f % 30 === 0 });
        videoFrame.close();

        encodedFrames++;
        const progress = Math.min(95, Math.round((encodedFrames / totalFrames) * 92));
        updateExportProgress(progress);

        if (f % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      await encoder.flush();
      muxer.finalize();

      const { buffer } = muxer.target;
      const blob = new Blob([buffer], { type: 'video/webm' });
      triggerDownload(blob, `subtitles_transparent_${state.style.aspectRatio.replace(':', 'x')}_${Date.now()}.webm`);
      finishExportUI();
      return;
    } catch (webcodecsErr) {
      console.warn("WebCodecs VideoEncoder failed, falling back to MediaRecorder stream:", webcodecsErr);
    }
  }

  // Fallback to MediaRecorder canvas captureStream
  await exportMediaRecorderWebm(false);
}

/**
 * 2. QUICKTIME MOV 32-BIT ALPHA VIDEO EXPORT (.mov)
 * Builds an Apple QuickTime Movie container with 32-bit RGBA PNG video frames.
 * Canva natively loads .mov video files with full alpha transparency on the video timeline!
 */
async function exportQuickTimeAlphaVideo() {
  showExportUI("Rendering QuickTime Alpha Video (.mov) for Canva...");

  const w = state.style.width;
  const h = state.style.height;
  const fps = 25;
  const totalFrames = Math.ceil(state.duration * fps);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const offCtx = offCanvas.getContext('2d', { alpha: true, willReadFrequently: true });

  const pngBlobs = [];

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    renderFrame(offCtx, t, false);

    const blob = await new Promise(resolve => offCanvas.toBlob(resolve, 'image/png'));
    const arrayBuffer = await blob.arrayBuffer();
    pngBlobs.push(new Uint8Array(arrayBuffer));

    const progress = Math.min(90, Math.round(((f + 1) / totalFrames) * 88));
    updateExportProgress(progress);

    if (f % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }

  updateExportProgress(92);
  exportStatusText.textContent = "Muxing QuickTime .MOV Video Container...";

  const movBuffer = buildQuickTimeMov(pngBlobs, w, h, fps);
  const finalBlob = new Blob([movBuffer], { type: 'video/quicktime' });
  triggerDownload(finalBlob, `subtitles_transparent_${state.style.aspectRatio.replace(':', 'x')}_${Date.now()}.mov`);
  finishExportUI();
}

/**
 * Pure JavaScript QuickTime MOV Muxer for 32-bit Alpha Video Frames
 */
function buildQuickTimeMov(pngFrames, width, height, fps) {
  const timescale = 600;
  const frameDuration = Math.round(timescale / fps);
  const totalDuration = pngFrames.length * frameDuration;

  // Calculate total mdat size
  let mdatPayloadSize = 0;
  pngFrames.forEach(f => { mdatPayloadSize += f.byteLength; });

  // 1. ftyp Atom
  const ftyp = createAtom('ftyp', [
    stringToBytes('qt  '),
    new Uint8Array([0x00, 0x00, 0x02, 0x00]), // minor version
    stringToBytes('qt  ')
  ]);

  // 2. mdat Atom Header (8 bytes) + concatenated PNG frames
  const mdatHeader = createAtomHeader('mdat', 8 + mdatPayloadSize);
  const mdatOffset = ftyp.byteLength;

  // 3. Track & Sample Table Construction
  const stszPayload = new Uint8Array(12 + pngFrames.length * 4);
  const stszView = new DataView(stszPayload.buffer);
  stszView.setUint32(0, 0); // version & flags
  stszView.setUint32(4, 0); // uniform sample size (0 = variable)
  stszView.setUint32(8, pngFrames.length); // count
  pngFrames.forEach((f, idx) => {
    stszView.setUint32(12 + idx * 4, f.byteLength);
  });
  const stsz = createAtom('stsz', [stszPayload]);

  // stts (Time-to-sample)
  const sttsPayload = new Uint8Array(16);
  const sttsView = new DataView(sttsPayload.buffer);
  sttsView.setUint32(0, 0);
  sttsView.setUint32(4, 1); // 1 entry
  sttsView.setUint32(8, pngFrames.length);
  sttsView.setUint32(12, frameDuration);
  const stts = createAtom('stts', [sttsPayload]);

  // stsc (Sample-to-chunk: 1 chunk containing all samples)
  const stscPayload = new Uint8Array(20);
  const stscView = new DataView(stscPayload.buffer);
  stscView.setUint32(0, 0);
  stscView.setUint32(4, 1);
  stscView.setUint32(8, 1); // first chunk
  stscView.setUint32(12, pngFrames.length); // samples per chunk
  stscView.setUint32(16, 1); // sample desc index
  const stsc = createAtom('stsc', [stscPayload]);

  // stsd (Sample Description: 'png ' codec with 32-bit depth)
  const pngEntryPayload = new Uint8Array(78);
  const peView = new DataView(pngEntryPayload.buffer);
  peView.setUint32(0, 86); // size of sample entry
  pngEntryPayload.set(stringToBytes('png '), 4); // fourcc
  peView.setUint16(14, 1); // data reference index
  peView.setUint16(32, width); // width
  peView.setUint16(34, height); // height
  peView.setUint32(36, 0x00480000); // 72 dpi horiz
  peView.setUint32(40, 0x00480000); // 72 dpi vert
  peView.setUint16(50, 1); // frame count
  peView.setUint16(82 - 8, 32); // 32-bit depth (24-bit color + 8-bit alpha)
  peView.setInt16(84 - 8, -1); // color table id (-1 = default)

  const stsdHeader = new Uint8Array(8);
  const stsdView = new DataView(stsdHeader.buffer);
  stsdView.setUint32(0, 0); // version/flags
  stsdView.setUint32(4, 1); // 1 description entry
  const stsd = createAtom('stsd', [stsdHeader, pngEntryPayload]);

  // Placeholder for stco (will populate exact chunk offset once mdat is positioned)
  const stcoPayload = new Uint8Array(12);
  const stcoView = new DataView(stcoPayload.buffer);
  stcoView.setUint32(0, 0);
  stcoView.setUint32(4, 1);
  const videoDataOffset = mdatOffset + 8; // mdat payload starts right after 8-byte mdat header
  stcoView.setUint32(8, videoDataOffset);
  const stco = createAtom('stco', [stcoPayload]);

  // stbl
  const stbl = createAtom('stbl', [stsd, stts, stsc, stsz, stco]);

  // vmhd
  const vmhdPayload = new Uint8Array(12);
  const vmhd = createAtom('vmhd', [vmhdPayload]);

  // dinf -> dref
  const drefPayload = new Uint8Array(20);
  const drefView = new DataView(drefPayload.buffer);
  drefView.setUint32(4, 1);
  drefView.setUint32(8, 12);
  drefPayload.set(stringToBytes('url '), 12);
  drefView.setUint32(16, 1); // self-contained flag
  const dref = createAtom('dref', [drefPayload]);
  const dinf = createAtom('dinf', [dref]);

  // minf
  const minf = createAtom('minf', [vmhd, dinf, stbl]);

  // hdlr
  const hdlrPayload = new Uint8Array(25);
  const hdlrView = new DataView(hdlrPayload.buffer);
  hdlrPayload.set(stringToBytes('mhlr'), 4);
  hdlrPayload.set(stringToBytes('vide'), 8);
  const hdlr = createAtom('hdlr', [hdlrPayload]);

  // mdhd
  const mdhdPayload = new Uint8Array(24);
  const mdhdView = new DataView(mdhdPayload.buffer);
  mdhdView.setUint32(12, timescale);
  mdhdView.setUint32(16, totalDuration);
  const mdhd = createAtom('mdhd', [mdhdPayload]);

  // mdia
  const mdia = createAtom('mdia', [mdhd, hdlr, minf]);

  // tkhd
  const tkhdPayload = new Uint8Array(84);
  const tkhdView = new DataView(tkhdPayload.buffer);
  tkhdView.setUint32(0, 0x00000007); // flags: enabled | in_movie | in_preview
  tkhdView.setUint32(12, 1); // track ID
  tkhdView.setUint32(20, totalDuration);
  tkhdView.setUint32(36, 0x00010000); // matrix unity
  tkhdView.setUint32(52, 0x00010000);
  tkhdView.setUint32(68, 0x40000000);
  tkhdView.setUint32(76, width << 16);
  tkhdView.setUint32(80, height << 16);
  const tkhd = createAtom('tkhd', [tkhdPayload]);

  // trak
  const trak = createAtom('trak', [tkhd, mdia]);

  // mvhd
  const mvhdPayload = new Uint8Array(100);
  const mvhdView = new DataView(mvhdPayload.buffer);
  mvhdView.setUint32(12, timescale);
  mvhdView.setUint32(16, totalDuration);
  mvhdView.setUint32(20, 0x00010000); // rate 1.0
  mvhdView.setUint16(24, 0x0100); // volume 1.0
  mvhdView.setUint32(36, 0x00010000);
  mvhdView.setUint32(52, 0x00010000);
  mvhdView.setUint32(68, 0x40000000);
  mvhdView.setUint32(96, 2); // next track ID
  const mvhd = createAtom('mvhd', [mvhdPayload]);

  // moov
  const moov = createAtom('moov', [mvhd, trak]);

  // Combine ftyp + mdat + moov into single buffer
  const totalFileSize = ftyp.byteLength + 8 + mdatPayloadSize + moov.byteLength;
  const result = new Uint8Array(totalFileSize);

  let offset = 0;
  result.set(ftyp, offset);
  offset += ftyp.byteLength;

  result.set(mdatHeader, offset);
  offset += 8;

  pngFrames.forEach(frame => {
    result.set(frame, offset);
    offset += frame.byteLength;
  });

  result.set(moov, offset);

  return result.buffer;
}

function createAtomHeader(type, size) {
  const header = new Uint8Array(8);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  header.set(stringToBytes(type), 4);
  return header;
}

function createAtom(type, chunks) {
  let payloadSize = 0;
  chunks.forEach(c => { payloadSize += c.byteLength; });
  const totalSize = 8 + payloadSize;
  const header = createAtomHeader(type, totalSize);
  const atom = new Uint8Array(totalSize);
  atom.set(header, 0);
  let off = 8;
  chunks.forEach(c => {
    atom.set(c, off);
    off += c.byteLength;
  });
  return atom;
}

function stringToBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

/**
 * 3. GREEN SCREEN VIDEO EXPORT
 */
async function exportGreenScreenVideo() {
  showExportUI("Rendering Chroma Key Green (#00FF00) Video...");
  await exportMediaRecorderWebm(true);
}

/**
 * Standard MediaRecorder stream recorder fallback
 */
async function exportMediaRecorderWebm(isGreenScreen = false) {
  const fps = 30;
  const totalFrames = Math.ceil(state.duration * fps);
  const offCanvas = document.createElement('canvas');
  offCanvas.width = state.style.width;
  offCanvas.height = state.style.height;
  const offCtx = offCanvas.getContext('2d', { alpha: !isGreenScreen });

  const stream = offCanvas.captureStream(fps);
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  let chosenMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 12000000
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: chosenMime });
    const filename = isGreenScreen
      ? `subtitles_greenscreen_${state.style.aspectRatio.replace(':', 'x')}_${Date.now()}.webm`
      : `subtitles_transparent_${state.style.aspectRatio.replace(':', 'x')}_${Date.now()}.webm`;
    triggerDownload(blob, filename);
    finishExportUI();
  };

  recorder.start();

  let f = 0;
  const frameIntervalMs = 1000 / fps;

  const renderNext = () => {
    if (f > totalFrames) {
      recorder.stop();
      return;
    }
    const t = f / fps;
    renderFrame(offCtx, t, isGreenScreen);

    const progress = Math.min(98, Math.round((f / totalFrames) * 98));
    updateExportProgress(progress);

    f++;
    setTimeout(renderNext, frameIntervalMs);
  };

  renderNext();
}

function showExportUI(statusMsg) {
  exportProgressContainer.classList.remove('hidden');
  exportProgressBar.style.width = '0%';
  exportProgressPct.textContent = '0%';
  exportStatusText.textContent = statusMsg;
  exportWebmBtn.disabled = true;
  exportWebmBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

function updateExportProgress(pct) {
  exportProgressBar.style.width = `${pct}%`;
  exportProgressPct.textContent = `${pct}%`;
}

function finishExportUI() {
  exportProgressBar.style.width = '100%';
  exportProgressPct.textContent = '100% - Ready!';
  setTimeout(() => {
    exportProgressContainer.classList.add('hidden');
    exportWebmBtn.disabled = false;
    exportWebmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
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
