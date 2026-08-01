#!/usr/bin/env python3
"""
ZERO 2 ONE — provenance guard
=============================

Fails the build if anything that belongs to somebody else is still shipping.

Why this exists
---------------
This site was built on a purchased template and next to an earlier project
(datarecovery-sa). Three separate times a foreign artefact survived into
production because nothing was watching for it:

  1. the contact form posted to a Formspree endpoint on a personal account
  2. the map link on all 20 pages pointed at "أصول لاستعادة البيانات" —
     a data-recovery company — because a Google Maps place link was pasted
     from the other project. Every page told Google our office was theirs.
  3. assorted personal names in markup and comments

Each was found by hand, late, after it was live. Grepping once fixes one
instance; this file makes the class of bug impossible to reintroduce, because
the pre-flight in tools/deploy.sh refuses to upload while any rule matches.

Two kinds of rule
-----------------
  BANNED   — an exact string that must never appear (a known foreign phone
             number, endpoint, CID, domain, person).
  GUARDED  — a *pattern* that is fine in principle but must be reviewed:
             notably any Google Maps link that asserts a specific business
             listing (place/data=!…, ?cid=…, maps.app.goo.gl/…). Those encode
             an opaque ID that no reviewer can eyeball, which is exactly how
             (2) went unnoticed. To ship one, add it to ALLOWED_MAPS below,
             which forces somebody to open the link and confirm whose pin it is.

Usage:
    python3 tools/check_provenance.py          # exit 1 on any violation
    python3 tools/check_provenance.py -v       # also list what was scanned
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SCAN_EXT = {".html", ".css", ".js", ".php", ".json", ".xml", ".txt", ".webmanifest"}
SKIP_DIRS = {".git", "node_modules", ".visual", "__pycache__", "tools"}

# Files where a mention is documentation, not something a visitor can reach.
# Kept deliberately tiny — every entry is a hole in the guard.
COMMENT_OK = {
    "send.php": ["datarecovery-sa"],  # architectural credit in the file header
}

# --- 1) strings that must never appear anywhere ------------------------------
BANNED = [
    # the other project
    ("datarecovery-sa.com", "domain of the previous project"),
    ("0x3e2f035a37629539", "Google Maps CID of أصول لاستعادة البيانات"),
    ("9423620171052841332", "same listing, decimal CID form"),
    ("+966531010903", "phone number of the previous project"),
    ("966531010903", "phone number of the previous project"),
    ("0531010903", "phone number of the previous project"),
    # third-party form service on a personal account
    ("formspree.io", "third-party form endpoint — we use send.php"),
    ("xqedjevn", "Formspree form ID from a personal account"),
    # personal identifiers that must not ship
    ("mohammad", "personal name — must not appear on the site"),
    ("محمد", "personal name — must not appear on the site"),
]

# --- 2) patterns that need a human to vouch for them -------------------------
MAP_LINK = re.compile(
    r"https?://(?:www\.)?(?:maps\.google\.[a-z.]+|google\.[a-z.]+/maps|maps\.app\.goo\.gl)"
    r"[^\s\"'<>)]*",
    re.I,
)
# A maps URL is only allowed through if it is a *search* for an address we
# publish, or it is listed here after somebody has opened it and checked.
SEARCH_OK = re.compile(r"/maps/search/\?api=1&(?:amp;)?query=", re.I)
ALLOWED_MAPS = {
    # Add a verified Google Business Profile link here, e.g.
    #   "https://maps.app.goo.gl/XXXXXXXX",  # verified 2026-xx-xx: ZERO 2 ONE
    "https://maps.google.com/maps?q=Computer%20Complex%2C%20Al%20Olaya%2C%20Riyadh"
    "&z=16&hl=en&output=embed",  # address query, not a business listing
}


def files():
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        for n in names:
            if os.path.splitext(n)[1].lower() in SCAN_EXT:
                yield os.path.join(base, n)


def line_of(text, idx):
    return text.count("\n", 0, idx) + 1


def main():
    verbose = "-v" in sys.argv
    problems = []
    scanned = 0

    for path in files():
        rel = os.path.relpath(path, ROOT)
        try:
            text = open(path, encoding="utf-8", errors="ignore").read()
        except OSError:
            continue
        scanned += 1
        low = text.lower()
        exempt = COMMENT_OK.get(os.path.basename(path), [])

        for needle, why in BANNED:
            if needle in exempt:
                continue
            at = low.find(needle.lower())
            if at != -1:
                problems.append((rel, line_of(text, at), needle, why))

        for m in MAP_LINK.finditer(text):
            url = m.group(0).replace("&amp;", "&")
            if SEARCH_OK.search(url):
                continue
            if url in ALLOWED_MAPS or url.replace("&", "&amp;") in ALLOWED_MAPS:
                continue
            if any(a.replace("&amp;", "&") == url for a in ALLOWED_MAPS):
                continue
            problems.append(
                (rel, line_of(text, m.start()), url[:78],
                 "unvouched map link — open it, confirm the pin, then add it to ALLOWED_MAPS")
            )

    if verbose:
        print(f"  scanned {scanned} file(s)")

    if not problems:
        print("  provenance: clean — no foreign artefacts")
        return 0

    print(f"  provenance: {len(problems)} violation(s)\n")
    for rel, line, what, why in problems:
        print(f"    {rel}:{line}")
        print(f"      found : {what}")
        print(f"      why   : {why}\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
