# ZERO 2 ONE — Audit & SEO toolkit

Small, dependency-light scripts that check and maintain the site's SEO / code
health. Pure **Python 3 standard library**, except `optimize_images.py` which
uses **Pillow**.

Run everything from the **project root**:

```bash
python3 tools/audit.py           # SEO / code audit
python3 tools/geo_audit.py       # GEO / AEO / AI-Overviews readiness
python3 tools/check_links.py     # broken-link report
python3 tools/check_robots.py    # robots.txt validator
python3 tools/generate_sitemap.py
python3 tools/optimize_images.py --png
```

**Audit — read only**

| Script | Purpose |
|--------|---------|
| [`audit.py`](audit.py) | Classic on-page SEO / code health (titles, meta, alt, headings, internal links, duplicate content) |
| [`geo_audit.py`](geo_audit.py) | **GEO / AEO / AIO** — structured data, FAQ, entity/NAP, AI-crawler access, llms.txt |
| [`check_links.py`](check_links.py) | Internal + external link checker (404 / redirect / blocked) |
| [`check_robots.py`](check_robots.py) | robots.txt mistakes that hurt SEO |
| [`check_css_collisions.py`](check_css_collisions.py) | Classes we author that the purchased template already defines — the silent layout-wrecker that made the contact submit button render 0px wide |
| [`check_provenance.py`](check_provenance.py) | Artefacts belonging to somebody else — the previous project's domain / phone / Google Maps listing, third-party form endpoints, personal names. Also fails any Maps link that asserts a specific business listing unless it is vouched for in `ALLOWED_MAPS`. Runs first in the `deploy.sh` pre-flight |
| [`verify_deploy.py`](verify_deploy.py) | **Run after every upload.** Checks the *live* site: are the retired URLs still 301ing, did `.htaccess` actually upload, is every sitemap URL reachable with a self-referencing canonical |
| [`test_send.sh`](test_send.sh) | 22-case test suite for `send.php` — validation, `<select>` whitelist, header injection, honeypot, CSRF, rate limiting, UTF-8 mail composition. Uses local `php`, or Docker if there is none |

**Build — these write files**

| Script | Writes |
|--------|--------|
| [`build_ar.py`](build_ar.py) | The whole `/ar/` tree, from the English pages + [`ar-dictionary.json`](ar-dictionary.json) |
| [`build_redirects.py`](build_redirects.py) | The `.htaccess` redirect block, `_redirects`, and the fallback stubs under `pages/` — all from [`redirects.json`](redirects.json) |
| [`build_form.py`](build_form.py) | `send.php`'s `<select>` whitelist, read out of the real `<option value>`s in both contact pages |
| [`generate_sitemap.py`](generate_sitemap.py) | `sitemap.xml` (English + Arabic, with hreflang alternates) |
| [`optimize_images.py`](optimize_images.py) | WebP generation + PNG optimization (CDN prep) |
| [`build.sh`](build.sh) | The minified CSS/JS bundles |
| [`deploy.sh`](deploy.sh) | Nothing locally — uploads the site (dotfiles included) and then runs `verify_deploy.py` |

Every script exits non-zero when it finds real problems, so they double as CI
gates. `build_ar.py --check`, `build_redirects.py --check` and
`generate_sitemap.py --check` validate without writing.

### Order of operations after a content change

```bash
# 1. edit the English page
python3 tools/build_ar.py             # mirror it into /ar/
python3 tools/generate_sitemap.py     # refresh the sitemap
sh      tools/build.sh                # rebuild the CSS/JS bundles (if those changed)
python3 tools/build_form.py           # re-sync the form whitelist (if the form changed)
python3 tools/audit.py                # 0 errors expected
sh      tools/test_send.sh            # only if send.php or the form changed
sh      tools/deploy.sh --live        # upload + verify
```

---

## `audit.py` — SEO / code audit

Scans every page (both language trees; the generated redirect stubs under
`pages/` are skipped) and reports, per severity:

| Check | Level |
|-------|-------|
| Missing `<title>` / meta description | ERROR |
| Duplicate `<title>` / description across pages | ERROR |
| `<img>` with **no** `alt` attribute | ERROR |
| Missing content `<h1>` | ERROR |
| Broken **internal** link (href/src not on disk) | ERROR |
| Title/description length out of range | WARN |
| Multiple `<h1>` / skipped heading level (H2→H4…) | WARN |
| Missing `<html lang>` / canonical | WARN |
| Near-duplicate page **content** (chrome excluded) | WARN |
| `<img alt="">` (decorative — usually fine) | INFO |

It is **chrome-aware**: headings/text inside the loading screen, side menu, top
nav and footer are ignored so the report reflects real content — and it skips
the `<title>` elements inside inline SVG icons.

