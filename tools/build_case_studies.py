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
# النصّ الطويل لكل مشروع صار في مصدر واحد مع بيانات الشبكة والمختارات،
# فلا يبقى عنوانُ مشروعٍ في ملف ووصفُه في آخر.
from portfolio_data import CASES, strings_block, validate  # noqa: E402

validate()


# ------------------------------------------------------------------ rendering
def webp_size(path, name):
    """أبعاد ملف WebP من رأسه مباشرة — بلا مكتبات خارجية.

    الأبعاد الصريحة في الوسم هي ما يمنع اهتزاز الصفحة (CLS)، وقراءتها من
    الملف تعني أنها لا تكذب بعد استبدال صورة بأخرى.
    """
    w = h = 0
    with open(path, "rb") as fh:
        data = fh.read(64)
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
    return w, h


def img(name, alt, cls="case-figure", eager=False):
    """صورة المشروع بأبعادها الحقيقية."""
    path = os.path.join(ROOT, "assets", "images", f"{name}.webp")
    w, h = webp_size(path, name)
    # صورة البطل هي أكبر عنصر فوق الطيّة، وتأجيلها يؤجّل LCP بلا مقابل.
    prio = ('fetchpriority="high" decoding="async"' if eager
            else 'decoding="async" fetchpriority="low" loading="lazy"')
    return (f'<figure class="{cls}">\n'
            f'                        <img {prio} '
            f'src="/assets/images/{name}.webp" width="{w}" height="{h}" '
            f'alt="{alt}" />\n'
            f'                     </figure>')


def metric_panel(metrics, note, pad="                        "):
    """لوحة أرقام مبنيّة بـHTML لا صورةً — تُقرأ بقارئ الشاشة وتكبر مع التكبير.

    الأرقام تُفصَل بـ<bdi>: العربيّة RTL والقيم مثل «SAR 17.6K» و«3.60×» تبقى
    LTR، فلا تنقلب العلامة إلى يسار الرقم ولا يسبق «بعد» «قبل» في القراءة.
    """
    o = [f'{pad}<dl class="z2o-metrics">']
    for label, before, after in metrics:
        o.append(f'{pad}   <div class="z2o-metric">')
        o.append(f'{pad}      <dt class="z2o-metric-label">{label}</dt>')
        o.append(f'{pad}      <dd class="z2o-metric-value">')
        if before is not None:
            o.append(f'{pad}         <bdi class="z2o-metric-before">{before}</bdi>')
            o.append(f'{pad}         <span class="z2o-metric-arrow" aria-hidden="true">&rarr;</span>')
        o.append(f'{pad}         <bdi class="z2o-metric-after">{after}</bdi>')
        o.append(f'{pad}      </dd>')
        o.append(f'{pad}   </div>')
    o.append(f'{pad}</dl>')
    if note:
        o.append(f'{pad}<p class="z2o-metrics-note">{note}</p>')
    return "\n".join(o)


def evidence(name, alt, caption, pad="                        "):
    """لقطة أصلية داخل إطار محايد، مع رابط مباشر للحجم الكامل.

    الرابط عنصر <a> حقيقي إلى ملف الصورة: بلا جافاسكربت يفتح الصورة كما هي،
    ومع جافاسكربت يعترضه العارض. لا زرّ يقود إلى لا شيء.

    و`data-barba-prevent` شرطٌ لعمله: barba يلتقط نقرات الروابط قبل معالِجنا
    وينتقل بنفسه، فيفتح ملف .webp كأنه صفحة مهما استدعينا preventDefault.
    """
    path = os.path.join(ROOT, "assets", "images", f"{name}.webp")
    w, h = webp_size(path, name)
    url = f"/assets/images/{name}.webp"
    return "\n".join([
        f'{pad}<figure class="z2o-evidence">',
        f'{pad}   <div class="z2o-evidence-frame">',
        f'{pad}      <img decoding="async" fetchpriority="low" loading="lazy" src="{url}" '
        f'width="{w}" height="{h}" alt="{alt}" />',
        f'{pad}   </div>',
        f'{pad}   <figcaption class="z2o-evidence-caption">{caption}</figcaption>',
        f'{pad}   <a class="z2o-evidence-open" href="{url}" data-z2o-viewer data-barba-prevent>'
        f'<span class="z2o-evidence-open-text">View full size</span></a>',
        f'{pad}</figure>',
    ])


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
    elif k == "evidence":
        o += [evidence(n, a, cap) for n, a, cap in s["evidence"]]
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


