#!/usr/bin/env python3
"""
ZERO 2 ONE — Static-site SEO / code audit
==========================================

Scans every HTML page in the project and reports:
  * Images missing (or with empty) alt text
  * <title> presence, length, and duplicates across pages
  * <meta name="description"> presence, length, and duplicates
  * Content heading structure (exactly one <h1>, no skipped levels)
  * Broken internal links (href/src pointing to files that don't exist on disk)
  * Missing <html lang> / <link rel="canonical">
  * Near-duplicate page *content* (site chrome excluded)

The parser is "chrome aware": headings and body text inside the loading
screen, side menu, top nav and footer are ignored so the audit reflects the
real page content, not the shared template shell. It also ignores the
<title> elements that live inside inline SVG icons.

Pure standard library — no third-party dependencies.

Usage:
    python3 tools/audit.py            # human-readable report
    python3 tools/audit.py --json     # machine-readable JSON

Exit code = number of ERROR-level issues (0 = clean), handy for CI.
"""
import os
import sys
import glob
import json
from html.parser import HTMLParser
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LINK_ATTRS = {"href", "src"}
# Void elements never get an end tag — don't push them on the element stack.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
# An element is "chrome" (shared template shell, not content) when its class
# attribute contains any of these substrings. Headings / text inside chrome are
# excluded from the content-quality checks.
CHROME = ("loading-container", "fixed-nav", "nav-bar", "footer",
          "credits", "mouse-pos-list")


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.title = None
        self.metas = {}
        self.canonical = None
        self.images = []          # {src, alt}
        self.headings = []        # (level, text, in_chrome)
        self.links = []           # (attr, value)
        self.stack = []           # [(tag, class_str)]
        self.svg_depth = 0
        self.skiptext_depth = 0   # inside <script>/<style>/<head>/<noscript>
        self._cap = None          # 'title' or ('h', level)
        self._buf = []
        self._content_text = []   # visible text OUTSIDE chrome, for dup detection

    # -- helpers ------------------------------------------------------------
    def _in_chrome(self):
        for _tag, cls in self.stack:
            if cls and any(tok in cls for tok in CHROME):
                return True
        return False

    # -- tag handling -------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style", "head", "noscript"):
            self.skiptext_depth += 1
        if tag == "svg":
            self.svg_depth += 1
        if tag == "html" and "lang" in a:
            self.lang = a["lang"]
        elif tag == "title" and self.svg_depth == 0 and self.title is None:
            self._cap = "title"; self._buf = []
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.metas[key.lower()] = a.get("content", "")
        elif tag == "link" and a.get("rel", "").lower() == "canonical":
            self.canonical = a.get("href")
        elif tag == "img":
            self.images.append({"src": a.get("src", ""), "alt": a.get("alt")})
            if a.get("alt") and not self._in_chrome():
                self._content_text.append(a["alt"])
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._cap = ("h", int(tag[1])); self._buf = []; self._h_chrome = self._in_chrome()

        for attr in LINK_ATTRS:
            if a.get(attr):
                self.links.append((attr, a[attr]))

        if tag not in VOID:
            self.stack.append((tag, a.get("class", "")))

    def handle_startendtag(self, tag, attrs):
        # self-closing (e.g. <path/>, <img/>) — handle without pushing a frame
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1][0] == tag:
            self.stack.pop()
        if tag == "svg" and self.svg_depth > 0:
            self.svg_depth -= 1

    def handle_endtag(self, tag):
        if tag in ("script", "style", "head", "noscript") and self.skiptext_depth > 0:
            self.skiptext_depth -= 1
        if tag == "title" and self._cap == "title":
            self.title = "".join(self._buf).strip(); self._cap = None
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6") and isinstance(self._cap, tuple):
            text = " ".join("".join(self._buf).split())
            self.headings.append((self._cap[1], text, getattr(self, "_h_chrome", False)))
            self._cap = None
        if tag == "svg" and self.svg_depth > 0:
            self.svg_depth -= 1
        # pop the stack back to (and including) the matching open tag
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self._cap:
            self._buf.append(data)
        s = data.strip()
        if s and self.svg_depth == 0 and self.skiptext_depth == 0 and not self._in_chrome():
            self._content_text.append(s)

    @property
    def content_headings(self):
        return [(lvl, txt) for lvl, txt, chrome in self.headings if not chrome]

    @property
    def content_text(self):
        return " ".join(self._content_text)


def discover_pages():
    pages = []
    for pat in ("*.html", "pages/**/*.html"):
        for p in glob.glob(os.path.join(ROOT, pat), recursive=True):
            rel = os.path.relpath(p, ROOT)
            if rel.split(os.sep)[0] == "_archive":
                continue
            pages.append(rel)
    return sorted(set(pages))


def resolve_internal(page_rel, value):
    v = value.strip(); low = v.lower()
    if low.startswith(("http://", "https://", "//", "mailto:", "tel:", "data:",
                        "javascript:", "#")):
        return (False, None)
    v = v.split("#", 1)[0].split("?", 1)[0]
    if not v:
        return (False, None)
    base_dir = os.path.dirname(os.path.join(ROOT, page_rel))
    return (True, os.path.normpath(os.path.join(base_dir, v)))


