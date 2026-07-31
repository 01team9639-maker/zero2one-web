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
          ("contact/index.html", "ar/contact/index.html", "/contact/")]

# ---------------------------------------------------------------- Arabic <head>
AR_META = {
    "/": {
        "title": "زيرو تو ون | شركة تسويق رقمي في الرياض، السعودية",
        "description": "شركة تسويق رقمي في الرياض تأخذ علامتك من الصفر إلى الواحد: تصميم مواقع، سيو، حملات إعلانية، هوية تجارية، إدارة وسائل التواصل، ومتاجر إلكترونية.",
        "keywords": "شركة تسويق رقمي في الرياض, أفضل شركة تسويق رقمي بالرياض, شركة سيو بالرياض, تصميم مواقع بالرياض, إدارة حملات إعلانية جوجل, تصميم هوية تجارية, إدارة حسابات التواصل الاجتماعي, تصميم متاجر إلكترونية, وكالة تسويق سعودية",
    },
    "/services/": {
        "title": "خدمات التسويق الرقمي في الرياض | زيرو تو ون",
        "description": "ست خدمات تسويق رقمي مبنية كنظام واحد: تصميم المواقع، السيو، الإعلانات، الهوية التجارية، إدارة وسائل التواصل، وتطوير المتاجر — في الرياض وجميع أنحاء السعودية.",
        "keywords": "خدمات تسويق رقمي بالرياض, خدمات سيو السعودية, تصميم مواقع الرياض, إدارة حملات جوجل, تصميم هوية بصرية, إدارة سوشيال ميديا, تطوير متاجر إلكترونية السعودية",
    },
    "/services/web-design-riyadh/": {
        "title": "تصميم وتطوير المواقع في الرياض | زيرو تو ون",
        "description": "تصميم وتطوير مواقع سريعة ومتجاوبة وصديقة لمحركات البحث في الرياض والسعودية — مواقع شركات، صفحات هبوط عالية التحويل، متاجر إلكترونية، ولوحات تحكّم مخصّصة.",
        "keywords": "تصميم مواقع بالرياض, تصميم مواقع السعودية, شركة تصميم مواقع الرياض, تطوير موقع إلكتروني, صفحات هبوط, تصميم متجر إلكتروني",
    },
    "/services/seo-riyadh/": {
        "title": "تحسين محركات البحث SEO في الرياض | زيرو تو ون",
        "description": "خدمات سيو في الرياض: تحليل المنافسين، بحث الكلمات المفتاحية، السيو التقني، المحتوى، والسيو المحلي — نمو عضوي مستدام في السوق السعودي.",
        "keywords": "شركة سيو بالرياض, خدمات سيو السعودية, تحسين محركات البحث الرياض, سيو محلي, تحسين ظهور الموقع في جوجل, مصمم مواقع سيو في السعودية",
    },
    "/services/digital-advertising/": {
        "title": "إدارة الحملات الإعلانية في الرياض | زيرو تو ون",
        "description": "إدارة حملات إعلانية على جوجل وإنستغرام وسناب شات وتيك توك، مبنية على تكلفة العميل المحتمل لا على المشاهدات — للشركات في الرياض والسعودية.",
        "keywords": "إدارة حملات إعلانية جوجل, إعلانات جوجل الرياض, إدارة إعلانات سناب شات, إعلانات تيك توك السعودية, شركة إعلانات رقمية بالرياض",
    },
    "/services/brand-identity/": {
        "title": "تصميم الهوية التجارية في الرياض | زيرو تو ون",
        "description": "بناء هوية تجارية تبدأ من الاستراتيجية قبل التصميم: الشعار، النظام البصري، الألوان والخطوط، نبرة الصوت، ودليل علامة متكامل.",
        "keywords": "تصميم هوية تجارية, استراتيجية علامة تجارية, تصميم شعار الرياض, دليل هوية بصرية, شركة تصميم هوية السعودية",
    },
    "/services/social-media-management/": {
        "title": "إدارة وسائل التواصل وصناعة المحتوى في الرياض | زيرو تو ون",
        "description": "إدارة حسابات التواصل الاجتماعي بمنهج استراتيجي: خطة محتوى، تصميم بصري، ريلز، كتابة تسويقية، وتحليل أداء — لعلامات في الرياض والسعودية.",
        "keywords": "إدارة حسابات التواصل الاجتماعي, إدارة سوشيال ميديا الرياض, صناعة محتوى, تكلفة إدارة حسابات التواصل الاجتماعي, شركة سوشيال ميديا السعودية",
    },
    "/services/ecommerce-development/": {
        "title": "تطوير المتاجر الإلكترونية والأنظمة المخصّصة | زيرو تو ون",
        "description": "تطوير متاجر إلكترونية وأنظمة مخصّصة: بوابات الدفع، أنظمة الحجوزات وإدارة الطلبات، لوحات تحكّم، وتكاملات الشحن — مبنية على طريقة عملك.",
        "keywords": "تطوير متاجر إلكترونية السعودية, تصميم متجر إلكتروني الرياض, أنظمة إدارة طلبات, لوحة تحكم مخصصة, ربط بوابات الدفع",
    },
    "/about/": {
        "title": "من نحن — شركة تسويق رقمي في الرياض | زيرو تو ون",
        "description": "زيرو تو ون شركة نمو رقمي سعودية مقرّها العليا في الرياض. الاستراتيجية قبل التصميم، نظام واحد متكامل بدل خدمات متفرّقة، وتقارير تُقرأ في خمس دقائق.",
        "keywords": "من نحن زيرو تو ون, شركة تسويق رقمي في الرياض, وكالة تسويق سعودية, شركة تسويق العليا الرياض",
    },
    "/contact/": {
        "title": "تواصل معنا — شركة تسويق رقمي في الرياض | زيرو تو ون",
        "description": "تواصل مع زيرو تو ون في العليا، الرياض. اتصل على 966530307054+، راسلنا على واتساب، أو أرسل طلبك — نردّ في نفس يوم العمل من الأحد إلى الخميس.",
        "keywords": "تواصل مع شركة تسويق رقمي بالرياض, رقم شركة تسويق الرياض, عنوان شركة تسويق العليا, طلب عرض سعر تسويق رقمي",
    },
}

