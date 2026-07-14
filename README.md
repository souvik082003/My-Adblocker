# My Ad Blocker 

A minimal Manifest V3 Chrome extension that blocks known YouTube/Google ad
endpoints at the network level and skips/hides in-player ads via a content
script. Built for personal, educational use.

## How to load it in Chrome

1. Open `chrome://extensions` in Chrome.
2. Toggle on **Developer mode** (top-right corner).
3. Click **Load unpacked**.
4. Select this folder (`My-Adblocker`).
5. Open YouTube — the extension should start working immediately.
6. Click the extension icon in the toolbar to toggle it on/off.

## How it works

- **`rules.json`** — uses Chrome's `declarativeNetRequest` API to block
  requests to known ad-serving endpoints (`/api/stats/ads`, `/pagead/`,
  `doubleclick.net`, `googlesyndication.com`, etc.) without breaking
  actual video playback requests.
- **`content.js`** — runs on every YouTube page and uses a
  `MutationObserver` to react instantly whenever the page changes. It:
  - Auto-clicks "Skip Ad" the moment it appears.
  - Mutes and speeds up unskippable ads so they finish almost instantly.
  - Removes leftover ad banners/overlays from the DOM.
- **`popup.html` / `popup.js`** — a simple on/off switch, saved via
  `chrome.storage.local`, so you can disable the blocker without
  uninstalling it.

## Known limitations / what will likely break

- YouTube changes its ad-related CSS class names periodically
  (e.g. `.ytp-ad-skip-button`). If skipping stops working, open DevTools
  while an ad is playing, inspect the skip button/overlay, and update the
  selectors in `content.js`.
- YouTube's server-side ad injection experiments (ads that are harder to
  distinguish from an API/network standpoint) may not be caught by
  `rules.json` alone — the DOM-based skipping in `content.js` is the
  fallback for those.
- YouTube's Terms of Service prohibit blocking ads, and YouTube has
  active detection for ad-blocker usage. This project is intended for
  learning how `declarativeNetRequest`, content scripts, and
  `MutationObserver` work together — not for redistribution.

## File structure

```
youtube-adblocker/
├── manifest.json
├── rules.json
├── content.js
├── popup.html
├── popup.js
└── icons/
    └── icon128.png
```
