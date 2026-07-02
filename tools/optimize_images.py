#!/usr/bin/env python3
"""
ZERO 2 ONE — image optimizer / CDN prep
=======================================

Prepares the site's raster images to be served fast from a CDN:

  * Generates a modern **WebP** copy next to every PNG/JPG (big savings —
    photos in PNG shrink 60-85%). Non-destructive: originals are kept as the
    fallback.
  * With --png, also re-saves the PNGs losslessly (optimize=True) in place.
  * With --max-width N, writes down-scaled WebP copies capped at N px wide
    (originals untouched) — useful when a source is far larger than it is shown.

Needs Pillow (already available in this environment).

Usage:
    python3 tools/optimize_images.py                 # generate .webp siblings
    python3 tools/optimize_images.py --png           # + lossless PNG re-save
    python3 tools/optimize_images.py --max-width 1920
    python3 tools/optimize_images.py --dry-run

After running, either:
  (a) put a CDN in front that auto-serves WebP (Cloudflare Polish / Bunny
      Optimizer) — no markup change, or
  (b) reference the .webp with a <picture> element (see docs/README.md).
"""
import os
import sys
import glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets", "images")
WEBP_QUALITY = 82


def human(n):
    return f"{n/1024:.0f} KB" if n < 1024 * 1024 else f"{n/1024/1024:.2f} MB"


def main():
    dry = "--dry-run" in sys.argv
    do_png = "--png" in sys.argv
    max_w = None
    if "--max-width" in sys.argv:
        max_w = int(sys.argv[sys.argv.index("--max-width") + 1])

    files = sorted(glob.glob(os.path.join(IMG_DIR, "*.png")) +
                   glob.glob(os.path.join(IMG_DIR, "*.jpg")) +
                   glob.glob(os.path.join(IMG_DIR, "*.jpeg")))

    print("=" * 70)
    print("ZERO 2 ONE — IMAGE OPTIMIZER" + ("  (dry-run)" if dry else ""))
    print("=" * 70)
    print(f"{'file':30}{'original':>12}{'webp':>12}{'saved':>10}")
    print("-" * 70)

    orig_total = webp_total = 0
    png_before = png_after = 0

    for f in files:
        name = os.path.basename(f)
        orig = os.path.getsize(f)
        orig_total += orig
        im = Image.open(f)

        # optional lossless PNG re-save (in place)
        if do_png and f.lower().endswith(".png") and not dry:
            png_before += orig
            im.save(f, format="PNG", optimize=True)
            png_after += os.path.getsize(f)
            orig = os.path.getsize(f)

        # WebP sibling
        webp_path = os.path.splitext(f)[0] + ".webp"
        wim = im
        if max_w and im.width > max_w:
            h = round(im.height * max_w / im.width)
            wim = im.resize((max_w, h), Image.LANCZOS)
        if not dry:
            save_kw = {"quality": WEBP_QUALITY, "method": 6}
            wim.save(webp_path, format="WEBP", **save_kw)
            wsize = os.path.getsize(webp_path)
        else:
            wsize = 0
        webp_total += wsize
        saved = (1 - wsize / orig) * 100 if (wsize and orig) else 0
        print(f"{name:30}{human(orig):>12}{(human(wsize) if wsize else '—'):>12}{(f'{saved:.0f}%' if wsize else ''):>10}")

    print("-" * 70)
    print(f"{'TOTAL':30}{human(orig_total):>12}{human(webp_total):>12}"
          f"{((1-webp_total/orig_total)*100 if webp_total else 0):>9.0f}%")
    if do_png and png_before:
        print(f"PNG lossless re-save: {human(png_before)} -> {human(png_after)} "
              f"({(1-png_after/png_before)*100:.0f}% smaller)")
    if dry:
        print("\n(dry-run — nothing written)")
    else:
        print(f"\nGenerated {len(files)} .webp file(s) in assets/images/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
