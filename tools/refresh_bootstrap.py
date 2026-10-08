"""One-time capture of existing, owner-approved chrome/content before refresh.
Run only before the first build. Never overwrite this preservation source.
"""
import json, re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
target = root / 'tools/refresh/legacy-blocks.json'
assert not target.exists(), 'Already captured; refusing to replace original blocks'
result = {}
for lang in ('en', 'ar'):
    base = root / ('ar' if lang == 'ar' else '')
    home = (base / 'index.html').read_text()
    seo = (base / 'services/seo-riyadh/index.html').read_text()
    def section_at(src, marker):
        a = src.index(marker)
        # All captured sections here contain no nested <section>.
        z = src.index('</section>', a) + len('</section>')
        return src[a:z]
    prefix = seo[:seo.index('<section class="section seo-hero-shell"')]
    footer = home[home.index('<div class="footer-rounded-div"'):]
    # Prefix already opens the case-top-wrap; close it before the home footer.
    result[lang] = {
        'prefix': prefix,
        'footer': '</section>\n' + footer,
        'team': section_at(home, '<section id="team"'),
        'testimonials': section_at(home, '<section id="testimonials"'),
        'faq': section_at(home, '<section class="section faq-section"'),
        'clients': section_at(seo, '<section class="section seo-sec seo-clients'),
        'home_head': home[:home.index('</head>')+7],
    }
target.write_text(json.dumps(result, ensure_ascii=False, indent=2))
print('Captured original header, footer, team, testimonials, FAQ and client logos.')
