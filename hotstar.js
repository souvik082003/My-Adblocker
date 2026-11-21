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

  let adCounted = false;
  let userMutedState = false;

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
    if (!enabled) {
      cleanupBillboardVideos();
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
  const billboardVideos = new Map();
  const pendingNodes = new Set();
  let debounceTimeout = null;

  function isBillboardVideo(video) {
    if (!video) return false;
    return Boolean(video.closest(BILLBOARD_SELECTOR));
  }

  function handleBillboardVideo(video) {
    if (!enabled) return;
    if (isBillboardVideo(video)) {
      if (!billboardVideos.has(video)) {
        billboardVideos.set(video, {
          muted: video.muted,
          autoplay: video.autoplay
        });
        incrementBlockCount(1);
      }
      video.muted = true;
      if (video.autoplay) {
        video.autoplay = false;
      }
      if (!video.paused) {
        video.pause();
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

  function scanNodeForVideos(node) {
    if (node.nodeType === Node.ELEMENT_NODE && node.matches('video')) {
      handleBillboardVideo(node);
    }
    if (node.querySelectorAll) {
      node.querySelectorAll('video').forEach(handleBillboardVideo);
    }
  }

  function cleanupBillboardVideos() {
    for (const [video, state] of billboardVideos) {
      if (!video.isConnected || !isBillboardVideo(video)) {
        billboardVideos.delete(video);
        video.muted = state.muted;
        video.autoplay = state.autoplay;
      }
    }
  }

  function flushPendingNodes() {
    debounceTimeout = null;
    cleanupBillboardVideos();
    const nodes = [...pendingNodes];
    pendingNodes.clear();

    if (nodes.length > 100) {
      scanNodeForVideos(document);
    } else {
      for (const node of nodes) {
        if (node.isConnected && !nodes.some((other) => other !== node && other.contains(node))) {
          scanNodeForVideos(node);
        }
      }
    }
  }

  function simulateClick(el) {
    if (!el) return false;
    try {
      if (typeof el.click === 'function') {
        el.click();
        return true;
      }
    } catch (_) {}
    return false;
  }

  const SKIP_SELECTORS = [
    '.ad-skip-button',
    '[data-testid="ad-skip-button"]',
    'button.ad-skip',
    '.skip-ad-button',
    'button[aria-label*="skip" i]',
    'button[class*="skip" i]',
    '[class*="skip-ad"]',
    '[class*="ad-skip"]'
  ];

  const AD_INDICATOR_SELECTORS = [
    '[data-testid="ad-timer"]',
    '.ad-timer',
    '[data-testid="ad-countdown"]',
    '.ad-countdown',
    '[data-testid="ad-badge"]',
    '.ad-badge',
    '[data-testid="ad-slug"]',
    '.ad-indicator',
    '[class*="ad-timer"]',
    '[class*="ad-badge"]'
  ];

  function getActiveSkipButton() {
    for (const sel of SKIP_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        return btn;
      }
    }
    return null;
  }

  function isAdIndicatorPresent() {
    for (const sel of AD_INDICATOR_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return true;
      }
    }
    return false;
  }

  function isExplicitAdContainer(el) {
    if (!el) return false;
    return Boolean(el.closest('#ad-video-container, .ad-video-container, [data-testid="ad-video-container"]'));
  }

  function isHotstarAdShowing() {
    if (getActiveSkipButton()) return true;
    if (isAdIndicatorPresent()) return true;
    const explicitAdContainer = document.querySelector('#ad-video-container, .ad-video-container, [data-testid="ad-video-container"]');
    if (explicitAdContainer && explicitAdContainer.offsetParent !== null) {
      const v = explicitAdContainer.querySelector('video');
      if (v) return true;
    }
    return false;
  }

  function skipInStreamAds() {
    if (!enabled) return;

    const skipBtn = getActiveSkipButton();
    if (skipBtn) {
      simulateClick(skipBtn);
    }

    const adShowing = isHotstarAdShowing();

    if (adShowing) {
      if (!adCounted) {
        adCounted = true;
        incrementBlockCount(1);
      }

      const explicitAdContainer = document.querySelector('#ad-video-container, .ad-video-container, [data-testid="ad-video-container"]');
      const adVideos = explicitAdContainer ? explicitAdContainer.querySelectorAll('video') : document.querySelectorAll('video');

      for (const video of adVideos) {
        if (isBillboardVideo(video)) continue;

        video.muted = true;
        video.playbackRate = 16.0;

        const duration = video.duration;
        if (Number.isFinite(duration) && duration > 0 && duration <= 180 && !(video.ended || video.currentTime >= duration)) {
          try {
            if (video.buffered && video.buffered.length > 0) {
              const bufEnd = video.buffered.end(video.buffered.length - 1);
              if (bufEnd > video.currentTime) {
                video.currentTime = Math.min(bufEnd, duration);
              } else {
                video.currentTime = duration;
              }
            } else {
              video.currentTime = duration;
            }
            video.dispatchEvent(new Event('ended'));
          } catch (_) {}
        }

        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      }

      const postSkipBtn = getActiveSkipButton();
      if (postSkipBtn) {
        simulateClick(postSkipBtn);
      }
    } else {
      adCounted = false;

      const allVideos = document.querySelectorAll('video');
      for (const mv of allVideos) {
        if (isBillboardVideo(mv) || isExplicitAdContainer(mv)) continue;

        if (mv.muted && !mv.__userMuted && !userMutedState) {
          mv.muted = false;
        }

        if (mv.playbackRate > 4.0) {
          mv.playbackRate = 1.0;
        }

        if (mv.paused && !mv.ended && !mv.__userPaused) {
          mv.play().catch(() => {});
        }
      }
    }
  }

  function onVideoEvent(event) {
    if (event.target instanceof HTMLVideoElement) {
      cleanupBillboardVideos();
      handleBillboardVideo(event.target);
      skipInStreamAds();
    }
  }

  document.addEventListener('volumechange', (e) => {
    if (e.isTrusted && e.target instanceof HTMLVideoElement && !isBillboardVideo(e.target)) {
      if (!isHotstarAdShowing()) {
        e.target.__userMuted = e.target.muted;
        userMutedState = e.target.muted;
      }
    }
  }, true);

  document.addEventListener('pause', (e) => {
    if (e.isTrusted && e.target instanceof HTMLVideoElement && !isBillboardVideo(e.target)) {
      if (!isHotstarAdShowing() && e.target.currentTime > 0.5) {
        e.target.__userPaused = true;
      }
    }
  }, true);

  document.addEventListener('play', (e) => {
    if (e.target instanceof HTMLVideoElement && !isBillboardVideo(e.target)) {
      e.target.__userPaused = false;
    }
  }, true);

  const observer = new MutationObserver((mutations) => {
    let hasAdChange = false;
    for (const m of mutations) {
      if (m.type === 'attributes') {
        pendingNodes.add(m.target);
      } else {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.add(node);
            const id = node.id || '';
            const cls = typeof node.className === 'string' ? node.className : '';
            const testId = typeof node.getAttribute === 'function' ? (node.getAttribute('data-testid') || '') : '';
            if (
              id === 'ad-video-container' ||
              cls.includes('ad-video') ||
              cls.includes('ad-skip') ||
              cls.includes('skip-ad') ||
              cls.includes('ad-timer') ||
              cls.includes('ad-badge') ||
              testId === 'ad-video-container' ||
              testId === 'ad-timer' ||
              testId === 'ad-skip-button' ||
              testId === 'ad-countdown' ||
              testId === 'ad-badge'
            ) {
              hasAdChange = true;
            }
          }
        }
      }
    }

    if (hasAdChange) {
      skipInStreamAds();
    }

    if (debounceTimeout === null) {
      debounceTimeout = setTimeout(flushPendingNodes, 50);
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-testid', 'id', 'src', 'autoplay', 'class']
  });

  scanNodeForVideos(document);

  ['play', 'playing', 'loadedmetadata', 'durationchange', 'timeupdate', 'canplay'].forEach((eventType) => {
    document.addEventListener(eventType, onVideoEvent, true);
  });

  setInterval(() => {
    skipInStreamAds();
    scanBannerAds();
  }, 100);

  skipInStreamAds();
  scanBannerAds();
})();
