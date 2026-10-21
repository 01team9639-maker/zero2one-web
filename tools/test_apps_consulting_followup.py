"""Exact scope/copy protection for the 21 October apps and consulting review."""
import hashlib,json,re,subprocess,sys
from pathlib import Path
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/apps-consulting-followup-2026-10-21'
TARGETS=[p+'services/'+s+'/index.html' for s in ['mobile-application','marketing-consulting'] for p in ['ar/','']]
PACKAGE_TITLES={'باقات تطوير تطبيقات الجوال مصممة لتناسب احتياجات مشروعك',"Mobile App Packages Designed to Fit Your Project's Needs"}
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protect(source,rel):
    root=Tree(source).root
    for section in list(root.walk()):
        if section.tag!='section' or 'mobile-application' not in rel:continue
        heading=section.first(lambda n:n.tag=='h2')
        if heading and heading.text() in PACKAGE_TITLES:section.detach()
    for toggle in [n for n in root.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
    return {
        'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
        'links':[n.attrs for n in root.walk() if n.tag=='a'],
        'images':[n.attrs for n in root.walk() if n.tag=='img'],
        'people':[n.render() for n in root.walk() if n.has('team-card')],
        'head':unstamp(root.first(lambda n:n.tag=='head').render()),
        'footer':unstamp(root.first(lambda n:n.tag=='footer').render()),
    }
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','.codex-repos/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel in TARGETS:protected[rel]=protect(source,rel)
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json'
    assert not dest.exists(),'Never replace the independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured exact retained copy, links, images, complete profiles, metadata and unrelated page scope.')
else:
    before=json.loads((REPORT/'before.json').read_text());after=json.loads(json.dumps(snapshot()))
    if '--release-baseline' in sys.argv:
        base=sys.argv[sys.argv.index('--release-baseline')+1]
        tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=ROOT,text=True).splitlines()
        before['pages']={rel:hashlib.sha256(unstamp(subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT,text=True)).encode()).hexdigest()
                         for rel in tracked if rel.endswith('.html') and not rel.startswith(('tools/','.codex-repos/'))}
    assert before['pages'].keys()==after['pages'].keys()
    for rel,value in before['pages'].items():
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    assert before['protected']==after['protected'],'Retained source words, links, images, profiles or metadata changed'
    for rel in TARGETS:
        root=Tree((ROOT/rel).read_text()).root
        assert root.first(lambda n:'data-followup-deliverables' in n.attrs and 'data-home-scroll-always' in n.attrs)
        clients=root.first(lambda n:n.attrs.get('data-service-stage')=='clients')
        assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
        if 'mobile-application' in rel:
            assert not root.first(lambda n:n.attrs.get('data-service-stage')=='packages')
            assert len([n for n in root.walk() if n.has('mobile-daily-benefit')])==3
            h1=root.first(lambda n:n.tag=='h1')
            words=[n.text() for n in h1.walk() if n.has('service-studio-title-keyword')]
            assert words==(['تطبيق'] if rel.startswith('ar/') else ['App','App'])
    print('PASS four-page-only scope; original copy/links/images/profiles/head/footer intact; only mobile package/pause removals and source-preserving presentation changes.')
