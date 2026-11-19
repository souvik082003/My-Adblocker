# My Ad Blocker `v3.0`

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-3.0-blue?style=for-the-badge)](manifest.json)
[![Supported Platforms](https://img.shields.io/badge/Platforms-YouTube%20%7C%20Hotstar-ff0000?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker)
[![License](https://img.shields.io/badge/License-Educational-green?style=for-the-badge)](README.md#educational-notice)

A high-performance, lightweight **Manifest V3** browser extension engineered for personal educational research into how modern streaming platforms deliver video ads, execute anti-adblock detection, and handle media playback state.

Built with native performance, zero external runtime dependencies, and a modern glassmorphic dashboard.

---

## What's New in Version 3.0

- **Zero-Reload Dynamic Toggle**: Toggle protection ON or OFF in real time without refreshing the page. Employs `:root:not(.adblock-disabled)` CSS selector scoping and cross-world `window.postMessage` communication to release or engage ad-blocking rules instantly.
- **Redesigned Glassmorphic Dashboard**: A 320px dark OLED popup interface with interactive glow status pills (`SHIELD ACTIVE` vs `SHIELD PAUSED`), per-platform status indicators (YouTube & Disney+ Hotstar), and quick-action buttons.
- **Live Performance & Time-Saved Metrics**: Real-time counter of total ads skipped and a dynamic algorithm estimating hours, minutes, and seconds saved from ad interruptions.
- **Buffer-Aware 16x Video Acceleration**: Prevents playback buffering and seeking freezes by capping fast-forward seeks strictly to the actively buffered range (`video.buffered.end`) while dispatching synthetic `ended` and skip events.
- **Quick Controls**: Includes instant "Reload Tab" with animated feedback and "Reset Stats" counter clearing.

---

## Core Capabilities

### 1. YouTube Engine
- **In-Memory Ad Placement Stripping (`inject.js`)**: Executes in the `MAIN` execution world at `document_start`. Intercepts `window.ytInitialPlayerResponse`, hooks `Response.prototype.json`, and parses JSON payloads to strip `adPlacements`, `playerAds`, and `adSlots` before YouTube player initialization.
- **16x Acceleration with Volume Memory**: When an in-stream ad activates (`.ad-showing`, `.ad-interrupting`), audio is instantly muted and video playback is set to `16.0x`. When the main content resumes, the user's exact prior playback speed and volume are restored.
- **Multi-Event Synthetic Clicker**: Dispatches full input chains (`pointerdown` → `mousedown` → `click` → `pointerup` → `mouseup`) across all modern and legacy YouTube skip button variants (`.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`, and nested button slots).
- **Anti-Adblock Modal Dismissal**: Automatically catches and removes enforcement dialogs (`ytd-enforcement-message-view-model`), dismisses warning popups, unblocks page scrolling (`overflow: hidden` clearance), and suppresses "Experiencing interruptions" toast notifications.
- **YouTube Shorts Auto-Advancement**: Detects sponsored reels in YouTube Shorts and skips immediately to the next video.

### 2. Disney+ Hotstar Engine
- **In-Stream Ad Fast-Forward & Auto-Skip**: Monitors `#ad-video-container`, `.ad-video-container`, and `[data-testid="ad-container"]`. Automatically clicks skip buttons and advances in-stream video ads to completion.
- **Billboard Tray & Video Suppression**: Mutes, pauses, and neutralizes autoplay on billboard promotional banner videos (`[data-testid="bbtype-video"]`) while preserving normal homepage video carousels and trays.
- **Overlay & Banner Cleanser**: Hides sponsored ad banners, promotional headers, and live-stream commercial break call-to-action overlays (`[data-testid="ad-head"]`, `[data-testid="bbtype-image"]`).

---

## Technical Architecture

| Component | Execution Context | Run Timing | Primary Role |
| :--- | :--- | :--- | :--- |
| `manifest.json` | Manifest V3 Config | Browser Startup | Declares DNR rulesets, content scripts, and permissions |
| `inject.js` | `MAIN` World | `document_start` | Hooks in-memory JSON parsing, `ytcfg`, and player responses |
| `content.js` | Isolated Content Script | `document_start` | 16x fast-forward, button clicker, modal cleanser, and state sync |
| `content.css` | Isolated Style Injection | `document_start` | Zero-flash hiding rules scoped with `:root:not(.adblock-disabled)` |
| `hotstar.js` | Isolated Content Script | `document_start` | Billboard video neutralizer and Hotstar in-stream ad skipper |
| `hotstar.css` | Isolated Style Injection | `document_start` | Scoped CSS rules hiding Hotstar billboards and overlay banners |
| `rules.json` | Declarative Net Request | Network Level | Blocks third-party tracking and telemetry requests |
| `popup.html` | Extension Action Popup | User Click | Glassmorphic interface with metrics, controls, and platform pills |
| `popup.js` | Extension Action Popup | User Click | Manages storage persistence, ruleset toggling, and tab reload |

---

## Installation Guide

1. Clone or download this repository:
   ```bash
   git clone https://github.com/souvik082003/My-Adblocker.git
   ```
2. Open your Chromium-based browser (Google Chrome, Brave, Microsoft Edge, Opera).
3. Navigate to the extensions manager:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
4. Toggle on **Developer mode** (switch usually located in the top-right corner).
5. Click **Load unpacked** in the top toolbar.
6. Select the `my-Adblocker` folder.
7. Pin the extension to your toolbar.
8. Navigate to [YouTube](https://www.youtube.com) or [Disney+ Hotstar](https://www.hotstar.com) and enjoy uninterrupted playback!

---

## Permissions Breakdown

- **`declarativeNetRequest`**: Used to block third-party tracking scripts and ad networks at the network routing level without slowing down page rendering.
- **`storage`**: Used to save user preferences (`adblockEnabled`) and persist total ad block counts (`adblockCount`) locally on your device.
- **`activeTab`**: Used by the popup dashboard to reload the active tab when the user clicks the "Reload Tab" button.
- **`host_permissions`**: Scoped strictly to YouTube, Disney+ Hotstar, and relevant ad delivery hosts (`googlesyndication.com`, `doubleclick.net`, `googleadservices.com`).

*Zero data is collected, logged, or transmitted outside your local browser environment.*

---

## Educational Notice

This project is created strictly for **personal educational and research purposes**. It serves as an exploration of:
- Chromium Manifest V3 architectures and declarative network filtering.
- Single Page Application (SPA) lifecycle hooks and DOM MutationObserver efficiency.
- HTML5 `<video>` API manipulation, buffered range inspection, and pointer event simulation.
