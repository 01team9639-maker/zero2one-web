#!/usr/bin/env python3
"""
ZERO 2 ONE — Link checker
=========================

Extracts every href/src from all HTML pages and checks them:

  * Internal links      -> must resolve to a file/dir on disk (else BROKEN)
  * In-page anchors      -> #id must exist somewhere on that page (else BROKEN)
  * External http(s)     -> real request; reports status 200 / 3xx redirect / 404
                            / other. Redirect targets (Location) are shown.

External checking needs network access. With `--internal-only` (or when the
network is unavailable) external links are listed as SKIPPED, never failed.

Standard library only (urllib).

Usage:
    python3 tools/check_links.py                 # internal + external
    python3 tools/check_links.py --internal-only # skip network calls
    python3 tools/check_links.py --json

Exit code = number of BROKEN links (0 = all good).
"""
import os
import ssl
import sys
import glob
import json
import urllib.request
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMEOUT = 8
UA = "Mozilla/5.0 (compatible; ZERO2ONE-linkcheck/1.0)"


class LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []   # (attr, value)
        self.ids = set()  # id / name anchors present on the page

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        # <link rel="preconnect|dns-prefetch|..."> are connection hints (an origin
        # to warm up), not fetchable documents — don't treat them as links.
        hint = tag == "link" and a.get("rel", "").lower() in (
            "preconnect", "dns-prefetch", "prefetch", "prerender")
        for attr in ("href", "src"):
            if a.get(attr) and not hint:
                self.links.append((attr, a[attr]))
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "a" and a.get("name"):
            self.ids.add(a["name"])


def discover_pages():
    pages = []
    for pat in ("*.html", "pages/**/*.html"):
        for p in glob.glob(os.path.join(ROOT, pat), recursive=True):
            rel = os.path.relpath(p, ROOT)
            if rel.split(os.sep)[0] == "_archive":
                continue
            pages.append(rel)
    return sorted(set(pages))


def classify(value):
    v = value.strip()
    low = v.lower()
    if low.startswith(("mailto:", "tel:", "javascript:", "data:")):
        return ("ignore", v)
    if low.startswith(("http://", "https://")):
        return ("external", v)
    if low.startswith("//"):
        return ("external", "https:" + v)
    if low.startswith("#"):
        return ("anchor", v[1:])
    return ("internal", v)


def check_external(url, cache):
    if url in cache:
        return cache[url]
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
                res = ("OK", r.status, r.geturl() if r.geturl() != url else "")
                cache[url] = res
                return res
        except HTTPError as e:
            # 405 on HEAD -> retry with GET
            if e.code == 405 and method == "HEAD":
                continue
            loc = e.headers.get("Location", "") if e.headers else ""
            if e.code in (999, 429, 403):
                # bot-protection / rate-limit (e.g. LinkedIn 999) — link is fine
                # for real browsers, just not verifiable from a script.
                status, loc = "BLOCKED", "bot-protection / rate-limited"
            elif e.code in (301, 302, 303, 307, 308):
                status = "REDIRECT"
            elif e.code >= 400:
                status = "BROKEN"
            else:
                status = "OK"
            res = (status, e.code, loc)
            cache[url] = res
            return res
        except (URLError, TimeoutError, OSError) as e:
            res = ("UNREACHABLE", None, str(getattr(e, "reason", e)))
            cache[url] = res
            return res
    res = ("UNREACHABLE", None, "no method succeeded")
    cache[url] = res
    return res


def main():
    internal_only = "--internal-only" in sys.argv
    as_json = "--json" in sys.argv
    pages = discover_pages()

    parsed = {}
    for page in pages:
        p = LinkParser()
        p.feed(open(os.path.join(ROOT, page), encoding="utf-8").read())
        parsed[page] = p

    results = []   # dicts: page, kind, target, status, code, note
    ext_cache = {}
    broken = 0

    for page in pages:
        p = parsed[page]
        seen = set()
        for attr, val in p.links:
            kind, target = classify(val)
            if kind == "ignore":
                continue
            key = (kind, target)
            if key in seen:
                continue
            seen.add(key)

            if kind == "internal":
                path = target.split("#", 1)[0].split("?", 1)[0]
                if not path:
                    continue
                abspath = os.path.normpath(os.path.join(os.path.dirname(
                    os.path.join(ROOT, page)), path))
                ok = os.path.isfile(abspath) or os.path.isdir(abspath)
                status = "OK" if ok else "BROKEN"
                if not ok:
                    broken += 1
                results.append({"page": page, "kind": "internal", "target": val,
                                "status": status, "code": None,
                                "note": "" if ok else f"missing {os.path.relpath(abspath, ROOT)}"})
                # also verify a #fragment on an internal link, if present
                frag = target.split("#", 1)[1] if "#" in target else ""
                if frag and ok and abspath.endswith(".html"):
                    tp = LinkParser(); tp.feed(open(abspath, encoding="utf-8").read())
                    if frag not in tp.ids:
                        broken += 1
                        results.append({"page": page, "kind": "anchor", "target": "#" + frag,
                                        "status": "BROKEN", "code": None,
                                        "note": f"#{frag} not found in {path}"})

            elif kind == "anchor":
                if target and target not in p.ids:
                    broken += 1
                    results.append({"page": page, "kind": "anchor", "target": "#" + target,
                                    "status": "BROKEN", "code": None,
                                    "note": f"#{target} not on page"})

            elif kind == "external":
                if internal_only:
                    results.append({"page": page, "kind": "external", "target": target,
                                    "status": "SKIPPED", "code": None, "note": ""})
                else:
                    st, code, loc = check_external(target, ext_cache)
                    if st == "BROKEN":
                        broken += 1
                    results.append({"page": page, "kind": "external", "target": target,
                                    "status": st, "code": code, "note": loc})

    if as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return broken

    # ---- report ----
    print("=" * 68)
    print("ZERO 2 ONE — LINK CHECK" + ("  (internal only)" if internal_only else ""))
    print("=" * 68)
    tally = {}
    for r in results:
        tally[r["status"]] = tally.get(r["status"], 0) + 1
    print("Summary: " + ", ".join(f"{k}:{v}" for k, v in sorted(tally.items())))
    print("-" * 68)
    for status in ("BROKEN", "UNREACHABLE", "BLOCKED", "REDIRECT", "SKIPPED", "OK"):
        block = [r for r in results if r["status"] == status]
        if not block:
            continue
        # keep OK / SKIPPED compact
        print(f"\n### {status} ({len(block)})")
        if status in ("OK", "SKIPPED"):
            for r in sorted(set(r["target"] for r in block)):
                print(f"  {r}")
        else:
            for r in block:
                code = f" [{r['code']}]" if r["code"] else ""
                note = f" -> {r['note']}" if r["note"] else ""
                print(f"  {r['page']}: {r['target']}{code}{note}")
    print()
    if broken:
        print(f"RESULT: {broken} broken link(s) found.")
    else:
        print("RESULT: no broken links.")
    return broken


if __name__ == "__main__":
    sys.exit(main())
