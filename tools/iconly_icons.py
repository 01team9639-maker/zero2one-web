"""Local Iconly Essential Light SVGs used by the static page builders.

The original exports and the publisher's free commercial grant are recorded in
``assets/icons/iconly/provenance.json``. Only free Essential / Light / Regular
assets are included. The normalized files retain the exported geometry while
using currentColor and avoiding duplicate SVG IDs when inlined repeatedly.
"""

from functools import lru_cache
from html import escape
from pathlib import Path
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
ICONLY_DIR = ROOT / "assets/icons/iconly"

# Canonical local keys map to the names and IDs returned by Iconly's public app.
ICONS = {
    "activity": ("Activity", 353),
    "bag": ("Bag", 376),
    "buy": ("Buy", 378),
    "call": ("Call", 382),
    "category": ("Category", 385),
    "chart": ("Chart", 386),
    "chat": ("Chat", 387),
    "close-square": ("Close Square", 388),
    "discovery": ("Discovery", 393),
    "edit-square": ("Edit Square", 396),
    "folder": ("Folder", 400),
    "home": ("Home", 405),
    "image": ("Image", 407),
    "location": ("Location", 409),
    "message": ("Message", 413),
    "paper-plus": ("Paper Plus", 420),
    "plus": ("Plus", 425),
    "search": ("Search", 428),
    "setting": ("Setting", 430),
    "star": ("Star", 434),
    "swap": ("Swap", 435),
    "tick-square": ("Tick Square", 436),
    "work": ("Work", 450),
}


def _key(name):
    key = re.sub(r"[\s_]+", "-", str(name).strip().lower())
    if key not in ICONS:
        raise KeyError(f"Unknown local Iconly icon: {name!r}")
    return key


def normalize_export(source):
    """Normalize an official SVG export without changing its drawing geometry."""
    source = source.replace("\r\n", "\n").replace("\r", "\n")
    source = re.sub(r"<\?xml[\s\S]*?\?>", "", source).strip()
    match = re.fullmatch(r"<svg\b[^>]*>([\s\S]*?)</svg>", source)
    if not match:
        raise ValueError("Expected one standalone SVG export")
    inner = match[1]
    inner = re.sub(r"<title\b[^>]*>[\s\S]*?</title>", "", inner)
    inner = re.sub(r"\s+id=([\"'])[^\"']*\1", "", inner)
    inner = re.sub(
        r"\b(stroke|fill)=([\"'])(?:#000000|#000|black)\2",
        lambda m: f'{m[1]}="currentColor"',
        inner,
        flags=re.IGNORECASE,
    )
    result = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
              'fill="none">' + inner.strip() + "</svg>\n")
    parsed = ET.fromstring(result)
    if parsed.tag != "{http://www.w3.org/2000/svg}svg":
        raise ValueError("Expected an SVG root")
    if any("href" in key for element in parsed.iter() for key in element.attrib):
        raise ValueError("Local Iconly assets must be standalone")
    if any(element.tag.rsplit("}", 1)[-1] in {"script", "foreignObject"}
           for element in parsed.iter()):
        raise ValueError("Unexpected non-drawing SVG element")
    return result


@lru_cache(maxsize=len(ICONS))
def _inner_svg(key):
    source = (ICONLY_DIR / f"{key}.svg").read_text(encoding="utf-8")
    match = re.fullmatch(r"<svg\b[^>]*>([\s\S]*?)</svg>\s*", source)
    if not match:
        raise ValueError(f"Invalid normalized Iconly asset: {key}")
    return match[1]


def iconly_svg(name, css_class, extra_attributes=""):
    """Inline a local Iconly SVG; extra_attributes is trusted builder markup.

    ``name`` accepts a canonical key or the original Iconly name, for example
    ``iconly_svg('edit-square', 'brand-owner-symbol')``.
    """
    key = _key(name)
    extra = (" " + extra_attributes.strip()) if extra_attributes.strip() else ""
    return ('<svg xmlns="http://www.w3.org/2000/svg" '
            f'class="{escape(str(css_class), quote=True)}" viewBox="0 0 24 24" '
            f'aria-hidden="true" focusable="false" data-iconly="{key}" fill="none"'
            + extra + ">" + _inner_svg(key) + "</svg>")


if __name__ == "__main__":
    # Mechanical normalization of the locally downloaded original exports.
    for key in ICONS:
        original = (ICONLY_DIR / "original" / f"{key}.svg").read_text(encoding="utf-8")
        (ICONLY_DIR / f"{key}.svg").write_text(normalize_export(original), encoding="utf-8")
    print(f"Normalized {len(ICONS)} local Iconly Essential Light icons.")
