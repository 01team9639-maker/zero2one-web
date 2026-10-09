# Local page review — 8 October 2026

Owner homepage revision, 8 October: restored the original three counters and
round consultation CTA, About layout, orange services design (nine cards),
split-column work slider and original footer. Approved source wording is retained.
The clients marquee now spans the viewport on orange; the closing section is
beige. Google Ads, consulting and mobile cards reuse existing artwork temporarily,
pending the owner's replacement images. These changes apply to both languages
and remain local.

Second homepage review: the differentiators section uses brand beige and the
original magnetic fill-hover buttons with service-card SVG arrows. Clients copy
is cream on orange, separated above by the original wave path. The visible pause
button is removed on the homepage only; the focusable marquee supports Space to
pause/resume, hover/focus holds, and a static reduced-motion layout.

Third owner review: remove the clients section's top border and overlap the wave
by one pixel to prevent seams. Shared CSS uses the exact service-card arrow path
for action icons and slide-fill hover on editorial/FAQ actions, while retaining
directional slider/navigation controls. FAQ plus markers are replaced by stateful
chevrons in the editorial, original SEO and older accordion components. No copy,
destinations, form handler or analytics configuration is changed.

Fourth homepage/navigation review: work uses orange with cream content and a
seam-free wave. Homepage blog cards are copied verbatim from the local blog index
(three Arabic cards; one available English card). FAQ consultation uses the
original magnetic/fill button; All FAQs is linked from both navigation surfaces.
Contact navigation resolves to the existing language-specific form page. Shared
navigation uses a chevron disclosure with reduced-motion-aware open animation.
RTL action arrows are mirrored with explicit pseudo-element selectors; existing
author-supplied arrow glyph in the work label remains in text but is visually
hidden to avoid a duplicate icon. Footer icon colors follow their label states.
Blog output files, forms, account settings and deployment remain untouched.

Latest owner review: sidebar Services is a direct link; desktop keeps its dropdown.
Desktop hamburger review: the floating toggle is hidden (including from Tab)
while the full navbar is visible, shown after its bottom leaves the viewport,
and remains available while the sidebar is open. At 1024px and below it remains
visible because the desktop links are hidden. Scroll state is read explicitly
from the current Barba container and reset on refresh/return to top. Local-only.
Language is last on both navigation surfaces. Homepage FAQ is orange with the
original beige-over-orange wave, cream questions and a beige consultation card.
Homepage blog is brand beige. Owner originals in Downloads/111 remain untouched;
optimized copies are under assets/images/owner-services-2026-10. Web, SEO and ads
images are assigned to their matching homepage cards. Four specialized SEO images
are imported but await placement confirmation. No service copy is invented.

This is an **unpublished** local implementation. Nothing here authorizes a push,
merge, deployment, workflow dispatch, GTM publication, or account change.

Evening homepage review: Team, All FAQs, Blog and closing CTAs now use the
same native outlined magnetic/fill button as the differentiators, including its
service-card SVG arrow and matching label/icon hover colors. Blog CTA is centered.
Footer Services is a direct link with cream/orange states, not a disclosure.
On small screens the consultation circle becomes a compact centered pill and
the differentiator actions wrap into centered rows. The wave cream path extends
outside the viewBox and has a cream overlap to prevent its top raster seam.
No source wording, destinations, hero, sliders or tracking code were changed.

Verification: `test_home_button_review.js` passes eight language/viewport cases
(English/Arabic at 1440, 440, 390 and 320px), including fractional-DPR wave pixel
checks, native button hover, footer link behavior and mobile centering/overflow.
Brand controls, homepage navigation and refresh interactions pass four cases each.
All 2,350 nonempty source paragraphs remain present; generator check and whitespace
check pass. Screenshots are retained in ignored `tools/reports/site-refresh/`.

9 October compact homepage review: service cards and homepage blog previews use
native horizontal overflow/snap with touch, logical RTL/LTR keyboard navigation
and previous/next controls. The compact media query covers phones up to 760px
and portrait tablets up to 1100px (including 1032px iPad Pro); desktop and larger
landscape layouts remain grids. A single English blog card is not duplicated to
simulate a carousel. Controls are hidden where no overflow exists.

The four white differentiator cards use native details/summary with chevrons;
only one can be open in the enhanced compact layout, with the first initially
open. Larger layouts restore all four answers and disable the summary controls.
Without JavaScript all answers are initially exposed. The orange card markup
is byte-identical to its previous version in both languages. No copy was changed.
Sliders use ResizeObserver, disconnected by the existing Barba cleanup, rather
than extra global resize handlers. The initial lifecycle check caught extra
resize handlers; they were replaced before delivery. Local only; no blog build,
form, Google account or tracking implementation was modified.

