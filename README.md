````md
# My Adblocker

A lightweight **Manifest V3 Chrome extension** that blocks known YouTube/Google ad requests and automatically skips or minimizes in-player ads using Chrome's **Declarative Net Request API** and **Content Scripts**.


---

## Download

[![Download](https://img.shields.io/badge/Download-Latest-blue?style=for-the-badge)](https://github.com/souvik082003/My-Adblocker/archive/refs/heads/main.zip)

Or clone the repository:

```bash
git clone https://github.com/souvik082003/My-Adblocker.git
```

---

## Features

- Blocks known YouTube & Google ad network requests.
- Automatically clicks the **Skip Ad** button.
- Mutes and speeds up unskippable ads.
- Removes ad overlays and banners.
- Built with **Manifest V3**.
- Saves enable/disable state using `chrome.storage.local`.
- Simple popup to toggle the extension.

---

## Installation

1. Download the extension using the button above.
2. Extract the ZIP file.
3. Open Chrome and go to:

   ```
   chrome://extensions
   ```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted **My-Adblocker** folder.
7. Open YouTube and the extension will start working automatically.

---

## How It Works

### `rules.json`

Uses Chrome's **Declarative Net Request API** to block requests sent to common advertising endpoints.

Examples include:

- `/api/stats/ads`
- `/pagead/`
- `doubleclick.net`
- `googlesyndication.com`

---

### `content.js`

A `MutationObserver` watches YouTube for changes and automatically:

- Clicks **Skip Ad**
- Mutes advertisements
- Speeds up unskippable ads
- Removes overlays and banners

---

### `popup.html` & `popup.js`

Provides a simple **On/Off** switch.

The selected state is stored with `chrome.storage.local`, so it persists between browser sessions.

---

## Project Structure

```text
My-Adblocker/
├── manifest.json
├── rules.json
├── content.js
├── popup.html
├── popup.js
└── icons/
    └── icon128.png
```

---

## Built With

- JavaScript (ES6)
- HTML
- Chrome Extension Manifest V3
- Declarative Net Request API
- Content Scripts
- MutationObserver
- Chrome Storage API

---

## Limitations

- YouTube may change its interface, requiring selector updates.
- Some server-side injected ads cannot be blocked with network rules alone.
- Future YouTube updates may affect functionality.
- YouTube may detect ad blockers.

---


## License

Licensed under the **MIT License**.


