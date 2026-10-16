# Scoped SEO package publication - 2026-10-16

Based on `ee52903c99b4ea1c88e37cf312b9b3fc0ae9684f`, including the previous
official blog chrome rebuild. Only the bilingual SEO package cards and matching
structured offers are replaced by Standard / Professional / Enterprise from the
owner's one-page PDF. All 75 service values and three audiences are retained.
No prices or contract/billing terms are supplied; hidden legacy prices and the
superseded commercial note are removed.

The cards are initially closed native disclosures, independently operable at all
sizes, with the approved chevron and an always-available WhatsApp request button.
The RTL/LTR rail remains swipeable and follows visible-card height on compact
screens. The confirmed SEO profile remains verbatim in an HTML comment, not a
live hidden section or a deleted source block.

Only the package-specific editorial event handlers and SEO-only CSS rules are
added to published dependencies. The existing form, consent, portfolio, nav,
global footer, all other services and shared CSS bundle stay unchanged. The
broader local service-studio redesign is explicitly excluded.

Verify with `node tools/test_seo_packages_release.js`,
`node tools/test_seo_packages.js` and the release navigation check. All browser
traffic is isolated from analytics/contact endpoints. Generated blog files must
be synchronized only by their owning workflow, with the published content
revision pinned; do not copy the dirty review's stale blog output.
