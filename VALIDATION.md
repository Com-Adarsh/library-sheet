# Validation — 18 October 2026

## Completed checks

- 18 automated checks passed with `node --test tests/pwa.test.cjs`.
- The Vue 3.5.44 template compiler reported no template errors.
- JavaScript syntax checks passed for the application, PWA controller, storage
  module and generated service worker.
- The live public CSV parsed successfully: 104 resource rows. One incomplete link
  is visibly marked for correction; 13 normalized subject groups were produced.
- Required local HTML/CSS/JS/font/image/icon assets exist and the manifest icons
  have their declared 192 px and 512 px PNG dimensions.
- Tailwind CSS compiled successfully using version 3.4.17.

## Behaviour checked with isolated JavaScript mocks

- Restore an offline catalogue without fetching the network.
- End the loading state on a first offline visit without inventing data.
- Save validated data on successful refresh.
- Preserve the previous catalogue after network errors, HTTP failures or malformed CSV.
- Continue online browsing after storage failure while reporting that saving failed.
- Never send or queue a contribution while offline.
- Precache the entire required interface and serve it on offline navigation.
- Bypass caching for remote resources, POST requests and document navigations.
- Reject worker installation when a required asset is missing.
- Activate an update only after the explicit update message.
- Clean old app caches without deleting unrelated caches.
- Reject unsafe link schemes and recover from corrupt saved preferences.

These are code-level checks. They do not simulate a real browser’s install prompt,
IndexedDB implementation, storage eviction, or full service-worker lifecycle.

## Checks needed after deployment

This downloadable package has not been deployed to the user’s Vercel project.
No visual browser preview or real Android/iOS installation was available in the
build environment. Complete the phone checklist in README section 5 after upload.

Also verify one code-update cycle on the deployed site: keep an older version open,
deploy a new cache version, check for updates, and use Update and reload. Confirm
saved filters and the offline catalogue survive. Check two open tabs if students
commonly use the library in multiple tabs.

The existing Apps Script backend was not modified or exercised with a test
submission. A maintainer should verify receipt using an authorized test entry.