`node tools/test_home_compact.js` covers both languages across ten viewports,
real Chromium touch input, arrow/keyboard boundaries, exclusive details,
portrait/landscape switching, no overflow and the no-JS fallback. Device-width
emulation is not testing Safari on a physical iPad. Existing button/wave (8),
navigation (58), homepage navigation (4) and interaction (4) checks also pass.
The strict rolling-letter/lifecycle checks pass 8/8 after the observer change;
two Barba round trips also preserve a single working accordion and control set.

## Owner constraints

9 October service-photo delivery: the owner supplied six JPEGs in
`Downloads/service-images`. Homepage identity, social, ecommerce, consulting,
mobile and dedicated Google Ads cards now use their corresponding photographs
in both languages, replacing reused placeholders. Existing web/SEO/general-ads
photos are unchanged. No service-page hero or approved text was changed.
`prepare_remaining_service_images.js` produces 480/800/1440px WebP derivatives
without cropping or restyling; `remaining-provenance.json` records original and
output hashes. Originals stay unchanged in Downloads. Homepage uses lazy loading,
responsive srcset and explicit intrinsic dimensions. All 2,350 approved source
paragraphs remain present. `test_remaining_service_images.js` verifies original
hashes, card mapping and loading on desktop, portrait tablet and phone in both
languages. The pending-photo markers on homepage have been removed. Local only.

- Keep source documents and original assets. Do not delete or rewrite them.
- Keep approved wording verbatim, including author-supplied typos. Layout markers
  and bullet formatting are not visitor copy. Do not invent missing content.
- Email Marketing and CRO are explicitly excluded, including their home cards.
- Keep the original home hero, rolling wordmark, magnetic interactions and team
  slider. The homepage work section remains a horizontal card slider.
- Arabic and English are independently authored, not automatic translations.
- Each page is saved in its own local commit, grouping its Arabic/English pair.
  Shared source/build/UI dependencies are in a separate framework commit.
- Owner approval must name the page before any future publication.

## Provenance and preservation

The baseline commit `6c59b61` preserves the dirty work that existed at task start:
the SEO clients marquee and owner-supplied logos. All 71 staged files were compared
by SHA-256 against the pre-task archive before that commit was created.
The prior HEAD was `6efea1c5e4613beaaa5c6bb9930b66e226699f40`.

The original archive and raw Drive responses are outside this repository:

`/Users/mohammad/Documents/Codex/2026-09-06/id-x20/work/site-refresh-2026-10-07/`

- `pre-existing-source.tgz`: original local project snapshot, not a server backup.
- `pre-existing.patch`: original tracked, uncommitted changes.
- `sources/`: read-only source retrieval snapshots from the supplied spreadsheet
  and its 19 content documents. No Drive documents were edited.
- `pdf/`: review renders of the supplied 40-page design PDF.

The original PDF and all user files in Downloads/Desktop remain in place.

## Source of truth

- `content-sources.json`: verbatim Google Docs paragraphs and source URLs.
- `legacy-blocks.json`: preserved original navigation/footer, people,
  testimonials, existing FAQs and the approved logo marquee.
- `protected-design.json`: preserved original home hero and existing service
  headers. Reused with approved wording, not redesigned into a different hero.
- `case-shell.html.txt`: preserved original case-study shell. It deliberately
  does not inherit the new brand-identity service body.
- `copy-manifest.json`: exact expected text of generated `data-copy` nodes.
- `coverage.json`: rendered, metadata, structural, excluded and held paragraphs.
- `pending.json`: incomplete packages/projects and article destination decisions.

`tools/build_site_refresh.py` owns the home, service index, team, general FAQs,
eight updated/new service pages, and the small SEO/About additions. The original
SEO content builder is retained. Existing case-study content remains unchanged.
The old service FAQ draft files do not override new approved Docs content.

The new service routes are:

- `/services/manage-google-adwords-campaigns/`
- `/services/mobile-application/`
- `/services/marketing-consulting/`

Plus `/team/` and `/faqs/`, all with `/ar/` counterparts.
Existing service and case-study URLs are preserved; no redirects were changed.
Service metadata uses the supplied page-specific title/description. Home keeps
its original metadata. Long source titles/descriptions are reported, not silently
rewritten to satisfy a character-count heuristic.

