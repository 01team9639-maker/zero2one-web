#!/usr/bin/env python3
"""
ZERO 2 ONE — sections kept out of Google's index
=================================================

Decision (owner, 2026-11-21): every page under /work/ and /team/ — English and
Arabic — carries `noindex, follow`. /project(s)/ was asked for, then dropped by
the owner the same day; it is deliberately not in SECTIONS.

* `noindex`  — the page stays reachable for visitors but leaves search results.
* `follow`   — links on it still pass to the service pages, so nothing is lost.
* Not in robots.txt on purpose: a `Disallow` would stop Google from fetching the
  page at all, so it would never *see* the noindex and could keep the URL listed.
* Not in sitemap.xml: a sitemap says "index this", the page says "don't" —
  Search Console reports that contradiction. generate_sitemap.py skips any page
  whose own robots meta says noindex.

This module is the single place the rule lives. Generators that rebuild these
pages from another page's shell (build_case_studies.py copies a service page)
call `apply()` so a rebuild cannot silently restore `index, follow`.

Usage:
    python3 tools/noindex_sections.py           # check every page + sitemap.xml
    python3 tools/noindex_sections.py --apply   # set the meta on every page
"""
import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTIONS = ("work", "team")
ROBOTS = '<meta name="robots" content="noindex, follow" />'
ROBOTS_RE = re.compile(r'<meta\s+name="robots"\s+content="[^"]*"\s*/?>')


def is_noindex_path(rel):
    """True for 'work/…', 'ar/team/…', '/work/x/' and the like."""
    parts = [p for p in rel.replace(os.sep, "/").split("/") if p]
    if parts and parts[0] == "ar":
        parts = parts[1:]
    return bool(parts) and parts[0] in SECTIONS


def says_noindex(html):
    m = ROBOTS_RE.search(html)
    return bool(m) and "noindex" in m.group(0).lower()


def apply(html):
    """Return the page with exactly one `noindex, follow` robots meta."""
    if ROBOTS_RE.search(html):
        return ROBOTS_RE.sub(ROBOTS, html, count=1)
    return html.replace("</title>", "</title>\n   " + ROBOTS, 1)


def pages():
    for f in sorted(glob.glob(os.path.join(ROOT, "**", "index.html"), recursive=True)):
        rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
        if rel.split("/")[0] in ("blog", "node_modules", "_archive"):
            continue
        if is_noindex_path(rel):
            yield rel


def main():
    problems, count = [], 0
    for rel in pages():
        path = os.path.join(ROOT, rel)
        html = open(path, encoding="utf-8").read()
        count += 1
        if "--apply" in sys.argv:
            new = apply(html)
            if new != html:
                open(path, "w", encoding="utf-8").write(new)
                print(f"  noindex → {rel}")
            continue
        metas = ROBOTS_RE.findall(html)
        if metas != [ROBOTS]:
            problems.append(f"{rel}: robots meta is {metas or 'missing'}")

    sitemap = os.path.join(ROOT, "sitemap.xml")
    if "--apply" not in sys.argv and os.path.isfile(sitemap):
        for loc in re.findall(r"<loc>https?://[^/]+(/[^<]*)</loc>", open(sitemap, encoding="utf-8").read()):
            if is_noindex_path(loc):
                problems.append(f"sitemap.xml lists a noindex page: {loc}")

    for p in problems:
        print("  ❌ " + p)
    if not problems and "--apply" not in sys.argv:
        print(f"✅ {count} pages under {', '.join(SECTIONS)} are noindex and out of sitemap.xml")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
