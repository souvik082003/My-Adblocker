// popup.js
const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

function render(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? "Blocking ads: ON" : "Blocking ads: OFF";
}

chrome.storage.local.get(["adblockEnabled"], (result) => {
  const enabled = result.adblockEnabled !== false; // default true
  render(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ adblockEnabled: enabled });
  render(enabled);
});