## Local review

Run from the project root:

```sh
node tools/preview_refresh.js 8766
```

Open `http://127.0.0.1:8766/__review/`. Each card has both language links and its
most recent page commit. This server is loopback-only and sends `noindex` headers.
It does not run PHP. CSP blocks third-party tracking, and preview-only event
guards block forms and external contact links. These restrictions are injected
in responses only, not written into the production pages.

Production identifiers remain `GTM-MKHHFMFH` and `G-801242QR6K`. New pages inherit
the site's existing integration once. This is not a claim that events were
received in GA4, that conversions are correct, or that Google account settings
were audited. Browser tests isolate external measurement; do not replace them
with a plain static server that can pollute production analytics.

## Build and test (local only)

```sh
python3 tools/build_site_refresh.py
python3 tools/build_portfolio.py
python3 tools/build_case_studies.py
python3 tools/build_faq.py
python3 tools/build_ar.py
sh tools/build.sh
python3 tools/build_site_refresh.py --check
python3 tools/build_case_studies.py --check
python3 tools/test_refresh_copy.py
python3 tools/audit.py
python3 tools/check_portfolio.py
python3 tools/check_provenance.py
python3 tools/check_css_collisions.py
node tools/test_site_refresh.js
node tools/test_refresh_interactions.js
node tools/test_nav_a11y.js --out tools/reports/site-refresh/navigation.json
node tools/test_head_sync.js --out tools/reports/site-refresh/head-sync.json
node tools/test_scroll_letters.js --out tools/reports/site-refresh/scroll-letters.json
node tools/test_menu_viewports.js
node tools/test_dom.js
python3 tools/test_audit_alt.py
```

Browser evidence/screenshots live in ignored `tools/reports/site-refresh/`.
Copy completeness is checked source-to-output as well as DOM-to-manifest.
Normalizing whitespace or removing the editorial `[Button -> ...]` wrapper is
allowed; changing spelling, claims, answers or punctuation is not.

### About owner review — 2026-10-09 (local only)

The About page in both languages now has a compact orange, wave-topped counter
and consultation band. Existing metrics animate on entry; reduced-motion users
see their final values without animation. Six differentiators have numbered
orange badges in a centered responsive grid. Timeline cards reveal individually
on scroll, and the existing audience contact text becomes a native magnetic CTA
inside an orange card. Approved narrative text and destinations are unchanged.
The Team section is removed only from About; Home and the Team page remain.
The beige client marquee is full viewport width, removing the inset clipping
boundary; moving edge cards can naturally enter/leave at the viewport edges.

`node tools/test_about_owner.js` verifies both languages at 1440, 834, 390 and
320 CSS pixels, exact About prose against the pre-change commit, actual counter
intermediate values, every process reveal, centered cards, client viewport width,
local contact destinations, no horizontal overflow or uncaught errors, plus a
reduced-motion check. Screenshots are `about-*.png` in the ignored evidence
folder. Refresh interaction checks and scroll/navigation lifecycle checks also
pass. These are browser simulations, not real-device or screen-reader tests.

### About interaction correction — 2026-10-09 (local only)

Owner screenshots showed the legacy `.fade-in.animate` process parent at zero
opacity. Its resetting ScrollTrigger could conceal the entire timeline even
though individual step opacity tests passed. About now removes that parent
animation and uses one-shot viewport reveals with a short ordered stagger;
underlying content is visible without a hidden inline fallback. A document-life
set prevents replay on upward scrolling, responsive reflow, script
reinitialization and Barba revisits; a browser reload starts fresh. Reduced
motion shows the content without animation.

The six numbered value cards are native details/summary disclosures on phones
and portrait tablets up to 1100 CSS pixels, with chevrons, keyboard support and
one open card at a time (the active card can also close). Desktop/large landscape
layouts remain fully expanded. Approved headings and body copy are unchanged.
`test_about_owner.js` also covers 1032-pixel portrait iPad layout, actual step
animation creation/order, parent visibility, native wheel up/down, resize,
reinitialization, Barba return and fresh reload. The older target-only animation
assertion was insufficient for the reported ancestor visibility regression.

### Arabic SEO owner review — 2026-10-09 (local only)

