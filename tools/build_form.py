#!/usr/bin/env python3
"""
ZERO 2 ONE — contact-form whitelist sync
========================================

send.php rejects a <select> value that is not on its whitelist, which is the
right behaviour — but it only works if the whitelist matches the form. The two
live in different files and different languages, so keeping them in step by
hand is exactly the kind of thing that silently rots.

This script reads the real <option value="…"> attributes out of both contact
pages and writes them into the generated block in send.php. Both language trees
are included, because tools/build_ar.py translates the option values, so an
Arabic enquiry posts Arabic values.

Run it after editing the service list in contact/index.html (and after
tools/build_ar.py, so the Arabic values exist).

Usage:
    python3 tools/build_form.py
    python3 tools/build_form.py --check   # fail if send.php is out of date
"""
import html
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHP = os.path.join(ROOT, "send.php")
PAGES = [os.path.join(ROOT, "contact", "index.html"),
         os.path.join(ROOT, "ar", "contact", "index.html")]

BEGIN = "/* >>> BEGIN generated whitelist — tools/build_form.py (do not edit by hand) */"
END = "/* <<< END generated whitelist */"

# form field name -> the <select> id it is rendered with
SELECTS = {"service": "cf-service"}


def options_for(page, select_id):
    """The exact value="" strings of one <select>, in document order."""
    src = open(page, encoding="utf-8").read()
    m = re.search(r'<select\b[^>]*\bid="' + re.escape(select_id) + r'"[^>]*>(.*?)</select>',
                  src, re.S)
    if not m:
        raise SystemExit(f"no <select id=\"{select_id}\"> in {os.path.relpath(page, ROOT)}")
    values = re.findall(r'<option\b[^>]*\bvalue="([^"]*)"', m.group(1))
    if not values:
        raise SystemExit(f"<select id=\"{select_id}\"> in {page} has no option values")
    return [html.unescape(v) for v in values]


def collect():
    """{field: [allowed values across both language trees]}"""
    out = {}
    for field, select_id in SELECTS.items():
        values, seen = [], set()
        for page in PAGES:
            if not os.path.isfile(page):
                raise SystemExit(f"missing {os.path.relpath(page, ROOT)} — run tools/build_ar.py first")
            for v in options_for(page, select_id):
                if v not in seen:
                    seen.add(v)
                    values.append(v)
        out[field] = values
    return out


def php_block(allowed):
    def quote(v):
        # PHP single-quoted string: only \ and ' need escaping
        return "'" + v.replace("\\", "\\\\").replace("'", "\\'") + "'"

    lines = [BEGIN, "$ALLOWED = ["]
    for field, values in allowed.items():
        lines.append(f"    '{field}' => [")
        lines += [f"        {quote(v)}," for v in values]
        lines.append("    ],")
    lines += ["];", END]
    return "\n".join(lines)


def main():
    check = "--check" in sys.argv
    allowed = collect()
    current = open(PHP, encoding="utf-8").read()
    if BEGIN not in current or END not in current:
        raise SystemExit(f"markers not found in send.php — expected a line reading:\n{BEGIN}")

    head = current[: current.index(BEGIN)]
    tail = current[current.index(END) + len(END):]
    updated = head + php_block(allowed) + tail

    total = sum(len(v) for v in allowed.values())
    if updated == current:
        print(f"up to date — {total} allowed value(s) across {len(allowed)} field(s)")
        return 0
    if check:
        print("OUT OF DATE — run tools/build_form.py")
        print(f"  send.php's whitelist does not match the <option> values in "
              f"{', '.join(os.path.relpath(p, ROOT) for p in PAGES)}")
        return 1
    open(PHP, "w", encoding="utf-8").write(updated)
    print(f"send.php whitelist rewritten — {total} allowed value(s):")
    for field, values in allowed.items():
        print(f"  {field}: {len(values)}")
        for v in values:
            print(f"    {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
