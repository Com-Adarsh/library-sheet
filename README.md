# Abhimanyu Learning Space — PWA upgrade

## 1. Start here

This folder is a complete, upload-ready version of your existing digital library.
It preserves the red/navy design, SFI IMSc branding, public Google Sheets catalogue,
and existing Google Apps Script contribution endpoint.

**Upload the extracted files and folders, not the ZIP file. No build command,
package installation, API key, or paid backend is needed for this release.**

The package was prepared from the deployed page at
https://imsc-digital-library.vercel.app/ on 18 October 2026. That page matched
`Com-Adarsh/library-sheet/index.html` at the time of inspection.

## 2. Features included

- Install controls for compatible browsers, plus iPhone/iPad installation help.
- Manifest, 192 px and 512 px icons, a maskable icon, and an Apple touch icon.
- Offline loading of the interface, scripts, styles, images, and fonts after a successful first visit.
- The last successfully downloaded catalogue saved in IndexedDB on each device.
- Offline search and filtering of saved resource details.
- Remembered semester, subject, and resource-type filters.
- Connection status, refresh button, catalogue timestamp, and useful empty/error states.
- Automatic catalogue refresh when connectivity returns while the page is open.
- A new-version notification with an explicit **Update and reload** button.
- Offline contribution blocking; no background submission queue.
- Locally hosted dependencies and precompiled CSS instead of runtime CDN dependencies.

**Offline catalogue browsing does not mean offline textbook/PDF access.**
Google Drive files and contribution submission still require internet. Browsers
can remove saved data when storage is cleared or under storage pressure; an online
visit restores the catalogue. No account or cross-device synchronization is added.

## 3. Upload to your existing GitHub repository

1. Download the ZIP and extract it on your computer.
2. Open the repository connected to your Vercel project. Based on the inspected
   source, this appears to be `Com-Adarsh/library-sheet`.
3. At the repository root, choose **Add file → Upload files**.
4. Drag the extracted contents into GitHub. Preserve the `assets`, `icons`, `tools`,
   and `tests` folders and their internal structure.
5. Replace the existing `index.html` with this package’s `index.html`.
6. Commit the upload to the branch your Vercel project deploys from.

**Folder placement matters:** `index.html`, `sw.js`, `manifest.webmanifest`, and
`vercel.json` must appear at the repository root. Do not put everything inside an
extra `imsc-pwa` folder unless you also change the Vercel Root Directory to that folder.

Existing root images such as `abhimanyu.png` may remain; this release uses its
bundled copies inside `assets/images`. No resource documents need to be uploaded.

If this repository already contains a customized `vercel.json`, merge these
headers and static deployment settings rather than discarding unrelated settings.
The inspected repository did not contain one.

## 4. Vercel deployment

If your Vercel project is connected to this repository and branch, the commit
should start its normal deployment. Otherwise, import the repository into Vercel.

The included `vercel.json` configures this as a static site:

| Setting | Value |
| --- | --- |
| Framework preset | Other / no framework |
| Root directory | Folder containing `index.html` (repository root for the instructions above) |
| Install command | Empty / disabled |
| Build command | Empty / disabled |
| Output directory | `.` |
| Environment variables | None needed |

Retain the included cache headers. They allow browsers to check the service
worker for updates while the worker itself caches the offline interface.
Deploy **all files in the same commit**, so a new worker cannot see a partial release.

Use the HTTPS Vercel address for installation and offline checks. Opening
`index.html` directly as a local `file://` document does not test a PWA.
This package is intended for the existing Vercel deployment; GitHub stores the
source, and Vercel serves the application.

## 5. First-use check on a phone

1. Open the deployed HTTPS site in a normal browser while online.
2. Wait for resources and **Catalogue ready for offline browsing**.
3. Select a semester and refresh the page. The selection should remain.
4. Use **Install app** when the browser offers it. Otherwise use **How to install**.
5. On iPhone/iPad, open Safari and use **Share → Add to Home Screen**. If shown,
   enable **Open as Web App**.
6. On Android, use Chrome’s installation control or its **Install app / Add to
   Home screen** menu option. Browser wording and eligibility vary.
7. Turn on airplane mode, close/reopen the installed app, and search the catalogue.
8. Confirm that the offline notice appears and contribution submission is disabled.
9. Reconnect. The catalogue should refresh while the page is open.

The automatic install button is shown only after the browser supplies an install
prompt. If already installed or in an unsupported browser, it may not appear.
An in-app browser inside WhatsApp/Instagram may need **Open in browser** first.

## 6. File guide — where each part of the code lives

