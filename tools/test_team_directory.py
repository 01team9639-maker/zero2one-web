"""Independent scope/identity protection for team directory and direct navigation."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/team-directory-2026-10-22'
def stable(source):
    tree=Tree(source).root
    for node in list(tree.walk()):
        if node.has('rf-nav-team'):node.detach()
    return re.sub(r'\?v=[a-f0-9]+','?v=HASH',tree.render())
def snapshot():
    result={};teams={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('node_modules/','tools/','.git/','.codex-repos/')):continue
        text=file.read_text();result[rel]=hashlib.sha256(stable(text).encode()).hexdigest()
        if rel in ('team/index.html','ar/team/index.html'):
            tree=Tree(text).root
            teams[rel]={'cards':[n.render() for n in tree.walk() if n.has('team-card')],
                        'head':re.sub(r'\?v=[a-f0-9]+','?v=HASH',tree.first(lambda n:n.tag=='head').render()),
                        'footer':tree.first(lambda n:n.tag=='footer').render()}
    return {'pages':result,'teams':teams}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json';assert not dest.exists()
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n');print('Captured all page scope, original profiles, metadata and footer.')
else:
    before=json.loads((REPORT/'before.json').read_text());now=snapshot();assert before['pages'].keys()==now['pages'].keys()
    for rel,digest in before['pages'].items():
        if rel not in before['teams']:assert now['pages'][rel]==digest,'Unrelated page content changed: '+rel
    for rel,old in before['teams'].items():
        assert sorted(old['cards'])==sorted(now['teams'][rel]['cards']),'Changed/missing team biography or portrait'
        assert old['head']==now['teams'][rel]['head'] and old['footer']==now['teams'][rel]['footer']
        root=Tree((ROOT/rel).read_text()).root
        assert len([n for n in root.walk() if n.has('team-directory-group')])==3
        assert len([n for n in root.walk() if n.has('team-card')])==12
    count=0
    for rel in now['pages']:
        if rel.startswith('blog/'):continue
        root=Tree((ROOT/rel).read_text()).root
        if not root.first(lambda n:n.has('nav-bar')):continue
        expected='/ar/team/' if rel.startswith('ar/') else '/team/'
        for parent in [root.first(lambda n:n.has('nav-bar')),root.first(lambda n:n.attrs.get('id')=='site-menu')]:
            assert parent is not None,rel
            links=[n for n in parent.walk() if n.tag=='a' and n.attrs.get('data-team-nav')=='true']
            assert len(links)==1 and links[0].attrs['href']==expected,(rel,expected)
            assert not links[0].first(lambda n:n.tag=='summary')
            count+=1
    print('PASS original profiles/content preserved; redesigned only two team pages;',count,'direct navbar/sidebar links.')