# Whole-element rewrites: markup that is built from several <span>s, so a
# text-node lookup cannot reach it (the JS runtime handled these the same way).
HTML_REPLACEMENTS = [
    # hero <h1>
    ('<h1 class="home-header-title"><span>Digital Marketing</span> Agency in Riyadh</h1>',
     '<h1 class="home-header-title"><span>وكالة تسويق رقمي</span> في الرياض</h1>'),
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

    def text(self, raw):
        key = norm(raw)
        if not key or key in KEEP_AS_IS:
            return None
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
        # Preserve the original node's surrounding whitespace. The dictionary is
        # keyed on normalised text, so without this a node like
        # " — Brands Built in Riyadh" comes back with its leading space eaten and
        # runs straight into the preceding element.
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
             ('href="/services/"', 'href="/ar/services/"')]
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
                            hit = tr.table.get(norm(v))
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
    html = re.sub(r'(<meta name="keywords"\s+content=")[^"]*(")',
                  lambda m: m.group(1) + meta["keywords"] + m.group(2), html, count=1)
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
    html = html.replace('<meta property="og:locale" content="en_US" />',
                        '<meta property="og:locale" content="ar_SA" />', 1)
    html = html.replace('<meta property="og:locale:alternate" content="ar_SA" />',
                        '<meta property="og:locale:alternate" content="en_US" />', 1)
    return html


# ------------------------------------------------------------------------ build
def build(check_only=False, missing_only=False):
    table = json.load(open(DICT_PATH, encoding="utf-8"))
    tr = Translator(table)
    written = []

    for en_rel, ar_rel, page_path in PAGES:
        src = open(os.path.join(ROOT, en_rel), encoding="utf-8").read()
        meta = AR_META[page_path]
        en_desc = re.search(r'<meta name="description"\s+content="([^"]*)"', src).group(1)

        out = rewrite_head(src, page_path, meta)
        for a, b in HTML_REPLACEMENTS:
            out = out.replace(a, b)
        out = translate_jsonld(out, tr, en_desc, meta["description"])
        out = ar_links(out)
        out = swap_switcher(out, page_path)
        out = translate_body(out, tr)

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

    if missing_only:
        print(f"{len(uniq)} untranslated string(s):\n")
        for m in uniq:
            print(json.dumps(m, ensure_ascii=False) + ": \"\",")
        return 1 if uniq else 0

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
