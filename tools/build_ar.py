#!/usr/bin/env python3
"""
ZERO 2 ONE — Arabic site generator
==================================

Regenerates the whole `/ar/` tree from the English pages.

The Arabic version is *real static HTML* — its own URLs, its own
<title>/meta/JSON-LD, paired with the English pages through hreflang — rather
than a client-side DOM translation. That is the only shape Google can crawl,
index and rank, and it is why `assets/js/i18n.js` no longer translates at
runtime: it only routes visitors to the right language tree.

Sources of truth
    page structure & copy .... the English pages at the repo root
    translations ............. tools/ar-dictionary.json   (English -> Arabic)
    Arabic page metadata ..... AR_META below
    owner-supplied pages ..... tools/page-copy/<page>.json, listed in PAGE_COPY below:
                               copy the owner wrote in BOTH languages. Its Arabic is
                               exact for that one page — applied before the shared
                               dictionary, and never passed through brandify() or
                               isolate_numbers(), which would rewrite "Zero2One" and
                               inject bidi marks into words the owner wrote as is.

Workflow — after editing any English page, run:
    python3 tools/build_ar.py

Other modes:
    python3 tools/build_ar.py --missing   # English text with no translation yet
    python3 tools/build_ar.py --check     # build to memory, report only
"""
import html as html_mod
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_PATH = os.path.join(ROOT, "tools", "ar-dictionary.json")
BASE = "https://zero2one.sa"

SERVICE_SLUGS = [
    "web-design-riyadh",
    "seo-riyadh",
    "digital-advertising",
    "brand-identity",
    "social-media-management",
    "ecommerce-development",
]

# English page -> Arabic page
PAGES = [("index.html", "ar/index.html", "/")]
PAGES += [("services/index.html", "ar/services/index.html", "/services/")]
PAGES += [(f"services/{s}/index.html", f"ar/services/{s}/index.html", f"/services/{s}/")
          for s in SERVICE_SLUGS]
PAGES += [("about/index.html", "ar/about/index.html", "/about/"),
          ("work/index.html", "ar/work/index.html", "/work/"),
          ("contact/index.html", "ar/contact/index.html", "/contact/")]
# صفحات المشاريع — يولّدها tools/build_case_studies.py بالإنجليزية،
# وتُترجَم هنا كأي صفحة أخرى فتبقى الترجمات في قاموس واحد.
# قائمة المشاريع مصدرها tools/portfolio_data.py لا نسخةٌ هنا: مشروعٌ يُضاف
# إلى المعرض ولا يُسجَّل في الشجرة العربية كان سيمرّ صامتاً.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from portfolio_data import case_slugs  # noqa: E402

import build_faq  # noqa: E402  (service-page FAQ content: tools/faq/<service>.json)

CASE_SLUGS = case_slugs()
PAGES += [(f"work/{c}/index.html", f"ar/work/{c}/index.html", f"/work/{c}/")
          for c in CASE_SLUGS]

