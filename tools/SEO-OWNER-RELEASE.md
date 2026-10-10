# Scoped SEO owner release — 2026-10-10

This release is based on the existing published main revision
`3b068b8f81c6e62f362977b508f6cc96422a4185`, not the full local design-review branch.
The owner requested completion and upload on 2026-10-10.

## Scope

- Arabic and English `/services/seo-riyadh/` only: matching owner images,
  shadows and motion, native brand CTA arrows with matching hover colors,
  clipped wave dividers, numbered cards, orange process/Know Why sections,
  cream cards on the dark Why section, audience icons, removed prices/team/clients.
- Phones and portrait tablets up to 1100 CSS pixels: two native horizontal
  swipe tracks and four independent single-open disclosure groups. Collapsed
  packages retain their name, Details affordance and request CTA; one expansion
  shows all included features. No-JS copy remains visible and native details work.
- Thirty optimized owner images, with output hashes and original-image hashes
  in `assets/images/seo/owner-review-2026-10/release-provenance.json`.
  Unmodified source originals remain in the separate local review archive;
  this release does not upload private local paths or extra original-image copies.
- New page-scoped stylesheet/module, loaded only for `main.rf-seo-owner`.
  Every style selector is scope-validated. Barba navigation loads and cleans up
  enhancements; late asset loads cannot initialize an outgoing page.
- A small guarded loader and SEO navbar fix in the existing site script.
  Legacy navbar behavior is retained unchanged outside SEO. Thirty-six existing
  non-SEO pages receive only its necessary cache-hash update.

The shared CSS bundle, other page content/design, blog output, sitemap,
redirects, mail handler, account settings and tracking configuration are unchanged.
The full local review branch is deliberately not merged or pushed.

The reviewed SEO dropdown links only to existing published service pages.
Three not-yet-published service destinations are excluded from this release.
The FAQ navigation uses the current SEO page's existing `#faq` section until
the separate full FAQ page is approved. Its local proposed navigation is preserved.

## Rebuild and verification

Install the repository's locked dev dependencies, then:

```sh
node tools/build_seo_release_dependencies.js
python3 tools/stamp_assets.py
node tools/build_seo_release_dependencies.js --check
node tools/test_seo_owner_release.js
node tools/test_seo_release_manifest.js
node tools/test_seo_release_navigation.js
python3 tools/check_links.py --internal-only
python3 tools/check_provenance.py
python3 tools/audit.py
```

`prepare_seo_owner_release.js` is an explicit mechanical packager accepting a
separate approved review checkout. Do not run a full refresh generator here.
Tests use local HTTP and block external traffic, including production analytics
and messaging. Live publication must be checked separately after pushing main;
a Git push alone is not evidence that hosting has deployed it.

## Verified release candidate

- Bilingual browser suite: all twelve viewport/language combinations passed,
  plus reduced-motion and native no-JS details checks in both languages.
- All thirty optimized assets match the approved provenance hashes.
- Legacy home → SEO → home round trips passed in both languages, including
  delayed module loading, listener/observer cleanup, unchanged legacy computed
  styles, and persistent process reveals until refresh.
- Internal link check and provenance audit passed; site audit reported zero
  errors (two existing warnings). The rebuilt dependency hashes are
  CSS `b973beff`, SEO module `26726b99`, and main loader `b21e8b42`.
