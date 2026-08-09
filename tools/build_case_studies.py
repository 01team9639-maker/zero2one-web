#!/usr/bin/env python3
"""
ZERO 2 ONE — case study page generator
======================================

Builds the English project pages under `/work/<slug>/` from the copy held in
CASES below, reusing an existing service page as the shell.

Why generate instead of hand-editing HTML
-----------------------------------------
A project page is ~35 KB, and all but ~12 KB of it is chrome the site already
duplicates across every page: head metadata, the burger, the sidebar, the top
nav bar, the footer. Hand-writing that twice invites the two pages to drift
apart from each other and from the rest of the site the first time anything
changes. Here the shell comes from a real page at build time, so the project
pages inherit every future chrome fix for free — the same reasoning behind
`tools/sync_site_chrome.py` on the blog side.

The Arabic pages are NOT produced here. They come from `tools/build_ar.py`
like every other page, so translations stay in one dictionary.

Usage:
    python3 tools/build_case_studies.py
    python3 tools/build_case_studies.py --check   # fail if output is stale
"""
import html as html_mod
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELL = os.path.join(ROOT, "services", "brand-identity", "index.html")
# ⚠️ الفوتر يُؤخذ من صفحة عادية لا من صفحة الخدمة.
# صفحات الخدمات تستبدل الفوتر القياسي ببلاطة «Next service» تقود إلى
# الخدمة التالية — وهي منطقية هناك وغريبة في صفحة مشروع: القارئ الذي
# أنهى دراسة حالة يريد التواصل أو بقية الأعمال، لا خدمةً لم يسأل عنها.
# وقرار المالك المتكرّر: الفوتر نفسه في كل صفحة.
FOOTER_SOURCE = os.path.join(ROOT, "work", "index.html")
BASE = "https://zero2one.sa"


def standard_footer():
    """كتلة الفوتر القياسية من `footer-rounded-div` حتى `</main>`."""
    h = open(FOOTER_SOURCE, encoding="utf-8").read()
    i = h.find('<div class="footer-rounded-div"')
    j = h.find("</main>", i)
    if i < 0 or j < i:
        raise SystemExit("  ❌ تعذّر إيجاد الفوتر القياسي في work/index.html")
    return h[i:j]


def esc(text):
    return html_mod.escape(text, quote=True)


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
}


# ------------------------------------------------------------------ rendering
def img(name, alt, cls="case-figure"):
    """صورة المشروع بأبعادها الحقيقية — بلا أبعاد صريحة تهتزّ الصفحة (CLS)."""
    path = os.path.join(ROOT, "assets", "images", f"{name}.webp")
    w = h = 0
    with open(path, "rb") as fh:
        data = fh.read(64)
    # رأس WebP: VP8X أو VP8L أو VP8 — نقرأ الأبعاد بلا مكتبات خارجية
    if data[12:16] == b"VP8X":
        w = int.from_bytes(data[24:27], "little") + 1
        h = int.from_bytes(data[27:30], "little") + 1
    elif data[12:16] == b"VP8L":
        b = int.from_bytes(data[21:25], "little")
        w = (b & 0x3FFF) + 1
        h = ((b >> 14) & 0x3FFF) + 1
    elif data[12:16] == b"VP8 ":
        w = int.from_bytes(data[26:28], "little") & 0x3FFF
        h = int.from_bytes(data[28:30], "little") & 0x3FFF
    if not (w and h):
        raise SystemExit(f"  ❌ تعذّرت قراءة أبعاد {name}.webp")
    return (f'<figure class="{cls}">\n'
            f'                        <img decoding="async" fetchpriority="low" '
            f'src="/assets/images/{name}.webp" width="{w}" height="{h}" '
            f'alt="{alt}" loading="lazy" />\n'
            f'                     </figure>')


def para(lines):
    return "\n".join(f'                        <p>{t}</p>' for t in lines)


