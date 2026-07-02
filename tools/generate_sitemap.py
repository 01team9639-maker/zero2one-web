#!/usr/bin/env python3
"""
ZERO 2 ONE — sitemap.xml generator + validator
===============================================

Scans the site's HTML pages and (re)writes /sitemap.xml, then validates that
the output is well-formed XML.

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
import os
import sys
import glob
import datetime
from xml.dom import minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_BASE = "https://zero2one.sa"
OUT = os.path.join(ROOT, "sitemap.xml")


def base_url():
    if "--base" in sys.argv:
        return sys.argv[sys.argv.index("--base") + 1].rstrip("/")
    return os.environ.get("ZERO2ONE_BASE", DEFAULT_BASE).rstrip("/")


def discover_pages():
    pages = []
    for pat in ("*.html", "pages/**/*.html"):
        for p in glob.glob(os.path.join(ROOT, pat), recursive=True):
            rel = os.path.relpath(p, ROOT)
            if rel.split(os.sep)[0] == "_archive":
                continue
            pages.append(rel)
    return sorted(set(pages))


def loc_for(base, rel):
    # index.html at the site root becomes "/"
    if rel == "index.html":
        return base + "/"
    return base + "/" + rel.replace(os.sep, "/")


def build(base):
    rows = []
    for rel in discover_pages():
        mtime = datetime.date.fromtimestamp(os.path.getmtime(os.path.join(ROOT, rel)))
        home = rel == "index.html"
        rows.append(f"""  <url>
    <loc>{loc_for(base, rel)}</loc>
    <lastmod>{mtime.isoformat()}</lastmod>
    <changefreq>{'weekly' if home else 'monthly'}</changefreq>
    <priority>{'1.0' if home else '0.8'}</priority>
  </url>""")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
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
            print("sitemap.xml not found"); return 1
        return 0 if validate(OUT) else 1

    base = base_url()
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(build(base))
    print(f"Wrote {os.path.relpath(OUT, ROOT)} (base: {base})")
    print("-" * 60)
    return 0 if validate(OUT) else 1


if __name__ == "__main__":
    sys.exit(main())
