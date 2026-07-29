#!/usr/bin/env python3
"""
ZERO 2 ONE — sitemap.xml generator + validator
===============================================

Scans the site's pages and (re)writes /sitemap.xml, then validates that the
output is well-formed XML.

Every page exists in two languages — English at `/…` and Arabic at `/ar/…` —
so each <url> also carries the full set of <xhtml:link rel="alternate">
hreflang annotations (en, ar, x-default). Google requires the alternates to be
listed on *both* sides of the pair, which is what the mirrored walk below
produces.

URLs are clean directory URLs (`/services/seo-riyadh/`), never `…/index.html`,
matching the rel=canonical on each page and the 301s in .htaccess.

Base URL resolution (first match wins):
    1. --base https://example.com
    2. env ZERO2ONE_BASE
    3. default https://zero2one.sa

`lastmod` is taken from each file's modification time.

Usage:
    python3 tools/generate_sitemap.py
    python3 tools/generate_sitemap.py --base https://zero2one.sa
    python3 tools/generate_sitemap.py --check     # validate existing, don't rewrite
"""
import datetime
import glob
import os
import sys
from xml.dom import minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BASE = "https://zero2one.sa"
OUT = os.path.join(ROOT, "sitemap.xml")

# priority / changefreq per English page
PRIORITY = {
    "/": ("1.0", "weekly"),
    "/services/": ("0.9", "monthly"),
    "/about/": ("0.7", "monthly"),
    "/contact/": ("0.7", "monthly"),
}
SERVICE_PAGE = ("0.8", "monthly")


def base_url():
    if "--base" in sys.argv:
        return sys.argv[sys.argv.index("--base") + 1].rstrip("/")
    return os.environ.get("ZERO2ONE_BASE", DEFAULT_BASE).rstrip("/")


def discover():
    """Every English page, as a site path ('/', '/about/', '/services/seo-riyadh/')."""
    paths = []
    for f in glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True):
        rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
        if rel.split("/")[0] in ("_archive", "ar", "node_modules"):
            continue
        paths.append("/" if rel == "index.html" else "/" + rel[: -len("index.html")])
    return sorted(set(paths), key=lambda p: (p.count("/"), p))


def meta_for(path):
    if path.startswith("/services/") and path != "/services/":
        return SERVICE_PAGE
    return PRIORITY.get(path, ("0.6", "monthly"))


def lastmod(rel_file):
    f = os.path.join(ROOT, rel_file)
    if not os.path.isfile(f):
        return None
    return datetime.date.fromtimestamp(os.path.getmtime(f)).isoformat()


def entry(loc, mod, prio, freq, en_url, ar_url):
    return f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{mod}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="{en_url}" />
    <xhtml:link rel="alternate" hreflang="ar" href="{ar_url}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="{en_url}" />
  </url>"""


def build(base):
    rows, missing = [], []
    for path in discover():
        prio, freq = meta_for(path)
        en_url = base + path
        ar_url = base + "/ar" + path
        en_file = "index.html" if path == "/" else path.lstrip("/") + "index.html"
        ar_file = "ar" + path + "index.html"

        rows.append(entry(en_url, lastmod(en_file), prio, freq, en_url, ar_url))
        if os.path.isfile(os.path.join(ROOT, ar_file)):
            rows.append(entry(ar_url, lastmod(ar_file), prio, freq, en_url, ar_url))
        else:
            missing.append(path)

    for path in missing:
        print(f"  ! no Arabic page for {path} — run tools/build_ar.py", file=sys.stderr)

    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + "\n".join(rows) + "\n</urlset>\n")


def validate(path):
    try:
        dom = minidom.parse(path)
        urls = dom.getElementsByTagName("url")
        locs = [u.getElementsByTagName("loc")[0].firstChild.data
                for u in urls if u.getElementsByTagName("loc")]
        print(f"VALID XML — {len(urls)} <url> entries:")
        for l in locs:
            print(f"  {l}")
        return True
    except Exception as e:
        print(f"INVALID XML: {e}")
        return False


def main():
    if "--check" in sys.argv:
        if not os.path.isfile(OUT):
            print("sitemap.xml not found")
            return 1
        return 0 if validate(OUT) else 1

    base = base_url()
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(build(base))
    print(f"Wrote {os.path.relpath(OUT, ROOT)} (base: {base})")
    print("-" * 60)
    return 0 if validate(OUT) else 1


if __name__ == "__main__":
    sys.exit(main())
