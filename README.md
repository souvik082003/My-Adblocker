# Universal AdBlocker `v3.0`

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-3.0-blue?style=for-the-badge)](manifest.json)
[![Supported Platforms](https://img.shields.io/badge/Platforms-YouTube%20%7C%20JioHotstar-ff0000?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker)
[![License](https://img.shields.io/badge/License-Educational-green?style=for-the-badge)](README.md#educational-notice)

**Universal AdBlocker** is a high-performance, lightweight **Manifest V3** browser extension engineered for personal educational research into how modern streaming platforms deliver video ads, execute anti-adblock detection, and handle media playback state.

Supports full in-stream video ad skipping and banner suppression across both **YouTube** and **JioHotstar** (`hotstar.com`, `jiohotstar.com`, `jiocinema.com`).

---

## What's New in Version 3.0

- **Project Rebrand to Universal AdBlocker**: Enhanced architecture supporting universal multi-service streaming ad prevention across YouTube and JioHotstar.
- **Website-Specific Ad Counter**: The extension popup now detects your active tab and displays the real-time ad block count for that specific website, alongside platform breakdown counters for YouTube and JioHotstar.
- **Zero-Reload Dynamic Toggle**: Toggle protection ON or OFF in real time without refreshing the page. Employs `:root:not(.adblock-disabled)` CSS selector scoping and cross-world `window.postMessage` communication to release or engage ad-blocking rules instantly.
- **Glassmorphic OLED Dashboard**: Modern dark popup interface with interactive glow status pills (`SHIELD ACTIVE` vs `SHIELD PAUSED`), per-platform status indicators, and quick-action buttons.
- **Buffer-Aware 16x Video Acceleration**: Prevents playback buffering and seeking freezes by capping fast-forward seeks strictly to the actively buffered range (`video.buffered.end`) while dispatching synthetic `ended` and skip events.
- **Quick Controls**: One-click "Reload Tab" with animated feedback and "Reset Stats" counter clearing.

---

## Core Capabilities

### 1. YouTube Engine
- **In-Memory Ad Placement Stripping (`inject.js`)**: Executes in the `MAIN` execution world at `document_start`. Intercepts `window.ytInitialPlayerResponse`, hooks `Response.prototype.json`, and parses JSON payloads to strip `adPlacements`, `playerAds`, and `adSlots` before YouTube player initialization.
- **16x Acceleration with Volume Memory**: When an in-stream ad activates (`.ad-showing`, `.ad-interrupting`), audio is instantly muted and video playback is set to `16.0x`. When the main content resumes, the user's exact prior playback speed and volume are restored.
- **Multi-Event Synthetic Clicker**: Dispatches full input chains (`pointerdown` → `mousedown` → `click` → `pointerup` → `mouseup`) across all modern and legacy YouTube skip button variants (`.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`, and nested button slots).
- **Anti-Adblock Modal Dismissal**: Automatically catches and removes enforcement dialogs (`ytd-enforcement-message-view-model`), dismisses warning popups, unblocks page scrolling (`overflow: hidden` clearance), and suppresses "Experiencing interruptions" toast notifications.
- **YouTube Shorts Auto-Advancement**: Detects sponsored reels in YouTube Shorts and skips immediately to the next video.

### 2. JioHotstar Engine
- **In-Stream Ad Fast-Forward & Auto-Skip**: Monitors `#ad-video-container`, `.ad-video-container`, and `[data-testid="ad-container"]`. Automatically clicks skip buttons and advances in-stream video ads to completion.
- **Billboard Tray & Video Suppression**: Mutes, pauses, and neutralizes autoplay on billboard promotional banner videos (`[data-testid="bbtype-video"]`) while preserving normal homepage video carousels and trays.
- **Overlay & Banner Cleanser**: Hides sponsored ad banners, promotional headers, and live-stream commercial break call-to-action overlays (`[data-testid="ad-head"]`, `[data-testid="bbtype-image"]`).

---

## Technical Architecture

| Component | Execution Context | Run Timing | Primary Role |
| :--- | :--- | :--- | :--- |
| `manifest.json` | Manifest V3 Config | Browser Startup | Declares DNR rulesets, content scripts, and permissions |
| `inject.js` | `MAIN` World | `document_start` | Hooks in-memory JSON parsing, `ytcfg`, and player responses |
| `content.js` | Isolated Content Script | `document_start` | 16x fast-forward, button clicker, modal cleanser, and site metrics |
| `content.css` | Isolated Style Injection | `document_start` | Zero-flash hiding rules scoped with `:root:not(.adblock-disabled)` |
| `hotstar.js` | Isolated Content Script | `document_start` | Billboard video neutralizer and JioHotstar ad skipper |
| `hotstar.css` | Isolated Style Injection | `document_start` | Scoped CSS rules hiding JioHotstar billboards and overlay banners |
| `rules.json` | Declarative Net Request | Network Level | Blocks third-party tracking and telemetry requests |
| `popup.html` | Extension Action Popup | User Click | Glassmorphic interface with metrics, controls, and platform pills |
| `popup.js` | Extension Action Popup | User Click | Manages site detection, metrics display, and storage sync |

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
8. Navigate to [YouTube](https://www.youtube.com) or [JioHotstar](https://www.hotstar.com) and enjoy uninterrupted playback!

---

## Permissions Breakdown

- **`declarativeNetRequest`**: Used to block third-party tracking scripts and ad networks at the network routing level without slowing down page rendering.
- **`storage`**: Used to save user preferences (`adblockEnabled`) and persist total and per-site ad block counts locally on your device.
- **`activeTab`**: Used by the popup dashboard to detect the active website and reload the active tab when requested.
- **`host_permissions`**: Scoped strictly to YouTube, JioHotstar domains (`hotstar.com`, `jiohotstar.com`, `jiocinema.com`), and relevant ad delivery hosts (`googlesyndication.com`, `doubleclick.net`, `googleadservices.com`).

*Zero data is collected, logged, or transmitted outside your local browser environment.*

---

## Educational Notice

This project is created strictly for **personal educational and research purposes**. It serves as an exploration of:
- Chromium Manifest V3 architectures and declarative network filtering.
- Single Page Application (SPA) lifecycle hooks and DOM MutationObserver efficiency.
- HTML5 `<video>` API manipulation, buffered range inspection, and pointer event simulation.

## Documentation & Build Notes
- **Update 1**: Manifest V3 core configuration & schema declarations.
- **Update 2**: Declarative net request rule sets compilation & priority mapping.
- **Update 3**: Permissions boundary audit: downloads removed, DNR retained.
- **Update 4**: Host permissions scoped strictly to streaming endpoints.
- **Update 5**: Service worker registration replaced with lean declarative hooks.
- **Update 6**: Web accessible resources minimized for security isolation.
- **Update 7**: MAIN world execution timing for inject.js set to document_start.
- **Update 8**: Isolated world content script bindings for YouTube.
- **Update 9**: Isolated world content script bindings for JioHotstar.
- **Update 10**: Content script CSS isolation with root disabled selectors.
- **Update 11**: In-memory ytInitialPlayerResponse interception and caching.
- **Update 12**: Clean adPlacements stripping logic in player response objects.
- **Update 13**: Recursive playerResponse ad parameter sanitization.
- **Update 14**: Window.ytInitialPlayerResponse getter/setter property definition.
- **Update 15**: JSON.parse global prototype hooking with ad pruning guards.
- **Update 16**: Response.prototype.json hooking for youtubei/v1/player endpoints.
- **Update 17**: ytcfg global object observer and ad configuration stripping.
- **Update 18**: Safe suppression of enforcementMessageViewModel dialogs.
- **Update 19**: Cross-world postMessage event dispatching for blocked ad counters.
- **Update 20**: Debounced counter persistence in chrome.storage.local.
- **Update 21**: Separate tracking counters for YouTube and JioHotstar.
- **Update 22**: Storage change listeners for seamless multi-tab state sync.
- **Update 23**: Dynamic adblockEnabled toggle switch handling.
- **Update 24**: Synthetic pointerdown event dispatching on skip buttons.
- **Update 25**: Synthetic mousedown event dispatching on skip buttons.
- **Update 26**: Synthetic click event dispatching on skip buttons.
- **Update 27**: Synthetic pointerup event dispatching on skip buttons.
- **Update 28**: Synthetic mouseup event dispatching on skip buttons.
- **Update 29**: Legacy .videoAdUiSkipButton compatibility checks.
- **Update 30**: Modern ytp-ad-skip-button-modern element selection.
- **Update 31**: Nested ytd-button-renderer skip button slot resolution.
- **Update 32**: Close button simulation for overlay and banner advertisements.
- **Update 33**: MutationObserver subtree monitoring on document.documentElement.
- **Update 34**: HTML5 video element acquisition and validation.
- **Update 35**: In-stream advertisement state detection via ad-showing class.
- **Update 36**: In-stream advertisement state detection via ad-interrupting class.
- **Update 37**: Instant 16x video acceleration on active ad playback.
- **Update 38**: Instant muting of audio channels during ad playback.
- **Update 39**: Buffered range checking to prevent seeking beyond loaded chunks.
- **Update 40**: Synthetic ended event triggering for instant ad completion.
- **Update 41**: User playback rate preservation before ad acceleration.
- **Update 42**: User audio volume and mute state restoration after ad completion.
- **Update 43**: YouTube Shorts navigation and sponsored reel auto-advancement.
- **Update 44**: Automatic removal of sponsored banner promos and masthead ads.
- **Update 45**: Suppression of companion slot rendering containers.
- **Update 46**: Removal of in-feed ad layout renderer elements.
- **Update 47**: Removal of ytd-promoted-video-renderer elements.
- **Update 48**: Removal of ytd-promoted-sparkles-web-renderer elements.
- **Update 49**: Removal of ytd-statement-banner-renderer elements.
- **Update 50**: Removal of ytd-display-ad-renderer elements.
- **Update 51**: Paper toast notification suppression for blocker warnings.
- **Update 52**: Enforcement dialog dismissal and iron overlay backdrop removal.
- **Update 53**: Body overflow style clearance to prevent page scrolling freeze.
- **Update 54**: Playability error screen automatic retry button trigger.
- **Update 55**: Navigation finish event listener for SPA route transitions.
- **Update 56**: Page data updated event listener for dynamic view updates.
- **Update 57**: Attached listener state guarding with __adblockListenersAttached.
- **Update 58**: Periodic timer interval fallback for ultra-fast ad checks.
- **Update 59**: JioHotstar video container ad detection and skipping.
- **Update 60**: JioHotstar billboard video automatic muting and pausing.
- **Update 61**: Billboard tray banner element suppression in DOM tree.
- **Update 62**: Live-stream commercial break call-to-action overlay hiding.
- **Update 63**: Zero layout shift CSS rules for Hotstar promotional banners.
- **Update 64**: Static network rule 1: googlesyndication.com script blocking.
- **Update 65**: Static network rule 2: doubleclick.net multi-resource blocking.
- **Update 66**: Static network rule 3: googleadservices.com request blocking.
- **Update 67**: Declarative ruleset enabling and disabling synchronization.
- **Update 68**: Popup glassmorphic card styling and OLED dark background.
- **Update 69**: Popup brand header with 32px icon and version badge.
- **Update 70**: Real-time shield status indicator dot and glow animations.
- **Update 71**: Live active tab hostname detection for YouTube and JioHotstar.
- **Update 72**: Platform specific indicator pills with active/pause states.
- **Update 73**: Site-specific ad blocked counter computation and display.
