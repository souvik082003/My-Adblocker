(function () {
  'use strict';

  let isEnabled = true;
  try {
    if (
      (document.cookie && document.cookie.includes('__adblocker_disabled__=1')) ||
      window.sessionStorage.getItem('__adblocker_disabled__') === 'true' ||
      window.localStorage.getItem('__adblocker_disabled__') === 'true'
    ) {
      isEnabled = false;
    }
  } catch (_) {}

  function updatePersistence(active) {
    try {
      if (!active) {
        document.cookie = '__adblocker_disabled__=1; path=/; max-age=31536000';
        window.sessionStorage.setItem('__adblocker_disabled__', 'true');
        window.localStorage.setItem('__adblocker_disabled__', 'true');
      } else {
        document.cookie = '__adblocker_disabled__=; path=/; max-age=0';
        window.sessionStorage.removeItem('__adblocker_disabled__');
        window.localStorage.removeItem('__adblocker_disabled__');
      }
    } catch (_) {}
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'ADBLOCK_TOGGLE') {
      isEnabled = e.data.enabled !== false;
      updatePersistence(isEnabled);
    }
  });

  function isAdblockActive() {
    if (!isEnabled) return false;
    if (document.documentElement && document.documentElement.dataset.adblockEnabled === 'false') {
      return false;
    }
    try {
      if (
        (document.cookie && document.cookie.includes('__adblocker_disabled__=1')) ||
        window.sessionStorage.getItem('__adblocker_disabled__') === 'true' ||
        window.localStorage.getItem('__adblocker_disabled__') === 'true'
      ) {
        return false;
      }
    } catch (_) {}
    return true;
  }

  function pruneAdData(obj) {
    if (!isAdblockActive() || !obj || typeof obj !== 'object') return obj;

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

  let originalYtInitialPlayerResponse = window.ytInitialPlayerResponse;
  let currentYtInitialPlayerResponse = isAdblockActive() && originalYtInitialPlayerResponse
    ? pruneAdData(originalYtInitialPlayerResponse)
    : originalYtInitialPlayerResponse;

  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get() {
        if (!isAdblockActive()) {
          return originalYtInitialPlayerResponse || currentYtInitialPlayerResponse;
        }
        return currentYtInitialPlayerResponse;
      },
      set(val) {
        originalYtInitialPlayerResponse = val;
        if (isAdblockActive() && val && typeof val === 'object') {
          try {
            const clone = JSON.parse(JSON.stringify(val));
            currentYtInitialPlayerResponse = pruneAdData(clone);
          } catch (_) {
            currentYtInitialPlayerResponse = pruneAdData(val);
          }
        } else {
          currentYtInitialPlayerResponse = val;
        }
      },
      configurable: true,
      enumerable: true
    });
  } catch (_) {}

  if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
    const originalResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
      const data = await originalResponseJson.apply(this, arguments);
      if (isAdblockActive() && data && typeof data === 'object') {
        pruneAdData(data);
      }
      return data;
    };
  }

  const originalJSONParse = JSON.parse;
  JSON.parse = function (...args) {
    const result = originalJSONParse.apply(this, args);
    if (isAdblockActive() && result && typeof result === 'object') {
      pruneAdData(result);
    }
    return result;
  };

  function hookYtcfg(cfg) {
    if (cfg && typeof cfg.set === 'function' && !cfg.__adblockHooked) {
      cfg.__adblockHooked = true;
      const originalSet = cfg.set;
      cfg.set = function (keyOrObj, val) {
        if (isAdblockActive() && keyOrObj && typeof keyOrObj === 'object') {
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