def audit():
    pages = discover_pages()
    parsed, issues = {}, []
    titles, descriptions = {}, {}

    def add(page, level, kind, detail):
        issues.append({"page": page, "level": level, "kind": kind, "detail": detail})

    for page in pages:
        with open(os.path.join(ROOT, page), encoding="utf-8") as fh:
            p = PageParser(); p.feed(fh.read())
        parsed[page] = p

        # title
        if not p.title:
            add(page, "ERROR", "title-missing", "no <title>")
        else:
            titles.setdefault(p.title, []).append(page)
            if not (15 <= len(p.title) <= 65):
                add(page, "WARN", "title-length",
                    f"{len(p.title)} chars (rec 15-65): {p.title!r}")

        # description
        desc = p.metas.get("description")
        if not desc:
            add(page, "ERROR", "description-missing", "no meta description")
        else:
            descriptions.setdefault(desc, []).append(page)
            if not (50 <= len(desc) <= 165):
                add(page, "WARN", "description-length",
                    f"{len(desc)} chars (rec 50-165)")

        # lang / canonical
        if not p.lang:
            add(page, "WARN", "lang-missing", "<html> has no lang attribute")
        if not p.canonical:
            add(page, "WARN", "canonical-missing", "no <link rel=canonical>")

        # images / alt (whole page)
        for img in p.images:
            if img["alt"] is None:
                add(page, "ERROR", "alt-missing", f"<img> no alt: {img['src']}")
            elif img["alt"].strip() == "":
                add(page, "INFO", "alt-empty", f"empty alt (decorative?): {img['src']}")

        # content headings
        ch = p.content_headings
        levels = [l for l, _ in ch]
        h1 = levels.count(1)
        if h1 == 0:
            add(page, "ERROR", "h1-missing", "no content <h1>")
        elif h1 > 1:
            add(page, "WARN", "h1-multiple", f"{h1} content <h1> tags")
        prev = 0
        for lvl, txt in ch:
            if prev and lvl > prev + 1:
                add(page, "WARN", "heading-skip",
                    f"H{prev} -> H{lvl} ({txt[:40]!r})")
            prev = lvl

        # internal links exist?
        seen = set()
        for attr, val in p.links:
            is_int, target = resolve_internal(page, val)
            if not is_int or target in seen:
                continue
            seen.add(target)
            if not (os.path.isfile(target) or os.path.isdir(target)):
                add(page, "ERROR", "broken-internal-link",
                    f"{attr}={val!r} -> missing {os.path.relpath(target, ROOT)}")

    # duplicate titles / descriptions
    for t, pgs in titles.items():
        if len(pgs) > 1:
            for pg in pgs:
                add(pg, "ERROR", "title-duplicate",
                    f"shared with {', '.join(x for x in pgs if x != pg)}")
    for d, pgs in descriptions.items():
        if len(pgs) > 1:
            for pg in pgs:
                add(pg, "ERROR", "description-duplicate",
                    f"shared with {', '.join(x for x in pgs if x != pg)}")

    # near-duplicate CONTENT (chrome excluded)
    names = list(parsed)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = parsed[names[i]].content_text, parsed[names[j]].content_text
            if not a or not b:
                continue
            ratio = SequenceMatcher(None, a, b).ratio()
            if ratio >= 0.90:
                add(names[i], "WARN", "duplicate-content",
                    f"{int(ratio*100)}% similar content to {names[j]}")

    return pages, parsed, issues


def print_report(pages, parsed, issues):
    counts = {"ERROR": 0, "WARN": 0, "INFO": 0}
    for it in issues:
        counts[it["level"]] += 1
    print("=" * 68)
    print("ZERO 2 ONE — SEO / CODE AUDIT")
    print("=" * 68)
    print(f"Pages scanned: {len(pages)}\n")
    for p in pages:
        pp = parsed[p]
        no_alt = sum(1 for i in pp.images if i["alt"] is None)
        print(f"  {p:40} title:{'Y' if pp.title else 'N'} "
              f"desc:{'Y' if pp.metas.get('description') else 'N'} "
              f"h1:{[l for l,_ in pp.content_headings].count(1)} "
              f"imgs:{len(pp.images)} no-alt:{no_alt}")
    print(f"\nIssues: {counts['ERROR']} ERROR, {counts['WARN']} WARN, {counts['INFO']} INFO")
    print("-" * 68)
    for level in ("ERROR", "WARN", "INFO"):
        block = [it for it in issues if it["level"] == level]
        if not block:
            continue
        print(f"\n### {level} ({len(block)})")
        for it in sorted(block, key=lambda x: x["page"]):
            print(f"  [{it['kind']}] {it['page']}: {it['detail']}")
    print()
    return counts["ERROR"]


def main():
    pages, parsed, issues = audit()
    if "--json" in sys.argv:
        print(json.dumps(issues, ensure_ascii=False, indent=2))
        return sum(1 for i in issues if i["level"] == "ERROR")
    return print_report(pages, parsed, issues)


if __name__ == "__main__":
    sys.exit(main())
