#!/usr/bin/env python3
"""Branded error pages: /404.html and /ar/404.html.

A missing URL used to get Hostinger's generic page, "This Page Does Not Exist":
English only, no logo, no menu, not one link back into the site (checked
2026-10-19). These pages are the FAQ page's shell — head assets, loader, menu,
footer — with its content swapped for a short message and four ways back. They
are rebuilt from that shell on every `sh tools/build.sh`, so they follow the
site's chrome instead of drifting from it.

ErrorDocument in .htaccess and ar/.htaccess serves them with the real 404
status. They are noindex and carry no canonical, hreflang, social card or
JSON-LD: an error page must never become a search result, and the address it
appears under is whatever was mistyped.

Usage:
    python3 tools/build_404.py          # write both pages
    python3 tools/build_404.py --check  # exit 1 if either is out of date
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COPY = {
    "en": dict(
        shell="faqs/index.html", out="404.html", switch="/ar/",
        title="Page not found | ZERO 2 ONE",
        description="This page doesn't exist. Head back to ZERO 2 ONE's home page, services, work or contact page.",
        label="Page not found",
        h1="This page doesn't exist",
        lead="The link may be old or mistyped. Here are some places to start:",
        nav="Back to the site",
        links=[("Home", "/"), ("Our Services", "/services/"), ("Our Work", "/work/"), ("Contact Us", "/contact/")],
    ),
    "ar": dict(
        shell="ar/faqs/index.html", out="ar/404.html", switch="/",
        title="الصفحة غير موجودة | زيرو تو ون",
        description="هذه الصفحة غير موجودة. ارجع إلى الرئيسية أو خدماتنا أو أعمالنا أو صفحة التواصل.",
        label="الصفحة غير موجودة",
        h1="هذه الصفحة غير موجودة",
        lead="ربما الرابط قديم أو فيه خطأ في الكتابة. ابدأ من هنا:",
        nav="العودة إلى الموقع",
        links=[("الرئيسية", "/ar/"), ("خدماتنا", "/ar/services/"), ("أعمالنا", "/ar/work/"), ("تواصل معنا", "/ar/contact/")],
    ),
}

# Page-specific head entries an error page must not carry.
HEAD_DROP = [
    r'\s*<link rel="canonical"[^>]*>',
    r'\s*<link rel="alternate" hreflang="[^"]*"[^>]*>',
    r'\s*<meta property="og:[^"]*"[^>]*>',
    r'\s*<meta name="twitter:[^"]*"[^>]*>',
    r'\s*<meta name="keywords"[^>]*>',
    r'\s*<!-- (?:Language versions \(hreflang\)|Open Graph|Twitter[^>]*) -->',
    r'\s*<script type="application/ld\+json">[\s\S]*?</script>',
]


def sub1(pattern, repl, text, what, flags=0):
    out, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"build_404: FAQ shell changed — could not find {what}. Update tools/build_404.py.")
    return out


def button(label, href):
    return ('<div class="btn btn-normal"><a class="btn-click magnetic" href="%s" data-strength="20" '
            'data-strength-text="10"><div class="btn-fill"></div><span class="btn-text">'
            '<span class="btn-text-inner">%s</span></span></a></div>' % (href, html.escape(label)))


def render(lang):
    c = COPY[lang]
    page = open(os.path.join(ROOT, c["shell"]), encoding="utf-8").read()
    head_end = page.index("</head>")
    head, body = page[:head_end], page[head_end:]

    head = sub1(r"<title>[^<]*</title>", "<title>%s</title>" % html.escape(c["title"]), head, "<title>")
    head = sub1(r'<meta name="description" content="[^"]*"', '<meta name="description" content="%s"'
                % html.escape(c["description"], quote=True), head, "the meta description")
    head = sub1(r'<meta name="robots" content="[^"]*"', '<meta name="robots" content="noindex, follow"',
                head, "the robots meta")
    for pattern in HEAD_DROP:
        head = re.sub(pattern, "", head)

    label = html.escape(c["label"])
    body = sub1(r'(<div class="loading-word active">)[^<]*', r"\g<1>" + label, body, "the active loading word")
    body = sub1(r'(<span class="loading-brand-name">)[^<]*', r"\g<1>" + label, body, "the loader page name")
    body = body.replace('<li class="btn btn-link active"', '<li class="btn btn-link"')
    body, n = re.subn(r'(<li class="btn btn-link btn-lang">\s*<a href=")[^"]*(")',
                      r"\g<1>" + c["switch"] + r"\g<2>", body)
    if n != 2:
        raise SystemExit("build_404: expected 2 language switches in the FAQ shell, found %d" % n)

    hero = body.find('<section class="rf-hero rf-simple-hero"')
    top = body.find('<section class="section case-top-wrap')
    if hero < 0 or top < 0:
        raise SystemExit("build_404: FAQ shell changed — hero or top wrapper missing. Update tools/build_404.py.")
    # the top wrapper holds the menu, the hero and every FAQ section; keep its
    # own closing tag and replace everything from the hero up to it
    depth, close = 0, None
    for m in re.finditer(r"<section\b|</section>", body[top:]):
        depth += 1 if m.group(0) != "</section>" else -1
        if depth == 0:
            close = top + m.start()
            break
    if close is None or close < hero:
        raise SystemExit("build_404: could not find the end of the FAQ shell's top wrapper.")
    # drop the leftover comment that labels the shell's hero, if any
    lead_in = re.search(r"\s*<!-- [^>]*HERO[^>]* -->\s*$", body[:hero])
    start = lead_in.start() if lead_in else hero
    links = "".join(button(t, h) for t, h in c["links"])
    content = (
        '\n            <section class="rf-hero rf-simple-hero z2o-404" data-scroll-section><div class="rf-inner">'
        '<p class="z2o-404-code" aria-hidden="true">404</p>'
        '<h1 id="main-content" tabindex="-1">%s</h1>'
        '<p class="z2o-404-lead">%s</p>'
        '<nav class="z2o-404-links" aria-label="%s">%s</nav>'
        "</div></section>" % (html.escape(c["h1"]), html.escape(c["lead"]), html.escape(c["nav"], quote=True), links)
    )
    body = body[:start] + content + body[close:]
    return head + body


def main():
    check = "--check" in sys.argv[1:]
    stale = []
    for lang, c in COPY.items():
        out = os.path.join(ROOT, c["out"])
        new = render(lang)
        cur = open(out, encoding="utf-8").read() if os.path.exists(out) else None
        if cur != new:
            stale.append(c["out"])
            if not check:
                with open(out, "w", encoding="utf-8") as fh:
                    fh.write(new)
    if check and stale:
        print("stale error pages: " + ", ".join(stale) + " — run python3 tools/build_404.py")
        return 1
    print(("up to date" if not stale else "wrote " + ", ".join(stale)) + " — /404.html, /ar/404.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