def render_section(s):
    o = ['            <section class="section case-overview case-study-section once-in" data-scroll-section>',
         '               <div class="container medium">',
         '                  <div class="row">',
         # fade-in animate: محرّك الموقع نفسه (ScrollTrigger في index-new.js)
         # يلتقط هذا الصنف ويحرّك العنصر عند دخوله الشاشة. لا سطر JS جديد.
         '                     <div class="flex-col fade-in animate">',
         f'                        <h2 class="case-overview-sub">{s["title"]}</h2>',
         para(s["body"])]
    k = s["kind"]
    if k == "list":
        o.append('                        <ul class="case-study-list">')
        o += [f'                           <li>{i}</li>' for i in s["items"]]
        o.append('                        </ul>')
    elif k == "steps":
        o.append('                        <ol class="case-study-steps">')
        o += [f'                           <li>{i}</li>' for i in s["items"]]
        o.append('                        </ol>')
    elif k == "table":
        o += ['                        <div class="case-study-table-wrap">',
              '                        <table class="case-study-table">',
              '                           <thead><tr>'
              f'<th scope="col">{s["table_head"][0]}</th>'
              f'<th scope="col">{s["table_head"][1]}</th></tr></thead>',
              '                           <tbody>']
        o += [f'                              <tr><th scope="row">{a}</th><td>{b}</td></tr>'
              for a, b in s["rows"]]
        o += ['                           </tbody>', '                        </table>',
              '                        </div>']
    elif k == "figures":
        o.append('                        <ul class="case-study-figures">')
        o += [f'                           <li><span class="case-study-figure-value">{v}</span>'
              f'<span class="case-study-figure-label">{l}</span></li>' for v, l in s["figures"]]
        o.append('                        </ul>')
    o.append('                     </div>')
    if s.get("image"):
        o += ['                     <div class="flex-col case-study-media fade-in animate">',
              '                        ' + img(*s["image"]), '                     </div>']
    elif s.get("images"):
        o.append('                     <div class="flex-col case-study-media case-study-media-pair fade-in animate">')
        o += ['                        ' + img(n, a) for n, a in s["images"]]
        o.append('                     </div>')
    o += ['                  </div>', '               </div>', '            </section>']
    return "\n".join(o)


def render_body(slug, c):
    o = []
    # الفتحة: التصنيف والمقدّمة وبيانات المشروع وصورة البطل
    o += ['            <section class="section case-overview case-study-lead once-in" data-scroll-section>',
          '               <div class="container medium">',
          '                  <div class="row">',
          '                     <div class="flex-col fade-in animate">',
          f'                        <p class="case-study-eyebrow">{c["eyebrow"]}</p>',
          f'                        <p class="case-study-intro">{c["intro"]}</p>',
          '                        <dl class="case-study-meta">']
    for k, v in c["meta"]:
        o += [f'                           <div><dt>{k}</dt><dd>{v}</dd></div>']
    o += ['                        </dl>', '                     </div>',
          '                     <div class="flex-col case-study-media fade-in animate">',
          '                        ' + img(*c["hero_image"], cls="case-figure case-figure-hero"),
          '                     </div>',
          '                  </div>', '               </div>', '            </section>']

    for s in c["sections"]:
        o.append(render_section(s))

    # ما قدّمناه
    o += ['            <section class="section case-intro case-study-section once-in" data-scroll-section>',
          '               <div class="container medium">',
          '                  <div class="row">',
          '                     <div class="flex-col fade-in animate">',
          '                        <h2 class="case-overview-label">What We Delivered</h2>',
          '                        <div class="stripe"></div>',
          '                        <ul class="case-study-list case-study-deliverables">']
    o += [f'                           <li>{d}</li>' for d in c["deliverables"]]
    o += ['                        </ul>', '                     </div>', '                  </div>',
          '               </div>', '            </section>']

    # الخاتمة: الخدمة المرتبطة + نداء
    o += ['            <section class="section case-intro case-study-cta once-in" data-scroll-section>',
          '               <div class="container medium">',
          '                  <div class="row">',
          '                     <div class="flex-col fade-in animate">',
          f'                        <h2 class="case-overview-sub">{c["cta_title"]}</h2>',
          f'                        <p>{c["cta_body"]}</p>',
          '                        <ul class="related-services-list case-study-links">',
          '                           <li class="btn btn-link">',
          '                              <a href="/contact/" class="btn-click magnetic" data-strength="20"',
          '                                  data-strength-text="10">',
          '                                  <span class="btn-text">',
          f'                                      <span class="btn-text-inner">{c["cta_label"]}</span>',
          '                                  </span>',
          '                              </a>',
          '                           </li>',
          '                           <li class="btn btn-link">',
          f'                              <a href="{c["service_url"]}" class="btn-click magnetic" data-strength="20"',
          '                                  data-strength-text="10">',
          '                                  <span class="btn-text">',
          f'                                      <span class="btn-text-inner">{c["service_name"]}</span>',
          '                                  </span>',
          '                              </a>',
          '                           </li>',
          '                           <li class="btn btn-link">',
          '                              <a href="/work/" class="btn-click magnetic" data-strength="20"',
          '                                  data-strength-text="10">',
          '                                  <span class="btn-text">',
          '                                      <span class="btn-text-inner">All Work</span>',
          '                                  </span>',
          '                              </a>',
          '                           </li>',
          '                        </ul>',
          '                     </div>', '                  </div>', '               </div>',
          '            </section>',
          '         </section>']
    return "\n" + "\n".join(o) + "\n"


