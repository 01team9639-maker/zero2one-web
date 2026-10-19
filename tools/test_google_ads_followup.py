"""Independent pre-edit scope and source guard for the Google Ads review."""
import hashlib,json,re,sys,subprocess
from pathlib import Path
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/google-ads-followup-2026-10-19'
TARGETS=['ar/services/manage-google-adwords-campaigns/index.html','services/manage-google-adwords-campaigns/index.html']
MARKER='GOOGLE ADS INVESTMENT DISABLED:2026-10-19'
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def snapshot():
    pages={};protected={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','.codex-repos/','node_modules/','tools/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(unstamp(source).encode()).hexdigest()
        if rel not in TARGETS:continue
        source=re.sub(r'<!-- '+re.escape(MARKER)+r'\n([\s\S]*?)\n-->',lambda m:m[1],source)
        tree=Tree(source).root
        accent=tree.first(lambda n:n.has('service-studio-title-accent'))
        if accent:
            assert accent.text()=='Google Ads' and accent.attrs.get('dir')=='ltr'
            accent.detach()
        for toggle in [n for n in tree.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
        protected[rel]={
            'copy':[(n.attrs['data-copy'],norm(n.text())) for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'images':[n.attrs for n in tree.walk() if n.tag=='img'],
            'head':unstamp(tree.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(tree.first(lambda n:n.tag=='footer').render()),
        }
    return {'pages':pages,'protected':protected}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json'
    assert not dest.exists(),'Never replace the independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured original markup, copy, links, images and metadata.')
else:
    before=json.loads((REPORT/'before.json').read_text());after=json.loads(json.dumps(snapshot()))
    if '--release-baseline' in sys.argv:
        # Production has separately published blog revisions. Protect those
        # against the release's exact starting commit, not an older review copy.
        base=sys.argv[sys.argv.index('--release-baseline')+1]
        tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',base],cwd=ROOT,text=True).splitlines()
        before['pages']={rel:hashlib.sha256(unstamp(subprocess.check_output(['git','show',base+':'+rel],cwd=ROOT,text=True)).encode()).hexdigest() for rel in tracked if rel.endswith('.html') and not rel.startswith(('tools/','.codex-repos/'))}
    for rel,value in before['pages'].items():
        # Independent sibling repository checkouts are not site runtime pages.
        if rel.startswith('.codex-repos/'):continue
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    assert before['protected']==after['protected'],'Original content changed beyond approved accent/comment/pause removal'
    for rel in TARGETS:
        source=(ROOT/rel).read_text();assert source.count('<!-- '+MARKER+'\n')==1
        tree=Tree(source).root
        assert not tree.first(lambda n:n.tag=='section' and n.attrs.get('id')=='section-10')
        assert tree.first(lambda n:n.attrs.get('data-google-deliverables')=='true' and 'data-home-scroll-always' in n.attrs)
        clients=tree.first(lambda n:n.attrs.get('data-service-stage')=='clients')
        assert not clients.first(lambda n:n.has('logo-marquee-toggle'))
    print('PASS Google-only markup changes, exact retained copy/images/links/head/footer; investment preserved in one comment.')
