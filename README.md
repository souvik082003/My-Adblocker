# My Ad Blocker (v2.0)

A high-performance Manifest V3 Chrome extension designed for personal and educational research into how modern streaming platforms deliver video ads, detect ad blockers, and enforce playback restrictions.

[![Download](https://img.shields.io/badge/Download-Latest-blue?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker/archive/refs/heads/main.zip)

Or clone the repository:

```bash
git clone https://github.com/souvik082003/My-Adblocker.git
```

---

## What's New & Performance Optimizations

1. **Ultra-Fast Video Reload & Start Time**:
   - **Zero Network Retry Latency**: Third-party ad trackers (`doubleclick.net`, `googleadservices.com`, `googlesyndication.com`) are blocked cleanly without intercepting YouTube's internal player stream requests, preventing 3-5 second network retry backoffs.
   - **Auto-Play on Navigation**: Automatically ensures video playback begins immediately on navigation (`yt-navigate-finish`) with no buffering pauses.

2. **Instant Auto-Skipping with Multi-Event Simulation**:
   - Detects all modern and legacy YouTube skip button variations (`.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`, nested button slots, etc.).
   - Dispatches full pointer and mouse event sequences (`pointerdown`, `mousedown`, `click`, `pointerup`, `mouseup`) ensuring skip actions trigger regardless of YouTube's event listeners.

3. **Smart 16x Fast-Forward & Audio Muting (With Auto-Restore)**:
   - When an ad is displayed (`.ad-showing`, `.ad-interrupting`, preroll/midroll), the extension instantly mutes audio, sets video speed to **16x**, and advances `currentTime` to `duration`.
   - **Safe Duration Check**: Protects against accidentally skipping the main video by only advancing `currentTime` if the clip duration is $\le$ 3 minutes.
   - **Automatic Restoration**: Remembers your preferred playback rate (e.g. 1.25x or 1.5x) and unmuted volume state, instantly restoring them the millisecond the main video resumes.

4. **Anti-Adblock Popup & Modal Bypass ("Bypass Detection")**:
   - **Zero-Flash CSS (`content.css`)**: Suppresses `ytd-enforcement-message-view-model`, enforcement dialogs, and gray overlay backdrops (`tp-yt-iron-overlay-backdrop`) at the rendering engine level before they can appear.
   - **Interruption Prompt Dismissal**: Automatically dismisses "Experiencing interruptions? Find out why" toast popups.
   - **DOM Cleanser (`content.js`)**: Automatically tears down enforcement dialogs, unfreezes background page scrolling (`overflow: hidden`), and calls `video.play()` so videos never freeze.

5. **In-Memory Ad Cue Sanitization (`inject.js`)**:
   - Runs in the `MAIN` world at `document_start` to intercept `window.ytInitialPlayerResponse`, `Response.prototype.json`, and `JSON.parse`.
   - Strips `adPlacements`, `playerAds`, and `adSlots` from player initialization data in memory. Because player cues never arrive, the player does not queue ads in the first place.

6. **YouTube Shorts Support**:
   - Automatically detects sponsored reels in YouTube Shorts and skips down to the next short.

---

## How to Load in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left).
4. Select this folder (`my-Adblocker`).
5. Open [YouTube](https://www.youtube.com). The extension is active immediately.
6. Click the extension icon in your browser toolbar to view the status or toggle it on/off.

---

## File Structure

```
my-Adblocker/
├── manifest.json   # Manifest V3 configuration with MAIN/ISOLATED worlds & DNR
├── inject.js       # MAIN world script: in-memory JSON & ytInitialPlayerResponse pruning
├── content.js      # ISOLATED world script: auto-skipping, fast-forwarding, volume restoration
├── content.css     # Zero-flash CSS hiding ad placements and anti-adblock modals
├── empty.js        # No-op stub resource for smooth 200 OK DNR redirects
├── rules.json      # DeclarativeNetRequest routing rules for third-party ad networks
├── popup.html      # Modern popup dashboard interface
├── popup.js        # Toggle controller syncing storage and DNR rulesets
└── icons/
    └── icon128.png # Extension icon
```

---

## Educational Notice

This repository is strictly for educational, personal research, and development purposes to study how web extensions interact with Single Page Applications (SPAs), HTML5 `<video>` APIs, and Declarative Net Request routing.