# ---------------------------------------------------------------- Arabic <head>
AR_META = {
    "/": {
        "title": "زيرو تو ون | شركة تسويق رقمي في الرياض، السعودية",
        "description": "شركة تسويق رقمي في الرياض تأخذ علامتك من الصفر إلى الواحد: تصميم مواقع، سيو، حملات إعلانية، هوية تجارية، إدارة وسائل التواصل، ومتاجر إلكترونية.",
    },
    "/services/": {
        "title": "خدمات التسويق الرقمي في الرياض | زيرو تو ون",
        "description": "ست خدمات تسويق رقمي كنظام واحد: تصميم المواقع، السيو، الإعلانات، الهوية التجارية، إدارة التواصل، والمتاجر — في الرياض والسعودية.",
    },
    "/services/web-design-riyadh/": {
        "title": "تصميم وتطوير المواقع في الرياض | زيرو تو ون",
        "description": "تصميم وتطوير مواقع سريعة ومتجاوبة وصديقة لمحركات البحث في الرياض والسعودية — مواقع شركات، صفحات هبوط عالية التحويل، متاجر إلكترونية، ولوحات تحكّم مخصّصة.",
    },
    "/services/seo-riyadh/": {
        "title": "تحسين محركات البحث SEO في الرياض | زيرو تو ون",
        "description": "خدمات سيو في الرياض: تحليل المنافسين، بحث الكلمات المفتاحية، السيو التقني، المحتوى، والسيو المحلي — نمو عضوي مستدام في السوق السعودي.",
    },
    "/services/digital-advertising/": {
        "title": "إدارة الحملات الإعلانية في الرياض | زيرو تو ون",
        "description": "إدارة حملات إعلانية على جوجل وإنستغرام وسناب شات وتيك توك، مبنية على تكلفة العميل المحتمل لا على المشاهدات — للشركات في الرياض والسعودية.",
    },
    "/services/brand-identity/": {
        "title": "تصميم الهوية التجارية في الرياض | زيرو تو ون",
        "description": "بناء هوية تجارية تبدأ من الاستراتيجية قبل التصميم: الشعار، النظام البصري، الألوان والخطوط، نبرة الصوت، ودليل علامة متكامل.",
    },
    "/services/social-media-management/": {
        "title": "إدارة وسائل التواصل وصناعة المحتوى في الرياض | زيرو تو ون",
        "description": "إدارة حسابات التواصل الاجتماعي بمنهج استراتيجي: خطة محتوى، تصميم بصري، ريلز، كتابة تسويقية، وتحليل أداء — لعلامات في الرياض والسعودية.",
    },
    "/services/ecommerce-development/": {
        "title": "تطوير المتاجر الإلكترونية والأنظمة المخصّصة | زيرو تو ون",
        "description": "تطوير متاجر إلكترونية وأنظمة مخصّصة: بوابات الدفع، أنظمة الحجوزات وإدارة الطلبات، لوحات تحكّم، وتكاملات الشحن — مبنية على طريقة عملك.",
    },
    "/about/": {
        "title": "من نحن — شركة تسويق رقمي في الرياض | زيرو تو ون",
        "description": "زيرو تو ون شركة نمو رقمي سعودية مقرّها العليا في الرياض. الاستراتيجية قبل التصميم، نظام واحد متكامل بدل خدمات متفرّقة، وتقارير تُقرأ في خمس دقائق.",
    },
    "/work/": {
        "title": "أعمالنا — هويات وحملات ونتائج بحث | زيرو تو ون",
        "description": "أعمال زيرو تو ون: هويات بصرية ومحتوى إبداعي وتحسين محركات بحث وحملات إعلانية في السعودية ومصر والكويت والإمارات — بلقطات لوحات القياس كما هي.",
        "keywords": "أعمال شركة تسويق رقمي بالرياض, معرض أعمال تسويق, دراسات حالة تسويق السعودية, مشاريع هوية تجارية الرياض, حملات إعلانية السعودية",
    },
    "/work/alostaz-seo/": {
        "title": "سيو منصة أستاذ — من 3.21 ألف إلى 28.3 ألف نقرة | زيرو تو ون",
        "description": "ستة أشهر من تحسين محركات البحث لمنصة أستاذ السعودية: سيرش كونسول يسجّل ارتفاع النقرات من 3.21K إلى 28.3K ومتوسط الترتيب من 21.7 إلى 8.2.",
    },
    "/work/cosmetic-surgery-egypt-seo/": {
        "title": "سيو مركز جراحة تجميل في مصر — 29 ألف نقرة | زيرو تو ون",
        "description": "بناء الظهور في البحث من الصفر لمركز جراحة تجميل في مصر: 29K نقرة و1.36M ظهور كما تعرضها لوحة سيرش كونسول خلال نحو أحد عشر شهراً.",
    },
    "/work/orthopedic-clinic-egypt-seo/": {
        "title": "سيو عيادة عظام في مصر — 110 ألف نقرة | زيرو تو ون",
        "description": "سنة كاملة من بيانات البحث لعيادة عظام في مصر: 110K نقرة و3.81M ظهور ومتوسط ترتيب 9، كما تعرضها لوحة سيرش كونسول بلا تعديل.",
    },
    "/work/alhokail-seo/": {
        "title": "سيو مستشفيات الحقيل — مقارنة ربعين | زيرو تو ون",
        "description": "تحسين محركات البحث لمجموعة الحقيل الطبية: النقرات من 14.1K إلى 38.2K والظهور من 566K إلى 1.67M بين ربعين متتاليين — ومعها ما تراجع في الأرقام.",
    },
    "/work/google-ads-conversion-value/": {
        "title": "حملة إعلانات جوجل — قيمة التحويل من 0.54 إلى 3.60 | زيرو تو ون",
        "description": "حساب إعلانات جوجل أُعيد بناؤه حول المنتجات الرابحة: قيمة التحويل المُبلَّغة لكل ريال إنفاق من 0.54 إلى 3.60 بين أبريل وأغسطس 2026.",
    },
    "/work/kuwait-tutoring-instagram-ads/": {
        "title": "إعلانات إنستجرام لمركز دروس في الكويت | زيرو تو ون",
        "description": "حملات محادثات على إنستجرام لمركز تعليمي في الكويت: 267 محادثة بمتوسط 5.05 دولار للمحادثة، مع تفصيل الإعلانات كما يعرضه مدير إعلانات ميتا.",
    },
    "/work/habba/": {
        "title": "هوية حبّة التجارية — محمصة ومقهى قهوة مختصة | زيرو تو ون",
        "description": "كيف بنينا هوية تجارية متكاملة لعلامة حبّة للقهوة المختصة: نظام الشعار، قواعد الألوان، المطبوعات والقوائم والتغليف والزي واللوحات — مصمّمة لتبقى واضحة بكل مقاس.",
    },
    "/work/alrahwanji-paints/": {
        "title": "حملة دهانات الرهونجي الإعلانية على فيسبوك وإنستغرام | زيرو تو ون",
        "description": "كيف نقلنا دهانات الرهونجي من ترويج غير منظّم إلى إعلان مقيس على فيسبوك وإنستغرام: أرقام الوصول والتفاعل وأماكن الظهور كما وردت، وميزانية لا تُزاد إلا بعد ثبات النتائج.",
    },
    "/contact/": {
        "title": "تواصل معنا — شركة تسويق رقمي في الرياض | زيرو تو ون",
        "description": "تواصل مع زيرو تو ون في العليا، الرياض. اتصل على 966530307054+، راسلنا على واتساب، أو أرسل طلبك — نردّ في نفس يوم العمل من الأحد إلى الخميس.",
    },
}

