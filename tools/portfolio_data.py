#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZERO 2 ONE — the portfolio's single source of truth
===================================================

Three generators read this file and nothing else:

  * `tools/build_case_studies.py`  → `/work/<slug>/index.html`
  * `tools/build_portfolio.py`     → `/work/index.html` only
  * `tools/build_ar.py`            → every Arabic counterpart, via CASE_SLUGS

Put a project here once and all three follow. Edit a generated HTML file
instead and the next build erases you.

Two structures
--------------
`ITEMS`  every portfolio entry — what the portfolio listing shows.
`CASES`  the long-form copy for entries that have their own page.

An entry with `"case": True` must have a matching key in `CASES`, and its slug
must be in `tools/build_ar.py`'s `CASE_SLUGS` with an `AR_META` entry. The
generators check all of that, so a half-registered project fails the build
rather than shipping a page with an English title in the Arabic tree.

Writing the numbers
-------------------
Every figure here traces to `tools/PORTFOLIO_EVIDENCE.md`, which records the
source page, the screenshot, the readable value and — where the portfolio PDF's
prose contradicts its own dashboard — which of the two we publish. Read it
before changing a metric. Three traps it documents, all of them live:

  * Al Hokail's average position went 9.8 → 12.7. Lower is better, so that is a
    decline, and the source's "reached the first page" line is not published.
  * `Conv. value / cost` is the platform's reported conversion value over ad
    spend. It is not net profit, and the conversion counts are fractional.
  * A percentage increase from a zero baseline is undefined. "0 → 200 daily
    clicks" is not "+200%" and is not published as either.

Fields
------
    slug          URL segment under /work/ when `case` is True, else an id
    categories    keys from CATEGORIES; an item may hold several
    kind          "case-study" | "creative-sample" | "evidence-sample"
    card          "media" or "metric": content classification; listing appearance is uniform
    span          legacy layout metadata; ignored by the uniform gallery
    featured      legacy selection metadata; does not modify the restored homepage
    tag           the service label above the title
    title         client name, or a descriptive anonymous title
    summary       one source-supported sentence
    facts         (label, value) source metadata retained for project content
    metrics       (label, before, after) — before may be None for a single period
    cover         dict(src, w, h, alt, fit)  — fit is "cover" or "contain"
    gallery       [dict(src, w, h, alt, caption)] for the evidence viewer
    case          True when /work/<slug>/ exists
    note          internal, never rendered
