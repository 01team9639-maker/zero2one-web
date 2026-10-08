"""Extract protected hero sources from the pre-task archive, not current output."""
import json,re,tarfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'tools/refresh/protected-design.json'
assert not out.exists(), 'Refuse to replace protected original design'
archive=Path('/Users/mohammad/Documents/Codex/2026-09-06/id-x20/work/site-refresh-2026-10-07/pre-existing-source.tgz')
data={}
with tarfile.open(archive) as tar:
    for lang in ('en','ar'):
        prefix='ar/' if lang=='ar' else ''
        src=tar.extractfile('./'+prefix+'index.html').read().decode()
        a=src.index('<header class="section home-header')
        z=src.index('</header>',a)+len('</header>')
        data[lang]={'home_prefix':src[:a], 'home_hero':src[a:z]}
        for slug in ('web-design-riyadh','brand-identity','digital-advertising','social-media-management','ecommerce-development'):
            src=tar.extractfile('./'+prefix+'services/'+slug+'/index.html').read().decode()
            a=src.index('<header class="section default-header')
            z=src.index('</header>',a)+len('</header>')
            data[lang][slug]=src[a:z]
out.write_text(json.dumps(data,ensure_ascii=False,indent=2))
print('Original home hero and five existing service headers captured for both languages.')
