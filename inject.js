(function () {
  'use strict';

  function pruneAdData(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    try {
      if (obj.adPlacements) {
        delete obj.adPlacements;
      }
      if (obj.playerAds) {
        delete obj.playerAds;
      }
      if (obj.adSlots) {
        delete obj.adSlots;
      }

      if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers) {
        if (obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel) {
          delete obj.auxiliaryUi.messageRenderers.enforcementMessageViewModel;
        }
      }

      if (obj.playerResponse && typeof obj.playerResponse === 'object') {
        pruneAdData(obj.playerResponse);
      }
    } catch (_) {}

    return obj;
  }

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

  const originalJSONParse = JSON.parse;
  JSON.parse = function (...args) {
    const result = originalJSONParse.apply(this, args);
    if (result && typeof result === 'object') {
      pruneAdData(result);
    }
    return result;
  };

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
