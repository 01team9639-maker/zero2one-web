"""Scope and copy guards for the owner's 18 October website-service review."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/web-design-followup-2026-10-18'
BEFORE=REPORT/'before.json'
TARGETS=['services/web-design-riyadh/index.html','ar/services/web-design-riyadh/index.html']
clean=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(clean(source).encode()).hexdigest()
        if rel not in TARGETS:continue
        tree=Tree(source).root
        for node in list(tree.walk()):
            if node.tag=='section' and node.attrs.get('id')=='section-9':node.detach()
            if node.has('team-card') and node.first(lambda n:n.tag=='img' and 'team-karabala.' in n.attrs.get('src','')):node.detach()
            if node.has('logo-marquee-toggle'):node.detach()
        protected[rel]={
            'copy':[[n.attrs['data-copy'],norm(n.text())] for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'footer':clean(tree.first(lambda n:n.tag=='footer').render()),
            'people':[n.render() for n in tree.walk() if n.has('team-card')],
            'head':clean(tree.first(lambda n:n.tag=='head').render()),
        }
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    assert not BEFORE.exists(),'Never overwrite an independent baseline'
    REPORT.mkdir(parents=True,exist_ok=True);BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured exact pre-edit scope; excludes only the owner-requested removals.')
else:
    before=json.loads(BEFORE.read_text());after=snapshot()
    assert before['pages'].keys()==after['pages'].keys()
    for p,h in before['pages'].items():
        if p not in TARGETS:assert h==after['pages'][p],'Unrelated markup changed: '+p
    assert before['protected']==after['protected'],'Copy, links, other people, metadata or footer markup changed'
    for p in TARGETS:
        tree=Tree((ROOT/p).read_text()).root
        assert not tree.first(lambda n:n.tag=='section' and n.attrs.get('id')=='section-9')
        team=tree.first(lambda n:n.attrs.get('data-service-stage')=='team')
        assert len([n for n in team.walk() if n.has('team-card')])==4
        assert not team.first(lambda n:n.tag=='img' and 'team-karabala.' in n.attrs.get('src',''))
        clients=tree.first(lambda n:n.attrs.get('data-service-stage')=='clients')
        assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
        assert len([n for n in tree.walk() if 'data-web-technology' in n.attrs])==10
        assert tree.first(lambda n:n.attrs.get('data-web-site-types')=='true' and 'data-home-scroll-always' in n.attrs)
    print('PASS bilingual website-only markup scope, exact retained copy/links/people, 10 technology icons and requested removals; unrelated pages unchanged apart from asset stamps.')
