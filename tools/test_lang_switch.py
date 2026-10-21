#!/usr/bin/env python3
"""Every language switch must lead to another existing page — never back to itself.

Regression test for /ar/contact/, whose "English" switch pointed at /ar/contact/
(found 2026-10-19): polish_chrome() matched the word "contact" inside the
switch's own href and rewrote it as the Arabic contact link. Static check over
the committed pages; the generated blog/ tree is owned by blog-build.

Usage: python3 tools/test_lang_switch.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SWITCH = re.compile(r'<li class="btn btn-link btn-lang">\s*<a href="([^"]*)"')


def route(path):
    rel = path.relative_to(ROOT).as_posix()
    return '/' + rel[:-len('index.html')]


def main():
    failures, checked = [], 0
    for page in sorted(ROOT.rglob('index.html')):
        rel = page.relative_to(ROOT)
        if rel.parts[0] in ('blog', 'node_modules', 'tools', '.git'):
            continue
        hrefs = SWITCH.findall(page.read_text(encoding='utf-8'))
        if not hrefs:
            continue
        here = route(page)
        for href in hrefs:
            checked += 1
            target = ROOT / href.strip('/') / 'index.html' if href.strip('/') else ROOT / 'index.html'
            if not href:
                failures.append(f'{here}: empty switch href')
            elif href == here:
                failures.append(f'{here}: switch points at the page itself')
            elif not href.startswith('/') or not target.is_file():
                failures.append(f'{here}: switch target {href} is not a page')
    print(f'{checked} language switches checked; {len(failures)} broken.')
    for f in failures:
        print('  ' + f)
    return len(failures)


if __name__ == '__main__':
    raise SystemExit(bool(main()))
