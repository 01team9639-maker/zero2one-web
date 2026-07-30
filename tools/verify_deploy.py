#!/usr/bin/env python3
"""
ZERO 2 ONE — post-deploy verification
=====================================

Run this against the live site straight after every upload. It answers, in one
command, the questions that otherwise only surface weeks later in Search
Console:

  * did .htaccess actually make it up?  (it is a dotfile — FTP clients hide it)
  * do the retired URLs still redirect, and to the right place?
  * is every page in sitemap.xml reachable?
  * does each page's rel=canonical point at itself?
  * do the English/Arabic hreflang pairs both resolve?

Redirect results are reported in three states, because "not a 301" is not the
same as "broken":

  301 -> right target ....... PASS   .htaccess is live, strongest signal
  200 with right canonical .. WARN   .htaccess did NOT upload; the fallback stub
                                     from tools/build_redirects.py is covering,
                                     so nothing 404s — but fix the upload
  anything else ............. FAIL   the old URL is dead and losing its ranking

Standard library only.

Usage:
    python3 tools/verify_deploy.py
    python3 tools/verify_deploy.py --base https://staging.example.com
    python3 tools/verify_deploy.py --quiet     # only WARN/FAIL lines

Exit code = number of FAILs (0 = deploy is good).
"""
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from xml.dom import minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TIMEOUT = 15
UA = "Mozilla/5.0 (compatible; ZERO2ONE-deploycheck/1.0)"
CTX = ssl.create_default_context()

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"
COUNTS = {PASS: 0, WARN: 0, FAIL: 0}
QUIET = "--quiet" in sys.argv


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **kw):
        return None


def fetch(url, follow=True):
    """-> (status, headers, body_text). Never raises for HTTP status codes."""
    handlers = [] if follow else [NoRedirect()]
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=CTX), *handlers)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with opener.open(req, timeout=TIMEOUT) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "replace")
        except Exception:
            pass
        return e.code, dict(e.headers or {}), body
    except Exception as e:
        return None, {}, str(e)


def report(level, what, detail=""):
    COUNTS[level] += 1
    if QUIET and level == PASS:
        return
    mark = {PASS: "  ok  ", WARN: " warn ", FAIL: " FAIL "}[level]
    print(f"[{mark}] {what}" + (f"\n            {detail}" if detail else ""))


def base_url():
    if "--base" in sys.argv:
        return sys.argv[sys.argv.index("--base") + 1].rstrip("/")
    return json.load(open(os.path.join(ROOT, "tools", "redirects.json"),
                          encoding="utf-8"))["base"].rstrip("/")


def canonical_of(body):
    m = re.search(r'<link[^>]+rel="canonical"[^>]+href="([^"]+)"', body, re.I)
    return m.group(1) if m else None


def path_of(url):
    """Just the path part. Canonicals are always absolute production URLs, so
    comparing paths is what makes --base work against staging or localhost."""
    if not url:
        return None
    if url.startswith("http"):
        i = url.index("/", 8)
        url = url[i:]
    return "/" + url.strip("/") + ("/" if url.endswith("/") or url == "/" else "")


def check_redirects(base):
    print("\n── retired URLs ──────────────────────────────────────────────")
    data = json.load(open(os.path.join(ROOT, "tools", "redirects.json"), encoding="utf-8"))
    htaccess_live = 0
    for r in data["redirects"]:
        src, dst = base + r["from"], base + r["to"]
        status, headers, body = fetch(src, follow=False)

        want = path_of(r["to"])
        if status in (301, 308):
            got = path_of(headers.get("Location", ""))
            if got == want:
                htaccess_live += 1
                report(PASS, f"{r['from']} -> 301 -> {r['to']}")
            else:
                report(FAIL, f"{r['from']} -> 301 to the WRONG place",
                       f"expected {want}, got {got}")
        elif status == 200:
            got = path_of(canonical_of(body))
            if got == want:
                report(WARN, f"{r['from']} -> 200, fallback stub is serving",
                       ".htaccess did not upload. Nothing 404s and the canonical "
                       "still points at the new URL, but re-upload .htaccess so "
                       "this becomes a real 301.")
            else:
                report(FAIL, f"{r['from']} -> 200 but not a redirect page",
                       f"canonical path is {got!r}, expected {want}")
        elif status is None:
            report(FAIL, f"{r['from']} unreachable", body)
        else:
            report(FAIL, f"{r['from']} -> HTTP {status}",
                   "the old URL is dead — neither .htaccess nor the fallback stub is present")

    total = len(data["redirects"])
    if htaccess_live == 0:
        print(f"\n  .htaccess rewrite rules: NOT ACTIVE (0/{total} returned a 301)")
    elif htaccess_live < total:
        print(f"\n  .htaccess rewrite rules: PARTIAL ({htaccess_live}/{total})")
    else:
        print(f"\n  .htaccess rewrite rules: active ({htaccess_live}/{total})")


def sitemap_urls(base):
    status, _, body = fetch(base + "/sitemap.xml")
    if status != 200:
        report(FAIL, "sitemap.xml", f"HTTP {status}")
        return []
    try:
        dom = minidom.parseString(body)
    except Exception as e:
        report(FAIL, "sitemap.xml is not valid XML", str(e))
        return []
    urls = [u.getElementsByTagName("loc")[0].firstChild.data
            for u in dom.getElementsByTagName("url") if u.getElementsByTagName("loc")]
    report(PASS, f"sitemap.xml — {len(urls)} URLs")
    return urls


def check_pages(base, urls):
    print("\n── pages ─────────────────────────────────────────────────────")
    for url in urls:
        local = base + url[url.index("/", 8):] if url.startswith("http") else base + url
        status, _, body = fetch(local)
        if status != 200:
            report(FAIL, f"{local} -> HTTP {status}")
            continue
        can = canonical_of(body)
        if not can:
            report(FAIL, f"{local}", "no rel=canonical")
        elif path_of(can) != path_of(url):
            report(FAIL, f"{local}", f"canonical points elsewhere: {can}")
        else:
            is_ar = '<html lang="ar"' in body
            expected_ar = "/ar/" in local or local.rstrip("/").endswith("/ar")
            if is_ar != expected_ar:
                report(FAIL, f"{local}", f'lang mismatch (html lang ar={is_ar})')
            else:
                report(PASS, f"{local}")


def check_essentials(base):
    print("\n── essentials ────────────────────────────────────────────────")
    for path in ("/robots.txt", "/llms.txt", "/assets/css/bundle.min.css",
                 "/assets/js/vendor.min.js", "/assets/js/i18n.min.js",
                 "/assets/js/index-new.min.js"):
        status, _, _ = fetch(base + path)
        report(PASS if status == 200 else FAIL, path,
               "" if status == 200 else f"HTTP {status}")


def main():
    base = base_url()
    print("=" * 62)
    print(f"ZERO 2 ONE — deploy verification\n{base}")
    print("=" * 62)

    check_redirects(base)
    urls = sitemap_urls(base)
    if urls:
        check_pages(base, urls)
    check_essentials(base)

    print("\n" + "=" * 62)
    print(f"{COUNTS[PASS]} ok · {COUNTS[WARN]} warning · {COUNTS[FAIL]} failure")
    if COUNTS[FAIL]:
        print("DEPLOY HAS PROBLEMS — see the FAIL lines above.")
    elif COUNTS[WARN]:
        print("DEPLOY IS SERVING, WITH WARNINGS — most likely .htaccess did not upload.")
    else:
        print("DEPLOY IS GOOD.")
    return COUNTS[FAIL]


if __name__ == "__main__":
    sys.exit(main())
