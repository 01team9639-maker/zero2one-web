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

This is an **unpublished** local implementation. Nothing here authorizes a push,
merge, deployment, workflow dispatch, GTM publication, or account change.

## Owner constraints

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