| File or folder | Purpose |
| --- | --- |
| `index.html` | Main page, installation help, status messages, filters and contribution form |
| `manifest.webmanifest` | Installed app name, icons, theme and launch behaviour |
| `sw.js` | Generated offline worker and release cache list |
| `offline.html` | Small fallback page when no usable cached interface is available |
| `vercel.json` | Static hosting configuration and cache headers |
| `assets/config.js` | Existing public Google Sheets and Apps Script URLs |
| `assets/app.js` | Vue interface, network refresh, saved filters and submission logic |
| `assets/core.js` | Catalogue normalization, safe link validation and preference defaults |
| `assets/storage.js` | IndexedDB persistence of the public catalogue |
| `assets/pwa.js` | Install prompts, service worker registration and update controls |
| `assets/styles.css` | Compiled stylesheet, ready to serve |
| `assets/styles.input.css` | Editable stylesheet source for future changes |
| `assets/vendor` | Local Vue/PapaParse scripts and licence notices |
| `assets/fonts` | Local Plus Jakarta Sans fonts and licence |
| `assets/images` | Existing branding and background images |
| `icons` | App installation icons generated from existing branding |
| `tools/update-cache.mjs` | Creates a new worker cache version after code changes |
| `tools/sw.template.js` | Editable service worker source |
| `tailwind.config.cjs` | CSS source scanning configuration |
| `tests/pwa.test.cjs` | Repeatable behavioural checks using Node.js |
| `VALIDATION.md` | Checks performed and device checks still needed |

## 7. Your current data connection

`assets/config.js` already contains the same public catalogue and submission
addresses as the inspected live page. Do not change them for the initial upload.

The catalogue expects these headings (case and surrounding spaces are normalized):

`Title`, `Semester`, `Type`, `Subject`, `Link`

The app keeps only these resource fields in its offline snapshot. It does not
change access to the published Google Sheet: the CSV itself remains publicly
downloadable. Do not add private fields to that published source.

Semester labels such as `Sem 1` become `1`, and subject whitespace/capitalization
is normalized so duplicate subject filters are combined. Unsafe or incomplete
links are displayed as requiring correction, rather than opened.

During checking, the source contained 104 resources and one incomplete resource
link. This code deliberately does not invent a replacement URL.

Contributions continue to use the existing Apps Script endpoint and JSON body.
The request uses `text/plain;charset=UTF-8` as a CORS-safelisted content type.
The script should continue reading the JSON from `e.postData.contents`. Its source
was not provided, so server processing could not be verified. Because the request
uses `no-cors`, the page says **Request sent — receipt is not confirmed**.
It does not claim approval or guaranteed successful storage.

## 8. Future updates — important for cached apps

### Catalogue changes only

Edit your existing published Sheet as usual. Students get fresh data on the next
successful refresh. There is no need to redeploy just to change catalogue records.

### HTML, JavaScript, image, font, configuration or icon changes

After editing the files, run this once in the project folder using Node.js:

```sh
node tools/update-cache.mjs
```

Commit the changed files **and the regenerated `sw.js` together**. The script
hashes the offline assets and gives the release a new cache name. Existing users
see an update notice and choose when to reload. If a contribution form is open,
the current page asks them to finish or close it before applying the update.
Other open tabs are not automatically reloaded.

If you only edit through GitHub’s website and cannot run Node.js, change
`CACHE_NAME` in `sw.js` to a new unique value beginning with
`imsc-library-shell-` on every code release. If you add/remove runtime files,
also update `PRECACHE_PATHS` there. Never reuse an older cache name.

### Tailwind class or CSS changes

The initial package already includes compiled CSS. Only future changes to styles
or utility classes require rebuilding it:

```sh
npx --yes tailwindcss@3.4.17 -c tailwind.config.cjs -i assets/styles.input.css -o assets/styles.css --minify
node tools/update-cache.mjs
```

### Repeat the included checks

Use Node.js 22 or newer:

```sh
node --test tests/pwa.test.cjs
```

No npm installation is required for these checks.

## 9. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Unstyled/blank page | Ensure the complete `assets` folder was uploaded with the same filenames and case. |
| Offline setup error | Check `sw.js`, every precached file, and the icon/font folders were deployed; reconnect and reload. |
| No catalogue | Confirm the published Sheet still returns CSV and contains the five expected headings; use Refresh catalogue. |
| No install prompt | Use HTTPS and a supported regular browser; check whether the app is already installed; use How to install. |
| Old appearance after a code update | Regenerate `sw.js` or change its cache name, commit the complete release, then use Update and reload. |
| Offline storage warning | Check browser privacy/storage settings and available device storage; refresh while connected. |
| File will not open offline | Expected: the saved catalogue contains links, not downloaded Google Drive documents. |
| Contribution does not appear | Check the existing Apps Script/Sheet workflow; the opaque response does not confirm receipt. |

If a production rollback is needed after PWA adoption, publish a corrected release
with a **new cache name**. Simply deleting `sw.js` does not reliably remove a worker
already installed on students’ devices.

## 10. Scope and technical references

This is the PWA-first release. Notion/Supabase, campus-wide votes, comments,
moderation, thumbnail generation, offline PDF downloads and per-resource social
preview tags remain separate future work.

- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: Caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching)
- [Vercel: Project configuration](https://vercel.com/docs/project-configuration)
- [Tailwind CSS v3: Installation](https://v3.tailwindcss.com/docs/installation)

See `ASSET_SOURCES.json` for downloaded asset provenance and hashes. Upstream
library/font licence notices are retained. Existing institutional artwork is
reused from your public site without changing its design.