"""

# ---------------------------------------------------------------- categories
# "all" is computed, not stored. A category with no items is dropped by the
# generator rather than rendered as an empty filter — and `video` is absent on
# purpose: the source's video library is a Google Drive folder whose file names
# were read and whose contents were not. See PORTFOLIO_EVIDENCE.md §9.
CATEGORIES = [
    ("branding", "Brand identity"),
    ("seo", "SEO"),
    ("advertising", "Advertising"),
    ("creative", "Creative content"),
]

VIDEO_LIBRARY_URL = (
    "https://drive.google.com/drive/folders/1l61NlprCkjjo-6_HQl4VeFkby4hLKRZi"
)

WHATSAPP_URL = "https://wa.me/966530307054"


def _img(src, w, h, alt, fit="cover"):
    return {"src": src, "w": w, "h": h, "alt": alt, "fit": fit}


# -------------------------------------------------------------------- items
ITEMS = [
    # ===================================================== brand identity ===
    {
        "slug": "habba",
        "span": 8,
        "categories": ["branding"],
        "kind": "case-study",
        "card": "media",
        "featured": 1,
        "tag": "Brand Identity",
        "title": "HABBA",
        "summary": ("A specialty coffee roastery and caf&eacute; given one identity that holds "
                    "together on a cup, a menu, a uniform and a shopfront."),
        "facts": [("Sector", "Specialty Coffee"), ("Scope", "Logo System &amp; Applications")],
        "cover": _img("habba-01-brand-hero", 2000, 1415,
                      "HABBA specialty coffee brand identity and primary logo"),
        "case": True,
    },
    {
        "slug": "makan-mem-logo",
        "span": 4,
        "categories": ["branding", "creative"],
        "kind": "creative-sample",
        "card": "media",
        # المختارة الرابعة. الموجز يطلب عيّنة إبداعية واضحة النسبة هنا،
        # ولا يقبل بديلها إلا إن قصرت أصولها — وهذه وحدها من عيّنات
        # الصفحتين 13-14 أصلها حقيقي 1600×1600 لا تكبيرٌ لـ398×398،
        # فتملأ عمودًا بعرض 660 بكسل بلا ادّعاء حدّة ليست فيها.
        "featured": 4,
        "tag": "Logo Design",
        "title": "Makan Mem General Est.",
        "summary": "A monogram built from the Arabic letters of the name, inside a contracting mark.",
        "facts": [],
        "cover": _img("work/makan-mem-logo", 1200, 1200,
                      "Makan Mem General Est. logo on a printed sheet", fit="contain"),
        "gallery": [
            {"src": "work/makan-mem-logo", "w": 1200, "h": 1200,
             "alt": "Makan Mem General Est. logo on a printed sheet",
             "caption": "Makan Mem General Est. — logo design"},
        ],
        "case": False,
    },

    # ================================================================ SEO ===
    {
        "slug": "alostaz-seo",
        "span": 6,
        "categories": ["seo"],
        "kind": "case-study",
        "card": "metric",
        "featured": 2,
        "tag": "SEO",
        "title": "Alostaz.io",
        "summary": ("A Saudi software platform. Search Console recorded clicks rising across two "
                    "consecutive six-month windows."),
        "facts": [("Market", "Saudi Arabia"), ("Sector", "Software as a Service")],
        "metrics": [("Clicks", "3.21K", "28.3K")],
        "metric_note": "Google Search Console &mdash; last 6 months vs previous 6 months",
        "cover": _img("work/alostaz-search-console", 717, 255,
                      "Alostaz.io Search Console comparison of clicks, impressions and average position",
                      fit="contain"),
        "case": True,
    },
    {
        "slug": "cosmetic-surgery-egypt-seo",
        "span": 6,
        "categories": ["seo"],
        "kind": "case-study",
        "card": "metric",
        "featured": None,
        "tag": "SEO",
        "title": "A Cosmetic Surgery Centre",
        "summary": ("Organic search built from nothing for a clinic in Egypt. The dashboard covers "
                    "roughly eleven months."),
        "facts": [("Market", "Egypt"), ("Sector", "Cosmetic Surgery")],
        "metrics": [("Clicks", None, "29K"), ("Impressions", None, "1.36M")],
        "metric_note": "Google Search Console &mdash; totals for 9 Aug 2023 to 2 Jul 2024",
        "cover": _img("work/cosmetic-surgery-egypt-search-console", 781, 286,
                      "Search Console totals for a cosmetic surgery centre in Egypt",
                      fit="contain"),
        "case": True,
        "note": "Anonymous by source: the PDF names no client, only the sector and market.",
    },
    {
        "slug": "orthopedic-clinic-egypt-seo",
        "span": 6,
        "categories": ["seo"],
        "kind": "case-study",
        "card": "metric",
        "featured": None,
        "tag": "SEO",
        "title": "An Orthopedic Clinic",
        "summary": ("Keyword research, content and on- and off-page work for a clinic in Egypt, "
                    "measured over roughly twelve months."),
        "facts": [("Market", "Egypt"), ("Sector", "Orthopedics")],
        "metrics": [("Clicks", None, "110K"), ("Impressions", None, "3.81M")],
        "metric_note": "Google Search Console &mdash; totals for 9 Aug 2023 to 3 Aug 2024",
        "cover": _img("work/orthopedic-clinic-egypt-search-console", 716, 261,
                      "Search Console totals for an orthopedic clinic in Egypt",
                      fit="contain"),
        "case": True,
        "note": "Anonymous by source: the PDF names no client, only the sector and market.",
    },
    {
        "slug": "alhokail-seo",
        "span": 6,
        "categories": ["seo"],
        "kind": "case-study",
        "card": "metric",
        "featured": None,
        "tag": "SEO",
        "title": "Al Hokail Medical Group",
        "summary": ("Content, structured data and on- and off-page work, compared across two "
                    "three-month windows."),
        "facts": [("Market", "Saudi Arabia"), ("Sector", "Healthcare")],
        "metrics": [("Clicks", "14.1K", "38.2K"), ("Impressions", "566K", "1.67M")],
        "metric_note": "Google Search Console &mdash; last 3 months vs previous 3 months",
        "cover": _img("work/alhokail-search-console", 727, 289,
                      "Al Hokail Search Console comparison of clicks and impressions",
                      fit="contain"),
        "case": True,
        "note": "Average position went 9.8 to 12.7 — a decline. No ranking claim anywhere.",
    },

    # ======================================================== advertising ===
    {
        "slug": "google-ads-conversion-value",
        "span": 6,
        "categories": ["advertising"],
        "kind": "case-study",
        "card": "metric",
        "featured": 3,
        "tag": "Google Ads",
        "title": "A Google Ads Account, Rebuilt",
        "summary": ("Two monthly snapshots of the same account, before and after the campaigns "
                    "were rebuilt around the products that actually earn."),
        "facts": [("Market", "Saudi Arabia"), ("Platform", "Google Ads")],
        "metrics": [("Conversion value / cost", "0.54&times;", "3.60&times;")],
        "metric_note": "Reported conversion value divided by ad cost &mdash; April vs August 2026",
        "cover": _img("work/google-ads-conversion-value-after", 1136, 275,
                      "Google Ads dashboard showing conversion value over cost of 3.60",
                      fit="contain"),
        "case": True,
    },
    {
        "slug": "alrahwanji-paints",
        "span": 6,
        "categories": ["advertising"],
        "kind": "case-study",
        # بطاقة أرقام لا صورة: أصول هذا المشروع كلّها وثائق ولوحات قياس،
        # ولا صورة إبداعية فيه. وضع جدول ملخّص عربيّ غلافاً بعرض 600 بكسل
        # يعطي مستطيلاً لا يُقرأ ويوحي بأننا نملك صورةً ولا نملكها.
        "card": "metric",
        "featured": None,
        "tag": "Campaign Management",
        "title": "Alrahwanji Paints",
        "summary": ("A paints brand in Ajman moved from unstructured promotion to measured "
                    "advertising on Facebook and Instagram."),
        "facts": [("Market", "Ajman, UAE"), ("Sector", "Paints &amp; Coatings")],
        # الرقمان من لقطة واحدة هي غلاف البطاقة نفسه. لقطة «نظرة عامة على
        # الأداء» تعرض 295 ولا تعرض 5,921، فوضعُها خلف الرقمين كان سيجعل
        # نصف البطاقة بلا سند في الصورة التي تحتها.
        "metrics": [("Facebook Reels", None, "5,921"),
                    ("Mobile app feed", None, "1,436")],
        "metric_note": "Meta Ads Manager &mdash; reported delivery by placement",
        "cover": _img("alrahwanji-05-placement-results", 1138, 709,
                      "Alrahwanji Paints campaign delivery broken down by Facebook placement",
                      fit="contain"),
        "case": True,
    },
    {
        "slug": "kuwait-tutoring-instagram-ads",
        "span": 6,
        "categories": ["advertising"],
        "kind": "case-study",
        "card": "metric",
        "featured": None,
        "tag": "Instagram Ads",
        "title": "A Tutoring Centre",
        "summary": ("Messaging campaigns run on Instagram alone for an educational centre in Kuwait."),
        "facts": [("Market", "Kuwait"), ("Platform", "Instagram")],
        "metrics": [("Conversations", None, "267"), ("Cost per conversation", None, "$5.05")],
        "metric_note": "Meta Ads Manager &mdash; one campaign, cost per messaging conversation",
        "cover": _img("work/kuwait-tutoring-campaign-results", 762, 108,
                      "Meta Ads Manager row showing 267 messaging conversations at $5.05 each",
                      fit="contain"),
        "case": True,
        "note": "Anonymous by source: the PDF names no client, only the sector and market.",
    },
    {
        "slug": "riyadh-curtains-google-ads",
        "span": 12,
        "categories": ["advertising"],
        "kind": "evidence-sample",
        "card": "metric",
        "featured": None,
        "tag": "Google Ads",
        "title": "Curtain Retailers in Riyadh",
        "summary": ("Two separate advertising accounts in the same trade. Their reporting windows "
                    "overlap rather than follow each other, so they are shown side by side and "
                    "not as a before and after."),
        "facts": [("Market", "Riyadh"), ("Platform", "Google Ads")],
        "metrics": [("Clicks", "663", "935"), ("Conversions", "30.00", "147.00")],
        "metric_note": "Two accounts &mdash; 30 Jan to 26 Feb 2026, and 1 to 28 Feb 2026",
        "cover": _img("work/riyadh-curtains-campaign-a", 565, 196,
                      "Google Ads dashboard for a curtain retailer showing 663 clicks",
                      fit="contain"),
        "gallery": [
            {"src": "work/riyadh-curtains-campaign-a", "w": 565, "h": 196,
             "alt": "Google Ads dashboard showing 663 clicks and 30.00 conversions",
             "caption": "Account one &mdash; 30 January to 26 February 2026. "
                        "663 clicks, 30.00 conversions, average CPC SAR 7.21, cost SAR 4.78K."},
            {"src": "work/riyadh-curtains-campaign-b", "w": 409, "h": 112,
             "alt": "Google Ads dashboard showing 935 clicks and 147.00 conversions",
             "caption": "Account two &mdash; 1 to 28 February 2026. "
                        "935 clicks, 147.00 conversions, average CPC SAR 6.07, "
                        "cost per conversion SAR 38.60."},
        ],
        "case": False,
        "note": "Deliberately no combined KPI. Different accounts, overlapping windows.",
    },

    # ==================================================== creative content ===
    {
        "slug": "barbarees-post-pregnancy-ad",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Social Creative",
        "title": "Barbarees",
        "summary": "A post-pregnancy body treatment campaign built on a mirror and one line of copy.",
        "facts": [],
        "cover": _img("work/barbarees-post-pregnancy-ad", 318, 398,
                      "Barbarees social advertisement about post-pregnancy body treatment"),
        "gallery": [
            {"src": "work/barbarees-post-pregnancy-ad", "w": 318, "h": 398,
             "alt": "Barbarees social advertisement about post-pregnancy body treatment",
             "caption": "Barbarees &mdash; post-pregnancy body treatment"},
        ],
        "case": False,
    },
    {
        "slug": "barbarees-diet-plan-ad",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Social Creative",
        "title": "Barbarees",
        "summary": "A diet-plan campaign that casts the scale as a player and the clinic as the referee.",
        "facts": [],
        "cover": _img("work/barbarees-diet-plan-ad", 318, 398,
                      "Barbarees social advertisement with a referee character and a weighing scale"),
        "gallery": [
            {"src": "work/barbarees-diet-plan-ad", "w": 318, "h": 398,
             "alt": "Barbarees social advertisement with a referee character and a weighing scale",
             "caption": "Barbarees &mdash; diet plan campaign"},
        ],
        "case": False,
    },
    {
        "slug": "local-burger-ad",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Social Creative",
        "title": "Local Burger",
        "summary": "Product photography and typography for a burger brand.",
        "facts": [],
        "cover": _img("work/local-burger-ad", 318, 398,
                      "Local Burger social advertisement reading Taste the luxury"),
        "gallery": [
            {"src": "work/local-burger-ad", "w": 318, "h": 398,
             "alt": "Local Burger social advertisement reading Taste the luxury",
             "caption": "Local Burger &mdash; Taste the luxury"},
        ],
        "case": False,
    },
    {
        "slug": "engineering-technologies-ads",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Social Creative",
        "title": "Engineering Technologies",
        "summary": "Two advertisements for a lift control systems company in the UAE.",
        "facts": [],
        "cover": _img("work/engineering-technologies-elevator-buttons-ad", 318, 398,
                      "Engineering Technologies advertisement showing a hand pressing a lift button"),
        "gallery": [
            {"src": "work/engineering-technologies-elevator-buttons-ad", "w": 318, "h": 398,
             "alt": "Engineering Technologies advertisement showing a hand pressing a lift button",
             "caption": "Engineering Technologies &mdash; comfort and safety"},
            {"src": "work/engineering-technologies-elevator-doors-ad", "w": 318, "h": 398,
             "alt": "Engineering Technologies advertisement showing a technician at a lift door",
             "caption": "Engineering Technologies &mdash; lift control systems"},
        ],
        "case": False,
    },
    {
        "slug": "data-recovery-ad",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Social Creative",
        "title": "Data Recovery",
        "summary": "An advertisement about encrypted files for a data recovery service in Riyadh.",
        "facts": [],
        "cover": _img("work/data-recovery-encrypted-files-ad", 327, 400,
                      "Data Recovery advertisement about files that cannot be opened"),
        "gallery": [
            {"src": "work/data-recovery-encrypted-files-ad", "w": 327, "h": 400,
             "alt": "Data Recovery advertisement about files that cannot be opened",
             "caption": "Data Recovery &mdash; encrypted files"},
        ],
        "case": False,
    },
    {
        "slug": "product-ad-design",
        "span": 3,
        "categories": ["creative"],
        "kind": "creative-sample",
        "card": "media",
        "featured": None,
        "tag": "Product Advertising",
        "title": "Product Advertising Design",
        "summary": ("A studio composition for a wristwatch. A design sample, not a client project."),
        "facts": [],
        "cover": _img("work/seiko-presage-product-ad", 319, 427,
                      "Product advertising design showing a wristwatch above water"),
        "gallery": [
            {"src": "work/seiko-presage-product-ad", "w": 319, "h": 427,
             "alt": "Product advertising design showing a wristwatch above water",
             "caption": "Product advertising design &mdash; creative sample"},
        ],
        "case": False,
        "note": "A trademark inside the artwork is not a client relationship. Not named as one.",
    },
]


# --------------------------------------------------------- viewer strings
# كل نصّ يقرأه الزائر في العارض يُكتب في الصفحة لا في ملف الجافاسكربت:
# `build_ar.py` يترجم الـHTML ويتخطّى محتوى <script>، فسطرٌ مكتوب هناك كان
# سيبقى إنجليزيًّا في الصفحة العربية بلا أن يشتكي أحد. الجافاسكربت يقرأ هذه
# العُقد ويستبدل ما بين {} بالأرقام.
VIEWER_STRINGS = [
    ("dialog", "Image viewer"),
    ("close", "Close the viewer"),
    ("prev", "Previous image"),
    ("next", "Next image"),
    ("original", "Open the original file"),
    ("count", "{current} of {total}"),
    ("status", "Showing {visible} of {total} projects"),
]


def strings_block(pad):
    o = [f'{pad}<div hidden data-z2o-strings>']
    o += [f'{pad}   <span data-z2o-string="{k}">{v}</span>' for k, v in VIEWER_STRINGS]
    o.append(f'{pad}</div>')
    return "\n".join(o)



# Display order only. All gallery cards use equal-width columns.
GALLERY_ORDER = [
    "habba", "makan-mem-logo",
    "alostaz-seo", "alrahwanji-paints",
    "google-ads-conversion-value",
    "barbarees-post-pregnancy-ad", "barbarees-diet-plan-ad",
    "alhokail-seo", "local-burger-ad",
    "engineering-technologies-ads",
    "cosmetic-surgery-egypt-seo", "orthopedic-clinic-egypt-seo",
    "kuwait-tutoring-instagram-ads", "data-recovery-ad",
    "product-ad-design",
    "riyadh-curtains-google-ads",
]


def gallery():
    """العناصر بترتيب العرض."""
    by_slug = {i["slug"]: i for i in ITEMS}
    return [by_slug[s] for s in GALLERY_ORDER]


# ------------------------------------------------------------------ helpers
def items_with_pages():
    return [i for i in ITEMS if i.get("case")]


def case_slugs():
    return [i["slug"] for i in items_with_pages()]


def featured():
    picked = sorted((i for i in ITEMS if i.get("featured")), key=lambda i: i["featured"])
    if [i["featured"] for i in picked] != list(range(1, len(picked) + 1)):
        raise SystemExit("  ❌ featured must be 1..n with no gaps or repeats")
    return picked


def used_categories():
    """التصنيفات التي لها عناصر فعلاً — الفارغ منها لا يصير زرّ مرشّح."""
    live = {c for i in ITEMS for c in i["categories"]}
    missing = live - {k for k, _ in CATEGORIES}
    if missing:
        raise SystemExit(f"  ❌ unknown category key(s): {sorted(missing)}")
    return [(k, label) for k, label in CATEGORIES if k in live]


def validate():
    seen = set()
    for i in ITEMS:
        if i["slug"] in seen:
            raise SystemExit(f"  ❌ duplicate slug: {i['slug']}")
        seen.add(i["slug"])
        if i.get("case") and i["slug"] not in CASES:
            raise SystemExit(f"  ❌ '{i['slug']}' is marked case but has no CASES entry")
        if i["card"] == "metric" and not i.get("metrics"):
            raise SystemExit(f"  ❌ '{i['slug']}' is a metric card with no metrics")
    for slug in CASES:
        if slug not in seen:
            raise SystemExit(f"  ❌ CASES has '{slug}' but ITEMS does not")
    missing = seen - set(GALLERY_ORDER)
    extra = set(GALLERY_ORDER) - seen
    if missing or extra:
        raise SystemExit(f"  ❌ GALLERY_ORDER لا يطابق ITEMS: ناقص {sorted(missing)} زائد {sorted(extra)}")
    if len(GALLERY_ORDER) != len(set(GALLERY_ORDER)):
        raise SystemExit("  ❌ GALLERY_ORDER فيه تكرار")
    # Equal-width cards allow a partially filled last row.
    used_categories()
    return True


# ------------------------------------------------------------------ the copy
CASES = {
    "habba": {
        "title": "HABBA Brand Identity — Specialty Coffee Roastery | ZERO 2 ONE",
        "description": (
            "Brand identity for HABBA specialty coffee: logo system, colour rules, stationery, menus, packaging, uniforms and signage — recognisable at every scale."
        ),
        "eyebrow": "Brand Identity / Food &amp; Beverage",
        "h1": "HABBA — A Brand Identity Crafted Around the Ritual of Coffee",
        "intro": (
            "We created a warm, distinctive visual identity for HABBA, bringing its "
            "specialty coffee experience to life across every customer touchpoint — "
            "from the brandmark and packaging to printed materials and the physical space."
        ),
        "meta": [
            ("Client", "HABBA"),
            ("Industry", "Specialty Coffee Roastery &amp; Caf&eacute;"),
            ("Service", "Brand Identity"),
            ("Scope", "Logo System, Packaging &amp; Brand Applications"),
        ],
        "hero_image": ("habba-01-brand-hero", "HABBA specialty coffee brand identity and primary logo"),
        "sections": [
            {"kind": "text", "title": "From a Coffee Concept to a Complete Brand Experience",
             "body": [
                 "HABBA needed more than a recognizable logo. It needed a flexible identity that could feel "
                 "consistent on a coffee cup, a menu, stationery, staff uniforms, and within the caf&eacute; itself.",
                 "Our approach was to build one coherent visual system — distinctive enough to be remembered, "
                 "flexible enough to work across different applications, and practical enough to support the "
                 "brand as it grows.",
             ]},
            {"kind": "split", "title": "One Identity. Many Touchpoints.",
             "body": [
                 "A specialty coffee brand is experienced through repeated details — the cup customers hold, "
                 "the menu they read, the packaging they carry, and the space they remember.",
                 "The challenge was to create a visual identity that feels warm, refined, and recognizable "
                 "while remaining functional across packaging, printed materials, digital communication, "
                 "uniforms, and environmental branding.",
             ],
             "image": ("habba-02-logo-system",
                       "HABBA horizontal, vertical, brandmark, and simplified logo system")},
            {"kind": "list", "title": "Designed to Work at Every Scale",
             "body": [
                 "The HABBA identity is built around a distinctive H monogram inspired by the elegance and "
                 "precision of specialty coffee culture.",
                 "A flexible family of horizontal, vertical, simplified, and standalone brandmark "
                 "configurations allows the identity to remain clear and recognizable across large-format "
                 "signage, packaging, printed materials, and small digital applications.",
             ],
             "items": ["Horizontal Logo", "Vertical Logo", "Standalone Brandmark", "Simplified Logo"]},
            {"kind": "wide", "title": "A Palette Inspired by Warmth, Craft, and Character",
             "body": [
                 "The color palette combines warm coffee-inspired brown with deep contrasting tones and a "
                 "distinctive blue accent. Together, these colors give HABBA a refined yet approachable personality.",
                 "The system also includes light and dark logo variations, ensuring clarity and consistency "
                 "across different backgrounds and applications.",
             ],
             "image": ("habba-03-color-variations",
                       "HABBA logo color variations across the brand palette")},
            {"kind": "split", "title": "Consistency Builds Recognition",
             "body": [
                 "A strong identity depends on how consistently it is used. Clear logo guidelines were "
                 "developed to protect the proportions, colors, spacing, and visual integrity of the HABBA brand.",
                 "These rules prevent incorrect stretching, rotation, effects, recoloring, and layout changes — "
                 "helping the identity remain recognizable wherever it appears.",
             ],
             "image": ("habba-04-logo-guidelines", "HABBA logo usage and misuse guidelines")},
            {"kind": "pair", "title": "Bringing the Identity into Everyday Business",
             "body": [
                 "The identity was extended across the brand&rsquo;s essential printed materials, creating a "
                 "consistent and professional experience in both customer-facing and operational touchpoints.",
                 "From business cards and stationery to menus and branded stamps, every application follows "
                 "the same visual language while adapting to its specific function.",
             ],
             "items": ["Business Cards", "Letterhead", "Envelopes", "Invoice and Document Templates",
                       "Menus", "Branded Stamp"],
             "images": [("habba-05-stationery",
                         "HABBA business cards, letterhead, envelope, and stationery applications"),
                        ("habba-06-menu-print",
                         "HABBA menu, stamp, and printed collateral applications")]},
            {"kind": "wide", "title": "Designed to Travel with the Customer",
             "body": [
                 "Packaging turns the brand into a physical experience customers can carry with them. "
                 "HABBA&rsquo;s visual identity was adapted across coffee cups, coffee bags, and takeaway "
                 "carriers while maintaining clear recognition and a consistent premium character.",
                 "Each packaging application was designed to feel like a natural extension of the caf&eacute; "
                 "experience — practical, memorable, and unmistakably HABBA.",
             ],
             "image": ("habba-07-packaging", "HABBA coffee cup, coffee bag, and takeaway packaging")},
            {"kind": "split", "title": "From Visual Identity to Physical Experience",
             "body": [
                 "A complete brand identity should remain recognizable beyond printed materials. The HABBA "
                 "system was extended into the physical environment through exterior signage and staff uniforms.",
                 "These applications help create a connected customer experience — from seeing the caf&eacute; "
                 "for the first time to interacting with the team inside.",
             ],
             "image": ("habba-08-environment", "HABBA signage and staff uniform applications")},
        ],
        "deliverables": [
            "Brand Identity Direction", "Primary and Secondary Logo Configurations", "Standalone Brandmark",
            "Logo Usage Guidelines", "Brand Color System", "Business Stationery",
            "Menu and Printed Collateral", "Coffee Packaging", "Takeaway Packaging",
            "Staff Uniform Applications", "Environmental Signage",
        ],
        "cta_title": "Your Brand Should Feel Complete at Every Touchpoint.",
        "cta_body": ("From the first idea to the final application, we build identities that are ready to be "
                     "seen, remembered, and used."),
        "cta_label": "Build Your Brand with Us",
        "service_url": "/services/brand-identity/",
        "service_name": "Brand Identity Development",
    },

    "alrahwanji-paints": {
        "title": "Alrahwanji Paints Ad Campaign — Facebook &amp; Instagram | ZERO 2 ONE",
        "description": (
            "How Alrahwanji Paints moved to measured advertising on Facebook and Instagram — reported reach, engagement and placement data from the ad dashboard."
        ),
        "eyebrow": "Paid Media / Paints &amp; Coatings",
        "h1": "Turning Ad Spend into Focused, Measurable Growth",
        "intro": (
            "We helped Alrahwanji Paints move from unstructured promotion to a focused "
            "advertising approach built around clear objectives, continuous performance "
            "analysis, and smarter budget allocation."
        ),
        "meta": [
            ("Client", "Alrahwanji Paints"),
            ("Industry", "Paints &amp; Coatings"),
            ("Market", "Ajman, United Arab Emirates"),
            ("Service", "Advertising Campaign Management"),
            ("Platforms", "Facebook &amp; Instagram"),
            ("Objectives", "Reach, Engagement &amp; Follower Growth"),
        ],
        "hero_image": ("alrahwanji-01-project-overview",
                       "Alrahwanji Paints advertising campaign project overview and strategy"),
        "sections": [
            {"kind": "text", "title": "From Scattered Promotion to a Clear Growth System",
             "body": [
                 "Before the campaign, the company had limited digital reach and no clear structure for "
                 "managing its marketing budget.",
                 "Our work focused on building brand visibility, attracting relevant engagement, and using "
                 "live campaign data to determine where the advertising budget could perform most effectively.",
             ]},
            {"kind": "list", "title": "A Limited Digital Presence and No Clear Media Plan",
             "body": [
                 "The brand was not marketing consistently, audience growth was limited, and previous "
                 "advertising activity lacked a defined strategy.",
                 "The key challenge was to build trust and visibility while making every stage of the "
                 "available budget clearer, more focused, and more accountable.",
             ],
             "items": ["Limited digital reach", "Low audience engagement", "No clear advertising strategy",
                       "Unstructured budget distribution", "Limited performance tracking"]},
            {"kind": "steps", "title": "Test, Learn, and Scale What Works",
             "body": [
                 "We defined reach and follower growth as the campaign&rsquo;s primary objectives, then "
                 "monitored performance across campaigns and placements.",
                 "Investment was increased gradually only after results became stable. Stronger-performing "
                 "activity received more budget, while lower-performing campaigns were paused to reduce "
                 "wasted spend and improve efficiency.",
             ],
             "items": ["Define clear campaign objectives.", "Launch and test campaign variations.",
                       "Monitor engagement and cost efficiency.",
                       "Identify stronger campaigns and placements.",
                       "Gradually scale successful activity.", "Pause lower-performing campaigns."]},
            {"kind": "split", "title": "A Measurable Performance Snapshot",
             "body": [
                 "The campaign produced measurable follower activity within the reported advertising period. "
                 "Performance was monitored through follower growth, cost per result, campaign spend, and the "
                 "activity timeline.",
             ],
             "image": ("alrahwanji-03-performance-overview",
                       "Campaign followers, cost per follow, spending, and performance trend")},
            {"kind": "figures", "title": "Engagement Beyond Passive Reach",
             "body": [
                 "The campaign generated multiple forms of audience activity, from page likes and post "
                 "reactions to deeper post engagement and link clicks.",
                 "This gave the team a clearer understanding of how users responded to the campaign, rather "
                 "than relying on impressions alone.",
             ],
             "figures": [("295", "Facebook Likes"), ("139", "Post Engagements"),
                         ("112", "Post Reactions"), ("19", "Link Clicks")],
             "image": ("alrahwanji-04-engagement-results",
                       "Campaign likes, engagements, reactions, and link clicks")},
            {"kind": "table", "title": "Reels Delivered the Strongest Visibility",
             "body": [
                 "Placement analysis showed that Facebook Reels generated the strongest reported delivery, "
                 "followed by the mobile app feed and Facebook Stories.",
                 "This insight helped clarify where the campaign was gaining the most visibility and where "
                 "future budget allocation could be focused.",
             ],
             "table_head": ("Placement", "Reported Delivery"),
             "rows": [("Facebook Reels", "5,921"), ("Facebook Mobile App Feed", "1,436"),
                      ("Facebook Stories", "412"), ("Facebook Mobile Web Feed", "9")],
             "image": ("alrahwanji-05-placement-results",
                       "Campaign delivery across Facebook Reels, feed, Stories, and mobile web")},
            {"kind": "wide", "title": "Performance, Documented",
             "body": [
                 "Campaign decisions were supported by reported platform data covering follower activity, "
                 "engagement, clicks, and placement-level delivery.",
                 "Every figure on this page is reproduced from the advertising dashboard below. The client "
                 "report also describes customer and revenue growth, but without verified numbers — so those "
                 "outcomes are not claimed here.",
             ],
             "image": ("alrahwanji-02-dashboard-full",
                       "Facebook advertising campaign performance dashboard")},
            {"kind": "list", "title": "Clearer Performance. Smarter Budget Decisions.",
             "body": [
                 "Campaign performance was reviewed continuously. Successful activity was scaled gradually "
                 "after achieving stable results, while lower-performing campaigns were reduced or paused.",
                 "This approach helped the client move toward a more structured and informed way of managing "
                 "advertising investment.",
             ],
             "items": ["Continuous Performance Monitoring", "Gradual Budget Scaling", "Placement Analysis",
                       "Lower-Performance Reduction", "Campaign Reporting"]},
        ],
        "deliverables": [
            "Campaign Objective Definition", "Facebook and Instagram Campaign Management",
            "Audience and Placement Monitoring", "Campaign Performance Analysis", "Budget Optimization",
            "Gradual Campaign Scaling", "Underperforming Campaign Reduction", "Results Reporting",
        ],
        "cta_title": "Your Ad Budget Should Produce More Than Impressions.",
        "cta_body": ("We build, monitor, and optimize advertising campaigns around clear business objectives "
                     "and measurable performance."),
        "cta_label": "Plan Your Next Campaign",
        "service_url": "/services/digital-advertising/",
        "service_name": "Advertising Campaign Management",
    },

    # =====================================================================
    # Cases below are built from the company portfolio PDF. Every figure is
    # recorded in tools/PORTFOLIO_EVIDENCE.md with its source page and the
    # screenshot that shows it.
    # =====================================================================
    "alostaz-seo": {
        "title": "Alostaz.io SEO &mdash; From 3.21K to 28.3K Clicks | ZERO 2 ONE",
        "description": (
            "Six months of SEO for Alostaz.io, a Saudi SaaS platform: Search Console recorded clicks rising from 3.21K to 28.3K and average position moving from 21.7 to 8.2."
        ),
        "eyebrow": "SEO / Software as a Service",
        "h1": "Alostaz.io &mdash; Six Months of Search Growth, Read From the Dashboard",
        "intro": (
            "Alostaz.io is a Saudi software-as-a-service platform. Across two consecutive "
            "six-month windows, Google Search Console recorded total clicks rising from 3.21K "
            "to 28.3K. The dashboard those numbers come from is published further down this "
            "page, at the resolution we received it."
        ),
        "meta": [
            ("Client", "Alostaz.io"),
            ("Market", "Saudi Arabia"),
            ("Sector", "Software as a Service"),
            ("Service", "Search Engine Optimisation"),
            ("Reporting period", "Last 6 months vs previous 6 months"),
        ],
        "hero_metrics": [
            ("Clicks", "3.21K", "28.3K"),
            ("Impressions", "96.1K", "1.1M"),
            ("Average position", "21.7", "8.2"),
        ],
        "hero_metric_note": "Google Search Console, last 6 months compared with the previous 6 months.",
        "sections": [
            {"kind": "evidence", "title": "The Search Console Comparison",
             "body": [
                 "This is the comparison view exactly as the platform draws it. The upper figure in "
                 "each tile is the last six months and the lower figure is the six months before it.",
             ],
             "evidence": [
                 ("work/alostaz-search-console",
                  "Alostaz.io Search Console comparison showing 28.3K clicks against 3.21K, and average position 8.2 against 21.7",
                  "Total clicks 28.3K against 3.21K. Total impressions 1.1M against 96.1K. "
                  "Average position 8.2 against 21.7."),
             ]},
            {"kind": "text", "title": "What This Comparison Does and Does Not Say",
             "body": [
                 "Average position is an average across every query the site appears for. Moving it "
                 "from 21.7 to 8.2 means the site is typically being seen much earlier in results. "
                 "It does not mean first place for any particular keyword, and we do not present it "
                 "that way.",
                 "Average click-through rate went the other way over the same window, from 3.3% to "
                 "2.6%. That is what happens when a site starts ranking for far more queries, "
                 "including broad ones: impressions grow faster than clicks. We publish it because "
                 "leaving it out would make the picture tidier than the data is.",
             ]},
        ],
        "deliverables": [
            "Technical SEO Audit", "Keyword Research", "On-Page Optimisation",
            "Content Strategy", "Internal Linking Structure", "Search Console Monitoring",
            "Monthly Performance Reporting",
        ],
        "cta_title": "Search Growth Compounds &mdash; but Only if Someone Is Measuring It.",
        "cta_body": ("We work from Search Console and analytics data, and we show you the same "
                     "dashboards we work from."),
        "cta_label": "Talk About Your Search Visibility",
        "service_url": "/services/seo-riyadh/",
        "service_name": "Search Engine Optimisation",
    },

    "cosmetic-surgery-egypt-seo": {
        "title": "Cosmetic Surgery SEO in Egypt &mdash; 29K Organic Clicks | ZERO 2 ONE",
        "description": (
            "SEO built from nothing for a cosmetic surgery centre in Egypt: 29K clicks and 1.36M impressions recorded in Search Console over roughly eleven months."
        ),
        "eyebrow": "SEO / Healthcare",
        "h1": "A Cosmetic Surgery Centre in Egypt &mdash; Organic Search Built From Nothing",
        "intro": (
            "The centre had no organic search presence when the work started. The Search Console "
            "period below runs from August 2023 to July 2024 and records 29K clicks against 1.36M "
            "impressions. The source portfolio does not name this client, so neither do we."
        ),
        "meta": [
            ("Client", "Not named in the source"),
            ("Market", "Egypt"),
            ("Sector", "Cosmetic Surgery"),
            ("Service", "Search Engine Optimisation"),
            ("Reporting period", "9 August 2023 to 2 July 2024"),
        ],
        "hero_metrics": [
            ("Clicks", None, "29K"),
            ("Impressions", None, "1.36M"),
            ("Average position", None, "19"),
        ],
        "hero_metric_note": "Google Search Console totals for the period shown on the chart below.",
        "sections": [
            {"kind": "evidence", "title": "The Dashboard",
             "body": [
                 "One period, no comparison window. The figures are totals for the whole date range "
                 "on the horizontal axis, not daily numbers.",
             ],
             "evidence": [
                 ("work/cosmetic-surgery-egypt-search-console",
                  "Search Console totals for a cosmetic surgery centre in Egypt: 29K clicks, 1.36M impressions, 2.1% average click-through rate and average position 19",
                  "Total clicks 29K. Total impressions 1.36M. Average click-through rate 2.1%. "
                  "Average position 19. Period 9 August 2023 to 2 July 2024."),
             ]},
            {"kind": "list", "title": "What the Work Covered",
             "body": [
                 "The engagement started with no existing organic traffic, which means there is no "
                 "meaningful percentage to quote &mdash; a growth rate measured from zero has no "
                 "defined value. The totals above are the honest way to state the result.",
             ],
             "items": ["Content Strategy", "On-Page SEO", "Technical Recommendations"]},
        ],
        "deliverables": [
            "Content Strategy", "On-Page Optimisation", "Technical SEO Recommendations",
            "Search Console Monitoring",
        ],
        "cta_title": "Starting From Zero Is Not a Disadvantage.",
        "cta_body": ("It means nothing has to be undone first. We would rather show you a dashboard "
                     "than quote a percentage."),
        "cta_label": "Talk About Your Search Visibility",
        "service_url": "/services/seo-riyadh/",
        "service_name": "Search Engine Optimisation",
    },

    "orthopedic-clinic-egypt-seo": {
        "title": "Orthopedic Clinic SEO in Egypt &mdash; 110K Organic Clicks | ZERO 2 ONE",
        "description": (
            "SEO for an orthopedic clinic in Egypt: 110K clicks, 3.81M impressions and average position 9, recorded in Search Console over roughly twelve months."
        ),
        "eyebrow": "SEO / Healthcare",
        "h1": "An Orthopedic Clinic in Egypt &mdash; A Year of Search Data",
        "intro": (
            "Keyword research, content strategy, and on- and off-page optimisation for an "
            "orthopedic clinic. The Search Console period below runs from August 2023 to August "
            "2024 and records 110K clicks against 3.81M impressions. The source portfolio does "
            "not name this client, so neither do we."
        ),
        "meta": [
            ("Client", "Not named in the source"),
            ("Market", "Egypt"),
            ("Sector", "Orthopedics"),
            ("Service", "Search Engine Optimisation"),
            ("Reporting period", "9 August 2023 to 3 August 2024"),
        ],
        "hero_metrics": [
            ("Clicks", None, "110K"),
            ("Impressions", None, "3.81M"),
            ("Average position", None, "9"),
        ],
        "hero_metric_note": "Google Search Console totals for the period shown on the chart below.",
        "sections": [
            {"kind": "evidence", "title": "The Dashboard",
             "body": [
                 "The rising shape on the chart is the whole point: this is a year of accumulation, "
                 "not a spike. The tile figures are totals for the entire range.",
             ],
             "evidence": [
                 ("work/orthopedic-clinic-egypt-search-console",
                  "Search Console totals for an orthopedic clinic in Egypt: 110K clicks, 3.81M impressions, 2.9% average click-through rate and average position 9",
                  "Total clicks 110K. Total impressions 3.81M. Average click-through rate 2.9%. "
                  "Average position 9. Period 9 August 2023 to 3 August 2024."),
             ]},
            {"kind": "text", "title": "What a Search Metric Is",
             "body": [
                 "Clicks and impressions describe behaviour in search results. They are not patients, "
                 "bookings, or revenue, and a dashboard cannot turn into any of those on its own. "
                 "What this period shows is that the clinic became findable at scale for the things "
                 "people actually search for.",
             ]},
        ],
        "deliverables": [
            "Keyword Research", "Content Strategy", "On-Page Optimisation",
            "Off-Page Optimisation", "Technical SEO Recommendations", "Search Console Monitoring",
        ],
        "cta_title": "A Year of Search Data Beats a Month of Promises.",
        "cta_body": "We report from the same dashboards our clients can open themselves.",
        "cta_label": "Talk About Your Search Visibility",
        "service_url": "/services/seo-riyadh/",
        "service_name": "Search Engine Optimisation",
    },

    "alhokail-seo": {
        "title": "Al Hokail Medical Group SEO &mdash; Clicks and Impressions | ZERO 2 ONE",
        "description": (
            "SEO for Al Hokail Medical Group: Search Console recorded clicks rising from 14.1K to 38.2K and impressions from 566K to 1.67M across two three-month windows."
        ),
        "eyebrow": "SEO / Healthcare",
        "h1": "Al Hokail Medical Group &mdash; Two Quarters, Side by Side",
        "intro": (
            "Content management, structured data, and on- and off-page optimisation for a Saudi "
            "medical group. Search Console compares the last three months against the three before "
            "them: clicks 38.2K against 14.1K, impressions 1.67M against 566K."
        ),
        "meta": [
            ("Client", "Al Hokail Medical Group"),
            ("Market", "Saudi Arabia"),
            ("Sector", "Healthcare"),
            ("Service", "Search Engine Optimisation"),
            ("Reporting period", "Last 3 months vs previous 3 months"),
        ],
        "hero_metrics": [
            ("Clicks", "14.1K", "38.2K"),
            ("Impressions", "566K", "1.67M"),
        ],
        "hero_metric_note": "Google Search Console, last 3 months compared with the previous 3 months.",
        "sections": [
            {"kind": "evidence", "title": "The Search Console Comparison",
             "body": [
                 "The upper figure in each tile is the last three months; the lower one is the "
                 "previous three.",
             ],
             "evidence": [
                 ("work/alhokail-search-console",
                  "Al Hokail Search Console comparison showing 38.2K clicks against 14.1K and 1.67M impressions against 566K",
                  "Total clicks 38.2K against 14.1K. Total impressions 1.67M against 566K. "
                  "Average click-through rate 2.3% against 2.5%. Average position 12.7 against 9.8."),
             ]},
            {"kind": "text", "title": "The Part Most Portfolios Would Leave Out",
             "body": [
                 "Average position in this comparison moved from 9.8 to 12.7. In Search Console a "
                 "lower number is a better position, so that is a decline, not an improvement, and "
                 "we are not going to describe it as one.",
                 "It is also what you would expect alongside a threefold rise in impressions: as a "
                 "site starts appearing for a much wider set of queries, many of them newer and "
                 "more competitive, the average across all of them can fall even while traffic "
                 "grows. Clicks nearly tripled over the same window. Both things are true, and "
                 "both are on this page.",
             ]},
        ],
        "deliverables": [
            "Content Management", "On-Page Optimisation", "Off-Page Optimisation",
            "Structured Data Implementation", "Technical SEO Recommendations",
            "Search Console Monitoring",
        ],
        "cta_title": "We Will Show You the Numbers That Did Not Move, Too.",
        "cta_body": ("A report that only contains good news is not a report. Ours name what went "
                     "the other way and why."),
        "cta_label": "Talk About Your Search Visibility",
        "service_url": "/services/seo-riyadh/",
        "service_name": "Search Engine Optimisation",
    },

    "google-ads-conversion-value": {
        "title": "Google Ads &mdash; Conversion Value 0.54&times; to 3.60&times; | ZERO 2 ONE",
        "description": (
            "A Google Ads account rebuilt around its profitable products: reported conversion value per riyal of ad spend moved from 0.54 to 3.60 between April and August 2026."
        ),
        "eyebrow": "Advertising / Google Ads",
        "h1": "A Google Ads Account Rebuilt Around What Actually Earns",
        "intro": (
            "Two monthly snapshots of the same advertising account. In April 2026 it returned SAR "
            "2.75K of reported conversion value on SAR 5.1K of spend. In August, after the "
            "campaigns were rebuilt around the products that earn, it returned SAR 17.6K on SAR "
            "4.88K. The client is not named in the source portfolio, so we do not name one."
        ),
        "meta": [
            ("Client", "Not named in the source"),
            ("Market", "Saudi Arabia"),
            ("Platform", "Google Ads"),
            ("Service", "Advertising Campaign Management"),
            ("Reporting period", "April 2026 and August 2026"),
        ],
        "hero_metrics": [
            ("Conversion value / cost", "0.54&times;", "3.60&times;"),
            ("Reported conversion value", "SAR 2.75K", "SAR 17.6K"),
            ("Advertising cost", "SAR 5.1K", "SAR 4.88K"),
        ],
        "hero_metric_note": ("Google Ads, 1&ndash;30 April 2026 compared with 1&ndash;31 August 2026. "
                             "Conversion value is the figure the platform reports, not audited revenue."),
        "sections": [
            {"kind": "evidence", "title": "Both Dashboards, Unedited",
             "body": [
                 "The metric named Conv. value / cost is the platform's reported conversion value "
                 "divided by what was spent to get it. It is commonly abbreviated ROAS. It is not "
                 "profit, and it is not audited.",
             ],
             "evidence": [
                 ("work/google-ads-conversion-value-before",
                  "Google Ads dashboard for April 2026 showing conversion value over cost of 0.54",
                  "Before &mdash; 1 to 30 April 2026. Conversion value / cost 0.54. Conversions "
                  "466.52. Conversion value SAR 2.75K. Cost SAR 5.1K."),
                 ("work/google-ads-conversion-value-after",
                  "Google Ads dashboard for August 2026 showing conversion value over cost of 3.60",
                  "After &mdash; 1 to 31 August 2026. Conversion value / cost 3.60. Conversions "
                  "428.78. Conversion value SAR 17.6K. Cost SAR 4.88K."),
             ]},
            {"kind": "text", "title": "Fewer Conversions. Far More Value.",
             "body": [
                 "Read the conversion counts and the story gets more interesting: 466.52 before, "
                 "428.78 after. The account did not start converting more often. It started "
                 "converting on things worth more, which is what happens when spend moves off "
                 "cheap traffic and onto the products that carry margin.",
                 "Those counts are fractional because the platform attributes fractions of a "
                 "conversion across interactions. They are a modelled figure, not a count of "
                 "people, and anyone presenting them as customers is misreading their own "
                 "dashboard.",
                 "The two months are four months apart and were not run as a controlled test. "
                 "They show what the account reported in each window; they do not isolate a single "
                 "cause.",
             ]},
        ],
        "deliverables": [
            "Account Audit", "Campaign Restructure", "Product and Audience Targeting",
            "Ad Creative and Copy", "Bid and Budget Management", "Conversion Tracking Review",
            "Monthly Performance Reporting",
        ],
        "cta_title": "Spending Less and Earning More Is a Structure Problem.",
        "cta_body": ("Most underperforming accounts are not short of budget. They are pointed at "
                     "the wrong things."),
        "cta_label": "Have Your Account Reviewed",
        "service_url": "/services/digital-advertising/",
        "service_name": "Advertising Campaign Management",
    },

    "kuwait-tutoring-instagram-ads": {
        "title": "Instagram Ads for a Tutoring Centre in Kuwait | ZERO 2 ONE",
        "description": (
            "Instagram messaging campaigns for an educational centre in Kuwait: 267 conversations at an average cost of $5.05, with the ad-level breakdown published."
        ),
        "eyebrow": "Advertising / Instagram",
        "h1": "A Tutoring Centre in Kuwait &mdash; Conversations, Not Impressions",
        "intro": (
            "Messaging campaigns run on Instagram alone for an educational centre, optimised for "
            "conversations started rather than reach. Ads Manager records 267 conversations at an "
            "average of $5.05 each. The source portfolio does not name this client, so we do not."
        ),
        "meta": [
            ("Client", "Not named in the source"),
            ("Market", "Kuwait"),
            ("Platform", "Instagram"),
            ("Service", "Advertising Campaign Management"),
            ("Objective", "Messaging conversations"),
        ],
        "hero_metrics": [
            ("Conversations", None, "267"),
            ("Cost per conversation", None, "$5.05"),
            ("Amount spent", None, "$1,348.62"),
        ],
        "hero_metric_note": "Meta Ads Manager, one campaign. The unit is a messaging conversation started.",
        "sections": [
            {"kind": "evidence", "title": "Campaign and Ad Level",
             "body": [
                 "The campaign row gives the average. The ad rows underneath show where it came "
                 "from &mdash; two creatives, both below the campaign average.",
             ],
             "evidence": [
                 ("work/kuwait-tutoring-campaign-results",
                  "Meta Ads Manager campaign row showing 267 results at $5.05 cost per result",
                  "Campaign level &mdash; 267 messaging conversations, $5.05 per conversation, "
                  "$1,348.62 spent."),
                 ("work/kuwait-tutoring-ad-results",
                  "Meta Ads Manager ad rows showing 54 results at $4.17 and 140 results at $3.58",
                  "Ad level &mdash; 54 conversations at $4.17 and 140 conversations at $3.58, on "
                  "a shared daily budget of $45.00."),
             ]},
            {"kind": "text", "title": "About the 44% Figure",
             "body": [
                 "The company portfolio reports that average cost per message fell from around $9 "
                 "to around $5, roughly 44%. The $5.05 is visible in the dashboard above. The $9 "
                 "starting point comes from the portfolio's own account of the earlier period and "
                 "is not shown in any screenshot we hold, so we attribute it rather than present "
                 "it as read from a dashboard.",
                 "The unit throughout is a conversation started on Instagram. Not a sale, not a "
                 "signed student.",
             ]},
        ],
        "deliverables": [
            "Platform Selection", "Audience Targeting", "Ad Creative Production",
            "Messaging Campaign Setup", "Budget Management", "Cost per Result Monitoring",
        ],
        "cta_title": "Cheaper Conversations Come From Better Targeting.",
        "cta_body": ("We optimise toward the action that matters to the business, then report the "
                     "cost of it honestly."),
        "cta_label": "Plan Your Next Campaign",
        "service_url": "/services/digital-advertising/",
        "service_name": "Advertising Campaign Management",
    },
}

validate()
