/* 2. OFFLINE DATA — only public catalogue fields are stored in IndexedDB. */
(function () {
  'use strict';
  let opening;
  function open() {
    if (!opening) opening = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('Storage unavailable'));
      const request = indexedDB.open('imsc-library', 1);
      const timeout = setTimeout(() => reject(new Error('Storage timeout')), 4000);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('catalogue')) request.result.createObjectStore('catalogue');
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
      request.onerror = () => { clearTimeout(timeout); reject(request.error); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('Storage blocked')); };
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  async function run(mode, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('catalogue', mode);
      const store = tx.objectStore('catalogue');
      const req = mode === 'readwrite' ? store.put(value, 'latest') : store.get('latest');
      const timeout = setTimeout(() => {
        try { tx.abort(); } catch (_) { /* Transaction already ended. */ }
        reject(new Error('Storage transaction timeout'));
      }, 4000);
      tx.oncomplete = () => { clearTimeout(timeout); resolve(req.result); };
      tx.onerror = tx.onabort = () => { clearTimeout(timeout); reject(tx.error || new Error('Storage transaction failed')); };
    });
  }
  window.LibraryStorage = {
    read: () => run('readonly'),
    write: value => run('readwrite', value)
  };
})();
