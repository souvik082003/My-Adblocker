const toggle = document.getElementById('toggle');
const heroCard = document.getElementById('hero-card');
const statusText = document.getElementById('status-text');
const heroDesc = document.getElementById('hero-desc');
const ytPill = document.getElementById('yt-pill');
const hotstarPill = document.getElementById('hotstar-pill');
const statCount = document.getElementById('stat-count');
const statTime = document.getElementById('stat-time');
const reloadBtn = document.getElementById('reload-btn');
const resetBtn = document.getElementById('reset-btn');

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

function updateMetrics(count) {
  const safeCount = Number.isFinite(count) ? count : 0;
  if (statCount) {
    statCount.textContent = safeCount.toLocaleString();
  }
  if (statTime) {
    statTime.textContent = formatTimeSaved(safeCount);
  }
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

chrome.storage.local.get(['adblockEnabled', 'adblockCount'], (result) => {
  const enabled = result.adblockEnabled !== false;
  renderState(enabled);
  updateMetrics(result.adblockCount || 0);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.adblockEnabled) {
    renderState(changes.adblockEnabled.newValue !== false);
  }
  if (changes.adblockCount) {
    updateMetrics(changes.adblockCount.newValue || 0);
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
    chrome.storage.local.set({ adblockCount: 0 }, () => {
      updateMetrics(0);
      const originalHTML = resetBtn.innerHTML;
      resetBtn.textContent = 'Reset!';
      setTimeout(() => {
        resetBtn.innerHTML = originalHTML;
      }, 1000);
    });
  });
}
