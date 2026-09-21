#!/usr/bin/env python3
"""
ZERO 2 ONE — portfolio asset extraction
=======================================

Pulls the portfolio's images out of the company PDF (`ملف الاعمال.ai-1.pdf`)
and writes two things:

  1. `tools/portfolio-sources/`  — the untouched embedded originals, byte for
     byte as the PDF stores them. `.htaccess` 404s `/tools/`, so this stays out
     of the public site while remaining versioned, which is what makes the
     public assets reproducible after the PDF is gone.
  2. `assets/images/work/`       — the optimized WebP the site actually serves.

Why extract embedded images instead of rendering pages
------------------------------------------------------
Rendering a page gives whatever DPI you ask for, which *looks* like more
resolution but is the PDF upscaling a small image for you. The embedded object
is the real ceiling: the creative artwork is 318×398 and the Search Console
screenshots are ~720×270. Those numbers decide the layout — a 318px-wide
original cannot fill a 700px card honestly, which is why the homepage's fourth
slot uses the existing Alrahwanji case instead (see tools/portfolio_data.py).

The one exception is the Makan Mem logo: the owner supplied a genuine
1600×1600 original. It is kept in `tools/portfolio-sources/` alongside the
extracted files and is the only asset here not taken from the PDF.

Measurement behind that claim, per pixel edge energy (higher = real detail):

    embedded original 318×398  →  17.31
    supplied file    1280×1600 →   5.71   (≈ a 4× upscale, no new detail)
    Makan Mem embed   398×398  →  10.92
    Makan Mem supplied 1600×1600 → 31.12  (a real original)

Encoding
--------
Dashboards are flat UI colour and small text, so they go out as lossless WebP —
it beats quality 82 on both size and legibility for that kind of image. The
creative artwork is photographic and uses lossy.

Usage:
    python3 tools/extract_portfolio_assets.py
    python3 tools/extract_portfolio_assets.py --check     # fail if output drifts
    python3 tools/extract_portfolio_assets.py --pdf /path/to/file.pdf

Needs pymupdf + Pillow, which are not site build dependencies — this runs once
when the source material changes, not on every build. The extracted sources in
`tools/portfolio-sources/` are what the repository depends on.
"""
import hashlib
import io
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "tools", "portfolio-sources")
OUT_DIR = os.path.join(ROOT, "assets", "images", "work")
DEFAULT_PDF = os.path.expanduser("~/Downloads/ملف الاعمال.ai-1.pdf")

# The owner-supplied Makan Mem original, looked for in these places in order.
MAKAN_CANDIDATES = [
    os.path.join(SRC_DIR, "makan-mem-logo-original.jpg"),
]

