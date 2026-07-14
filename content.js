

let enabled = true;

chrome.storage.local.get(["adblockEnabled"], (result) => {
  enabled = result.adblockEnabled !== false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.adblockEnabled) {
    enabled = changes.adblockEnabled.newValue;
  }
});

function skipAds() {
  if (!enabled) return;

  const skipBtn = document.querySelector(
    ".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern"
  );
  if (skipBtn) {
    skipBtn.click();
  }

  const adShowing = document.querySelector(".ad-showing, .ad-interrupting");
  if (adShowing) {
    const video = document.querySelector("video");
    if (video) {
      video.muted = true;
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration;
      }
      video.playbackRate = 16;
    }
  }

  const adSelectors = [
    ".ytp-ad-overlay-container",
    ".ytp-ad-text-overlay",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-display-ad-renderer",
    "ytd-companion-slot-renderer",
    "#player-ads",
    "ytd-ad-slot-renderer",
    "tp-yt-paper-dialog.ytd-popup-container:has(ytd-mealbar-promo-renderer)"
  ];

  adSelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  });
}

const observer = new MutationObserver(() => skipAds());
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Also run once on load and once shortly after, to catch early ad injections.
skipAds();
window.addEventListener("yt-navigate-finish", skipAds);
setTimeout(skipAds, 1000);
