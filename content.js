(function () {
  'use strict';

  let enabled = true;
  let isAdActive = false;
  let adCounted = false;
  let userPlaybackRate = 1.0;
  let userMuted = false;

  chrome.storage.local.get(['adblockEnabled'], (result) => {
    enabled = result.adblockEnabled !== false;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.adblockEnabled) {
      enabled = changes.adblockEnabled.newValue !== false;
    }
  });

  function countSkippedAd() {
    if (adCounted) return;
    adCounted = true;
    try {
      chrome.storage.local.get(['adblockCount'], (res) => {
        const count = (res.adblockCount || 0) + 1;
        chrome.storage.local.set({ adblockCount: count });
      });
    } catch (_) {}
  }

  const SKIP_BUTTON_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    'button.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-slot',
    '.ytp-ad-skip-button-slot button',
    '.ytp-ad-skip-button-container button',
    'button.ytp-skip-ad-button',
    '.ytp-ad-skip-text',
    '[id^="skip-button:"]',
    'ytd-button-renderer#skip-button',
    '.ytp-ad-overlay-close-button',
    '.videoAdUiSkipButton',
    '.ytp-ad-preview-container',
    'button.ytp-ad-preview-container',
    '.ytp-ad-button-icon'
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
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.click();
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      return true;
    } catch (_) {
      try {
        el.click();
        return true;
      } catch (_) {}
    }
    return false;
  }

  function clickSkipButtons() {
    for (const sel of SKIP_BUTTON_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn) {
        simulateClick(btn);
        countSkippedAd();
        return true;
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
    return !!document.querySelector(
      '.ad-showing, .ad-interrupting, .ytp-ad-player-overlay'
    );
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

    const errorScreen = document.querySelector('yt-playability-error-supported-renderers, #error-screen, .ytp-error');
    if (errorScreen) {
      const reloadBtn = errorScreen.querySelector(
        'button#retry-button, button.yt-spec-button-shape-next, .ytp-error-content-wrap-reason button, button'
      );
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
          countSkippedAd();
        }
      }
    }
  }

  function processAds() {
    if (!enabled) return;

    handleAntiAdblockDetection();
    clickSkipButtons();
    skipShortsAds();

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    const adActive = isAdShowing();

    if (video) {
      if (adActive) {
        if (!isAdActive) {
          isAdActive = true;
          adCounted = false;
          if (video.playbackRate > 0 && video.playbackRate <= 4) {
            userPlaybackRate = video.playbackRate;
          }
          userMuted = video.muted;
        }

        video.muted = true;
        video.playbackRate = 16.0;

        clickSkipButtons();

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
          countSkippedAd();
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
        adCounted = false;

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
        adElements.forEach((el) => el.remove());
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
      video.addEventListener('timeupdate', processAds);
      video.addEventListener('loadedmetadata', () => {
        processAds();
        if (!isAdShowing() && video.playbackRate !== userPlaybackRate) {
          video.playbackRate = userPlaybackRate;
        }
      });
      video.addEventListener('play', processAds);
      video.addEventListener('pause', () => {
        setTimeout(processAds, 50);
      });
    }
  }

  window.addEventListener('yt-navigate-finish', () => {
    isAdActive = false;
    adCounted = false;
    processAds();
    attachVideoListeners();

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    if (video) {
      video.playbackRate = userPlaybackRate;
      if (video.paused && !video.ended) {
        video.play().catch(() => {});
      }
    }
  });

  window.addEventListener('yt-page-data-updated', () => {
    processAds();
  });

  processAds();
  attachVideoListeners();
  setInterval(processAds, 100);
})();
