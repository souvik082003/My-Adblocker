(function () {
  'use strict';

  let enabled = true;
  try {
    if (
      (document.cookie && document.cookie.includes('__adblocker_disabled__=1')) ||
      window.sessionStorage.getItem('__adblocker_disabled__') === 'true' ||
      window.localStorage.getItem('__adblocker_disabled__') === 'true'
    ) {
      enabled = false;
      if (document.documentElement) {
        document.documentElement.classList.add('adblock-disabled');
        document.documentElement.dataset.adblockEnabled = 'false';
      }
    }
  } catch (_) {}

  function syncEnabled(state) {
    enabled = state !== false;
    try {
      if (!enabled) {
        document.cookie = '__adblocker_disabled__=1; path=/; max-age=31536000';
        window.sessionStorage.setItem('__adblocker_disabled__', 'true');
        window.localStorage.setItem('__adblocker_disabled__', 'true');
      } else {
        document.cookie = '__adblocker_disabled__=; path=/; max-age=0';
        window.sessionStorage.removeItem('__adblocker_disabled__');
        window.localStorage.removeItem('__adblocker_disabled__');
      }
    } catch (_) {}

    if (document.documentElement) {
      document.documentElement.classList.toggle('adblock-disabled', !enabled);
      document.documentElement.dataset.adblockEnabled = String(enabled);
    }
  }

  chrome.storage.local.get(['adblockEnabled'], (result) => {
    syncEnabled(result.adblockEnabled);
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.adblockEnabled) {
      syncEnabled(changes.adblockEnabled.newValue);
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'ADBLOCK_TOGGLE') {
      syncEnabled(msg.enabled);
      sendResponse({ success: true, enabled: msg.enabled });
    }
  });

  let pendingCount = 0;
  let saveTimeout = null;

  function incrementBlockCount(amount = 1) {
    if (!enabled) return;
    pendingCount += amount;

    if (saveTimeout !== null) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      const toAdd = pendingCount;
      pendingCount = 0;
      saveTimeout = null;

      try {
        chrome.storage.local.get(['adblockCount', 'adblockCount_hotstar'], (res) => {
          const total = (res.adblockCount || 0) + toAdd;
          const hotstarTotal = (res.adblockCount_hotstar || 0) + toAdd;
          chrome.storage.local.set({
            adblockCount: total,
            adblockCount_hotstar: hotstarTotal
          });
        });
      } catch (_) {}
    }, 80);
  }

  const BILLBOARD_SELECTOR = '[data-testid="bbtype-video"]';

  function handleBillboardVideos() {
    if (!enabled) return;
    const billboardVideos = document.querySelectorAll(`${BILLBOARD_SELECTOR} video`);
    for (const v of billboardVideos) {
      if (!v.muted) {
        v.muted = true;
      }
      if (!v.paused) {
        v.pause();
        incrementBlockCount(1);
      }
    }
  }

  function scanBannerAds() {
    if (!enabled) return;
    const adBanners = document.querySelectorAll('[data-testid="bbtype-image"], [data-testid="ad-head"]');
    if (adBanners.length > 0) {
      let count = 0;
      adBanners.forEach((b) => {
        if (!b.__adblockCounted) {
          b.__adblockCounted = true;
          count++;
        }
      });
      if (count > 0) {
        incrementBlockCount(count);
      }
    }
  }

  const SKIP_SELECTORS = [
    '.ad-skip-button',
    '[data-testid="ad-skip-button"]',
    'button.ad-skip',
    '.skip-ad-button',
    'button[class*="skip-ad" i]',
    'button[class*="ad-skip" i]'
  ];

  function clickSkipButtons() {
    if (!enabled) return;
    for (const sel of SKIP_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        try {
          btn.click();
          incrementBlockCount(1);
          return;
        } catch (_) {}
      }
    }
  }

  function tick() {
    handleBillboardVideos();
    scanBannerAds();
    clickSkipButtons();
  }

  const observer = new MutationObserver(() => {
    tick();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  tick();
  setInterval(tick, 500);
})();
