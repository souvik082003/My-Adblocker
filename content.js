/**
 * content.js - Runs in the ISOLATED world on youtube.com.
 * Handles auto-skipping, ad fast-forwarding, volume/speed restoration,
 * YouTube Shorts ad auto-advance, and dismissal of "Experiencing interruptions" prompts.
 */

(function () {
  'use strict';

  let enabled = true;
  let isAdActive = false;
  let adCounted = false;
  let userPlaybackRate = 1.0;
  let userMuted = false;

  // Load and listen for enabled state from storage
  chrome.storage.local.get(['adblockEnabled'], (result) => {
    enabled = result.adblockEnabled !== false;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.adblockEnabled) {
      enabled = changes.adblockEnabled.newValue !== false;
    }
  });

  /**
   * Increments the total skipped ad counter in storage.
   */
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

  // Selectors for all variations of YouTube's skip ad buttons
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

  // Selectors for banner, promoted, and companion ad elements
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

  /**
   * Helper to dispatch pointer and click events so simulated clicks
   * trigger whatever event listeners YouTube's player attached.
   */
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

  /**
   * Clicks any visible skip ad button on the player immediately.
   */
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

  /**
   * Detects whether an advertisement is actively playing in the main player.
   */
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

  /**
   * Automatically handles and dismisses:
   * 1. "Experiencing interruptions? Find out why" toast popups.
   * 2. Anti-adblock enforcement dialogs & gray backdrops.
   * 3. Player error screens with a "Reload" / "Try again" button.
   */
  function handleAntiAdblockDetection() {
    // 1. Remove "Experiencing interruptions" toasts
    const toasts = document.querySelectorAll('yt-notification-action-renderer, tp-yt-paper-toast');
    toasts.forEach((toast) => {
      const text = (toast.textContent || '').toLowerCase();
      if (text.includes('interruption') || text.includes('experiencing') || text.includes('blocker')) {
        toast.remove();
      }
    });

    // 2. Remove anti-adblock enforcement modals
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

    // 3. Remove dark overlay backdrops freezing the page
    const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
    backdrops.forEach((b) => b.remove());

    // 4. Unfreeze document scrolling if locked
    if (document.body && document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }

    // 5. If player displays a transient error screen with a Reload/Retry button, auto-click it
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

  /**
   * Auto-skips sponsored ads in YouTube Shorts.
   */
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

  /**
   * Core ad skipper and player controller.
   */
  function processAds() {
    if (!enabled) return;

    // Handle anti-adblock popups, interruptions, and reload prompts
    handleAntiAdblockDetection();

    // Auto-click any skip button immediately
    clickSkipButtons();

    // Auto-skip shorts ads if on shorts feed
    skipShortsAds();

    const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
    const adActive = isAdShowing();

    if (video) {
      if (adActive) {
        if (!isAdActive) {
          // Entering ad mode: save the user's preferred speed and mute state
          isAdActive = true;
          adCounted = false;
          if (video.playbackRate > 0 && video.playbackRate <= 4) {
            userPlaybackRate = video.playbackRate;
          }
          userMuted = video.muted;
        }

        // Mute audio during the ad
        video.muted = true;

        // Accelerate playback to 16x speed
        video.playbackRate = 16;

        // Jump to end of ad clip only if duration is short (typical ad length <= 3 mins)
        // This protects against jumping past main video content
        if (video.duration && isFinite(video.duration) && video.duration <= 180 && video.currentTime < video.duration) {
          video.currentTime = video.duration;
          countSkippedAd();
        }

        // Click skip button immediately
        clickSkipButtons();

        // Ensure video is playing so ad ends instantly
        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      } else if (isAdActive) {
        // Exiting ad mode: ad has ended! Restore user's normal settings
        isAdActive = false;
        video.playbackRate = userPlaybackRate;
        video.muted = userMuted;

        // Resume main video playback immediately
        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      } else {
        // Normal video playback: track user's speed and volume preferences
        if (video.playbackRate > 0 && video.playbackRate <= 4) {
          userPlaybackRate = video.playbackRate;
        }
        userMuted = video.muted;
        adCounted = false;

        // If video paused unexpectedly while not in an ad, auto-resume
        if (video.paused && !video.ended && video.currentTime > 0) {
          const hasInterruption = document.querySelector('tp-yt-paper-toast#toast, yt-notification-action-renderer');
          if (hasInterruption) {
            video.play().catch(() => {});
          }
        }
      }
    }

    // Clean up promotional/feed ads from DOM
    for (const sel of AD_DOM_SELECTORS) {
      try {
        const adElements = document.querySelectorAll(sel);
        adElements.forEach((el) => el.remove());
      } catch (_) {}
    }
  }

  // 1. MutationObserver to react instantaneously (< 16ms) to DOM updates
  const observer = new MutationObserver(() => processAds());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // 2. Attach video-specific event listeners
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

  // 3. YouTube SPA navigation & reload events: fast start with zero buffering stall
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

  // 4. Initial execution & periodic heartbeat backup
  processAds();
  attachVideoListeners();
  setInterval(processAds, 250);
})();