# Pages whose copy the owner supplied in both languages and wants shipped verbatim.
# The file holds {"meta": {title, description}, "pairs": [{id, en, ar}]}: `pairs` is an
# exact English -> Arabic table used for that page only, so the shared dictionary (and
# every other page's wording, e.g. "How We Work" -> "كيف نعمل") stays as it is.
PAGE_COPY = {
    "/services/seo-riyadh/": "tools/page-copy/seo-riyadh.json",
    "/": "tools/page-copy/home.json",
}


def load_page_copy(page_path, include_drafts=False):
    """The owner-supplied exact Arabic for a page: its PAGE_COPY file (if any) plus the
    service FAQ (tools/faq/<service>.json — approved items only, or drafts too in the
    local review preview). Returns None for a page with neither."""
    rel = PAGE_COPY.get(page_path)
    exact, meta, replace, files = {}, None, [], []

    def add(en, ar, origin):
        key = norm(en)
        if key in exact and exact[key] != ar.strip():
            raise SystemExit(f"{origin}: two different Arabic texts for {key[:60]!r}")
        exact[key] = ar.strip()

    if rel:
        data = json.load(open(os.path.join(ROOT, rel), encoding="utf-8"))
        for pair in data["pairs"]:
            add(pair["en"], pair["ar"], rel)
        meta = {k: html_mod.escape(v["ar"], quote=True) for k, v in data["meta"].items()}
        replace = data.get("html_replacements", [])
        files.append(rel)
    slug = page_path.strip("/").split("/")[-1] if page_path.startswith("/services/") else None
    if slug in build_faq.SERVICE_SLUGS:
        faq = build_faq.pairs(slug, include_drafts)
        for en, ar in faq:
            add(en, ar, f"tools/faq/{slug}.json")
        if faq:
            files.append(f"tools/faq/{slug}.json")
    if not files:
        return None
    return {"exact": exact, "meta": meta, "replace": replace, "file": " + ".join(files)}


