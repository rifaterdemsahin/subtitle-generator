# SubWebM Alpha — Transparent Subtitle Generator for Canva

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://rifaterdemsahin.github.io/subtitle-generator/)
[![Limitations Guide](https://img.shields.io/badge/Guide-WebM%20Limitations-amber?style=for-the-badge&logo=googledocs)](https://rifaterdemsahin.github.io/subtitle-generator/limitations.html)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

A fast, client-side web application to transform video transcripts into **100% transparent animated subtitles**, ready for drag-and-drop overlay into **Canva**, Apple Final Cut Pro, Adobe Premiere Pro, and DaVinci Resolve.

- 🌐 **Live Web Studio**: [https://rifaterdemsahin.github.io/subtitle-generator/](https://rifaterdemsahin.github.io/subtitle-generator/)
- 🎨 **Video Composer (Merge with Background)**: [https://rifaterdemsahin.github.io/subtitle-generator/composer.html](https://rifaterdemsahin.github.io/subtitle-generator/composer.html)
- 📝 **Updates & Multi-Track Guide**: [https://rifaterdemsahin.github.io/subtitle-generator/updates.html](https://rifaterdemsahin.github.io/subtitle-generator/updates.html)
- ⚠️ **WebM Limitations & Technical Deep Dive**: [https://rifaterdemsahin.github.io/subtitle-generator/limitations.html](https://rifaterdemsahin.github.io/subtitle-generator/limitations.html)

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

- **Canva Multi-Track Transparency**:
  - **Canva Transparent Overlay (.png)**: 100% Guaranteed transparency on the top track with zero black background.
  - **Apple QuickTime 32-bit Alpha (.mov)**: QuickTime video with 8-bit alpha channel.
  - **WebM VP9 Alpha (.webm)**: Matroska AlphaMode=1 video container.
  - **Chroma Key Green (.mp4 / .webm)**: Clean #00FF00 background.

---

## 🎨 How to Use with Canva

1. Open the [Live Web App](https://rifaterdemsahin.github.io/subtitle-generator/) in **Google Chrome**.
2. Paste or upload your transcript / SRT.
3. Customize your font, colors, stroke, and animation preset.
4. Click **"Export Canva Transparent"** to download your transparent subtitle overlay.
5. In **Canva**, drag the file onto your video project timeline.
6. The subtitle layer will appear on the **Top Purple Track**, with your underlying video footage completely visible in the middle track!

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
