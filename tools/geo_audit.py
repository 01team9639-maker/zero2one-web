#!/usr/bin/env python3
"""
ZERO 2 ONE — GEO / AEO / AIO readiness audit
============================================

GEO = Generative Engine Optimization (ChatGPT, Perplexity, Gemini, Copilot…)
AEO = Answer Engine Optimization / Google AI Overviews (AIO)

These engines don't "rank" pages — they read, understand and *quote* them. This
audit checks the signals that make a page easy for an LLM to extract and cite:

  Per page
    * JSON-LD structured data present, and which @types
    * Organization / entity clarity (name, phone, email, address = NAP)
    * FAQPage schema and/or visible Q&A (direct answers)
    * Breadcrumb schema (context/hierarchy) on inner pages
    * A concise, answer-shaped meta description
    * A single clear <h1> and enough extractable content (word count)

  Site-wide
    * robots.txt welcomes (doesn't block) AI crawlers
    * llms.txt present (emerging GEO standard)
    * sitemap.xml present

Standard library only. Usage:
    python3 tools/geo_audit.py
    python3 tools/geo_audit.py --json

Exit code = number of FAIL-level findings (0 = excellent).
"""
import os
import sys
import glob
import json
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# AI / generative-engine crawlers we care about being allowed
AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
           "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended",
           "Applebot-Extended", "CCBot", "Bytespider", "Amazonbot",
           "Meta-ExternalAgent", "cohere-ai", "YouBot", "DuckAssistBot"]

MIN_WORDS = 120   # below this a page is too thin for an engine to quote well


class GeoParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.jsonld_raw = []
        self.metas = {}
        self.h1 = 0
        self.questions = []          # heading text ending in "?"
        self.words = 0
        self._in_ld = False
        self._ld_buf = []
        self._cap_h = False
        self._hbuf = []
        self._skip = 0               # script/style/head depth (for word count)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in_ld = True; self._ld_buf = []
        if tag in ("script", "style", "head", "noscript"):
            self._skip += 1
        if tag == "meta":
            k = a.get("name") or a.get("property")
            if k:
                self.metas[k.lower()] = a.get("content", "")
        if tag == "h1":
            self.h1 += 1
        if tag in ("h1", "h2", "h3", "h4"):
            self._cap_h = True; self._hbuf = []

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ld:
            self.jsonld_raw.append("".join(self._ld_buf)); self._in_ld = False
        if tag in ("script", "style", "head", "noscript") and self._skip > 0:
            self._skip -= 1
        if tag in ("h1", "h2", "h3", "h4") and self._cap_h:
            t = " ".join("".join(self._hbuf).split())
            if t.endswith("?"):
                self.questions.append(t)
            self._cap_h = False

    def handle_data(self, data):
        if self._in_ld:
            self._ld_buf.append(data)
        if self._cap_h:
            self._hbuf.append(data)
        if self._skip == 0:
            s = data.strip()
            if s:
                self.words += len(s.split())

    def ld_types(self):
        types = []
        for raw in self.jsonld_raw:
            try:
                data = json.loads(raw)
            except Exception:
                types.append(("__invalid__", {}))
                continue
            nodes = data.get("@graph", data) if isinstance(data, dict) else data
            if isinstance(nodes, dict):
                nodes = [nodes]
            for node in nodes:
                if isinstance(node, dict) and "@type" in node:
                    t = node["@type"]
                    for tt in (t if isinstance(t, list) else [t]):
                        types.append((tt, node))
        return types


def discover_pages():
    pages = []
    for pat in ("*.html", "pages/**/*.html"):
        for p in glob.glob(os.path.join(ROOT, pat), recursive=True):
            rel = os.path.relpath(p, ROOT)
            if rel.split(os.sep)[0] == "_archive":
                continue
            pages.append(rel)
    return sorted(set(pages))


def robots_ai_status():
    """Return (blocked_bots, welcomed_bots) based on robots.txt."""
    path = os.path.join(ROOT, "robots.txt")
    if not os.path.isfile(path):
        return ([], [])
    blocked, welcomed = [], []
    groups, cur = [], None
    for raw in open(path, encoding="utf-8").read().splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        f, v = [x.strip() for x in line.split(":", 1)]
        fl = f.lower()
        if fl == "user-agent":
            if cur is None or cur["seen_rule"]:
                cur = {"agents": [], "disallow_all": False, "seen_rule": False}
                groups.append(cur)
            cur["agents"].append(v)
        elif fl in ("disallow", "allow") and cur is not None:
            cur["seen_rule"] = True
            if fl == "disallow" and v == "/":
                cur["disallow_all"] = True
            if fl == "allow" and v in ("/", "*"):
                cur["disallow_all"] = False
    for bot in AI_BOTS:
        for g in groups:
            if bot in g["agents"]:
                (blocked if g["disallow_all"] else welcomed).append(bot)
                break
        else:
            # covered only by "*": blocked only if * disallows all
            star = next((g for g in groups if "*" in g["agents"]), None)
            if star and star["disallow_all"]:
                blocked.append(bot)
    return (blocked, welcomed)


