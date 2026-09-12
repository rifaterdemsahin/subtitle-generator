# SubWebM Alpha — Transparent Subtitle Video Generator

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://rifaterdemsahin.github.io/subtitle-generator/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A fast, client-side web application to transform video transcripts into **transparent WebM videos (`video/webm; codecs=vp9` or `vp8` with full Alpha Channel)**, ready for drag-and-drop overlay into **Canva**, Premiere Pro, Final Cut Pro, and DaVinci Resolve.

🌐 **Live GitHub Pages URL**: [https://rifaterdemsahin.github.io/subtitle-generator/](https://rifaterdemsahin.github.io/subtitle-generator/)

---

## 🚀 Features

- **Transcript & Subtitle Support**:
  - **SRT (.srt)** and **WebVTT (.vtt)** parsing
  - **Whisper JSON** parsing (including word-level timestamp support)
  - **Plain Text Auto-chunker** (auto-generates timestamps and punchy phrases)
  - Drag-and-drop file upload or direct text paste
  - Pre-loaded sample presets (Viral TikTok, Word Timestamps)

- **Viral Subtitle Styling & Customization**:
  - **Aspect Ratios**: 9:16 Vertical (Shorts/Reels/TikTok), 16:9 Landscape (YouTube), 1:1 Square, 4:5 Portrait
  - **Typography**: Anton, Montserrat, Inter, Poppins, Bebas Neue, Rubik, Oswald, Roboto
  - **Animation Modes**: Karaoke (active word highlight & bounce), Pop-in, Smooth Fade, and Clean Static
  - **Text Styling**: Primary color, Active highlight color, Stroke/Outline width & color, Drop shadow / Neon glow, Background pill box
  - **Adjustable Positioning**: Custom vertical Y offset slider and max words per line

- **Transparent WebM Export with Alpha Channel**:
  - Pure RGBA transparent background rendering using HTML5 Canvas & MediaRecorder (VP9/VP8 Alpha)
  - Real-time progress bar indicator
  - 100% client-side — no server uploads or data leaks

---

## 🎨 How to Use with Canva

1. Open the [Live Web App](https://rifaterdemsahin.github.io/subtitle-generator/) in **Google Chrome**.
2. Paste or upload your transcript / SRT.
3. Customize your font, colors, stroke, and animation preset.
4. Click **"Export WebM (Alpha)"** to download your transparent subtitle video.
5. In **Canva**, go to **Uploads → Videos** and drag in your `.webm` file.
6. Overlay the transparent video directly over your footage!

---

## 💻 Local Development

Run the local development server:

```bash
python3 -m http.server 30085
```

Open in Google Chrome:

```bash
open -a "Google Chrome" http://localhost:30085
```