JSONLD = """    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": "{url}#case",
      "name": "{name}",
      "headline": "{name}",
      "description": "{desc}",
      "url": "{url}",
      "inLanguage": "en",
      "image": "{img}",
      "about": {{ "@type": "Service", "name": "{service}" }},
      "creator": {{ "@id": "{base}/#organization" }},
      "isPartOf": {{ "@type": "CollectionPage", "@id": "{base}/work/" }}
    }}
    </script>
"""


def build(slug, c, shell):
    url = f"{BASE}/work/{slug}/"
    h = shell

    # ---- head
    h = re.sub(r"<title>.*?</title>", f"<title>{c['title']}</title>", h, count=1, flags=re.S)
    h = re.sub(r'(<meta name="description" content=")[^"]*(")',
               lambda m: m.group(1) + c["description"] + m.group(2), h, count=1)
    h = re.sub(r'(<meta name="keywords" content=")[^"]*(")',
               lambda m: m.group(1) + m.group(2), h, count=1)
    h = h.replace(f'{BASE}/services/brand-identity/', url)
    h = h.replace(f'{BASE}/ar/services/brand-identity/', f"{BASE}/ar/work/{slug}/")
    # مبدّل اللغة وروابط الصفحة الذاتية تُكتب نسبية في القالب، فلا يكفي
    # استبدال الصيغة المطلقة وحدها وإلا بقي الزائر يُرسَل إلى صفحة الخدمة.
    h = h.replace('href="/ar/services/brand-identity/"', f'href="/ar/work/{slug}/"')
    h = h.replace('href="/services/brand-identity/" hreflang', f'href="/work/{slug}/" hreflang')
    h = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
               lambda m: m.group(1) + c["title"] + m.group(2), h, count=1)
    h = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
               lambda m: m.group(1) + c["description"] + m.group(2), h, count=1)
    h = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")',
               lambda m: m.group(1) + c["title"] + m.group(2), h, count=1)
    h = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")',
               lambda m: m.group(1) + c["description"] + m.group(2), h, count=1)

    # كل JSON-LD في القالب يخصّ صفحة خدمة — يُستبدل بكيان العمل
    h = re.sub(r'\s*<script type="application/ld\+json">.*?</script>\n', "\n", h, flags=re.S)
    ld = JSONLD.format(url=url, name=re.sub(r"\s*\|.*$", "", c["title"]),
                       desc=c["description"].replace('"', "'"),
                       img=f"{BASE}/assets/images/{c['hero_image'][0]}.webp",
                       service=c["service_name"], base=BASE)
    h = h.replace("</head>", ld + "</head>", 1)

    # ---- body
    h = re.sub(r"<h1>.*?</h1>", f"<h1>{c['h1']}</h1>", h, count=1, flags=re.S)
    start = h.find("</header>") + len("</header>")
    end = h.find('<div class="footer-rounded-div"')
    end = h.rfind("\n", 0, end) + 1
    h = h[:start] + render_body(slug, c) + h[end:]

    # تسمية مؤشّر الفأرة: القالب يقول "Next case" لأنه يتبع بلاطة الخدمة
    # التالية، وقد أزلناها. تصير "View" كما في بقية الصفحات فلا يبقى في
    # المصدر نصٌّ يشير إلى شيء غير موجود.
    h = re.sub(r'(<div class="mouse-pos-list-span no-select">\s*<p>)[^<]*(</p>)',
               r'\1View\2', h, count=1)

    # استبدال فوتر صفحة الخدمة بالفوتر القياسي
    i = h.find('<div class="footer-rounded-div"')
    j = h.find("</main>", i)
    if i < 0 or j < i:
        raise SystemExit(f"  ❌ لم أجد الفوتر في {slug}")
    h = h[:i] + standard_footer() + h[j:]
    return h


def main():
    check = "--check" in sys.argv
    shell = open(SHELL, encoding="utf-8").read()
    if "related-services" in shell:
        # قسم «خدمات ذات صلة» يخصّ صفحات الخدمات، وصفحة المشروع لها روابطها
        shell = re.sub(r'\s*<!-- ===== RELATED SERVICES.*?</section>\n', "\n", shell, flags=re.S)

    drift = []
    for slug, c in CASES.items():
        out = os.path.join(ROOT, "work", slug, "index.html")
        html = build(slug, c, shell)
        old = open(out, encoding="utf-8").read() if os.path.exists(out) else None
        if old == html:
            print(f"  = work/{slug}/ بلا تغيير")
            continue
        if check:
            drift.append(slug)
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(html)
        print(f"  ✅ work/{slug}/index.html  {len(html)/1024:.0f} KB")

    if check and drift:
        print(f"\n  ❌ صفحات المشاريع قديمة: {', '.join(drift)}")
        print("  شغّل الأداة بلا --check.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
