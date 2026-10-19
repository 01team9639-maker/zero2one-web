"""Protected scope for the owner's catalogue/social advertising corrections."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/social-revision-2026-10-18'
BEFORE=REPORT/'before.json'
TARGETS=['ar/services/index.html','services/index.html','ar/services/digital-advertising/index.html','services/digital-advertising/index.html']
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel not in TARGETS:continue
        tree=Tree(source).root
        investment=tree.first(lambda n:n.attrs.get('id')=='section-9')
        if investment:
            for image in [n for n in investment.walk() if n.tag=='img']:image.detach()
        seo=next((n for n in tree.walk() if n.tag=='article' and n.first(lambda e:e.tag=='a' and '/services/seo-riyadh/' in e.attrs.get('href',''))),None)
        if seo:seo.first(lambda n:n.tag=='img').detach()
        protected[rel]={
            'copy':[[n.attrs['data-copy'],norm(n.text())] for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'images':[n.attrs for n in tree.walk() if n.tag=='img'],
            'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
            'benefits':tree.first(lambda n:n.attrs.get('data-service-stage')=='benefits').render() if 'digital-advertising' in rel else None,
        }
    return {'pages':pages,'protected':protected}
if __name__=='__main__':
    if '--capture' in sys.argv:
        assert not BEFORE.exists(),'Never overwrite the independent baseline'
        REPORT.mkdir(parents=True,exist_ok=True)
        BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
        print('Captured exact pre-correction text, links, retained images and four-page scope.')
    else:
        before=json.loads(BEFORE.read_text());after=snapshot()
        assert before['pages'].keys()==after['pages'].keys()
        for rel,value in before['pages'].items():
            if rel not in TARGETS:assert value==after['pages'][rel],rel
        assert before['protected']==after['protected'],'Original copy/links/retained images/head/footer or platform card markup changed'
        for rel in TARGETS[:2]:
            root=Tree((ROOT/rel).read_text()).root
            seo=next(n for n in root.walk() if n.tag=='article' and n.first(lambda e:e.tag=='a' and '/services/seo-riyadh/' in e.attrs.get('href','')))
            assert seo.first(lambda n:n.tag=='img').attrs['src']=='/assets/images/owner-services-2026-10/seo.webp'
        for rel in TARGETS[2:]:
            root=Tree((ROOT/rel).read_text()).root
            investment=root.first(lambda n:n.has('social-investment'))
            assert len([n for n in investment.walk() if n.has('social-investment-case')])==3
            clients=root.first(lambda n:n.attrs.get('data-service-stage')=='clients')
            assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
        print('PASS exact retained bilingual copy/links/platform markup, updated SEO photo, three investment cases and no clients pause button.')
