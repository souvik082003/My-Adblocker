

let enabled = true;

// Load the on/off state saved from the popup (defaults to true/on).
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

  // 1. Auto-click the "Skip Ad" button the moment it becomes clickable.
  const skipBtn = document.querySelector(
    ".ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern"
  );
  if (skipBtn) {
    skipBtn.click();
  }

  // 2. For unskippable ads, mute + fast-forward through them so they
  //    finish (almost) instantly instead of sitting through the full ad.
  const adShowing = document.querySelector(".ad-showing, .ad-interrupting");
  if (adShowing) {
    const video = document.querySelector("video");
    if (video) {
      video.muted = true;
      // Jump to (near) the end of the ad clip if duration is known.
      if (video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration;
      }
      video.playbackRate = 16;
    }
  }

  // 3. Remove overlay banners / promoted cards / companion ad slots
  //    that would otherwise leave blank boxes on the page.
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

// React instantly whenever YouTube's SPA re-renders the page/player.
const observer = new MutationObserver(() => skipAds());
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Also run once on load and once shortly after, to catch early ad injections.
skipAds();
window.addEventListener("yt-navigate-finish", skipAds);
setTimeout(skipAds, 1000);
