# SEO Studio release — 2026-10-13

The owner requested publication of the complete reviewed SEO page in both
languages, including the latest compact audience swipe rail and permanently
expanded pricing cards. This release is based on the verified published
`2e183cfb087f8b466885b212e5dd2ebe400f4217` revision.

Only the two SEO pages change content/design. Their page-scoped stylesheet,
47 optimized supplied illustrations/phone images and 23 free normalized Iconly
icons are included. Original images, raw icon archives and private provenance
paths remain in the untouched local review checkout, not the hosting tree.

The shared behavior update is limited to the existing editorial enhancement
boundary and two SEO initializer calls. Legacy contact/form, consent, tracking,
portfolio, header behavior and all other initializers remain byte-identical.
Unapproved brand implementation is explicitly excluded. Shared CSS changes only
declare the approved palette variables; all Studio/Iconly visual rules are
gated by the SEO container. Other published HTML receives only dependency hashes.
Blog-generated output, redirects, form handler and sitemap remain unchanged.

`tools/prepare_seo_studio_release.js` prepares this boundary once from a clean
published checkout; it does not run the historical SEO owner packager. Build
with `sh tools/build.sh`. The reviewed browser suite can validate this separate
release with `SEO_STUDIO_REVIEW_ROOT` pointing to the local original-image
archive checkout. `tools/test_seo_studio_release.js` verifies isolation and
home/SEO/home transitions without production measurement or messaging.

The protected release ledger records the baseline, independent non-SEO markup
hashes, public asset hashes and reviewed source hashes. Publication is a normal
fast-forward to main; success must be confirmed with live GET/hash verification,
not inferred from the push alone.
