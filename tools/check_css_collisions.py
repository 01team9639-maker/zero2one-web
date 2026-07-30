#!/usr/bin/env python3
"""
ZERO 2 ONE — CSS class-collision check
======================================

The site is built on a purchased template whose stylesheets (normalize,
locomotive, styleguide, components) define a large vocabulary of generic class
names. When a class we author for our own markup happens to match one of those,
the template's rules apply silently and can wreck the layout with no error
anywhere.

That is not hypothetical: the contact form's submit button was named
`.form-btn`, which the template already used for an absolutely-positioned
invisible overlay input (`position:absolute; width:100%; height:100%`). The
button rendered 0px wide inside a collapsed wrapper — present in the DOM,
invisible on screen, and completely silent in every audit we had.

This script lists the classes used in our own pages that are also defined
*unscoped* in the template layers, so the collision is caught at build time
instead of by eye.

Usage:
    python3 tools/check_css_collisions.py
    python3 tools/check_css_collisions.py --json

Exit code = number of unreviewed collisions.
"""
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The template's own stylesheets — everything except our own style-new.css.
TEMPLATE_CSS = ["assets/css/normalize.css", "assets/css/locomotive-scroll.css",
                "assets/css/styleguide.css", "assets/css/components.css"]
OURS_CSS = "assets/css/style-new.css"

# Classes that legitimately come FROM the template and are reused on purpose —
# our markup is meant to inherit those rules.
INHERITED = {
    "btn", "btn-normal", "btn-round", "btn-link", "btn-link-external", "btn-click",
    "btn-fill", "btn-text", "btn-text-inner", "btn-wrap", "btn-hamburger", "btn-bars",
    "btn-logo", "btn-left-top", "btn-contact", "btn-fixed", "btn-contact-round",
    "magnetic", "section", "container", "medium", "small", "row", "flex-col", "stripe",
    "line", "overlay", "no-select", "theme-dark", "main", "main-wrap", "active",
    "not-active", "fade-in", "animate", "once-in", "once-in-secondary", "arrow", "big",
    "no-padding", "no-flex", "no-wrap", "full-height", "lazy", "field", "credits",
    "socials", "time", "ui-label", "spacer", "dot", "single-image", "tile-image",
    "tile-image-wrap", "block-padding-bottom", "get-height", "hanger",
    # template chrome reused verbatim in every page's nav / loading screen
    "links-wrap", "rounded-div", "rounded-div-wrap",
}


def used_classes():
    """Every class used in the pages we author (the /ar/ tree mirrors them)."""
    found = {}
    pages = ["index.html", "about/index.html", "contact/index.html", "services/index.html"]
    pages += sorted(glob.glob(os.path.join(ROOT, "services", "*", "index.html")))
    for p in pages:
        path = p if os.path.isabs(p) else os.path.join(ROOT, p)
        if not os.path.isfile(path):
            continue
        rel = os.path.relpath(path, ROOT)
        html = open(path, encoding="utf-8").read()
        for m in re.finditer(r'class="([^"]+)"', html):
            for cls in m.group(1).split():
                found.setdefault(cls, set()).add(rel)
    return found


def template_definitions():
    """Classes the template defines as a bare `.class` selector, with the
    declarations that make a collision dangerous (layout/visibility)."""
    RISKY = ("position", "display", "width", "height", "opacity", "visibility",
             "transform", "top", "left", "right", "bottom")
    defs = {}
    for rel in TEMPLATE_CSS:
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            continue
        css = re.sub(r"/\*.*?\*/", "", open(path, encoding="utf-8").read(), flags=re.S)
        for m in re.finditer(r"(?m)^\s*(\.[A-Za-z][\w-]*)\s*(?:,[^{]*)?\{([^}]*)\}", css):
            cls = m.group(1)[1:]
            body = m.group(2)
            props = [p.split(":")[0].strip() for p in body.split(";") if ":" in p]
            risky = sorted({p for p in props if p in RISKY})
            if risky:
                entry = defs.setdefault(cls, {"file": rel, "props": set()})
                entry["props"].update(risky)
    return defs


def main():
    used = used_classes()
    template = template_definitions()

    collisions = []
    for cls, pages in sorted(used.items()):
        if cls in INHERITED or cls not in template:
            continue
        collisions.append({
            "class": cls,
            "template_file": template[cls]["file"],
            "template_props": sorted(template[cls]["props"]),
            "used_in": sorted(pages),
        })

    if "--json" in sys.argv:
        print(json.dumps(collisions, indent=2, ensure_ascii=False))
        return len(collisions)

    print("=" * 66)
    print("ZERO 2 ONE — CSS class-collision check")
    print("=" * 66)
    print(f"{len(used)} classes used in our pages · {len(template)} layout-affecting "
          f"classes defined in the template\n")
    if not collisions:
        print("No collisions. Every class we author is either ours alone, or one we")
        print("deliberately inherit from the template (see INHERITED in this file).")
        return 0
    print(f"{len(collisions)} COLLISION(S) — the template will style these too:\n")
    for c in collisions:
        print(f"  .{c['class']}")
        print(f"      template sets: {', '.join(c['template_props'])}  ({c['template_file']})")
        print(f"      used in:       {', '.join(c['used_in'])}")
        print(f"      -> rename ours, or add it to INHERITED if the inheritance is wanted")
        print()
    return len(collisions)


if __name__ == "__main__":
    sys.exit(main())
