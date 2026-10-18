# Abhimanyu Learning Space: Technical Audit

**Audit date:** 2026-10-18  
**Scope:** Checked-in repository only. No production write, deployment, database migration, or code change was performed.

## Current architecture

- Static single-page site served from the repository root. Vue 3 global build drives the UI; PapaParse reads the CSV; application code is split across `app.js`, `core.js`, `storage.js`, and `pwa.js`.
- `index.html` loads local scripts, CSS, and image assets. No package manifest or build dependency is present in the tracked root. `vercel.json` configures static hosting.
- Catalogue source: the published Google Sheets CSV URL in `config.js`. The client parses rows and normalizes the five expected fields: Title, Semester, Type, Subject, Link. `core.js` currently assigns row-index IDs and drops rows without a title.
- Offline catalogue cache: IndexedDB database `imsc-library`, object store `catalogue`, key `latest`, schema `1`. This is a per-browser cache, not the authoritative catalogue. Filter preferences are in localStorage under `imsc-library-preferences-v1`.
- Contributions: `app.js` POSTs JSON to the public Apps Script URL in `config.js`, using `text/plain;charset=UTF-8` and `mode: no-cors`. The server implementation is not in this repository. The browser cannot inspect the opaque response or confirm storage/review; the UI labels the outcome as unconfirmed.
- PWA: `manifest.webmanifest` references the existing Abhimanyu and SFI IMSc PNGs. `pwa.js` only registers `sw.js`. The worker precaches a short shell list, then uses network-first caching for same-origin GET requests and serves the app HTML as a fallback. No update prompt or user-controlled update flow is present in the checked-in worker.
- Branding/community destinations found in `index.html`: Abhimanyu Learning Space; SFI IMSc · CUSAT; WhatsApp channel `https://whatsapp.com/channel/0029VaesYjiHgZWZT1NwWo1z`; Instagram `https://www.instagram.com/sfi_imsc_subcommittee_cusat`; contact `sfiimscsubcommittee25@gmail.com`. A distinct About Us description/section was not found.

## Data and integration inventory

| Data/integration | Checked-in location | Authority/status |
| --- | --- | --- |
| Public catalogue CSV | `config.js` | Intended authority; live response was not verified in this audit. |
| Resource metadata | `core.js`, `app.js` | Five known fields; no separate catalogue file is tracked. |
| Per-device catalogue snapshot | `storage.js` | IndexedDB cache only; not a production backup. |
| Filter preferences | `app.js` | Non-authoritative localStorage state. |
| Contribution endpoint | `config.js` | Apps Script URL present; server source, permissions, storage, deduplication, and review workflow are unavailable here. |
| Images and fonts | Root PNG/JPG/TTF files; `fonts.css` | Existing local assets. `ASSET_SOURCES.json` refers to a different `assets/` layout and is stale for this checkout. |
| Environment variables | No names found in checked-in configuration | No frontend environment variables are declared. Vercel project settings were not inspected. |
| Deployment | `vercel.json`, `.vercelignore` | Static Vercel configuration present; production project linkage and deployment state were not verified. |

## Integrity and backup status

- Git working tree was clean at audit start; current source checkpoint was `9f91984` (`main`, tracking `origin/main`). This is a source-code rollback point, not a data backup.
- The README and `VALIDATION.md` claim 104 resources and one incomplete link, but this count was **not independently verified** against the live Sheet.
- The attempted catalogue retrieval did not yield valid CSV. The resulting empty file was removed and is not represented as a backup.
- Therefore there is no verified catalogue snapshot, record-level inventory, checksum, or tested data restoration procedure from this session. No implementation touching catalogue normalization, caching, submission contracts, or production configuration should proceed until an authorized live export is available and validated.
- Safe backup procedure once access is available: fetch the configured published CSV following redirects; reject non-CSV, empty, malformed, or header-incomplete responses; retain the raw bytes and SHA-256 checksum outside the browser cache; parse a separate copy and record row count, identifiers/row positions, field values, duplicate candidates, incomplete fields, and URL validation results. Restore/compare by retaining the original Sheet as authority and restoring only through its authorized owner workflow. The Apps Script submission store needs its own owner-authorized export; it cannot be backed up from this repository.

## Findings and risks

- **Data integrity gate not met:** the live catalogue and submission storage have not been verified or backed up.
- **Refresh can replace a larger cache with a structurally plausible but partial response:** the client accepts any parsed response with at least one data row; there is no verified record-count or completeness guard.
- **Identifiers are synthesized from row positions:** no stable ID column is currently read from the five-field schema. Changing normalization or row ordering can change these IDs.
- **Potential record loss:** `core.js` removes rows without a title; therefore the current client can silently omit incomplete source rows.
- **Contribution outcome is not confirmed:** opaque `no-cors` responses prevent the client from distinguishing server acceptance from rejection. The form is cleared after a fetch resolves even though receipt is unconfirmed. Fixing this requires preserving the endpoint contract and reviewing the Apps Script implementation or adding a compatible, verified response path.
- **PWA behavior differs from README claims:** checked-in `pwa.js` and `sw.js` do not implement the documented update-notification flow. Offline behavior and all precache paths require browser-level verification.
- **Repository documentation is stale:** README refers to `assets/`, `offline.html`, `tools/`, and `tests/`, none of which are present in the tracked file list. `VALIDATION.md` records automated checks that are not reproducible from the current checkout as described.
- **UI omissions:** no About Us section was found; filters only enumerate semesters 1-10 and three resource types; search omits semester from its text matching; no per-resource contribution/reporting action is present.

## Access required to complete the rebuild

1. Allow/enable a read-only retrieval of the configured published CSV, or provide an owner-exported CSV plus its expected record count/checksum.
2. Provide the Apps Script source or owner-authorized documentation/test endpoint and clarify the actual contribution storage and review process. Do not provide secret values in this document or frontend code.
3. Provide access to Vercel project settings/logs and the production preview workflow before deployment verification.
4. Confirm the intended About Us copy and institutional wording if it is not present in the live source.

Until those checks are complete, production data, live integrations, and deployment have not been changed.
