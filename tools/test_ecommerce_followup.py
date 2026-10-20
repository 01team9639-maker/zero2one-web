"""Independent content/scope guard for the 20 October ecommerce review."""
import hashlib,json,re,sys,subprocess
from pathlib import Path
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/ecommerce-followup-2026-10-20'
TARGETS=['ar/services/ecommerce-development/index.html','services/ecommerce-development/index.html']
REMOVED={'المتجر ليس مصروفاً، بل فرع جديد لا يغلق',"A Store Isn't an Expense. It's a Branch That Never Closes"}
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protect(source):
    tree=Tree(source).root
    accent=tree.first(lambda n:n.has('service-studio-title-accent'))
    if accent:
        assert accent.text()=='E-commerce' and accent.attrs.get('dir')=='ltr'
        accent.detach()
    for section in list(tree.walk()):
        if section.tag!='section':continue
        heading=section.first(lambda n:n.tag=='h2')
        if heading and heading.text() in REMOVED:section.detach()
    for person in list(tree.walk()):
        if person.has('team-card') and person.first(lambda n:n.tag=='img' and 'team-karabala.' in n.attrs.get('src','')):person.detach()
    for toggle in [n for n in tree.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
    return {
        'copy':[(n.attrs['data-copy'],norm(n.text())) for n in tree.walk() if 'data-copy' in n.attrs],
        'links':[n.attrs for n in tree.walk() if n.tag=='a'],
        'images':[n.attrs for n in tree.walk() if n.tag=='img'],
        'people':[n.render() for n in tree.walk() if n.has('team-card')],
        'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
        'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
    }
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','.codex-repos/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel in TARGETS:protected[rel]=protect(source)
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json'
    assert not dest.exists(),'Never replace an independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured exact retained bilingual ecommerce source and unrelated page scope.')
else:
    before=json.loads((REPORT/'before.json').read_text());after=json.loads(json.dumps(snapshot()))
    if '--release-baseline' in sys.argv:
        # Production blog content is independently published. Compare every
        # unrelated production page against its exact starting commit.
        base=sys.argv[sys.argv.index('--release-baseline')+1]
        tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=ROOT,text=True).splitlines()
        before['pages']={rel:hashlib.sha256(unstamp(subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT,text=True)).encode()).hexdigest() for rel in tracked if rel.endswith('.html') and not rel.startswith(('tools/','.codex-repos/'))}
    assert before['pages'].keys()==after['pages'].keys()
    for rel,value in before['pages'].items():
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    assert before['protected']==after['protected'],'Unexpected copy/link/image/profile/metadata changes'
    for rel in TARGETS:
        tree=Tree((ROOT/rel).read_text()).root
        assert not tree.first(lambda n:n.tag=='h2' and n.text() in REMOVED)
        assert tree.first(lambda n:'data-ecommerce-deliverables' in n.attrs and 'data-home-scroll-always' in n.attrs)
        assert not tree.first(lambda n:n.tag=='img' and 'team-karabala.' in n.attrs.get('src',''))
        assert len([n for n in tree.walk() if n.has('team-card')])==4
        clients=tree.first(lambda n:n.attrs.get('data-service-stage')=='clients')
        assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
    print('PASS ecommerce-only markup changes; exact retained copy/images/links/four profiles/head/footer; approved investment/Karabala/pause removals only.')
