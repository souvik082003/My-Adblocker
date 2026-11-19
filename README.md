# My Ad Blocker (v2.1)

A high-performance Manifest V3 Chrome extension designed for personal and educational research into how modern streaming platforms deliver video ads, detect ad blockers, and enforce playback restrictions. Supports both **YouTube** and **Disney+ Hotstar**.

[![Download](https://img.shields.io/badge/Download-Latest-blue?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker/archive/refs/heads/main.zip)

Or clone the repository:

```bash
git clone https://github.com/souvik082003/My-Adblocker.git
```

---

## What's New in v2.1: Disney+ Hotstar Support

1. **In-Stream Video Ad Fast-Forwarding**:
   - Detects in-stream ad containers (`#ad-video-container`, `.ad-video-container`).
   - Automatically jumps `video.currentTime` to `duration` to skip ads instantly.
   - Automatically clicks any "Skip Ad" buttons as soon as they appear.

2. **Billboard Video & Image Suppression**:
   - Hides billboard promotional banners and image overlays (`[data-testid="bbtype-image"]`, `[data-testid="bbtype-video"]`).
   - Automatically mutes, disables autoplay, and pauses video ads in billboard trays while preserving normal homepage trays.
   - Hides advertiser copy and "Buy Now" CTA during live-news and episode breaks (`[data-testid="ad-head"]`).

3. **Integrated Popup Controller**:
   - Unified on/off switch and skipped-ad counter for both YouTube and Hotstar.

---

## YouTube Features

1. **Ultra-Fast Video Start & Zero Buffering**:
   - Pure network routing preventing 3-5 second timeout stalls.
   - Auto-play on SPA navigation (`yt-navigate-finish`).

2. **Instant Auto-Skipping with Multi-Event Simulation**:
   - Detects all modern and legacy YouTube skip button variations (`.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`, nested button slots).
   - Dispatches full pointer and mouse event sequences (`pointerdown`, `mousedown`, `click`, `pointerup`, `mouseup`).

3. **Smart 16x Fast-Forward & Audio Muting (With Auto-Restore)**:
   - When an ad is displayed (`.ad-showing`, `.ad-interrupting`), mutes audio and accelerates playback to 16x.
   - Automatically restores original playback speed and volume when the main video resumes.

4. **Anti-Adblock Popup & Modal Bypass**:
   - Zero-flash CSS (`content.css`) hides enforcement dialogs and "Experiencing interruptions" toasts.
   - DOM cleanser auto-dismisses popups and unfreezes page scroll.

5. **In-Memory Ad Cue Sanitization (`inject.js`)**:
   - Runs in the `MAIN` world at `document_start` to intercept `window.ytInitialPlayerResponse`, `Response.prototype.json`, and `JSON.parse`.
   - Strips `adPlacements`, `playerAds`, and `adSlots` directly in memory.

6. **YouTube Shorts Support**:
   - Automatically detects sponsored reels in YouTube Shorts and skips down to the next short.

---

## How to Load in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left).
4. Select this folder (`my-Adblocker`).
5. Open [YouTube](https://www.youtube.com) or [Disney+ Hotstar](https://www.hotstar.com). The extension is active immediately.
6. Click the extension icon in your browser toolbar to view the status or toggle it on/off.

---

## File Structure

```
my-Adblocker/
├── manifest.json   # Manifest V3 configuration with YouTube & Hotstar declarations
├── inject.js       # MAIN world script: in-memory JSON & ytInitialPlayerResponse pruning
├── content.js      # YouTube ISOLATED script: auto-skipping, fast-forwarding, volume restore
├── content.css     # YouTube zero-flash CSS hiding ad placements and anti-adblock modals
├── hotstar.js      # Hotstar content script: billboard suppression & in-stream ad skipping
├── hotstar.css     # Hotstar CSS: hiding billboard ads, trays, and CTA overlays
├── empty.js        # Stub resource
├── rules.json      # DeclarativeNetRequest routing rules for third-party ad networks
├── popup.html      # Modern popup dashboard interface
├── popup.js        # Toggle controller syncing storage and DNR rulesets
└── icons/
    └── icon128.png # Extension icon
```

---

## Educational Notice

This repository is strictly for educational, personal research, and development purposes to study how web extensions interact with Single Page Applications (SPAs), HTML5 `<video>` APIs, and Declarative Net Request routing.
