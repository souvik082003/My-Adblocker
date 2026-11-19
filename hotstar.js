(function () {
  'use strict';

  let enabled = true;
  let adCounted = false;

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

  const BILLBOARD_SELECTOR = '[data-testid="bbtype-video"]';
  const billboardVideos = new Map();
  const pendingNodes = new Set();
  let debounceTimeout = null;

  function handleBillboardVideo(video) {
    if (!enabled) return;
    if (video.closest(BILLBOARD_SELECTOR)) {
      if (!billboardVideos.has(video)) {
        billboardVideos.set(video, {
          muted: video.muted,
          autoplay: video.autoplay
        });
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
      if (!video.isConnected || !video.closest(BILLBOARD_SELECTOR)) {
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

  function skipInStreamAds() {
    if (!enabled) return;

    const adContainers = document.querySelectorAll(
      '#ad-video-container, .ad-video-container, [data-testid="ad-container"], [data-testid="ad-video-container"], [data-testid="ad-player"]'
    );

    if (adContainers.length === 0) {
      adCounted = false;
      return;
    }

    for (const container of adContainers) {
      const skipBtn = container.querySelector(
        '.ad-skip-button, [data-testid="ad-skip-button"], button.ad-skip, .skip-ad-button, button[aria-label*="skip" i], button[class*="skip" i]'
      );
      if (skipBtn) {
        simulateClick(skipBtn);
        countSkippedAd();
      }

      const videos = container.querySelectorAll('video');
      for (const video of videos) {
        video.muted = true;
        video.playbackRate = 16.0;

        const duration = video.duration;
        if (Number.isFinite(duration) && duration > 0 && !(video.ended || video.currentTime >= duration)) {
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
            countSkippedAd();
          } catch (_) {}
        }

        if (video.paused && !video.ended) {
          video.play().catch(() => {});
        }
      }
    }

    const mainVideos = document.querySelectorAll('video');
    for (const mv of mainVideos) {
      if (!mv.closest('#ad-video-container, .ad-video-container, [data-testid="ad-container"]')) {
        if (mv.paused && !mv.ended && mv.currentTime > 0) {
          mv.play().catch(() => {});
        }
      }
    }
  }

  function onVideoEvent(event) {
    if (event.target instanceof HTMLVideoElement) {
      cleanupBillboardVideos();
      handleBillboardVideo(event.target);
      if (event.target.closest('#ad-video-container, .ad-video-container, [data-testid="ad-container"]')) {
        skipInStreamAds();
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    let hasNewAdContainer = false;
    for (const m of mutations) {
      if (m.type === 'attributes') {
        pendingNodes.add(m.target);
      } else {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.add(node);
            if (
              node.id === 'ad-video-container' ||
              (node.className && typeof node.className === 'string' && node.className.includes('ad-video')) ||
              (node.getAttribute && node.getAttribute('data-testid')?.includes('ad'))
            ) {
              hasNewAdContainer = true;
            }
          }
        }
      }
    }

    if (hasNewAdContainer) {
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
    attributeFilter: ['data-testid', 'id', 'src', 'autoplay']
  });

  scanNodeForVideos(document);

  ['play', 'playing', 'loadedmetadata', 'durationchange', 'timeupdate', 'canplay'].forEach((eventType) => {
    document.addEventListener(eventType, onVideoEvent, true);
  });

  setInterval(skipInStreamAds, 100);
  skipInStreamAds();
})();
