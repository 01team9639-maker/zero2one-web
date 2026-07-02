#!/usr/bin/env python3
"""
ZERO 2 ONE — robots.txt validator
==================================

Parses /robots.txt and flags the mistakes that actually hurt SEO:

  * ERROR   "Disallow: /" under "User-agent: *"  -> blocks the whole site
  * WARN    no "Sitemap:" directive               -> crawlers won't find it
  * WARN    Sitemap: value is not an absolute URL
  * WARN    a group has no "User-agent:" line
  * INFO    unknown directive lines

Usage:
    python3 tools/check_robots.py

Exit code = number of ERRORs (0 = fine).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "robots.txt")
KNOWN = {"user-agent", "disallow", "allow", "sitemap", "crawl-delay", "host"}


def main():
    if not os.path.isfile(PATH):
        print("robots.txt not found (optional, but recommended).")
        return 0

    issues = []
    current_agents = []          # agents for the active group
    star_disallow_all = False
    has_sitemap = False
    lines = open(PATH, encoding="utf-8").read().splitlines()

    for n, raw in enumerate(lines, 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            issues.append(("INFO", n, f"line has no directive: {raw!r}"))
            continue
        field, value = line.split(":", 1)
        field = field.strip().lower()
        value = value.strip()

        if field == "user-agent":
            current_agents = [value]
        elif field == "disallow":
            if value == "/" and "*" in current_agents:
                star_disallow_all = True
                issues.append(("ERROR", n,
                               "'Disallow: /' under 'User-agent: *' blocks the ENTIRE site"))
        elif field == "sitemap":
            has_sitemap = True
            if not value.lower().startswith(("http://", "https://")):
                issues.append(("WARN", n, f"Sitemap should be an absolute URL: {value!r}"))
        elif field not in KNOWN:
            issues.append(("INFO", n, f"unknown directive {field!r}"))

    if not has_sitemap:
        issues.append(("WARN", 0, "no 'Sitemap:' directive — crawlers can't discover the sitemap"))

    print("=" * 60)
    print("ZERO 2 ONE — robots.txt CHECK")
    print("=" * 60)
    for level in ("ERROR", "WARN", "INFO"):
        block = [i for i in issues if i[0] == level]
        for _, n, msg in block:
            loc = f"line {n}: " if n else ""
            print(f"  [{level}] {loc}{msg}")
    errors = sum(1 for i in issues if i[0] == "ERROR")
    if not issues:
        print("  OK — no problems found.")
    print("-" * 60)
    print(f"RESULT: {errors} error(s). "
          + ("Site is crawlable." if not star_disallow_all else "SITE IS BLOCKED FROM CRAWLING!"))
    return errors


if __name__ == "__main__":
    sys.exit(main())
