const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status");
const statusDot = document.getElementById("status-dot");
const statCount = document.getElementById("stat-count");

function render(enabled) {
  toggle.checked = enabled;
  if (enabled) {
    statusText.textContent = "Ad Blocker: ON";
    if (statusDot) statusDot.className = "dot active";
  } else {
    statusText.textContent = "Ad Blocker: OFF";
    if (statusDot) statusDot.className = "dot disabled";
  }
}

chrome.storage.local.get(["adblockEnabled", "adblockCount"], (result) => {
  const enabled = result.adblockEnabled !== false;
  render(enabled);
  if (statCount) {
    statCount.textContent = result.adblockCount || 0;
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.adblockCount && statCount) {
    statCount.textContent = changes.adblockCount.newValue || 0;
  }
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ adblockEnabled: enabled });
  render(enabled);

  if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.updateEnabledRulesets) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabled ? ["ruleset_1"] : [],
      disableRulesetIds: enabled ? [] : ["ruleset_1"]
    }).catch(() => {});
  }
});