# Whole-element rewrites: markup that is built from several <span>s, so a
# text-node lookup cannot reach it (the JS runtime handled these the same way).
HTML_REPLACEMENTS = [
    # hero <h1>
    ('<h1 class="home-header-title" id="main-content" tabindex="-1"><span>Digital Marketing</span> Agency in Riyadh</h1>',
     '<h1 class="home-header-title" id="main-content" tabindex="-1"><span>وكالة تسويق رقمي</span> في الرياض</h1>'),
    # hero brand wordmark (GSAP clones it, but it is one element in the source)
    ('ZERO\n                                <span style="color:#F9460E;font-weight:900">2</span> ONE<span class="spacer">—</span>',
     'من الصفر <span style="color:#F9460E;font-weight:900">إلى</span> الواحد<span class="spacer">—</span>'),
    # logo hover label
    ('<span class="brand-label">ZERO 2 ONE</span>',
     '<span class="brand-label">من الصفر إلى الواحد</span>'),
    # footer headline
    ('<h2><span>Let’s start</span><span>your journey</span></h2>',
     '<h2><span>لنبدأ</span><span>رحلتك</span></h2>'),
    # loading screen brand
    ('<div class="loading-brand">ZERO 2 ONE</div>',
     '<div class="loading-brand">من الصفر إلى الواحد</div>'),
    ('<span class="loading-brand-site">ZERO 2 ONE</span>',
     '<span class="loading-brand-site">من الصفر إلى الواحد</span>'),
    # the contact form tells send.php which language the enquiry came from
    ('<input type="hidden" name="lang" value="en" />',
     '<input type="hidden" name="lang" value="ar" />'),
]

# Attribute values that carry visible or indexable text.
TRANSLATED_ATTRS = ("alt", "title", "aria-label", "placeholder", "value")

CURLY = {"‘": "'", "’": "'", "“": '"', "”": '"'}

# Text that is deliberately identical in both languages: the brand mark, contact
# identifiers, the JS-written clock, SVG <title>s, and the loading screen's
# "hello in many languages" motif (a design element, not copy).
KEEP_AS_IS = {
    "ZERO 2 ONE", "zero2one", "info@zero2one.sa", "arrow-up-right", "English",
    "Hello", "Bonjour", "Ciao", "Olá", "Hallå", "Guten tag", "Hallo",
    "1:04 PM GMT+3", "X", "Instagram", "Tiktok", "Facebook", "Youtube", "LinkedIn",
    "en", "ar",
}


def norm(s):
    """Normalise for dictionary lookup: decode entities, straighten curly quotes,
    collapse whitespace. Mirrors norm() in i18n.js plus entity decoding, because
    the dictionary is written with literal characters ("A & B", not "A &amp; B")."""
    s = html_mod.unescape(s)
    for a, b in CURLY.items():
        s = s.replace(a, b)
    return " ".join(s.split())


def isolate_numbers(s):
    """Wrap whole numbers in LRI…PDI so they read left-to-right inside RTL text.
    A digit run touching a Latin letter is part of an identifier (the "2" in
    info@zero2one.sa) and is left alone. Mirrors isolateNumbers() in i18n.js."""
    def repl(m):
        tok, i, j = m.group(0), m.start(), m.end()
        before = s[i - 1] if i else ""
        after = s[j] if j < len(s) else ""
        if re.match(r"[A-Za-z]", before) or re.match(r"[A-Za-z]", after):
            return tok
        return "⁦" + tok + "⁩"
    return re.sub(r"\(?\+?\d[\d\s./+-]*\d\)?|\+?\d", repl, s)


