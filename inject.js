/**
 * inject.js - Runs in the MAIN world (page context) at document_start.
 * Intercepts YouTube player response objects across Initial HTML, Fetch API,
 * and JSON.parse to sanitize ad cues in memory without breaking player state.
 */
(function () {
  'use strict';

  // Helper to remove ad fields safely
  function pruneAdData(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    try {
      // 1. Remove video ad placements and queues
      if (obj.adPlacements) {
        delete obj.adPlacements;
      }
      if (obj.playerAds) {
        delete obj.playerAds;
      }
      if (obj.adSlots) {
        delete obj.adSlots;
      }

      // 2. Remove anti-adblock enforcement messaging if present
      if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers) {
        if (obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel) {
          delete obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel;
        }
      }

      // 3. Prune nested playerResponse if present
      if (obj.playerResponse && typeof obj.playerResponse === 'object') {
        pruneAdData(obj.playerResponse);
      }
    } catch (_) {
      // Fail silently to prevent interrupting playback
    }

    return obj;
  }

  // 1. Intercept window.ytInitialPlayerResponse (Initial HTML payload)
  let currentYtInitialPlayerResponse = window.ytInitialPlayerResponse;
  if (currentYtInitialPlayerResponse) {
    pruneAdData(currentYtInitialPlayerResponse);
  }

  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() {
        return currentYtInitialPlayerResponse;
      },
      set(val) {
        currentYtInitialPlayerResponse = pruneAdData(val);
      },
      configurable: true,
      enumerable: true
    });
  } catch (_) {}

  // 2. Intercept Response.prototype.json for dynamic SPA Fetch calls (/youtubei/v1/player)
  if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
    const originalResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
      const data = await originalResponseJson.apply(this, arguments);
      if (data && typeof data === 'object') {
        pruneAdData(data);
      }
      return data;
    };
  }

  // 3. Intercept JSON.parse for manual JSON decoding
  const originalJSONParse = JSON.parse;
  JSON.parse = function (...args) {
    const result = originalJSONParse.apply(this, args);
    if (result && typeof result === 'object') {
      pruneAdData(result);
    }
    return result;
  };

  // 4. Intercept window.ytcfg via property descriptor
  function hookYtcfg(cfg) {
    if (cfg && typeof cfg.set === 'function' && !cfg.__adblockHooked) {
      cfg.__adblockHooked = true;
      const originalSet = cfg.set;
      cfg.set = function (keyOrObj, val) {
        if (keyOrObj && typeof keyOrObj === 'object') {
          pruneAdData(keyOrObj);
        }
        return originalSet.apply(this, arguments);
      };
    }
  }

  let currentYtcfg = window.ytcfg;
  if (currentYtcfg) {
    hookYtcfg(currentYtcfg);
  }

  try {
    Object.defineProperty(window, 'ytcfg', {
      get() {
        return currentYtcfg;
      },
      set(val) {
        currentYtcfg = val;
        hookYtcfg(currentYtcfg);
      },
      configurable: true,
      enumerable: true
    });
  } catch (_) {}

  document.addEventListener('DOMContentLoaded', () => {
    if (window.ytcfg) hookYtcfg(window.ytcfg);
  });
})();
