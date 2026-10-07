#!/usr/bin/env python3
"""
ZERO 2 ONE — service-page FAQ builder
=====================================

Every service page carries a FAQ section that is rendered at BUILD time from one
content file per service: tools/faq/<service>.json (see tools/faq/README.md).
There is no runtime fetching, no script needed to read an answer, no external call:
the questions and answers are in the page's initial HTML, as native <details>.

Where things live
    content ............ tools/faq/<service>.json   — the ONLY place a FAQ is edited
    template ........... render_section() below      — shared by all six services
    styles ............. .svc-faq* in assets/css/style-new.css
    Arabic ............. tools/build_ar.py reads the same file (pairs()) and puts the
                         supplied Arabic on the Arabic page verbatim

Status of each item (the owner's rule: supplied or approved wording is never changed;
proposals are never silently published):
    approved ........... rendered into the page
    draft .............. a proposal — kept in the JSON, NEVER rendered into the page;
                         shown only by `--preview` (the local review) with a data
                         attribute the review overlay turns into a visible DRAFT label
    needs-owner-input .. a question the site cannot answer yet (no answer is invented);
                         preview only
A service with no approved item gets no FAQ section at all.

Usage
    python3 tools/build_faq.py                 write the English pages (approved items only)
    python3 tools/build_faq.py --check         exit 1 if a page differs from what it would get
    python3 tools/build_faq.py --preview DIR   write EN+AR copies of the six pages INCLUDING
                                               drafts and open questions to DIR (local review only)

Order after editing a FAQ file:
    python3 tools/build_faq.py && python3 tools/build_ar.py
"""
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAQ_DIR = os.path.join(ROOT, "tools", "faq")

# the six service detail pages (the same list build_ar.py uses)
SERVICE_SLUGS = [
    "web-design-riyadh",
    "seo-riyadh",
    "digital-advertising",
    "brand-identity",
    "social-media-management",
    "ecommerce-development",
]

BEGIN = "<!-- FAQ:BEGIN {slug}"
END = "<!-- FAQ:END {slug} -->"

# used only when a service has approved questions but its own heading is still a proposal
DEFAULT_HEADING = {"en": "Frequently asked questions", "ar": "أسئلة شائعة"}

APPROVED = ("approved",)
PREVIEW = ("approved", "draft", "needs-owner-input")


def path_of(slug):
    return os.path.join(FAQ_DIR, f"{slug}.json")


def load(slug):
    p = path_of(slug)
    if not os.path.exists(p):
        return None
    data = json.load(open(p, encoding="utf-8"))
    assert data["service"] == slug, f"{p}: service field is {data['service']!r}"
    for it in data["items"] + data.get("needs_owner_input", []):
        assert it["status"] in PREVIEW, f"{p}: {it['id']} has status {it['status']!r}"
    ids = [it["id"] for it in data["items"] + data.get("needs_owner_input", [])]
    assert len(ids) == len(set(ids)), f"{p}: duplicate item ids"
    return data


def selected(data, include_drafts):
    """The items that go on the page, in order."""
    allowed = PREVIEW if include_drafts else APPROVED
    items = [it for it in data["items"] if it["status"] in allowed]
    if include_drafts:
        items += [it for it in data.get("needs_owner_input", []) if it["status"] in allowed]
    return items


def answer_paragraphs(item, lang):
    if item["status"] == "needs-owner-input":
        return [item["needs"][lang]]
    return list(item[lang]["a"])


def heading(data, lang, include_drafts):
    h = data["heading"]
    if h["status"] == "approved" or include_drafts:
        return h[lang]
    return DEFAULT_HEADING[lang]


def pairs(slug, include_drafts=False):
    """(English, Arabic) text pairs for everything render_section() puts on the page —
    the exact table build_ar.py applies to this page."""
    data = load(slug)
    if not data:
        return []
    items = selected(data, include_drafts)
    if not items:
        return []
    out = [(heading(data, "en", include_drafts), heading(data, "ar", include_drafts))]
    for it in items:
        out.append((it["en"]["q"], it["ar"]["q"]))
        for pe, pa in zip(answer_paragraphs(it, "en"), answer_paragraphs(it, "ar")):
            out.append((pe, pa))
        assert len(answer_paragraphs(it, "en")) == len(answer_paragraphs(it, "ar")), \
            f"{slug}/{it['id']}: English and Arabic answers have a different number of paragraphs"
    return out


def esc(t):
    return html.escape(t, quote=False)      # & < > only — apostrophes stay as written