def brandify(s):
    return re.sub(r"(?<!@)zero\s?(?:2|to)\s?one", "«من الصفر إلى الواحد»", s, flags=re.I)


class Translator:
    def __init__(self, table):
        self.table = {norm(k): v for k, v in table.items()}
        self.missing = []
        self.exact = {}          # the current page's owner-supplied copy (see PAGE_COPY)
        self.exact_used = set()

    def lookup(self, raw):
        """Raw translation for JSON-LD strings: the page's exact copy, else the dictionary."""
        key = norm(raw)
        if key in self.exact:
            self.exact_used.add(key)
            return self.exact[key]
        return self.table.get(key)

    def text(self, raw):
        key = norm(raw)
        if not key or key in KEEP_AS_IS:
            return None
        if key in self.exact:
            # Owner-supplied Arabic: escaped for HTML and nothing else — no brandify(),
            # no isolate_numbers().
            self.exact_used.add(key)
            return html_mod.escape(self.exact[key], quote=True)
        hit = self.table.get(key)
        if hit is None:
            # Nothing with at least two Latin letters is prose; skip punctuation,
            # numbers, and text that is already Arabic.
            if not re.search(r"[A-Za-z]{2}", key):
                return None
            self.missing.append(key)
            return None
        # Re-escape the one entity that matters inside text nodes and attributes.
        return isolate_numbers(brandify(hit)).replace("&", "&amp;")


# regions we must never touch
SKIP_BLOCK = re.compile(r"(?is)<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->")
TEXT_NODE = re.compile(r">([^<>]+)<")


def translate_body(html, tr):
    """Translate text nodes and translatable attributes inside <body>, skipping
    script/style/comments. The <head> is handled separately by rewrite_head(),
    which sets hand-written Arabic metadata."""
    split = html.index("<body")
    head, body = html[:split], html[split:]

    out, pos = [], 0
    for m in SKIP_BLOCK.finditer(body):
        out.append(_translate_chunk(body[pos:m.start()], tr))
        out.append(m.group(0))
        pos = m.end()
    out.append(_translate_chunk(body[pos:], tr))
    return head + "".join(out)


def _translate_chunk(chunk, tr):
    def node(m):
        raw = m.group(1)
        hit = tr.text(raw)
        if not hit:
            return m.group(0)
        # Preserve the leading/trailing whitespace of the original node. The
        # dictionary is keyed on normalised text, so without this a node like
        # " — Brands Built in Riyadh" comes back with its leading space eaten
        # and runs straight into the preceding element.
        lead = ' ' if raw[:1].isspace() else ''
        trail = ' ' if raw[-1:].isspace() else ''
        return '>' + lead + hit + trail + '<'
    chunk = TEXT_NODE.sub(node, chunk)

    def attr(m):
        hit = tr.text(m.group(2))
        return f'{m.group(1)}="{hit}"' if hit else m.group(0)
    return re.sub(r'\b(' + "|".join(TRANSLATED_ATTRS) + r')="([^"]+)"', attr, chunk)


# --------------------------------------------------------------- link rewriting
def ar_links(html):
    rules = [('href="/"', 'href="/ar/"'),
             ('href="/#', 'href="/ar/#'),
             ('href="/about/"', 'href="/ar/about/"'),
             ('href="/contact/"', 'href="/ar/contact/"'),
             ('href="/services/"', 'href="/ar/services/"'),
             ('href="/blog/"', 'href="/blog/ar/"'),
             ('href="/work/"', 'href="/ar/work/"')]
    rules += [(f'href="/work/{c}/"', f'href="/ar/work/{c}/"') for c in CASE_SLUGS]
    rules += [(f'href="/services/{s}/"', f'href="/ar/services/{s}/"') for s in SERVICE_SLUGS]
    for a, b in rules:
        html = html.replace(a, b)
    return html


