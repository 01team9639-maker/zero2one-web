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

| Script | Purpose |
|--------|---------|
| [`audit.py`](audit.py) | Classic on-page SEO / code health (titles, meta, alt, headings, internal links, duplicate content) |
| [`geo_audit.py`](geo_audit.py) | **GEO / AEO / AIO** — structured data, FAQ, entity/NAP, AI-crawler access, llms.txt |
| [`check_links.py`](check_links.py) | Internal + external link checker (404 / redirect / blocked) |
| [`check_robots.py`](check_robots.py) | robots.txt mistakes that hurt SEO |
| [`generate_sitemap.py`](generate_sitemap.py) | (Re)build + validate `sitemap.xml` |
| [`optimize_images.py`](optimize_images.py) | WebP generation + PNG optimization (CDN prep) |

Every script exits non-zero when it finds real problems, so they double as CI
gates. Nothing writes to the site except `generate_sitemap.py` (writes
`sitemap.xml`) and `optimize_images.py` (writes `.webp` / re-saves PNGs).

---

## `audit.py` — SEO / code audit

Scans every page (`index.html` + `pages/**/*.html`) and reports, per severity:

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