# ---------------------------------------------------------------------------
# What to pull out of the PDF.
#
#   key            stable name used by portfolio_data.py
#   xref           the PDF object number (stable for this file)
#   page           source page, for the evidence ledger
#   crop           optional (l, t, r, b) as fractions, applied to the original
#   lossless       True for UI screenshots, False for photographic artwork
# ---------------------------------------------------------------------------
ASSETS = [
    # ---- evidence: Search Console ----
    dict(key="alostaz-search-console", xref=143, page=9, lossless=True,
         note="Alostaz.io — last 6 months vs previous 6 months"),
    dict(key="cosmetic-surgery-egypt-search-console", xref=147, page=9, lossless=True,
         note="Cosmetic surgery centre, Egypt — single period, 8/9/23–7/2/24"),
    dict(key="orthopedic-clinic-egypt-search-console", xref=163, page=10, lossless=True,
         note="Orthopedic clinic, Egypt — single period, 8/9/23–8/3/24"),
    dict(key="alhokail-search-console", xref=159, page=10, lossless=True,
         note="Al Hokail — last 3 months vs previous 3 months"),
    # ⚠️ 159 و163 كانا معكوسين في أول تمرير: ترتيب get_images() ليس ترتيب
    #    الظهور على الصفحة، فصفحة الحقيل عرضت لوحة عيادة العظام وتعليقُها
    #    يذكر أرقام الحقيل. لا تثق بالترتيب — افتح الملفّ المستخرَج وطابِق
    #    أرقامه بـ tools/PORTFOLIO_EVIDENCE.md قبل النشر.
    # ---- evidence: Google Ads ----
    dict(key="google-ads-conversion-value-before", xref=171, page=11, lossless=True,
         note="Apr 1–30, 2026 — conv. value/cost 0.54"),
    dict(key="google-ads-conversion-value-after", xref=170, page=11, lossless=True,
         note="Aug 1–31, 2026 — conv. value/cost 3.60"),
    # ---- evidence: Meta / Instagram ----
    dict(key="kuwait-tutoring-campaign-results", xref=187, page=12, lossless=True,
         note="Campaign row — 267 messaging conversations at $5.05"),
    dict(key="kuwait-tutoring-ad-results", xref=188, page=12, lossless=True,
         note="Ad level — 54 at $4.17 and 140 at $3.58"),
    # ---- evidence: curtains, two separate accounts ----
    dict(key="riyadh-curtains-campaign-a", xref=311, page=12, lossless=True,
         note="Jan 30–Feb 26, 2026 — 663 clicks, 30.00 conversions"),
    # The second curtain screenshot carries a Google Ads auction-insights notice
    # naming a competing advertiser's impression share. That is another
    # business's data and has no place in our portfolio, so the crop keeps the
    # metric tiles and the chart and drops the notice above them.
    dict(key="riyadh-curtains-campaign-b", xref=185, page=12, lossless=True,
         crop=(0.035, 0.378, 1.0, 0.800),
         note="Feb 1–28, 2026 — 935 clicks, 147.00 conversions (cropped)"),
    # ---- creative artwork ----
    dict(key="barbarees-post-pregnancy-ad", xref=193, page=13, lossless=False,
         note="Barbarees — post-pregnancy body treatment"),
    dict(key="barbarees-diet-plan-ad", xref=194, page=13, lossless=False,
         note="Barbarees — diet plan, referee character"),
    dict(key="local-burger-ad", xref=196, page=13, lossless=False,
         note="Local Burger — Taste the luxury"),
    dict(key="engineering-technologies-elevator-doors-ad", xref=205, page=14, lossless=False,
         note="Engineering Technologies — lift control systems"),
    dict(key="engineering-technologies-elevator-buttons-ad", xref=206, page=14, lossless=False,
         note="Engineering Technologies — comfort and safety"),
    dict(key="data-recovery-encrypted-files-ad", xref=207, page=14, lossless=False,
         note="Data Recovery — encrypted files"),
    dict(key="seiko-presage-product-ad", xref=209, page=14, lossless=False,
         note="Product advertising design — Seiko Presage"),
]

# xref 208 is a second copy of xref 193 with a different JPEG encoding and is
# not placed anywhere visible. Excluded rather than shipped as a third project.
SKIP_DUPLICATES = {208}


def need(mod):
    try:
        return __import__(mod, fromlist=["*"])
    except ImportError:
        raise SystemExit(
            f"  ❌ {mod} غير مثبّت.\n"
            f"     python3 -m venv .venv && .venv/bin/pip install pymupdf pillow"
        )


def extract_sources(pdf_path):
    """يكتب الأصول المضمَّنة كما هي في tools/portfolio-sources/."""
    pymupdf = need("pymupdf")
    if not os.path.exists(pdf_path):
        return False
    doc = pymupdf.open(pdf_path)
    os.makedirs(SRC_DIR, exist_ok=True)
    for a in ASSETS:
        d = doc.extract_image(a["xref"])
        path = os.path.join(SRC_DIR, f"{a['key']}.{d['ext']}")
        with open(path, "wb") as f:
            f.write(d["image"])
    doc.close()
    return True


def source_for(key):
    """يعيد مسار الأصل المحفوظ أيًّا كان امتداده."""
    for ext in ("png", "jpeg", "jpg", "webp"):
        p = os.path.join(SRC_DIR, f"{key}.{ext}")
        if os.path.exists(p):
            return p
    return None