def audit():
    pages = discover_pages()
    findings = []   # (level, scope, kind, detail)   level: FAIL / IMPROVE / PASS

    def add(level, scope, kind, detail):
        findings.append({"level": level, "scope": scope, "kind": kind, "detail": detail})

    parsed = {}
    all_types = {}
    for page in pages:
        p = GeoParser(); p.feed(open(os.path.join(ROOT, page), encoding="utf-8").read())
        parsed[page] = p
        types = [t for t, _ in p.ld_types()]
        all_types[page] = types
        is_home = page == "index.html"

        # structured data present
        if "__invalid__" in types:
            add("FAIL", page, "jsonld-invalid", "a JSON-LD block is not valid JSON")
        if not [t for t in types if t != "__invalid__"]:
            add("FAIL", page, "jsonld-missing", "no JSON-LD structured data")

        # entity clarity (NAP) — look for an org node with contact info
        org = next((n for t, n in p.ld_types()
                    if t in ("Organization", "ProfessionalService", "LocalBusiness")), None)
        if is_home:
            if not org:
                add("FAIL", page, "entity-missing", "no Organization/ProfessionalService node")
            else:
                for field in ("name", "telephone", "email", "address"):
                    if not org.get(field):
                        add("IMPROVE", page, "entity-field", f"Organization missing '{field}'")
                if not org.get("sameAs"):
                    add("IMPROVE", page, "entity-sameas", "Organization has no sameAs (social profiles)")

        # FAQ (answer engines love direct Q&A)
        has_faq_schema = "FAQPage" in types
        has_visible_q = len(p.questions) >= 2
        if is_home and not has_faq_schema:
            add("IMPROVE", page, "faq-schema", "no FAQPage schema (key AEO/AI-Overviews signal)")
        if is_home and not has_visible_q:
            add("IMPROVE", page, "faq-visible", "no visible Q&A headings")

        # breadcrumbs on inner pages
        if not is_home and "BreadcrumbList" not in types:
            add("IMPROVE", page, "breadcrumb", "no BreadcrumbList schema (page context for engines)")

        # answer-shaped meta description
        desc = p.metas.get("description", "")
        if not desc:
            add("FAIL", page, "desc-missing", "no meta description")
        elif len(desc) < 50:
            add("IMPROVE", page, "desc-thin", f"meta description very short ({len(desc)} chars)")

        # single clear h1
        if p.h1 != 1:
            add("IMPROVE", page, "h1", f"page has {p.h1} <h1> (want exactly 1)")

        # extractable content depth
        if p.words < MIN_WORDS:
            add("IMPROVE", page, "thin-content",
                f"only ~{p.words} words of extractable text (want >= {MIN_WORDS})")

    # ---- site-wide ----
    blocked, welcomed = robots_ai_status()
    if blocked:
        add("FAIL", "site", "ai-blocked",
            f"robots.txt blocks AI crawlers: {', '.join(sorted(set(blocked)))}")
    if welcomed:
        add("PASS", "site", "ai-welcomed",
            f"robots.txt explicitly welcomes: {', '.join(sorted(set(welcomed)))}")
    elif not blocked:
        add("IMPROVE", "site", "ai-implicit",
            "AI crawlers allowed only implicitly — add explicit User-agent groups to signal intent")

    if not os.path.isfile(os.path.join(ROOT, "llms.txt")):
        add("IMPROVE", "site", "llms-txt", "no llms.txt (emerging GEO standard for LLMs)")
    else:
        add("PASS", "site", "llms-txt", "llms.txt present")

    if not os.path.isfile(os.path.join(ROOT, "sitemap.xml")):
        add("IMPROVE", "site", "sitemap", "no sitemap.xml")

    return pages, all_types, findings


def main():
    pages, all_types, findings = audit()
    if "--json" in sys.argv:
        print(json.dumps(findings, ensure_ascii=False, indent=2))
        return sum(1 for f in findings if f["level"] == "FAIL")

    fails = sum(1 for f in findings if f["level"] == "FAIL")
    improves = sum(1 for f in findings if f["level"] == "IMPROVE")
    passes = sum(1 for f in findings if f["level"] == "PASS")

    print("=" * 70)
    print("ZERO 2 ONE — GEO / AEO / AIO READINESS")
    print("=" * 70)
    for page in pages:
        ts = sorted(set(t for t in all_types[page] if t != "__invalid__"))
        print(f"  {page:40} schema: {', '.join(ts) if ts else '—'}")
    print(f"\nFindings: {fails} FAIL, {improves} IMPROVE, {passes} PASS")
    print("-" * 70)
    for level in ("FAIL", "IMPROVE", "PASS"):
        block = [f for f in findings if f["level"] == level]
        if not block:
            continue
        print(f"\n### {level} ({len(block)})")
        for f in block:
            print(f"  [{f['kind']}] {f['scope']}: {f['detail']}")
    print()
    verdict = "EXCELLENT" if fails == 0 and improves == 0 else \
              ("GOOD (no blockers)" if fails == 0 else "NEEDS WORK")
    print(f"VERDICT: {verdict}")
    return fails


if __name__ == "__main__":
    sys.exit(main())