Only `/ar/services/seo-riyadh/` has the `rf-seo-owner` scope. CTA text and native
service arrows inherit the same base/hover color. The owner's three Arabic
mockups are used as illustrative images, not evidence of rankings, endorsements,
ratings, business details or awards. The nine files from Downloads/2 4 replace
the service placeholder images, with responsive WebP copies and service-style
hover zoom. All 12 source images have hash-verified, unmodified archive copies
under `assets/images/seo/owner-review-2026-10/originals/`; this preserves clipboard
files beyond the temporary folder's lifetime.

The Know-Why and Process sections are orange with top waves; Know-Why has seven
numbered cards and a duplicate of the approved consultation CTA. Why-Zero2One
retains the existing dark background with top/bottom waves, six numbered beige
cards, bold titles and regular black text. The beige Audience section uses six
original inline line icons in an SF-like style, not Apple font assets. Process
cards use persistent sequential viewport reveals, with a longer, alternating
entry movement and no hidden/resetting parent. About and SEO reveal state keys
are isolated so navigation cannot consume another page's animation state.

Four package price blocks, the SEO Team section and the Clients section were
removed as explicitly requested. Other approved text, metadata, hero layout,
FAQ, form/measurement integration and original destinations are unchanged.
An existing duplicate paragraph corrupting the closing `html` tag was removed;
the identical approved sentence remains in its package card. The existing VAT
pricing note remains unchanged; no replacement pricing was invented.

`node tools/test_seo_owner.js` passes at 1440, 1032 portrait, 834, 390 and 320 CSS
pixels: exact DOM copy excluding only approved removals/the live clock, hero and
header copy, all images, numbering, icons, CTA base/hover colors, responsive
overflow, actual step animation order and persistence, uncaught errors, reduced
motion and original image hashes. Screenshots use `seo-owner-*.png` in the ignored
evidence folder. About and refresh interaction regression suites also pass.
Other pages, including English SEO, have dependency hash updates only; their
content/design is unchanged. No deployment or production measurement was sent.

The rolling-letter test now waits for Locomotive's original loader to actually
unlock input (`scroll.scroll.stop === false`) before sending wheel events. The
cursor becomes normal earlier. It verifies positive playback after downward input
and reversal after upward input; no uncaught errors are exempted. The failed
earlier result is retained as `scroll-before-readiness-fix.json`.

## Still awaiting content/owner review

1. Package headings were supplied without prices or deliverable matrices. No
   prices were invented; those sections retain a consultation link.
2. Third-project placeholders in web, ecommerce and Google Ads, and the mobile
   app technology placeholder are held, not published as facts.
3. The supplied `#1 in Google / Maps / ChatGPT` mock ranking labels are held on
   the existing SEO page. Generated mockups are not proof of an actual ranking,
   rating, address, endorsement or award.
4. Performance/retention/client-count claims in approved copy are preserved for
   local review, **not independently substantiated**. Obtain evidence and owner
   approval before publication. This includes the source's 95% retention and
   existing testimonials/client logos.
5. No approved separate Mission/Values/Experience copy was supplied for About.
   Its existing narrative is kept, visually separated; no invented facts added.
6. The Arabic consulting CTA links to the existing exact-title marketing strategy
   article. Its English counterpart was not found; that CTA currently opens the
   English blog index, recorded in `pending.json` for approval or a supplied URL.
7. Source typos, including `sEvery Great Journey Starts With One Step`, remain
   unchanged. Corrections require the owner's approved replacement text.
8. PHP/contact-mail delivery, real device/screen-reader testing, Search Console
   indexing, and received GA4/Ads conversions were not tested by this task.
9. Blog generated files and its repository were not changed. Shared asset hash
   synchronization needs a separately approved blog release later.

## Publication gate — important for page-by-page approval

The local branch contains **all** proposed pages for review. Never push/merge the
whole branch merely because the owner approves one page. `main` may auto-deploy.

For an approved page, prepare a separate release scope from the currently deployed
revision, including only that page's local commit and explicitly reviewed shared
dependencies. Test that scope again. A local page commit is a review unit, not a
standalone deployable package: it relies on shared CSS/JS, source snapshots and
sometimes new internal-link destinations.

In particular, the new service dropdown and homepage/FAQ/team links can point to
new, not-yet-published pages. Before publishing one page, either obtain approval
for those destinations or prepare a reviewed navigation/link subset using only
already-live/approved routes. Never silently publish the other pages to satisfy
those links. Include only approved routes in the publication sitemap.

Do not run the full refresh generator on a partial-release branch unless every
generated page in its diff is explicitly in the approved scope. No deployment
commands are part of this document. No destructive rollback/reset is required:
the original branch, source archive and local commits remain available.