def encode(a, check):
    """يحوّل أصلاً واحداً إلى WebP في assets/images/work/."""
    Image = need("PIL.Image")
    src = source_for(a["key"])
    if not src:
        return None, f"  ❌ الأصل مفقود: {a['key']} — شغّل الأداة ومعها --pdf"

    im = Image.open(src).convert("RGB")
    if a.get("crop"):
        l, t, r, b = a["crop"]
        im = im.crop((round(l * im.width), round(t * im.height),
                      round(r * im.width), round(b * im.height)))

    buf = io.BytesIO()
    if a["lossless"]:
        im.save(buf, "WEBP", lossless=True, quality=100, method=6)
    else:
        im.save(buf, "WEBP", quality=82, method=6)
    data = buf.getvalue()

    out = os.path.join(OUT_DIR, f"{a['key']}.webp")
    old = open(out, "rb").read() if os.path.exists(out) else None
    # Compare the two *decoded* images, not the encoded bytes. Byte equality
    # would make --check fail on a different libwebp build, and comparing the
    # decoded file against the pre-encoding source would fail on every lossy
    # asset, because lossy is lossy.
    if old is not None and Image.open(io.BytesIO(old)).tobytes() == \
            Image.open(io.BytesIO(data)).tobytes():
        return (a["key"], im.size, len(old), False), None
    if check:
        return (a["key"], im.size, len(data), True), None
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(out, "wb") as f:
        f.write(data)
    return (a["key"], im.size, len(data), True), None


def makan_mem(check):
    """الشعار الوحيد الذي أرسله المالك بدقّة أعلى من المضمَّن في الـPDF."""
    Image = need("PIL.Image")
    src = next((p for p in MAKAN_CANDIDATES if os.path.exists(p)), None)
    if not src:
        return [], ["  ⚠️  makan-mem-logo-original.jpg غير موجود في tools/portfolio-sources/"]
    im = Image.open(src).convert("RGB")
    rows, errs = [], []
    for width in (1200, 600):
        r = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        r.save(buf, "WEBP", quality=84, method=6)
        name = "makan-mem-logo" + ("" if width == 1200 else f"-{width}")
        out = os.path.join(OUT_DIR, f"{name}.webp")
        old = open(out, "rb").read() if os.path.exists(out) else None
        if old is not None and Image.open(io.BytesIO(old)).size == r.size:
            rows.append((name, r.size, len(old), False))
            continue
        if check:
            rows.append((name, r.size, len(buf.getvalue()), True))
            continue
        os.makedirs(OUT_DIR, exist_ok=True)
        with open(out, "wb") as f:
            f.write(buf.getvalue())
        rows.append((name, r.size, len(buf.getvalue()), True))
    return rows, errs


def main():
    check = "--check" in sys.argv
    pdf = DEFAULT_PDF
    if "--pdf" in sys.argv:
        pdf = sys.argv[sys.argv.index("--pdf") + 1]

    if not os.path.isdir(SRC_DIR) or not source_for(ASSETS[0]["key"]):
        if not extract_sources(pdf):
            raise SystemExit(
                f"  ❌ لا أصول محفوظة ولا ملف PDF في:\n     {pdf}\n"
                f"     مرّر --pdf بالمسار الصحيح."
            )
        print(f"  ✅ استُخرجت {len(ASSETS)} أصول إلى tools/portfolio-sources/")

    rows, errs = [], []
    for a in ASSETS:
        row, err = encode(a, check)
        (errs if err else rows).append(err or row)
    mrows, merrs = makan_mem(check)
    rows += mrows
    errs += merrs

    changed = [r for r in rows if r[3]]
    for key, size, nbytes, ch in rows:
        print(f"  {'✅' if ch else '='} {key:48} {size[0]:>4}×{size[1]:<4} {nbytes/1024:>6.0f} KB")
    for e in errs:
        print(e)

    if check and changed:
        print(f"\n  ❌ أصول المعرض قديمة: {len(changed)} ملفاً. شغّل الأداة بلا --check.")
        return 1
    if errs and any(e.startswith("  ❌") for e in errs):
        return 1
    print(f"\n  المجموع: {len(rows)} ملفاً، {sum(r[2] for r in rows)/1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
