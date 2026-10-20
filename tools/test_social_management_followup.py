"""Independent scope guard for the 20 October social management review."""
import hashlib,json,re,sys,subprocess
from pathlib import Path
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/social-management-followup-2026-10-20'
TARGETS=['ar/services/social-media-management/index.html','services/social-media-management/index.html']
PORTFOLIO={'بعض من أعمالنا في حسابات التواصل الاجتماعي','Some of Our Social Media Work'}
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protect(source):
    tree=Tree(source).root
    accent=tree.first(lambda n:n.has('service-studio-title-accent'))
    if accent:
        assert accent.text()=='Social Media' and accent.attrs.get('dir')=='ltr'
        accent.detach()
    for section in list(tree.walk()):
        if section.tag!='section':continue
        heading=section.first(lambda n:n.tag=='h2')
        if heading and heading.text() in PORTFOLIO:section.detach()
    for toggle in [n for n in tree.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
    return {
        'copy':[(n.attrs['data-copy'],norm(n.text())) for n in tree.walk() if 'data-copy' in n.attrs],
        'links':[n.attrs for n in tree.walk() if n.tag=='a'],
        'images':[n.attrs for n in tree.walk() if n.tag=='img'],
        'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
        'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
    }
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','.codex-repos/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel not in TARGETS:continue
        protected[rel]=protect(source)
    return {'pages':pages,'protected':protected}
if '--recover-baseline' in sys.argv:
    # The first guard mistakenly removed an enclosing section. Recover the
    # stronger copy/link guard from an independent commit whose HTML hashes
    # must exactly match those captured BEFORE editing. Keep the original file.
    checkout=sys.argv[sys.argv.index('--recover-baseline')+1]
    base='a760dbc7a343f49a8208fea016d1b67161a1e3e4'
    before=json.loads((REPORT/'before.json').read_text());dest=REPORT/'before-verified.json'
    assert not dest.exists(),'Never replace a recovered baseline'
    for rel in TARGETS:
        source=subprocess.check_output(['git','show',base+':'+rel],cwd=checkout,text=True)
        assert hashlib.sha256(unstamp(source).encode()).hexdigest()==before['pages'][rel],rel
        before['protected'][rel]=protect(source)
    before['recoveredFromExactPreEditCommit']=base
    dest.write_text(json.dumps(before,ensure_ascii=False,indent=2)+'\n')
    print('Recovered stronger guard from independently verified pre-edit HTML; original baseline untouched.')
elif '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json'
    assert not dest.exists(),'Never replace the independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured exact retained source copy, links, images, metadata and page scope.')
else:
    before=json.loads((REPORT/'before-verified.json').read_text());after=json.loads(json.dumps(snapshot()))
    if '--release-baseline' in sys.argv:
        # Separately published blog content belongs to the exact release base,
        # not the older local review copy. Protect every production HTML file.
        base=sys.argv[sys.argv.index('--release-baseline')+1]
        tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=ROOT,text=True).splitlines()
        before['pages']={rel:hashlib.sha256(unstamp(subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT,text=True)).encode()).hexdigest() for rel in tracked if rel.endswith('.html') and not rel.startswith(('tools/','.codex-repos/'))}
    assert before['pages'].keys()==after['pages'].keys()
    for rel,value in before['pages'].items():
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    assert before['protected']==after['protected'],'Retained source content changed'
    for rel in TARGETS:
        tree=Tree((ROOT/rel).read_text()).root
        assert not tree.first(lambda n:n.tag=='h2' and n.text() in PORTFOLIO)
        assert len([n for n in tree.walk() if 'data-social-content-rail' in n.attrs and 'data-home-scroll-always' in n.attrs])==2
        clients=tree.first(lambda n:n.attrs.get('data-service-stage')=='clients')
        assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
    print('PASS social-management-only markup scope; exact retained copy/images/links/head/footer; only approved portfolio/pause removals and Social Media accent.')
