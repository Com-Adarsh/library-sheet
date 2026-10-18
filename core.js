/* 1. CATALOGUE VALIDATION — shared by the app and the checks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LibraryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const text = value => String(value == null ? '' : value).trim();
  function safeLink(value) {
    try {
      const url = new URL(text(value));
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch (_) { return ''; }
  }
  function semester(value) {
    const raw = text(value);
    const match = raw.match(/^(?:sem(?:ester)?\s*)?(10|[1-9])$/i);
    return match ? match[1] : raw;
  }
  function preferences(raw) {
    try {
      const p = JSON.parse(raw || '{}');
      return {
        semester: /^(10|[1-9])$/.test(String(p.semester)) ? String(p.semester) : 'All',
        type: ['Textbook', 'PYQ', 'Notes'].includes(p.type) ? p.type : 'All',
        subject: typeof p.subject === 'string' ? p.subject.slice(0, 160) : 'All'
      };
    } catch (_) { return { semester: 'All', type: 'All', subject: 'All' }; }
  }
  function catalogue(parsed) {
    const fields = (parsed.meta && parsed.meta.fields || []).map(f => text(f).toLowerCase());
    if (!['title', 'semester', 'type', 'subject', 'link'].every(f => fields.includes(f))) {
      throw new Error('The catalogue is missing required column headings.');
    }
    if ((parsed.errors || []).some(e => e.type === 'Quotes' || e.type === 'FieldMismatch')) {
      throw new Error('The catalogue contains malformed CSV rows.');
    }
    const labels = new Map();
    return parsed.data.map((original, index) => {
      const row = {};
      Object.entries(original).forEach(([key, value]) => { row[text(key).toLowerCase()] = text(value); });
      const subjectKey = (row.subject || 'Unspecified').replace(/\s+/g, ' ').toLowerCase();
      if (!labels.has(subjectKey)) labels.set(subjectKey,
        subjectKey === 'evs' ? 'EVS' : subjectKey.replace(/\b\w/g, c => c.toUpperCase()));
      const type = { textbook: 'Textbook', pyq: 'PYQ', notes: 'Notes' }[row.type.toLowerCase()] || row.type;
      return {
        id: index, title: row.title, semester: semester(row.semester), type,
        subject: labels.get(subjectKey), link: safeLink(row.link)
      };
    }).filter(row => row.title);
  }
  return { safeLink, semester, preferences, catalogue };
});
