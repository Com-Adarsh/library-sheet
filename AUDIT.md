# Abhimanyu Learning Space — audit and preservation record

Audit date: 2026-10-18

## Architecture

- Static Vercel deployment (`vercel.json`, no build step).
- Vue 3 production runtime mounted from `index.html`.
- Papa Parse reads the public Google Sheets CSV catalogue.
- `core.js` normalises and validates catalogue records.
- `storage.js` stores only the latest public catalogue snapshot in IndexedDB (`imsc-library`, store `catalogue`).
- `app.js` owns search, combined filters, refresh state, offline state, contribution form and accessible modal behaviour.
- Contribution submissions use the existing Google Apps Script endpoint from `config.js`.

## Data sources and verified baseline

- Catalogue source: the existing published Google Sheets CSV URL in `config.js`.
- Submission source: the existing Google Apps Script URL in `config.js`.
- Branding assets: `abhimanyu.png`, `sfi-imsc-logo.png`, `cusat.jpg`.
- Contact: `sfiimscsubcommittee25@gmail.com`.
- Verified baseline export: `backups/catalogue-baseline.csv`.
- Baseline export size: 13,927 bytes, 104 CSV lines (header plus 103 resource rows).
- The published source contains at least one incomplete/non-URL link value; it is preserved in the backup and rendered as an unavailable resource instead of being replaced.

## Preservation decisions

- No production database, sheet, Apps Script, identifiers, or source URLs were deleted or migrated.
- No catalogue rows were replaced with demo data.
- The baseline backup is excluded from the Vercel output through `.vercelignore`.
- The browser cache is a recovery copy only; the published Google Sheet remains authoritative.
- Refreshes never overwrite a valid cached catalogue with an empty or malformed response.
- The previous PWA service worker assets were removed in the preceding maintenance change; no stale worker is registered by the current app.

## Known limitations / follow-up

- Google Apps Script submissions are sent using the existing `no-cors` contract, so the browser cannot prove server-side acceptance. The UI deliberately says the receipt is not confirmed and never claims approval.
- Google Drive documents require an internet connection; only catalogue metadata is available offline.
- Records with missing or non-HTTP(S) resource links remain visible but cannot be opened until the source sheet is corrected.
- A production backup should also be retained outside Git with restricted access before any future source-sheet migration.

## Restore procedure

1. Keep the published Google Sheet unchanged.
2. Use `backups/catalogue-baseline.csv` to compare row count, title, semester, type, subject, and link values against any proposed source update.
3. Restore the source sheet from the verified external backup if a future migration removes or changes records.
4. Publish the sheet again, refresh the app, and verify the count and representative links before deployment.
