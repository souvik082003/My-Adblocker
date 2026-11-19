const toggle = document.getElementById('toggle');
const heroCard = document.getElementById('hero-card');
const statusText = document.getElementById('status-text');
const heroDesc = document.getElementById('hero-desc');
const siteIcon = document.getElementById('site-icon');
const siteDomain = document.getElementById('site-domain');
const siteStatus = document.getElementById('site-status');
const siteCount = document.getElementById('site-count');
const statSiteCount = document.getElementById('stat-site-count');
const ytPill = document.getElementById('yt-pill');
const hotstarPill = document.getElementById('hotstar-pill');
const ytCount = document.getElementById('yt-count');
const hotstarCount = document.getElementById('hotstar-count');
const statCount = document.getElementById('stat-count');
const statTime = document.getElementById('stat-time');
const reloadBtn = document.getElementById('reload-btn');
const resetBtn = document.getElementById('reset-btn');

let activePlatform = 'other';
let cachedStorage = {
  adblockCount: 0,
  adblockCount_youtube: 0,
  adblockCount_hotstar: 0
};

function formatTimeSaved(count) {
  const seconds = count * 16;
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = (seconds / 60).toFixed(1);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  return `${hours}h ${remainingMins}m`;
}

function updateMetrics(data) {
  if (data) {
    cachedStorage = { ...cachedStorage, ...data };
  }

  const total = Number.isFinite(cachedStorage.adblockCount) ? cachedStorage.adblockCount : 0;
  const yt = Number.isFinite(cachedStorage.adblockCount_youtube) ? cachedStorage.adblockCount_youtube : 0;
  const hotstar = Number.isFinite(cachedStorage.adblockCount_hotstar) ? cachedStorage.adblockCount_hotstar : 0;

  if (statCount) statCount.textContent = total.toLocaleString();
  if (statTime) statTime.textContent = formatTimeSaved(total);
  if (ytCount) ytCount.textContent = `${yt.toLocaleString()} blocked`;
  if (hotstarCount) hotstarCount.textContent = `${hotstar.toLocaleString()} blocked`;

  let currentSiteNum = 0;
  if (activePlatform === 'youtube') {
    currentSiteNum = yt;
  } else if (activePlatform === 'hotstar') {
    currentSiteNum = hotstar;
  }

  if (siteCount) siteCount.textContent = currentSiteNum.toLocaleString();
  if (statSiteCount) statSiteCount.textContent = currentSiteNum.toLocaleString();
}

function renderState(enabled) {
  toggle.checked = enabled;
  if (enabled) {
    if (heroCard) {
      heroCard.classList.remove('disabled');
      heroCard.classList.add('active');
    }
    if (statusText) statusText.textContent = 'SHIELD ACTIVE';
    if (heroDesc) heroDesc.textContent = 'Realtime protection enabled';
    if (ytPill) {
      ytPill.textContent = 'ON';
      ytPill.classList.remove('off');
    }
    if (hotstarPill) {
      hotstarPill.textContent = 'ON';
      hotstarPill.classList.remove('off');
    }
  } else {
    if (heroCard) {
      heroCard.classList.remove('active');
      heroCard.classList.add('disabled');
    }
    if (statusText) statusText.textContent = 'SHIELD PAUSED';
    if (heroDesc) heroDesc.textContent = 'Protection temporarily paused';
    if (ytPill) {
      ytPill.textContent = 'OFF';
      ytPill.classList.add('off');
    }
    if (hotstarPill) {
      hotstarPill.textContent = 'OFF';
      hotstarPill.classList.add('off');
    }
  }
}

function detectActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs[0];
    const rawUrl = (activeTab && (activeTab.url || activeTab.pendingUrl)) || '';

    if (rawUrl) {
      try {
        const url = new URL(rawUrl);
        const host = url.hostname.toLowerCase();

        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          activePlatform = 'youtube';
          if (siteIcon) siteIcon.textContent = '▶️';
          if (siteDomain) siteDomain.textContent = 'YouTube';
          if (siteStatus) siteStatus.textContent = 'Shield Active';
        } else if (host.includes('hotstar.com') || host.includes('jiohotstar.com') || host.includes('jiocinema.com')) {
          activePlatform = 'hotstar';
          if (siteIcon) siteIcon.textContent = '⭐';
          if (siteDomain) siteDomain.textContent = 'JioHotstar';
          if (siteStatus) siteStatus.textContent = 'Shield Active';
        } else {
          activePlatform = 'other';
          if (siteIcon) siteIcon.textContent = '🌐';
          if (siteDomain) siteDomain.textContent = host || 'Active Tab';
          if (siteStatus) siteStatus.textContent = 'Standard Webpage';
        }
      } catch (_) {}
    }

    if (typeof callback === 'function') {
      callback();
    } else {
      updateMetrics();
    }
  });
}

detectActiveTab(() => {
  chrome.storage.local.get(['adblockEnabled', 'adblockCount', 'adblockCount_youtube', 'adblockCount_hotstar'], (result) => {
    const enabled = result.adblockEnabled !== false;
    renderState(enabled);
    if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
      chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: enabled ? ['ruleset_1'] : [],
        disableRulesetIds: enabled ? [] : ['ruleset_1']
      }).catch(() => {});
    }
    updateMetrics({
      adblockCount: result.adblockCount || 0,
      adblockCount_youtube: result.adblockCount_youtube || 0,
      adblockCount_hotstar: result.adblockCount_hotstar || 0
    });
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.adblockEnabled) {
    renderState(changes.adblockEnabled.newValue !== false);
  }
  const nextData = {};
  if (changes.adblockCount) nextData.adblockCount = changes.adblockCount.newValue;
  if (changes.adblockCount_youtube) nextData.adblockCount_youtube = changes.adblockCount_youtube.newValue;
  if (changes.adblockCount_hotstar) nextData.adblockCount_hotstar = changes.adblockCount_hotstar.newValue;
  if (Object.keys(nextData).length > 0) {
    updateMetrics(nextData);
  }
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  renderState(enabled);
  chrome.storage.local.set({ adblockEnabled: enabled });

  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? ['ruleset_1'] : [],
      disableRulesetIds: enabled ? [] : ['ruleset_1']
    }).catch(() => {});
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs[0];
    if (!activeTab || !activeTab.id || !activeTab.url) return;
    const url = activeTab.url.toLowerCase();
    const isTarget = url.includes('youtube.com') ||
                     url.includes('hotstar.com') ||
                     url.includes('jiohotstar.com') ||
                     url.includes('jiocinema.com');
    if (isTarget) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'ADBLOCK_TOGGLE', enabled }, () => {
        chrome.tabs.reload(activeTab.id);
      });
    }
  });
});

if (reloadBtn) {
  reloadBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
        const originalHTML = reloadBtn.innerHTML;
        reloadBtn.textContent = 'Reloaded!';
        setTimeout(() => {
          reloadBtn.innerHTML = originalHTML;
        }, 1200);
      }
    });
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    chrome.storage.local.set({
      adblockCount: 0,
      adblockCount_youtube: 0,
      adblockCount_hotstar: 0
    }, () => {
      updateMetrics({
        adblockCount: 0,
        adblockCount_youtube: 0,
        adblockCount_hotstar: 0
      });
      const originalHTML = resetBtn.innerHTML;
      resetBtn.textContent = 'Reset!';
      setTimeout(() => {
        resetBtn.innerHTML = originalHTML;
      }, 1000);
    });
  });
}
