#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZERO 2 ONE — portfolio consistency gate
=======================================

Four things that can break quietly, checked here so they break loudly:

  1. **Registration.** A case in `portfolio_data.py` with no slug in
     `build_ar.py`'s `CASE_SLUGS`, or no `AR_META` entry, produces an English
     page with no Arabic counterpart — and nothing else complains.

  2. **Assets.** Every image the portfolio references exists, and the width and
     height written into the markup are the file's real dimensions. Wrong
     numbers there are a layout shift nobody sees until a visitor on a slow
     connection does.

  3. **The evidence ledger.** `PORTFOLIO_EVIDENCE.md` records each screenshot's
     dimensions. If a file is re-extracted and the ledger is not updated, the
     two drift apart and the ledger stops being worth reading.

     This one is not pedantry. In the first build, two PDF object references
     were crossed: the Al Hokail page showed the orthopedic clinic's dashboard
     while its caption quoted Al Hokail's numbers. Dimensions were what caught
     it — the two screenshots are 727×289 and 716×261.

  4. **Captions.** Every number in an evidence caption must appear somewhere in
     the ledger. A caption is the one place where a figure reaches a visitor
     without passing through the data file, so it is the easiest place to
     invent one.

Usage:
    python3 tools/check_portfolio.py
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from portfolio_data import CASES, ITEMS, gallery, validate  # noqa: E402
from build_case_studies import webp_size  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "tools", "PORTFOLIO_EVIDENCE.md")

problems = []


def bad(msg):
    problems.append(msg)


def check_registration():
    import build_ar
    for slug in CASES:
        if slug not in build_ar.CASE_SLUGS:
            bad(f"'{slug}' في CASES وليس في build_ar.CASE_SLUGS")
        if f"/work/{slug}/" not in build_ar.AR_META:
            bad(f"'{slug}' بلا عنوان ووصف عربيّين في build_ar.AR_META")
        page = os.path.join(ROOT, "work", slug, "index.html")
        ar_page = os.path.join(ROOT, "ar", "work", slug, "index.html")
        for p in (page, ar_page):
            if not os.path.exists(p):
                bad(f"الصفحة غير مولَّدة: {os.path.relpath(p, ROOT)}")


def check_assets():
    """كل صورة يشير إليها المعرض موجودة، وأبعادها المكتوبة هي أبعادها الحقيقية."""
    refs = []
    for item in ITEMS:
        c = item["cover"]
        refs.append((item["slug"], c["src"], c["w"], c["h"]))
        for g in item.get("gallery") or []:
            refs.append((item["slug"], g["src"], g["w"], g["h"]))
    for slug, case in CASES.items():
        if case.get("hero_image"):
            refs.append((slug, case["hero_image"][0], None, None))
        for sec in case["sections"]:
            for name, _, _ in sec.get("evidence") or []:
                refs.append((slug, name, None, None))
            if sec.get("image"):
                refs.append((slug, sec["image"][0], None, None))
            for name, _ in sec.get("images") or []:
                refs.append((slug, name, None, None))

    for slug, name, w, h in refs:
        path = os.path.join(ROOT, "assets", "images", f"{name}.webp")
        if not os.path.exists(path):
            bad(f"'{slug}' يشير إلى صورة غير موجودة: {name}.webp")
            continue
        if w is None:
            continue
        rw, rh = webp_size(path, name)
        if (rw, rh) != (w, h):
            bad(f"'{slug}': {name}.webp مكتوب {w}×{h} وحقيقته {rw}×{rh}")


def ledger_text():
    if not os.path.exists(LEDGER):
        bad("سجلّ الأدلّة مفقود: tools/PORTFOLIO_EVIDENCE.md")
        return ""
    return io.open(LEDGER, encoding="utf-8").read()


def check_ledger(led):
    """أبعاد كل لقطة في السجلّ = أبعاد الملفّ المنشور."""
    seen = set()
    for m in re.finditer(r"`([a-z0-9-]+)\.webp`\s*\(‎?(\d+)×(\d+)", led):
        name, w, h = m.group(1), int(m.group(2)), int(m.group(3))
        seen.add(name)
        path = os.path.join(ROOT, "assets", "images", "work", f"{name}.webp")
        if not os.path.exists(path):
            bad(f"السجلّ يذكر {name}.webp وهو غير موجود")
            continue
        rw, rh = webp_size(path, name)
        if (rw, rh) != (w, h):
            bad(f"السجلّ يقول {name} = {w}×{h} والملفّ {rw}×{rh}")
    # كل دليل منشور له مدخل في السجلّ
    for slug, case in CASES.items():
        for sec in case["sections"]:
            for name, _, _ in sec.get("evidence") or []:
                base = name.split("/")[-1]
                if base not in seen:
                    bad(f"'{slug}' ينشر {base}.webp بلا مدخل في سجلّ الأدلّة")
    return seen


# بلا \b الختامي يبتلع التعبير نقطة نهاية الجملة فيقرأ «21.7.» رقماً
NUM = re.compile(r"\d[\d,.]*[KM%]?(?<![.,])")


def check_captions(led):
    """كل رقم في تعليق دليل موجود في السجلّ.

    التعليق آخر مكان يمرّ منه رقمٌ إلى الزائر دون أن يمرّ بملفّ البيانات،
    فهو أسهل موضع لاختلاق رقم بحسن نيّة.
    """
    # التواريخ والسنوات تُكتب في السجلّ بصيغ مختلفة (9 Aug 2023 مقابل 8/9/23)
    # فلا تُقارَن هنا؛ الأرقام المقيسة هي المقصودة.
    skip = {"1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
            "2023", "2024", "2025", "2026", "30", "31", "28", "26", "20", "19"}
    for slug, case in CASES.items():
        caps = [cap for sec in case["sections"] for _, _, cap in sec.get("evidence") or []]
        for cap in caps:
            for n in NUM.findall(cap):
                if n in skip or n.rstrip(".") in skip:
                    continue
                if n not in led:
                    bad(f"'{slug}': الرقم {n} في تعليق دليل ولا أثر له في السجلّ")


def main():
    validate()
    check_registration()
    check_assets()
    led = ledger_text()
    if led:
        check_ledger(led)
        check_captions(led)

    if problems:
        print(f"  ❌ {len(problems)} مشكلة في المعرض:")
        for p in problems:
            print(f"     · {p}")
        return 1
    print(f"  ✅ المعرض متّسق — {len(ITEMS)} عنصراً، {len(CASES)} صفحة مشروع، "
          f"{len(gallery())} في الشبكة")
    return 0


if __name__ == "__main__":
    sys.exit(main())
