/* 4. LIBRARY UI — public catalogue, remembered filters, and contributions. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister())).catch(() => {});
    if ('caches' in window) caches.keys().then(names => names.filter(name => name.startsWith('imsc-library-shell-')).forEach(name => caches.delete(name))).catch(() => {});
  }
  const { createApp } = Vue;
  const PREF_KEY = 'imsc-library-preferences-v1';
  const blankEntry = () => ({ title: '', semester: 1, type: 'Notes', subject: '', link: '' });
  let initial;
  try { initial = LibraryCore.preferences(localStorage.getItem(PREF_KEY)); }
  catch (_) { initial = LibraryCore.preferences(null); }
  let onlineListener, offlineListener;

  createApp({
    data() {
      return {
        semFilter: initial.semester, typeFilter: initial.type, subjectFilter: initial.subject, searchQuery: '',
        resources: [], loading: true, refreshing: false, catalogueAvailable: false,
        lastUpdated: null, cacheSaved: false, loadError: '', storageWarning: '', preferenceWarning: '',
        online: navigator.onLine,
        showUpload: false, uploading: false, showSuccess: false,
        formError: '', linkError: false, newEntry: blankEntry()
      };
    },
    computed: {
      subjectStats() {
        const counts = new Map();
        this.resources.forEach(r => counts.set(r.subject, (counts.get(r.subject) || 0) + 1));
        return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
      },
      filteredResources() {
        const query = this.searchQuery.trim().toLowerCase();
        return this.resources.filter(r =>
          (this.semFilter === 'All' || String(r.semester) === this.semFilter) &&
          (this.typeFilter === 'All' || r.type === this.typeFilter) &&
          (this.subjectFilter === 'All' || r.subject === this.subjectFilter) &&
          (!query || `${r.title} ${r.subject} ${r.type}`.toLowerCase().includes(query))
        );
      },
      updatedLabel() {
        return this.lastUpdated ? new Date(this.lastUpdated).toLocaleString(undefined, {
          dateStyle: 'medium', timeStyle: 'short'
        }) : 'Not yet saved';
      },
      connectionLabel() {
        if (!this.online) return this.catalogueAvailable ? 'Offline — showing your saved catalogue' : 'Offline — connect to load the catalogue';
        if (this.refreshing) return 'Refreshing catalogue…';
        if (this.loadError) return this.catalogueAvailable ? 'Showing the last available catalogue' : 'Catalogue unavailable';
        return this.cacheSaved ? 'Catalogue saved on this device' : 'Online';
      }
    },
    watch: {
      semFilter: 'savePreferences', typeFilter: 'savePreferences', subjectFilter: 'savePreferences',
      showUpload(value) {
        if (value) this.$nextTick(() => this.$refs.resourceTitle && this.$refs.resourceTitle.focus());
        else this.$nextTick(() => this.$refs.contributeButton && this.$refs.contributeButton.focus());
      }
    },
    methods: {
      filterClass(active) {
        const base = 'whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all border ';
        return base + (active ? 'bg-red-700 border-red-700 text-white shadow-xl' : 'bg-white/5 border-white/10 text-white/60 hover:text-white');
      },
      savePreferences() {
        try {
          localStorage.setItem(PREF_KEY, JSON.stringify({ semester: this.semFilter, type: this.typeFilter, subject: this.subjectFilter }));
          this.preferenceWarning = '';
        } catch (_) { this.preferenceWarning = 'Your browser could not save your filter preferences.'; }
      },
      resetFilters() { this.semFilter = 'All'; this.typeFilter = 'All'; this.subjectFilter = 'All'; this.searchQuery = ''; },
      openResource(event) {
        if (!this.online) {
          event.preventDefault();
          this.loadError = 'Document files need an internet connection. You can still browse and search the saved catalogue.';
        }
      },
      validateLink() {
        const link = LibraryCore.safeLink(this.newEntry.link);
        this.linkError = Boolean(this.newEntry.link) && (!link || new URL(link).hostname !== 'drive.google.com');
      },
      closeUpload() { if (!this.uploading) this.showUpload = false; },
      trapDialog(event) {
        if (event.key !== 'Tab') return;
        const nodes = Array.from(event.currentTarget.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]'));
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      },
      async submitForm() {
        this.validateLink();
        if (this.uploading || this.linkError) return;
        if (!this.online) { this.formError = 'Reconnect before submitting. Your form is still here.'; return; }
        this.uploading = true; this.formError = '';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          await fetch(LIBRARY_CONFIG.submissionUrl, {
            method: 'POST', mode: 'no-cors', cache: 'no-store',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ ...this.newEntry }), signal: controller.signal
          });
          // An opaque Apps Script response cannot prove that the server accepted the entry.
          this.showUpload = false; this.showSuccess = true;
          setTimeout(() => { this.showSuccess = false; }, 10000);
          this.newEntry = blankEntry();
        } catch (_) {
          this.formError = 'Delivery could not be confirmed. Your entry is still here. Check before retrying to avoid a duplicate.';
        } finally { clearTimeout(timer); this.uploading = false; }
      },
      async loadSavedCatalogue() {
        try {
          const saved = await LibraryStorage.read();
          if (saved && saved.schema === 1 && Array.isArray(saved.resources) && Number.isFinite(saved.updatedAt)) {
            this.resources = saved.resources.filter(r => r && typeof r.title === 'string').map(r => ({
              id: r.id, title: r.title, semester: String(r.semester || ''),
              subject: String(r.subject || 'Unspecified'), type: String(r.type || ''), link: LibraryCore.safeLink(r.link)
            }));
            this.lastUpdated = saved.updatedAt; this.cacheSaved = true;
            this.catalogueAvailable = true; this.loading = false;
          }
        } catch (_) { this.storageWarning = 'Offline catalogue storage is unavailable in this browser session.'; }
      },
      async fetchData() {
        if (this.refreshing) return;
        if (!this.online) { this.loading = false; return; }
        this.refreshing = true; this.loadError = '';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(LIBRARY_CONFIG.catalogueUrl, { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('Catalogue request failed');
          const csv = await response.text();
          if (csv.length > 8 * 1024 * 1024) throw new Error('Catalogue exceeds this release’s size limit');
          const parsed = Papa.parse(csv, { header: false, skipEmptyLines: 'greedy' });
          if (!Array.isArray(parsed.data) || parsed.data.length < 2) throw new Error('The catalogue is empty.');
          const resources = LibraryCore.catalogue({ data: parsed.data.slice(1) });
          const updatedAt = Date.now();
          this.resources = resources; this.lastUpdated = updatedAt; this.catalogueAvailable = true;
          try {
            await LibraryStorage.write({ schema: 1, updatedAt, resources });
            this.cacheSaved = true; this.storageWarning = '';
          } catch (_) {
            this.cacheSaved = false;
            this.storageWarning = 'The latest catalogue could not be saved offline. Free some device storage and refresh.';
          }
        } catch (_) {
          this.loadError = this.catalogueAvailable
            ? 'Could not refresh. Your previous catalogue is still available; reconnect and try again.'
            : 'Could not load the catalogue. Check your connection and try again.';
        } finally { clearTimeout(timer); this.refreshing = false; this.loading = false; }
      }
    },
    async mounted() {
      onlineListener = () => { this.online = true; this.fetchData(); };
      offlineListener = () => { this.online = false; };
      window.addEventListener('online', onlineListener);
      window.addEventListener('offline', offlineListener);
      await this.loadSavedCatalogue();
      await this.fetchData();
    },
    beforeUnmount() {
      window.removeEventListener('online', onlineListener);
      window.removeEventListener('offline', offlineListener);
    }
  }).mount('#app');
})();
