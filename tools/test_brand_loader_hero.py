"""Protect all existing content outside the shared loader and two hero photos."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/brand-loader-hero-2026-10-24'
BASE=REPORT/'before.json'
def normalized(source):
    tree=Tree(re.sub(r'\?v=[a-f0-9]+','?v=HASH',source)).root
    for node in list(tree.walk()):
        if node.has('loading-container'):
            node.attrs={'data-loader':'SHARED'};node.set([])
        elif node.tag=='img' and ('data-owner-cro-hero' in node.attrs or 'data-owner-email-hero' in node.attrs):
            node.attrs={'data-service-hero-photo':'IMAGE'}
    return tree.render()
def snapshot():
    result={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('tools/','node_modules/','.git/','.codex-repos/')):continue
        result[rel]=hashlib.sha256(normalized(file.read_text()).encode()).hexdigest()
    return result
if '--capture' in sys.argv:
    assert not BASE.exists(),'Never overwrite the independent baseline'
    REPORT.mkdir(parents=True,exist_ok=True);BASE.write_text(json.dumps(snapshot(),indent=2));print('Captured before shared loader/photo changes.')
else:
    before=json.loads(BASE.read_text());now=snapshot()
    assert before==now,'Changed outside loader/hero slots: '+str([p for p in before if now.get(p)!=before[p]])
    from brand_loader import WORDS,BRANDS
    count=0
    for file in ROOT.rglob('index.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('tools/','node_modules/','.git/','.codex-repos/','blog/')):continue
        tree=Tree(file.read_text()).root;loader=tree.first(lambda n:n.has('loading-container'))
        if not loader:continue
        lang='ar' if rel.startswith('ar/') else 'en'
        assert not loader.has('loading-service')
        words=[n.text() for n in loader.walk() if n.has('loading-word')]
        assert words==WORDS[lang],(rel,words)
        assert loader.first(lambda n:n.has('loading-brand')).text()==BRANDS[lang]
        count+=1
    photos=json.loads((ROOT/'tools/refresh/deferred-hero-photos-2026-10-24.json').read_text())
    for slug,entry in photos.items():
        assert hashlib.sha256(Path(entry['source']).read_bytes()).hexdigest()==entry['sourceSha256']
        assert (entry['width'],entry['height'])==(1536,1024)
        for o in entry['outputs']:
            assert hashlib.sha256((ROOT/o['url'].lstrip('/')).read_bytes()).hexdigest()==o['sha256']
        key='cro' if slug=='conversion-rate-optimization' else 'email'
        for prefix in ('ar/',''):
            for route in ('','services/','services/'+slug+'/'):
                tree=Tree((ROOT/(prefix+route+'index.html')).read_text()).root
                image=tree.first(lambda n:'data-owner-'+key+'-hero' in n.attrs)
                assert image and image.attrs['src']==entry['outputs'][1]['url']
                assert len(image.attrs['srcset'].split(','))==3
    print(f'PASS {count} canonical loaders, 12 bilingual hero/card placements, intact sources and all other HTML unchanged.')
