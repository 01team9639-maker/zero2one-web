# Full owner-design release — 2026-10-10

The owner explicitly approved uploading all local website changes after the
earlier SEO-only publication. This release merges the reviewed `b16d64d` snapshot
with published `47a1309` on `release/all-design-owner-2026-10-10`, without force
pushing, resetting or replacing the original review checkout.

Conflict resolutions retain the reviewed bilingual page designs and source
scripts, then rebuild and stamp their bundles. Published homepage/SEO copy
sources and all fourteen client logos, alt text, ordering and marquee behavior
remain preserved. The historical SEO-only loader is not included in the active
site script, preventing duplicate accordion/slider initialization. Its old
scoped assets are retained, unused, for compatibility with cached requests.

All reviewed pages are now in scope: home, About, services/index and service
pages, portfolio chrome, team, and the full FAQ route in both languages. The
new navigation destinations and sitemap are included. Blog-generated output,
redirect configuration, consent settings, mail handler, vendor files and
analytics configuration are unchanged.

Two image provenance ledgers and fifteen original SEO JPEGs are relocated to
`tools/refresh/image-archives/`, protected by the existing tools deny rule.
All forty-eight optimized outputs and twenty-one original-source hashes match
the review records. The separate original checkout/archive remains untouched.

Verification before upload:

- All 56 desktop/mobile/language page contexts pass the isolated browser sweep.
- 2,350 source paragraphs checked: no missing approved paragraphs.
- 2,339 internal links checked: no broken links.
- Refresh generator check: zero drift; site audit: zero errors.
- Homepage portrait-tablet/desktop/mobile, About owner interactions and shared
  interactions pass in both languages using the same reviewed source snapshot.
- Release-only 440px portrait tests pass in both languages, including real-touch
  service-card swipes, keyboard/controls, exclusive cards and no-JS answers.
- Provenance gate and protected image-archive hash gate pass.

Build with `sh tools/build.sh`. Check with `python3 tools/build_site_refresh.py
--check`, `node tools/test_site_refresh.js`, `python3 tools/test_refresh_copy.py`,
`node tools/check_owner_image_archives.js` and the focused review test suites.
The CSS hash is `e5f4331c`, main JS `01c0284b`, i18n `54304f96`, vendor `748f32fb`.

Live publication is verified separately by GET-only byte/hash checks after
the fast-forward push to main. No forms, analytics or conversion events are
submitted. Do not run the historical SEO-only packager on this full release.
