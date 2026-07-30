#!/usr/bin/env python3
"""
ZERO 2 ONE — asset cache stamping
=================================

Rewrites the `?v=` stamp on every built CSS/JS reference to a short hash of that
file's actual contents, across both language trees.

Why this exists: the stamp used to be a hand-bumped integer, so the only safe
cache policy was a short one (CSS/JS were capped at one day) — otherwise a
forgotten bump would leave visitors on stale assets. In practice the stamp sat
at `?v=6` through a dozen rebuilds, which is exactly the failure it was meant to
prevent.

With the stamp derived from content, a changed file always gets a new URL and an
unchanged file always keeps its old one. That makes a one-year immutable cache
correct rather than risky, which is what `.htaccess` now sets.

Run it after tools/build.sh and tools/build_ar.py — tools/build.sh calls it for
you.

Usage:
    python3 tools/stamp_assets.py
    python3 tools/stamp_assets.py --check   # fail if any stamp is stale
"""
import glob
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Only the built bundles are stamped; sources are never referenced by a page.
STAMPED = re.compile(r'(?P<attr>href|src)="(?P<path>/assets/(?:css|js)/[\w.-]+\.(?:css|js))\?v=(?P<stamp>[\w.]+)"')


def digest(rel_path):
    full = os.path.join(ROOT, rel_path.lstrip("/"))
    if not os.path.isfile(full):
        return None
    h = hashlib.sha256()
    with open(full, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:8]


def pages():
    out = []
    for f in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
        rel = os.path.relpath(f, ROOT).replace(os.sep, "/")
        if rel.split("/")[0] in ("node_modules", "_archive", "pages"):
            continue
        out.append(rel)
    return sorted(out)


def main():
    check = "--check" in sys.argv
    cache, stale, changed_files = {}, [], 0
    missing = set()

    for rel in pages():
        path = os.path.join(ROOT, rel)
        src = open(path, encoding="utf-8").read()

        def sub(m):
            asset = m.group("path")
            if asset not in cache:
                cache[asset] = digest(asset)
            want = cache[asset]
            if want is None:
                missing.add(asset)
                return m.group(0)
            if m.group("stamp") != want:
                stale.append((rel, asset, m.group("stamp"), want))
            return f'{m.group("attr")}="{asset}?v={want}"'

        out = STAMPED.sub(sub, src)
        if out != src:
            changed_files += 1
            if not check:
                open(path, "w", encoding="utf-8").write(out)

    for a in sorted(missing):
        print(f"  ! referenced but not on disk: {a}", file=sys.stderr)

    if check:
        if stale:
            print(f"STALE — {len(stale)} reference(s) in {changed_files} file(s); "
                  f"run tools/stamp_assets.py")
            for rel, asset, was, want in stale[:8]:
                print(f"   {rel}: {asset} ?v={was} -> ?v={want}")
            return 1
        print(f"up to date — {len(cache)} asset(s) stamped by content hash")
        return 0

    print(f"stamped {len(cache)} asset(s) across {len(pages())} page(s)"
          + (f", updated {changed_files}" if changed_files else ", nothing changed"))
    for asset, h in sorted(cache.items()):
        if h:
            size = os.path.getsize(os.path.join(ROOT, asset.lstrip("/"))) / 1024
            print(f"   {asset:<34} ?v={h}   {size:6.0f} KB")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