```bash
python3 tools/audit.py          # human report
python3 tools/audit.py --json   # machine-readable
```

Exit code = number of ERRORs.

---

## `geo_audit.py` — GEO / AEO / AIO readiness

**GEO** (Generative Engine Optimization) and **AEO / AIO** (Answer Engine
Optimization / Google *AI Overviews*) are about being **understood and quoted**
by AI engines — ChatGPT, Claude, Perplexity, Gemini, Copilot, Google AI
Overviews — not just ranked. This script checks the signals that matter:

| Check | Level |
|-------|-------|
| JSON-LD structured data present + valid | FAIL if missing/invalid |
| Organization entity clarity — name / phone / email / address (NAP) + `sameAs` | FAIL / IMPROVE |
| **FAQPage** schema + visible Q&A (direct answers → AI Overviews) | IMPROVE |
| **BreadcrumbList** on inner pages (context for engines) | IMPROVE |
| Answer-shaped meta description, single `<h1>`, enough extractable text | IMPROVE |
| robots.txt **welcomes AI crawlers** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…) | FAIL if blocked / PASS if welcomed |
| **llms.txt** present (emerging GEO standard) | IMPROVE / PASS |
| sitemap.xml present | IMPROVE |

```bash
python3 tools/geo_audit.py
python3 tools/geo_audit.py --json
```

Verdict is **EXCELLENT** when there are 0 FAIL and 0 IMPROVE. Exit code = number
of FAILs.

**What backs the current "EXCELLENT":** `@graph` of `ProfessionalService`
(+ `OfferCatalog` of all 6 services, NAP, `sameAs`) and `WebSite` on the home
page; `FAQPage` + a visible FAQ section; `Service` + `BreadcrumbList` on each
service page; `robots.txt` with explicit AI-crawler groups; and a root
[`llms.txt`](../llms.txt).

---

## `check_links.py` — link checker

Extracts every `href`/`src` and verifies:

- **internal** links resolve to a file/dir on disk,
- in-page **`#anchors`** exist on the target page,
- **external** `http(s)` links return a live status.

Statuses: `OK`, `REDIRECT` (3xx, shows `Location`), `BROKEN` (4xx/5xx),
`BLOCKED` (bot-protection/rate-limit, e.g. LinkedIn `999` — the link is fine for
real browsers), `UNREACHABLE` (DNS/TLS/timeout — e.g. a domain not deployed yet),
`SKIPPED`. `preconnect`/`dns-prefetch` hints are not treated as links.

```bash
python3 tools/check_links.py                 # internal + external (needs network)
python3 tools/check_links.py --internal-only # no network calls
python3 tools/check_links.py --json
```

Exit code = number of **BROKEN** links (BLOCKED/UNREACHABLE don't count).

---

## `check_robots.py` — robots.txt validator

Flags the mistakes that actually hurt SEO:

- **ERROR** `Disallow: /` under `User-agent: *` (blocks the whole site),
- **WARN** no `Sitemap:` directive, or a non-absolute sitemap URL,
- **INFO** unknown/blank directive lines.

```bash
python3 tools/check_robots.py
```

Exit code = number of ERRORs.

---

## `generate_sitemap.py` — sitemap generator + validator

Scans the HTML pages and (re)writes `sitemap.xml` (with `lastmod` from file
mtime), then validates the XML is well-formed.

```bash
python3 tools/generate_sitemap.py                       # default base https://zero2one.sa
python3 tools/generate_sitemap.py --base https://your-domain.com
python3 tools/generate_sitemap.py --check               # validate only, don't rewrite
ZERO2ONE_BASE=https://your-domain.com python3 tools/generate_sitemap.py
```

**Update the base URL to the real domain before launch.**

---

## `optimize_images.py` — image optimizer / CDN prep

Generates a **WebP** copy next to every PNG/JPG in `assets/images/`
(non-destructive) and, with `--png`, losslessly re-saves the PNGs.

```bash
python3 tools/optimize_images.py               # generate .webp siblings
python3 tools/optimize_images.py --png         # + lossless PNG re-save
python3 tools/optimize_images.py --max-width 1920   # also downscale wide sources
python3 tools/optimize_images.py --dry-run     # preview savings, write nothing
```

Last run: **26.28 MB → 2.20 MB of WebP (~92 % smaller).** See the *Images & CDN*
section of the root [`README.md`](../README.md) for how to serve them.

---

## Suggested pre-launch / recurring run

```bash
python3 tools/audit.py \
  && python3 tools/geo_audit.py \
  && python3 tools/check_robots.py \
  && python3 tools/generate_sitemap.py \
  && python3 tools/check_links.py
```

Wire this into a git pre-push hook or CI job for a weekly health check
(e.g. broken-link monitoring). `tools/reports/` is git-ignored if you want to
save output there.