def case_image(c):
    """الصورة التي تمثّل المشروع في JSON-LD وبطاقات المشاركة.

    المشاريع التي لا صورة بطل لها تمثّلها أول لقطة دليل فيها — وهي صورة
    حقيقية من الصفحة، لا غلاف عامّ لا علاقة له بالمشروع.
    """
    if c.get("hero_image"):
        return c["hero_image"][0]
    for sec in c["sections"]:
        if sec.get("evidence"):
            return sec["evidence"][0][0]
        if sec.get("image"):
            return sec["image"][0]
    raise SystemExit("  ❌ لا صورة تمثّل هذا المشروع")


def breadcrumb(title):
    """فتات التنقّل: عنصر <nav> حقيقي، والصفحة الحالية ليست رابطاً.

    الروابط وسم <a> لا onclick، فتعمل بلا جافاسكربت ومع barba معاً.
    """
    return "\n".join([
        '            <nav class="z2o-breadcrumb" aria-label="Breadcrumb" data-scroll-section>',
        '               <div class="container medium">',
        '                  <ol class="z2o-breadcrumb-list">',
        '                     <li><a href="/">Home</a></li>',
        '                     <li><a href="/work/">Our work</a></li>',
        f'                     <li><span aria-current="page">{title}</span></li>',
        '                  </ol>',
        '               </div>',
        '            </nav>',
    ])


def render_body(slug, c):
    o = [breadcrumb(c.get("breadcrumb") or c["h1"].split(" &mdash; ")[0])]
    # الفتحة: التصنيف والمقدّمة وبيانات المشروع، ثم صورة البطل أو لوحة الأرقام.
    # المشاريع التي دليلها لقطة لوحة قياس لا صورة بطل لها: لقطة بعرض 717 بكسل
    # ممدودة على نصف الشاشة تصير ضبابيّة وتُقرأ أسوأ من الأرقام نفسها. فتُبنى
    # الأرقام بـHTML هنا وتبقى اللقطة في موضعها بحجمها الأصلي أسفل الصفحة.
    o += ['            <section class="section case-overview case-study-lead once-in" data-scroll-section>',
          '               <div class="container medium">',
          '                  <div class="row">',
          '                     <div class="flex-col fade-in animate">',
          f'                        <p class="case-study-eyebrow">{c["eyebrow"]}</p>',
          f'                        <p class="case-study-intro">{c["intro"]}</p>',
          '                        <dl class="case-study-meta">']
    for k, v in c["meta"]:
        o += [f'                           <div><dt>{k}</dt><dd>{v}</dd></div>']
    o += ['                        </dl>', '                     </div>']
    if c.get("hero_image"):
        o += ['                     <div class="flex-col case-study-media fade-in animate">',
              '                        ' + img(*c["hero_image"], cls="case-figure case-figure-hero",
                                               eager=True),
              '                     </div>']
    elif c.get("hero_metrics"):
        o += ['                     <div class="flex-col case-study-media fade-in animate">',
              '                        <div class="z2o-metric-panel">',
              metric_panel(c["hero_metrics"], c.get("hero_metric_note"),
                           "                           "),
              '                        </div>',
              '                     </div>']
    o += ['                  </div>', '               </div>', '            </section>']

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
          strings_block('            '),
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
                       img=f"{BASE}/assets/images/{case_image(c)}.webp",
                       service=c["service_name"], base=BASE)
    h = h.replace("</head>", ld + "</head>", 1)

    # أرضية المعرض نفسها على صفحة المشروع، فلا تبدو الصفحتان من موقعين.
    h = h.replace('<main class="main" id="work-single"',
                  '<main class="main z2o-case-page" id="work-single"', 1)

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
    return re.sub(r"[ \t]+(?=\n)", "", h)


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
