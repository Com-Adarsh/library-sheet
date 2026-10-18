/* 3. INSTALLATION AND UPDATES — installation is always a user action. */
(function () {
  'use strict';
  let promptEvent = null;
  let registration = null;
  let reloadRequested = false;
  const standalone = window.matchMedia('(display-mode: standalone)');
  const state = {
    installed: standalone.matches || navigator.standalone === true,
    canInstall: false, offlineReady: false, updateAvailable: false,
    error: '', checking: false
  };
  function publish() {
    window.dispatchEvent(new CustomEvent('library:pwa', { detail: { ...state } }));
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent = event; state.canInstall = true; publish();
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null; state.installed = true; state.canInstall = false; publish();
  });
  if (standalone.addEventListener) standalone.addEventListener('change', event => {
    state.installed = event.matches || navigator.standalone === true; publish();
  });
  function waiting() {
    state.updateAvailable = Boolean(registration && registration.waiting && navigator.serviceWorker.controller);
    publish();
  }
  window.LibraryPWA = {
    state,
    async install() {
      if (!promptEvent) return false;
      const prompt = promptEvent; promptEvent = null; state.canInstall = false; publish();
      try { await prompt.prompt(); await prompt.userChoice; return true; }
      catch (_) { return false; }
    },
    async check() {
      if (!registration || state.checking) return;
      state.checking = true; state.error = ''; publish();
      try { await registration.update(); waiting(); }
      catch (_) { state.error = 'Could not check for app updates. Try again when connected.'; }
      finally { state.checking = false; publish(); }
    },
    applyUpdate() {
      if (!registration || !registration.waiting) return false;
      reloadRequested = true;
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
  };
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    state.error = 'Offline app installation needs a supported browser and HTTPS.';
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    state.offlineReady = true; state.updateAvailable = false; publish();
    if (reloadRequested) window.location.reload();
  });
  window.addEventListener('load', async () => {
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      waiting();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (worker) worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') waiting();
          if (worker.state === 'redundant' && !registration.active) {
            state.error = 'Offline setup did not complete. Reconnect and reload to try again.'; publish();
          }
        });
      });
      await navigator.serviceWorker.ready;
      state.offlineReady = true; publish();
    } catch (_) {
      state.error = 'Offline setup did not complete. Reconnect and reload to try again.'; publish();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) window.LibraryPWA.check();
  });
})();
