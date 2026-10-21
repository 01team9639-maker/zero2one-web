#!/usr/bin/env python3
"""Drop CSS rules that no page can ever match, from the built bundle only.

`bundle.min.css` carries the purchased template's leftovers: whole case-study
layouts (go-trip), a profile picture, checkbox styles — 992 selectors no page
can match, 15 of them pointing at images that do not even exist. Every page
downloads and parses all of it before it can paint; dropping them took the
bundle from 315 KB to 228 KB (50 KB to 37 KB compressed, 2026-10-21).

A selector survives if every class and id it names appears somewhere in the
corpus: any committed HTML (site pages, error pages, the generated blog), any
JavaScript under assets/js/ (vendor libraries included, so classes they add at
runtime — Locomotive's is-inview, has-scroll-smooth … — stay), and the words
in tools/css-keep.txt if that file exists. Appearing anywhere as a word is
enough, so a class built in a script still survives as long as its name is
written out somewhere. A rule goes only when all of its selectors are dead.
Attribute selectors, :not()/:is()/:where()/:has() arguments, keyframes,
@font-face and every at-rule other than @media/@supports are kept as they are.

The sources are never edited: build.sh runs this on the fresh esbuild output
every time, so a class that gains a page comes back on the next build.

Usage:
    python3 tools/prune_css.py assets/css/bundle.min.css [--report FILE]
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = ("node_modules", ".git", os.path.join("tools", "reports"))
WORD = re.compile(r"[A-Za-z_][\w-]*")


def corpus_words():
    files = glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True)
    files += glob.glob(os.path.join(ROOT, "assets", "js", "**", "*.js"), recursive=True)
    words = set()
    for path in files:
        rel = os.path.relpath(path, ROOT)
        if rel.startswith(SKIP_DIRS):
            continue
        with open(path, encoding="utf-8", errors="replace") as fh:
            words.update(WORD.findall(fh.read()))
    keep = os.path.join(ROOT, "tools", "css-keep.txt")
    if os.path.exists(keep):
        with open(keep, encoding="utf-8") as fh:
            for line in fh:
                words.update(WORD.findall(line.split("#", 1)[0]))
    return words


def matching_brace(css, i):
    """Index just past the brace block opening at css[i] == '{'."""
    depth, quote = 0, None
    while i < len(css):
        ch = css[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = None
        elif ch in "\"'":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced braces in CSS")


def split_selectors(prelude):
    parts, depth, cur, quote = [], 0, "", None
    for ch in prelude:
        if quote:
            cur += ch
            if ch == quote:
                quote = None
            continue
        if ch in "\"'":
            quote = ch
        elif ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return parts


def alive(selector, words):
    bare = re.sub(r"\[[^\]]*\]", "", selector)
    while True:
        stripped = re.sub(r":(?:not|is|where|has|nth-[a-z-]+)\([^()]*\)", "", bare)
        if stripped == bare:
            break
        bare = stripped
    return all(tok in words for tok in re.findall(r"[.#]([A-Za-z_][\w-]*)", bare))


def prune(css, words, removed):
    out, i = [], 0
    while i < len(css):
        brace = css.find("{", i)
        if brace < 0:
            out.append(css[i:])
            break
        prelude = css[i:brace]
        end = matching_brace(css, brace)
        block = css[brace + 1:end - 1]
        head = prelude.strip()
        if head.startswith(("@media", "@supports")):
            inner = prune(block, words, removed)
            if inner.strip():
                out.append(prelude + "{" + inner + "}")
        elif head.startswith("@") or not head:
            out.append(css[i:end])
        else:
            selectors = split_selectors(prelude)
            live = [s for s in selectors if alive(s, words)]
            if live:
                out.append(",".join(live) + "{" + block + "}")
            removed.extend(s.strip() for s in selectors if s not in live)
        i = end
    return "".join(out)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    path = args[0]
    report = args[args.index("--report") + 1] if "--report" in args else None
    with open(path, encoding="utf-8") as fh:
        css = fh.read()
    removed = []
    pruned = prune(css, corpus_words(), removed)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(pruned)
    if report:
        with open(report, "w", encoding="utf-8") as fh:
            fh.write("\n".join(removed) + "\n")
    print(f"prune_css: {os.path.basename(path)} {len(css) // 1024} KB -> {len(pruned) // 1024} KB, "
          f"{len(removed)} unmatched selectors dropped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
