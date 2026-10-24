"""Independent scope guard for catalogue/social-ads presentation only."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/catalogue-social-followup-2026-10-18'
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
        protected[rel]={
            'copy':[(n.attrs['data-copy'],norm(n.text())) for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'images':[n.attrs for n in tree.walk() if n.tag=='img'],
            'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
        }
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    assert not BEFORE.exists(),'Never replace the independent pre-edit baseline'
    REPORT.mkdir(parents=True,exist_ok=True)
    BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured catalogue/social-ads exact content, images, links and page scope.')
else:
    before=json.loads(BEFORE.read_text());after=snapshot()
    # Normalize the tuples produced in memory to the saved JSON arrays.
    after=json.loads(json.dumps(after))
    assert before['pages'].keys()==after['pages'].keys()
    for rel,value in before['pages'].items():
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    assert before['protected']==after['protected'],'Approved copy, images, links, metadata or footer changed'
    for rel in TARGETS[:2]:
        tree=Tree((ROOT/rel).read_text()).root
        cards=[n for n in tree.walk() if n.has('catalogue-home-card')]
        assert len(cards)==9
        for card in cards:
            assert card.has('service-card') and card.first(lambda n:n.has('service-card-media'))
            assert card.first(lambda n:n.has('service-card-body')) and card.first(lambda n:n.tag=='a')
    print('PASS four-page scope, exact original copy/images/links/head/footer and nine homepage-style catalogue cards per language.')
