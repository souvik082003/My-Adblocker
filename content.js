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

  let isAdActive = false;
  let adCounted = false;
  let userPlaybackRate = 1.0;
  let userMuted = false;

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
    window.postMessage({ type: 'ADBLOCK_TOGGLE', enabled }, '*');
    if (!enabled && isAdActive) {
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (video) {
        video.playbackRate = userPlaybackRate;
        video.muted = userMuted;
      }
      isAdActive = false;
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

  function incrementBlockCount(amount = 1, platform = 'youtube') {
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
        const platformKey = platform === 'youtube' ? 'adblockCount_youtube' : 'adblockCount_hotstar';
        chrome.storage.local.get(['adblockCount', platformKey], (res) => {
          const total = (res.adblockCount || 0) + toAdd;
          const siteTotal = (res[platformKey] || 0) + toAdd;
          chrome.storage.local.set({
            adblockCount: total,
            [platformKey]: siteTotal
          });
        });
      } catch (_) {}
    }, 80);
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'ADBLOCK_COUNT' && typeof e.data.count === 'number' && e.data.count > 0) {
      incrementBlockCount(e.data.count, 'youtube');
    }
  });

  const SKIP_BUTTON_SELECTORS = [
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-modern',
    'button.ytp-skip-ad-button',
    '.ytp-skip-ad-button',
    'button.ytp-ad-skip-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-slot > button',
    '.ytp-ad-skip-button-container > button',
    'ytd-button-renderer#skip-button button',
    '.ytp-ad-overlay-close-button',
    '.videoAdUiSkipButton'
  ];

  const AD_DOM_SELECTORS = [
    '#masthead-ad',
    'ytd-banner-promo-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-statement-banner-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '#player-ads',
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-survey',
    'tp-yt-paper-dialog.ytd-popup-container:has(ytd-mealbar-promo-renderer)'
  ];

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

  function clickSkipButtons() {
    if (!isAdShowing()) return false;

    for (const sel of SKIP_BUTTON_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        if (simulateClick(btn)) {
          incrementBlockCount(1, 'youtube');
          return true;
        }
      }
    }
    return false;
  }

  function isAdShowing() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player) {
      if (
        player.classList.contains('ad-showing') ||
        player.classList.contains('ad-interrupting')
      ) {
        return true;
      }
    }
    const adOverlay = document.querySelector('.ytp-ad-player-overlay-layout');
    if (adOverlay && adOverlay.offsetParent !== null) {
      return true;
    }
    return false;
  }

  function handleAntiAdblockDetection() {
    const toasts = document.querySelectorAll('yt-notification-action-renderer, tp-yt-paper-toast');
    toasts.forEach((toast) => {
      const text = (toast.textContent || '').toLowerCase();
      if (text.includes('interruption') || text.includes('experiencing') || text.includes('blocker')) {
        toast.remove();
      }
    });

    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      const dismissBtn =
        enforcement.querySelector('button.yt-spec-button-shape-next') ||
        document.querySelector('#dismiss-button');
      if (dismissBtn) {
        simulateClick(dismissBtn);
      }

      const dialog =
        enforcement.closest('tp-yt-paper-dialog') ||
        enforcement.closest('ytd-popup-container') ||
        enforcement;
      dialog.remove();
    }

    const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
    backdrops.forEach((b) => b.remove());

    if (document.body && document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }

    const errorScreen = document.querySelector('yt-playability-error-supported-renderers:not([hidden]), #error-screen');
    if (errorScreen && errorScreen.offsetParent !== null) {
      const reloadBtn = errorScreen.querySelector('button#retry-button, .ytp-error-content-wrap-reason button');
      if (reloadBtn && reloadBtn.offsetParent !== null) {
        simulateClick(reloadBtn);
      }
    }
  }

  function skipShortsAds() {
    if (!window.location.pathname.startsWith('/shorts/')) return;
    const currentShort = document.querySelector('ytd-reel-video-renderer[is-active]');
    if (currentShort) {
      const isAdShort = currentShort.querySelector(
        'ytd-ad-slot-renderer, .ytd-in-feed-ad-layout-renderer, ytd-reel-player-overlay-renderer .ytd-action-companion-ad-renderer'
      );
      if (isAdShort) {
        const nextBtn = document.querySelector('#navigation-button-down button, #shorts-container #navigation-button-down');
        if (nextBtn) {
          simulateClick(nextBtn);
          incrementBlockCount(1, 'youtube');
        }
      }
    }
  }

  function processAds() {
    if (!enabled) return;

    handleAntiAdblockDetection();
    skipShortsAds();

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    const adActive = isAdShowing();

    if (video) {
      if (adActive) {
        clickSkipButtons();

        if (!isAdActive) {
          isAdActive = true;
          incrementBlockCount(1, 'youtube');
          if (video.playbackRate > 0 && video.playbackRate <= 4) {
            userPlaybackRate = video.playbackRate;
          }
          userMuted = video.muted;
        }

        video.muted = true;
        video.playbackRate = 16.0;

        if (video.duration && isFinite(video.duration) && video.duration <= 180 && video.currentTime < video.duration) {
          if (video.buffered && video.buffered.length > 0) {
            const bufEnd = video.buffered.end(video.buffered.length - 1);
            if (bufEnd > video.currentTime) {
              video.currentTime = Math.min(bufEnd, video.duration);
            } else {
              video.currentTime = video.duration;
            }
          } else {
            video.currentTime = video.duration;
          }
        }

        clickSkipButtons();

        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      } else if (isAdActive) {
        isAdActive = false;
        video.playbackRate = userPlaybackRate;
        video.muted = userMuted;

        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      } else {
        if (video.playbackRate > 0 && video.playbackRate <= 4) {
          userPlaybackRate = video.playbackRate;
        }
        userMuted = video.muted;

        if (video.paused && !video.ended && video.currentTime > 0) {
          const hasInterruption = document.querySelector('tp-yt-paper-toast#toast, yt-notification-action-renderer');
          if (hasInterruption) {
            video.play().catch(() => {});
          }
        }
      }
    }

    for (const sel of AD_DOM_SELECTORS) {
      try {
        const adElements = document.querySelectorAll(sel);
        if (adElements.length > 0) {
          let count = 0;
          adElements.forEach((el) => {
            if (!el.__adblockCounted) {
              el.__adblockCounted = true;
              count++;
            }
            el.remove();
          });
          if (count > 0) {
            incrementBlockCount(count, 'youtube');
          }
        }
      } catch (_) {}
    }
  }

  const observer = new MutationObserver(() => processAds());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  function attachVideoListeners() {
    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (video && !video.__adblockListenersAttached) {
      video.__adblockListenersAttached = true;
      video.addEventListener('timeupdate', () => {
        if (isAdShowing()) processAds();
      });
      video.addEventListener('loadedmetadata', () => {
        if (isAdShowing()) {
          processAds();
        } else if (video.playbackRate !== userPlaybackRate) {
          video.playbackRate = userPlaybackRate;
        }
      });
      video.addEventListener('play', () => {
        if (isAdShowing()) processAds();
      });
    }
  }

  window.addEventListener('yt-navigate-finish', () => {
    isAdActive = false;
    adCounted = false;
    attachVideoListeners();

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (video) {
      video.playbackRate = userPlaybackRate;
      if (video.paused && !video.ended) {
        video.play().catch(() => {});
      }
    }
    processAds();
  });

  window.addEventListener('yt-page-data-updated', () => {
    processAds();
  });

  processAds();
  attachVideoListeners();
  setInterval(processAds, 100);
})();
