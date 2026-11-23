# Universal AdBlocker — Best Free Ad Blocker for YouTube & JioHotstar

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-3.1-blue?style=for-the-badge)](manifest.json)
[![Supported Platforms](https://img.shields.io/badge/Platforms-YouTube%20%7C%20JioHotstar%20%7C%20JioCinema-ff0000?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker)
[![Live Website](https://img.shields.io/badge/Website-GitHub%20Pages-brightgreen?style=for-the-badge)](https://souvik082003.github.io/My-Adblocker/)
[![License](https://img.shields.io/badge/License-Educational-green?style=for-the-badge)](README.md#educational-notice)

> **Universal AdBlocker** is an ultra-fast, lightweight **Manifest V3** Chrome extension engineered to block video ads, suppress promotional banners, and automatically skip commercial breaks across **YouTube** and **JioHotstar** (`hotstar.com`, `jiohotstar.com`, `jiocinema.com`).

---

## 🚀 Why Universal AdBlocker?

Most generic ad blockers fail on modern streaming platforms:
- **YouTube** actively displays anti-adblock detection popups (*"Ad blockers violate YouTube's Terms of Service"*), freezes playback, or slows page loading.
- **JioHotstar & JioCinema** use server-side dynamic ad injection and autoplaying billboard video trays that standard filters completely miss.

**Universal AdBlocker** solves both problems natively using dual-engine client-side fast-skipping, in-memory JSON placement stripping, and zero-flash CSS hiding rules.

---

## ⚡ Key Features & Capabilities

### 📺 1. YouTube Ad Blocking & Auto-Skip Engine
- **Instant 16x Ad Fast-Forward**: When an in-stream video ad appears, playback automatically accelerates to **16.0x speed** and mutes audio until content resumes.
- **Anti-Adblock Modal Auto-Dismissal**: Automatically removes the *"Ad blockers violate YouTube Terms"* popup (`ytd-enforcement-message-view-model`), clears modal backdrops, and restores scrolling.
- **Multi-Event Synthetic Clicker**: Instantly triggers skip buttons (`.ytp-skip-ad-button`, `.ytp-ad-skip-button-modern`) within milliseconds of becoming clickable.
- **In-Memory Placement Stripping (`inject.js`)**: Hooks `window.ytInitialPlayerResponse` and `Response.prototype.json` in the `MAIN` world to strip ad placements before the player initializes.
- **YouTube Shorts Ad-Skipper**: Automatically advances sponsored reels in YouTube Shorts feed.
- **Volume & Playback Speed Memory**: Seamlessly preserves your custom playback speed and volume level after ads are skipped.

### ⭐ 2. JioHotstar & JioCinema Engine
- **In-Stream Commercial Fast-Forward**: Detects video ad containers and fast-skips mid-roll and pre-roll advertisements.
- **Billboard Banner & Video Muting**: Neutralizes autoplay promotional billboard trailers (`[data-testid="bbtype-video"]`) on the homepage without breaking navigation carousels.
- **Commercial Break Cleanse**: Hides overlay banners, sponsored ad heads, and promotional CTA tags during live cricket and show streaming.
- **Live Stream Optimization**: Eliminates commercial freeze and keeps live streams running smoothly.

---

## 📊 Feature Comparison

| Feature | Universal AdBlocker | Generic AdBlockers (uBlock / AdBlock) |
| :--- | :---: | :---: |
| **YouTube Anti-Adblock Popup Bypass** |  **Instant Dismissal** |  Frequent Warning Blocks |
| **YouTube 16x Fast-Forward** |  **Supported** |  Standard Blocking Only |
| **JioHotstar In-Stream Video Ads** |  **Auto-Skipped** |  Often Fails on Hotstar |
| **JioHotstar Homepage Billboard Ads** |  **Neutralized & Muted** |  Not Supported |
| **Manifest V3 Compliant** |  **100% Native MV3** |  Transitioning / Legacy |
| **Memory Footprint** |  **< 5 MB RAM** |  50 MB - 150 MB RAM |
| **Zero Data Tracking / Privacy** |  **100% Local Only** |  Varies |

---

## 🛠️ How to Install in Chrome, Brave & Edge

1. **Clone or Download this Repository**:
   ```bash
   git clone https://github.com/souvik082003/My-Adblocker.git
   ```
2. Open your Chromium browser and go to your extensions settings:
   - **Google Chrome / Brave**: Navigate to `chrome://extensions`
   - **Microsoft Edge**: Navigate to `edge://extensions`
3. Toggle on **Developer mode** (top-right corner switch).
4. Click **Load unpacked** (top-left button).
5. Select the downloaded `my-Adblocker` folder.
6. Pin **Universal AdBlocker** to your toolbar and open [YouTube](https://www.youtube.com) or [JioHotstar](https://www.hotstar.com) to enjoy instant ad-free streaming!

---

## 🔒 Privacy & Permissions

Universal AdBlocker does not collect, store, or transmit any user data. All operations execute strictly on your device.

- **`declarativeNetRequest`**: High-speed network blocking of known tracking scripts without reading personal data.
- **`storage`**: Saves your local toggle preference (`adblockEnabled`) and local ad-block metrics.
- **`activeTab`**: Detects if your active tab is YouTube or JioHotstar to display site-specific metrics.
- **`host_permissions`**: Scoped strictly to `youtube.com`, `hotstar.com`, `jiohotstar.com`, `jiocinema.com`, and ad networks.

---

## ❓ Frequently Asked Questions (FAQ)

### Does this extension work on JioHotstar during live cricket matches?
Yes! Universal AdBlocker specifically detects Hotstar's in-stream ad containers and promotional billboard overlays, keeping your live streaming experience smooth.

### Will YouTube detect this ad blocker?
Universal AdBlocker uses in-memory JSON sanitization and synthetic 16x acceleration instead of brute-force request cancelling. If YouTube displays an enforcement modal, the extension automatically dismisses it and unfreezes the page.

### Is Universal AdBlocker free?
Yes, Universal AdBlocker is 100% free, open-source, and has no subscriptions, premium tiers, or hidden trackers.

---

## 🎓 Educational Notice

This repository is maintained for **personal educational, security research, and interoperability analysis**. It demonstrates modern DOM MutationObserver architectures, Manifest V3 Declarative Net Request APIs, and HTML5 video acceleration techniques.
