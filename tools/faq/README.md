# Service-page FAQs — where to edit

Each of the six service pages gets its FAQ section from **one file per service, one place to edit**:

| Service | English page | Arabic page | Edit this file |
|---|---|---|---|
| SEO | `/services/seo-riyadh/` | `/ar/services/seo-riyadh/` | `tools/faq/seo-riyadh.json` |
| Website design & development | `/services/web-design-riyadh/` | `/ar/services/web-design-riyadh/` | `tools/faq/web-design-riyadh.json` |
| Advertising campaign management | `/services/digital-advertising/` | `/ar/services/digital-advertising/` | `tools/faq/digital-advertising.json` |
| Brand identity | `/services/brand-identity/` | `/ar/services/brand-identity/` | `tools/faq/brand-identity.json` |
| Social media management | `/services/social-media-management/` | `/ar/services/social-media-management/` | `tools/faq/social-media-management.json` |
| E-commerce & custom systems | `/services/ecommerce-development/` | `/ar/services/ecommerce-development/` | `tools/faq/ecommerce-development.json` |

Both languages live side by side in the same record (`en` and `ar`), each written independently — the Arabic is never
machine-derived from the English.

## What a record looks like

```json
{
  "id": "seo-1",
  "status": "approved",
  "source": "where the owner's wording came from",
  "en": { "q": "Question?", "a": ["First paragraph.", "Second paragraph (optional)."] },
  "ar": { "q": "السؤال؟",   "a": ["الفقرة الأولى.", "الفقرة الثانية (اختيارية)."] }
}
```

* `a` is a **list of paragraphs**. English and Arabic must have the same number of paragraphs.
* Text is written exactly as it should appear — the build does not rewrite, shorten or correct it.
* `heading` (top of the file) is the section title; it has its own `status`.

## Status — what reaches the website

| `status` | Meaning | On the real page? |
|---|---|---|
| `approved` | supplied or approved by the owner, word for word | **yes** |
| `draft` | a proposal written from what the service page already documents | **no** — local review preview only |
| `needs-owner-input` | a question the site cannot answer yet (`needs` says what is missing); **no answer is invented** | **no** — local review preview only |

A service with no `approved` item has **no FAQ section at all**. To publish a draft: read it, edit it if needed, and change
its `status` to `approved` — only then it is rendered. Never change a draft's status without the owner's approval.

## Build

```sh
python3 tools/build_faq.py            # writes the English pages (approved items only)
python3 tools/build_ar.py             # regenerates /ar/ from them, taking the Arabic from the same files
sh      tools/build.sh                # only if CSS/JS changed
python3 tools/build_faq.py --check    # exit 1 if a page is out of date with its JSON
python3 tools/build_faq.py --preview /some/folder   # EN+AR pages WITH drafts, for the local review only
```

If a FAQ record never reaches its page (a typo in the file, or the page markers moved), `build_ar.py --missing` exits
non-zero and names the entry. The FAQ block on each page sits between `<!-- FAQ:BEGIN <service> … -->` and
`<!-- FAQ:END <service> -->`: do not edit it by hand, the next build replaces it.

## Structured data

No `FAQPage` JSON-LD is generated here and none is added to the service pages. If it is ever wanted, it must be built
from `approved` items only, so it can never contradict what is visible.
