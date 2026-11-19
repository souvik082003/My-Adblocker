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

  function skipInStreamAds() {
    if (!enabled) return;

    const adContainers = document.querySelectorAll('#ad-video-container, .ad-video-container');
    for (const container of adContainers) {
      const isVisible =
        typeof container.checkVisibility === 'function'
          ? container.checkVisibility({ visibilityProperty: true, opacityProperty: true })
          : container.getClientRects().length > 0;

      if (isVisible) {
        const skipBtn = container.querySelector(
          '.ad-skip-button, [data-testid="ad-skip-button"], button.ad-skip, .skip-ad-button'
        );
        if (skipBtn) {
          try {
            skipBtn.click();
            countSkippedAd();
          } catch (_) {}
        }

        const videos = container.querySelectorAll('video');
        for (const video of videos) {
          const duration = video.duration;
          if (Number.isFinite(duration) && duration > 0 && !(video.ended || video.currentTime >= duration)) {
            try {
              video.currentTime = duration;
              countSkippedAd();
            } catch (_) {}
          }
        }
      } else {
        adCounted = false;
      }
    }
  }

  function onVideoEvent(event) {
    if (event.target instanceof HTMLVideoElement) {
      cleanupBillboardVideos();
      handleBillboardVideo(event.target);
      if (event.target.closest('#ad-video-container, .ad-video-container')) {
        skipInStreamAds();
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes') {
        pendingNodes.add(m.target);
      } else {
        for (const node of m.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            pendingNodes.add(node);
          }
        }
      }
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

  ['play', 'loadedmetadata', 'durationchange'].forEach((eventType) => {
    document.addEventListener(eventType, onVideoEvent, true);
  });

  setInterval(skipInStreamAds, 250);
  skipInStreamAds();
})();
