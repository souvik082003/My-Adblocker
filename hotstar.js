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
    if (chrome.runtime.lastError) return;
    syncEnabled(result ? result.adblockEnabled : true);
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
      return false;
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
          if (chrome.runtime.lastError) return;
          const total = ((res && res.adblockCount) || 0) + toAdd;
          const hotstarTotal = ((res && res.adblockCount_hotstar) || 0) + toAdd;
          chrome.storage.local.set({
            adblockCount: total,
            adblockCount_hotstar: hotstarTotal
          });
        });
      } catch (_) {}
    }, 80);
  }

  const BILLBOARD_SELECTOR = '[data-testid="bbtype-video"]';

  function isBillboardVideo(video) {
    if (!video) return false;
    return Boolean(video.closest(BILLBOARD_SELECTOR));
  }

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
    const adBanners = document.querySelectorAll(
      '[data-testid="bbtype-image"], [data-testid="ad-head"], [data-testid="ad-details"]'
    );
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
    'button[class*="ad-skip" i]',
    'button[data-testid*="skip-ad" i]',
    'button[data-testid*="ad-skip" i]',
    '[aria-label*="skip ad" i]',
    '[aria-label*="skip advertisement" i]'
  ];

  function getActiveSkipButton() {
    for (const sel of SKIP_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }

    const playerButtons = document.querySelectorAll(
      '[data-testid="player-container"] button, .player-container button, #player button, .video-player button, div[class*="player" i] button'
    );
    for (const btn of playerButtons) {
      const text = (btn.textContent || '').trim().toLowerCase();
      const label = (btn.getAttribute('aria-label') || '').trim().toLowerCase();
      if (
        (text.includes('skip ad') || label.includes('skip ad') || text === 'skip' || label === 'skip') &&
        !text.includes('intro') &&
        !label.includes('intro') &&
        !text.includes('recap') &&
        !label.includes('recap') &&
        !text.includes('10s') &&
        !label.includes('10')
      ) {
        return btn;
      }
    }
    return null;
  }

  function isAdIndicatorPresent() {
    const timer = document.querySelector(
      '[data-testid="ad-timer"], [data-testid="ad-countdown"], .ad-timer, .ad-countdown, [data-testid="ad-badge"], .ad-badge, [data-testid="ad-tag"], .ad-tag, div[class*="ad-timer" i], div[class*="ad-countdown" i], div[class*="ad-badge" i]'
    );
    if (timer) return true;

    const adHead = document.querySelector('[data-testid="ad-head"]');
    if (adHead) return true;

    return false;
  }

  function getExplicitAdContainers() {
    return document.querySelectorAll(
      '#ad-video-container, [data-testid="ad-video-container"], .ad-video-container, .ad-container, [class*="ad-video-container" i]'
    );
  }

  let wasAdActive = false;
  let userMutedState = false;
  let adCounted = false;

  document.addEventListener(
    'volumechange',
    (e) => {
      if (e.isTrusted && e.target instanceof HTMLVideoElement && !isBillboardVideo(e.target)) {
        const v = e.target;
        const isExplicitAd = Boolean(v.closest('#ad-video-container, [data-testid="ad-video-container"], .ad-video-container, .ad-container, [class*="ad-video-container" i]'));
        const isShortAd = isAdIndicatorPresent() && Number.isFinite(v.duration) && v.duration > 0 && v.duration <= 180;
        if (!isExplicitAd && !isShortAd) {
          userMutedState = v.muted;
        }
      }
    },
    true
  );

  function handleInStreamAds() {
    if (!enabled) return;

    const skipBtn = getActiveSkipButton();
    if (skipBtn) {
      try {
        skipBtn.click();
        skipBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        if (!adCounted) {
          adCounted = true;
          incrementBlockCount(1);
        }
      } catch (_) {}
    }

    const explicitContainers = getExplicitAdContainers();
    let hasExplicitAdVideo = false;

    for (const container of explicitContainers) {
      const videos = container.querySelectorAll('video');
      for (const v of videos) {
        hasExplicitAdVideo = true;
        wasAdActive = true;
        if (!adCounted) {
          adCounted = true;
          incrementBlockCount(1);
        }

        v.muted = true;
        v.playbackRate = 16.0;

        const dur = v.duration;
        if (Number.isFinite(dur) && dur > 0 && dur <= 180 && !(v.ended || v.currentTime >= dur)) {
          try {
            if (v.buffered && v.buffered.length > 0) {
              const bufEnd = v.buffered.end(v.buffered.length - 1);
              v.currentTime = Math.min(bufEnd, dur);
            } else {
              v.currentTime = dur;
            }
            v.dispatchEvent(new Event('ended'));
          } catch (_) {}
        }
      }
    }

    const adIndicator = isAdIndicatorPresent() || Boolean(skipBtn);
    const allVideos = document.querySelectorAll('video');

    for (const v of allVideos) {
      if (isBillboardVideo(v)) continue;
      if (v.closest('#ad-video-container, [data-testid="ad-video-container"], .ad-video-container, .ad-container, [class*="ad-video-container" i]')) {
        continue;
      }

      const dur = v.duration;
      const isShortAd = Number.isFinite(dur) && dur > 0 && dur <= 180;

      if (adIndicator && isShortAd) {
        wasAdActive = true;
        if (!adCounted) {
          adCounted = true;
          incrementBlockCount(1);
        }

        v.muted = true;
        v.playbackRate = 16.0;

        if (!(v.ended || v.currentTime >= dur)) {
          try {
            if (v.buffered && v.buffered.length > 0) {
              const bufEnd = v.buffered.end(v.buffered.length - 1);
              v.currentTime = Math.min(bufEnd, dur);
            } else {
              v.currentTime = dur;
            }
            v.dispatchEvent(new Event('ended'));
          } catch (_) {}
        }
      } else if (!adIndicator || (Number.isFinite(dur) && dur > 180)) {
        if (wasAdActive) {
          if (v.playbackRate > 1.0) {
            v.playbackRate = 1.0;
          }
          if (v.muted && !userMutedState) {
            v.muted = false;
          }
        }
      }
    }

    if (!hasExplicitAdVideo && !adIndicator) {
      wasAdActive = false;
      adCounted = false;
    }
  }

  function tick() {
    handleBillboardVideos();
    scanBannerAds();
    handleInStreamAds();
  }

  const observer = new MutationObserver(() => {
    tick();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-testid', 'id', 'style']
  });

  ['play', 'playing', 'loadedmetadata', 'durationchange', 'timeupdate'].forEach((evt) => {
    document.addEventListener(
      evt,
      (e) => {
        if (e.target instanceof HTMLVideoElement) {
          tick();
        }
      },
      true
    );
  });

  tick();
  setInterval(tick, 80);
})();