LANG_LI = re.compile(r'<li class="btn btn-link btn-lang">.*?</li>\s*', re.S)


def swap_switcher(html, en_path):
    """On an Arabic page the switch points back at the English counterpart."""
    li = f'''<li class="btn btn-link btn-lang">
                            <a href="{en_path}" class="btn-click magnetic" data-strength="20" data-strength-text="10"
                                hreflang="en" lang="en" data-barba-prevent>
                                <span class="btn-text">
                                    <span class="btn-text-inner">English</span>
                                </span>
                            </a>
                        </li>
                    '''
    html, n = LANG_LI.subn(li, html)
    assert n == 2, f"expected 2 language switchers, replaced {n}"
    return html


# ----------------------------------------------------------------- JSON-LD pass
def translate_jsonld(html, tr, en_desc, ar_desc):
    """Rewrite each JSON-LD block for the Arabic page: translate human-readable
    strings, point page URLs at /ar/, and mark the language.

    The `#organization` and `#website` nodes keep their English `url` on purpose —
    both language trees describe one organisation and one website, so those two
    entities must resolve to a single canonical address. Only page-level URLs
    (`Service.url`, breadcrumb `item`, page `url`) get the /ar/ prefix.
    """
    STRINGS = ("name", "alternateName", "description", "text", "serviceType",
               "slogan", "headline", "articleBody")
    SINGLETON = ("#organization", "#website")

    def walk(node):
        if isinstance(node, dict):
            node_id = node.get("@id", "")
            is_singleton = any(tag in node_id for tag in SINGLETON)
            for k, v in list(node.items()):
                if isinstance(v, str):
                    if k in STRINGS:
                        if k == "description" and norm(v) == norm(en_desc):
                            node[k] = ar_desc
                        else:
                            hit = tr.lookup(v)
                            if hit:
                                node[k] = hit
                    elif k == "inLanguage":
                        node[k] = "ar"
                    elif k in ("url", "item") and v.startswith(BASE):
                        if not (is_singleton and k == "url"):
                            node[k] = to_ar_url(v)
                else:
                    walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    def block(m):
        try:
            data = json.loads(m.group(1))
        except ValueError:
            return m.group(0)
        walk(data)
        return ('<script type="application/ld+json">\n   '
                + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
                + "\n   </script>")

    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', block, html, flags=re.S)


def to_ar_url(url):
    path = url[len(BASE):]
    if path.startswith("/ar/"):
        return url
    return BASE + "/ar" + (path if path.startswith("/") else "/" + path)


# ------------------------------------------------------------------- head pass
def rewrite_head(html, page_path, meta):
    en_url = BASE + page_path
    ar_url = to_ar_url(en_url)

    html = html.replace('<html lang="en">', '<html lang="ar" dir="rtl">', 1)
    html = html.replace('<body data-barba="wrapper">',
                        '<body class="lang-ar" data-barba="wrapper">', 1)

    html = re.sub(r"<title>.*?</title>", f"<title>{meta['title']}</title>", html, count=1, flags=re.S)
    html = re.sub(r'(<meta name="description"\s+content=")[^"]*(")',
                  lambda m: m.group(1) + meta["description"] + m.group(2), html, count=1)
    html = html.replace(f'<link rel="canonical" href="{en_url}" />',
                        f'<link rel="canonical" href="{ar_url}" />', 1)

    for prop in ("og:title", "twitter:title"):
        html = re.sub(rf'((?:property|name)="{prop}"\s+content=")[^"]*(")',
                      lambda m: m.group(1) + meta["title"] + m.group(2), html, count=1)
    for prop in ("og:description", "twitter:description"):
        html = re.sub(rf'((?:property|name)="{prop}"\s+content=")[^"]*(")',
                      lambda m: m.group(1) + meta["description"] + m.group(2), html, count=1, flags=re.S)
    html = html.replace(f'<meta property="og:url" content="{en_url}" />',
                        f'<meta property="og:url" content="{ar_url}" />', 1)
    # Arabic share card, with Arabic alt text
    html = html.replace('/assets/images/og-cover.jpg', '/assets/images/og-cover-ar.jpg')
    html = re.sub(r'(<meta property="og:image:alt" content=")[^"]*(")',
                  lambda m: m.group(1) + 'زيرو تو ون — وكالة تسويق رقمي في الرياض' + m.group(2),
                  html, count=1)

    html = html.replace('<meta property="og:locale" content="en_US" />',
                        '<meta property="og:locale" content="ar_SA" />', 1)
    html = html.replace('<meta property="og:locale:alternate" content="ar_SA" />',
                        '<meta property="og:locale:alternate" content="en_US" />', 1)
    return html


