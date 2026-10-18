"""Independent content/scope guard for the October 18 brand-service follow-up."""
from pathlib import Path
import hashlib, json, re, sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/brand-followup-2026-10-18'
BEFORE=REPORT/'before.json'
TARGETS=['ar/services/brand-identity/index.html','services/brand-identity/index.html']
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def snapshot():
    pages={};protected={}
    for p in ROOT.rglob('*.html'):
        rel=p.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','node_modules/','tools/')):continue
        source=p.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel not in TARGETS:continue
        tree=Tree(source).root
        removed=tree.first(lambda n:n.tag=='section' and n.attrs.get('id')=='section-9')
        if removed:removed.detach()
        protected[rel]={
            'copy':[[n.attrs['data-copy'],norm(n.text())] for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'pictures':[n.render() for n in tree.walk() if n.tag=='picture'],
            'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
            'untouched':{n.attrs.get('id'):n.render() for n in tree.walk() if n.tag=='section' and n.attrs.get('data-service-stage') in ('benefits','know','why','faq')},
        }
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    assert not BEFORE.exists(),'Never replace an independent pre-edit baseline'
    REPORT.mkdir(parents=True,exist_ok=True)
    BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured brand-only scope, approved content/images/links and unrelated pages.')
else:
    before=json.loads(BEFORE.read_text());after=snapshot()
    assert before['pages'].keys()==after['pages'].keys()
    for rel,digest in before['pages'].items():
        if rel not in TARGETS:assert digest==after['pages'][rel],rel
    # Removing section 9 naturally renumbers the following FAQ's decorative
    # divider/flow IDs. Compare its full content independently of decoration.
    for state in (before,after):
        for rel in TARGETS:
            faq=Tree(state['protected'][rel]['untouched']['faq']).root
            for node in list(faq.walk()):
                if node.has('seo-flow-trace') or node.has('service-studio-divider'):node.detach()
            state['protected'][rel]['untouched']['faq']=faq.render()
    assert before['protected']==after['protected'],'Retained copy, links, images, head, footer or unrelated brand sections changed'
    for rel in TARGETS:
        tree=Tree((ROOT/rel).read_text()).root
        assert not tree.first(lambda n:n.attrs.get('id')=='section-9')
        outcomes=tree.first(lambda n:n.has('service-studio-outcomes'))
        assert len([n for n in outcomes.walk() if n.has('service-card')])==6
        assert not outcomes.first(lambda n:n.tag in ('details','summary'))
        assert outcomes.first(lambda n:'data-home-scroll-track' in n.attrs)
        assert len([n for n in tree.walk() if n.has('service-studio-step')])==7
    print('PASS brand-only scope, exact retained copy/images/links, six homepage-style results and seven original process steps.')
