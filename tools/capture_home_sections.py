"""One-time capture of original homepage layouts, without changing originals."""
import json,re,tarfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
dst=root/'tools/refresh/home-original-sections.json'
assert not dst.exists(), 'Original snapshot already exists'
archive=Path('/Users/mohammad/Documents/Codex/2026-09-06/id-x20/work/site-refresh-2026-10-07/pre-existing-source.tgz')
result={}
with tarfile.open(archive) as t:
    for lang in ('en','ar'):
        s=t.extractfile('./'+('ar/' if lang=='ar' else '')+'index.html').read().decode()
        result[lang]={}
        for name,pattern in [('intro',r'<section class="section home-intro"'),('about',r'<section id="about"'),('services',r'<section id="services"'),('work',r'<section id="selected-work"')]:
            a=re.search(pattern,s).start();z=s.index('</section>',a)+10
            result[lang][name]=s[a:z]
dst.write_text(json.dumps(result,ensure_ascii=False,indent=2))