# ------------------------------------------------------------------------ build
def render_arabic(src, page_path, tr, include_drafts=False, copy="load"):
    """One English page -> its Arabic page (text of the page, not written anywhere).
    `include_drafts` is for the local review preview (tools/build_faq.py --preview)."""
    if copy == "load":
        copy = load_page_copy(page_path, include_drafts)
    meta = copy["meta"] if copy and copy["meta"] else AR_META[page_path]
    tr.exact, tr.exact_used = (copy["exact"] if copy else {}), set()
    en_desc = re.search(r'<meta name="description"\s+content="([^"]*)"', src).group(1)

    out = rewrite_head(src, page_path, meta)
    for a, b in HTML_REPLACEMENTS:
        out = out.replace(a, b)
    if copy:                 # this page's own asset/markup swaps (e.g. the -en images -> -ar)
        for a, b in copy["replace"]:
            if a not in out:
                raise SystemExit(f"{copy['file']}: html_replacements entry matches nothing: {a[:70]!r}")
            out = out.replace(a, b)
    out = translate_jsonld(out, tr, en_desc, meta["description"])
    out = ar_links(out)
    out = swap_switcher(out, page_path)
    out = translate_body(out, tr)
    if copy:
        unused = sorted(set(copy["exact"]) - tr.exact_used)
        if unused:
            tr.unused = getattr(tr, "unused", []) + [(page_path, k) for k in unused]
    return out


def build(check_only=False, missing_only=False):
    table = json.load(open(DICT_PATH, encoding="utf-8"))
    tr = Translator(table)
    written = []
    tr.unused = []           # supplied entries that never reached their page

    for en_rel, ar_rel, page_path in PAGES:
        src = open(os.path.join(ROOT, en_rel), encoding="utf-8").read()
        copy = load_page_copy(page_path)
        out = render_arabic(src, page_path, tr, copy=copy)

        if not (check_only or missing_only):
            dst = os.path.join(ROOT, ar_rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "w", encoding="utf-8").write(out)
        written.append((ar_rel, len(out)))

    seen, uniq = set(), []
    for m in tr.missing:
        if m not in seen:
            seen.add(m)
            uniq.append(m)

    unused_copy = tr.unused
    if unused_copy:
        print(f"\n{len(unused_copy)} page-copy entr{'y' if len(unused_copy) == 1 else 'ies'} never matched a text node "
              "(the English page and tools/page-copy/*.json or tools/faq/*.json have drifted apart):")
        for page, key in unused_copy[:20]:
            print(f"  - {page}: {key[:90]}")

    if missing_only:
        print(f"{len(uniq)} untranslated string(s):\n")
        for m in uniq:
            print(json.dumps(m, ensure_ascii=False) + ": \"\",")
        return 1 if (uniq or unused_copy) else 0

    for rel, size in written:
        print(f"  wrote {rel:38s} {size/1024:6.1f} KB")
    print(f"\n{len(written)} Arabic pages, {len(table)} dictionary entries, "
          f"{len(uniq)} untranslated string(s)")
    if uniq:
        print("\nUntranslated (run --missing for a paste-ready list):")
        for m in uniq[:15]:
            print("  -", m[:96])
    return 0


if __name__ == "__main__":
    sys.exit(build(check_only="--check" in sys.argv, missing_only="--missing" in sys.argv))