def render_section(slug, data, include_drafts=False):
    """The marker block (English). Native <details>: readable and operable with no script."""
    items = selected(data, include_drafts)
    pad = " " * 12
    open_c = BEGIN.format(slug=slug)
    comment = (f"{open_c} — generated by tools/build_faq.py from tools/faq/{slug}.json."
               f" Edit the JSON, not this block. -->")
    close = END.format(slug=slug)
    if not items:
        return f"{pad}{comment}\n{pad}<!-- no approved FAQ yet for this service: no section is rendered -->\n{pad}{close}"

    hid = f"faq-heading-{slug}"
    h_en = esc(heading(data, "en", include_drafts))
    wide = data.get("layout") == "wide"

    def item_html(n, it, ind):
        i = " " * ind
        status = ""
        if include_drafts and it["status"] != "approved":
            status = f' data-faq-status="{it["status"]}"'
        paras = "\n".join(f"{i}      <p>{esc(p)}</p>" for p in answer_paragraphs(it, "en"))
        return (f'{i}<details class="svc-faq-item" id="faq-{slug}-{n}"{status}>\n'
                f'{i}   <summary class="svc-faq-summary">\n'
                f'{i}      <h3 class="svc-faq-q">{esc(it["en"]["q"])}</h3>\n'
                f'{i}      <span class="svc-faq-icon" aria-hidden="true"></span>\n'
                f'{i}   </summary>\n'
                f'{i}   <div class="svc-faq-a">\n{paras}\n{i}   </div>\n'
                f'{i}</details>')

    if wide:
        body = "\n".join(item_html(n, it, 21) for n, it in enumerate(items, 1))
        sec = (f'{pad}<section class="section seo-sec svc-faq" id="faq" aria-labelledby="{hid}" data-scroll-section>\n'
               f'{pad}   <div class="seo-sec-inner">\n'
               f'{pad}      <h2 class="seo-sec-title fade-in animate" id="{hid}">{h_en}</h2>\n'
               f'{pad}      <div class="svc-faq-list">\n{body}\n{pad}      </div>\n'
               f'{pad}   </div>\n'
               f'{pad}</section>')
    else:
        body = "\n".join(item_html(n, it, 27) for n, it in enumerate(items, 1))
        sec = (f'{pad}<section class="section case-intro svc-faq once-in" id="faq" aria-labelledby="{hid}" data-scroll-section>\n'
               f'{pad}   <div class="container medium">\n'
               f'{pad}      <div class="row">\n'
               f'{pad}         <div class="flex-col fade-in animate">\n'
               f'{pad}            <h2 class="case-overview-label" id="{hid}">{h_en}</h2>\n'
               f'{pad}            <div class="stripe"></div>\n'
               f'{pad}            <div class="svc-faq-list">\n{body}\n{pad}            </div>\n'
               f'{pad}         </div>\n'
               f'{pad}      </div>\n'
               f'{pad}   </div>\n'
               f'{pad}</section>')
    return f"{pad}{comment}\n{sec}\n{pad}{close}"


def inject(page, slug, block):
    """Replace the marker block in a page's HTML. Raises if the markers are missing."""
    a = page.find(BEGIN.format(slug=slug))
    z = page.find(END.format(slug=slug))
    if a < 0 or z < 0 or z < a:
        raise SystemExit(f"services/{slug}/index.html: FAQ markers not found "
                         f"(<!-- FAQ:BEGIN {slug} … --> … <!-- FAQ:END {slug} -->)")
    a = page.rfind("\n", 0, a) + 1                      # whole first line (its indentation)
    z = z + len(END.format(slug=slug))
    return page[:a] + block + page[z:]


def page_file(slug):
    return os.path.join(ROOT, "services", slug, "index.html")


def build(check=False):
    changed = []
    for slug in SERVICE_SLUGS:
        data = load(slug)
        if not data:
            raise SystemExit(f"missing {path_of(slug)}")
        p = page_file(slug)
        cur = open(p, encoding="utf-8").read()
        new = inject(cur, slug, render_section(slug, data, include_drafts=False))
        if new != cur:
            changed.append(slug)
            if not check:
                open(p, "w", encoding="utf-8").write(new)
    return changed


def preview(outdir):
    """EN + AR pages with drafts and open questions rendered. Local review only — never the site."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import build_ar
    table = json.load(open(build_ar.DICT_PATH, encoding="utf-8"))
    written = []
    for slug in SERVICE_SLUGS:
        data = load(slug)
        cur = open(page_file(slug), encoding="utf-8").read()
        en = inject(cur, slug, render_section(slug, data, include_drafts=True))
        route = f"/services/{slug}/"
        tr = build_ar.Translator(table)
        ar = build_ar.render_arabic(en, route, tr, include_drafts=True)
        for rel, text in ((f"services/{slug}/index.html", en), (f"ar/services/{slug}/index.html", ar)):
            dst = os.path.join(outdir, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "w", encoding="utf-8").write(text)
            written.append(rel)
    return written


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--preview" in args:
        out = args[args.index("--preview") + 1]
        w = preview(out)
        print(f"preview (drafts INCLUDED, local review only): {len(w)} pages -> {out}")
        sys.exit(0)
    ch = build(check="--check" in args)
    if "--check" in args:
        if ch:
            print("FAQ sections out of date in: " + ", ".join(ch) + "  (run: python3 tools/build_faq.py)")
            sys.exit(1)
        print("FAQ sections are up to date (approved items only; drafts are not rendered).")
    else:
        print("updated: " + (", ".join(ch) if ch else "nothing (already up to date)"))
        for slug in SERVICE_SLUGS:
            d = load(slug)
            n = sum(1 for it in d["items"] if it["status"] == "approved")
            dr = sum(1 for it in d["items"] if it["status"] == "draft")
            nd = len(d.get("needs_owner_input", []))
            print(f"  {slug:26s} approved {n} · draft {dr} · needs owner input {nd}"
                  + ("" if n else "   -> no FAQ section on the page"))
