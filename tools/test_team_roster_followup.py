"""Protect all existing content while adding two people and updating Omar."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/team-roster-followup-2026-10-23'
OWNED={p+s+'index.html' for p in ('','ar/') for s in ('','team/','services/digital-advertising/','services/manage-google-adwords-campaigns/','services/social-media-management/','services/marketing-consulting/')}
NEW={'walaa-al-qarni','hadeel-al-qahtani'}
def stable(source):
    tree=Tree(source).root
    for node in list(tree.walk()):
        if node.attrs.get('data-team-member') in NEW|{'omar-mansour'}:
            (node.parent if node.parent and node.parent.has('team-slide') else node).detach()
    return re.sub(r'\?v=[a-f0-9]+','?v=HASH',tree.render())
def snapshot():
    pages={};people={};chrome={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('node_modules/','tools/','.git/','.codex-repos/')):continue
        source=file.read_text();pages[rel]=hashlib.sha256(stable(source).encode()).hexdigest()
        if rel in OWNED:
            tree=Tree(source).root
            people[rel]=sorted(n.render() for n in tree.walk() if n.has('team-card') and n.attrs.get('data-team-member') not in NEW|{'omar-mansour'})
            chrome[rel]=[re.sub(r'\?v=[a-f0-9]+','?v=HASH',tree.first(lambda n:n.tag==tag).render()) for tag in ('head','footer')]
    return {'pages':pages,'people':people,'chrome':chrome}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json';assert not dest.exists(),'Never overwrite the independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n');print('Captured all original people, page scope, metadata and footer.')
else:
    before=json.loads((REPORT/'before.json').read_text());now=snapshot();assert before['pages'].keys()==now['pages'].keys()
    for rel,digest in before['pages'].items():
        if rel not in ('team/index.html','ar/team/index.html'):assert now['pages'][rel]==digest,'Changed unrelated non-roster content: '+rel
    assert before['people']==now['people'],'An unrelated team member changed'
    assert before['chrome']==now['chrome'],'Metadata or footer changed'
    from team_update import DATA
    members={m['id']:m for m in DATA['members']}
    for rel in OWNED:
        root=Tree((ROOT/rel).read_text()).root;general='services/' not in rel;lang='ar' if rel.startswith('ar/') else 'en'
        for key in NEW|{'omar-mansour'}:
            nodes=[n for n in root.walk() if n.attrs.get('data-team-member')==key]
            assert len(nodes)==int(general or key=='omar-mansour'),(rel,key,len(nodes))
            if nodes:
                node=nodes[0];source=members[key][lang]
                for css,field in [('testi-name','name'),('testi-role','role'),('testi-quote','bio')]:assert node.first(lambda n:n.has(css)).text()==source[field]
                if key in NEW:assert node.first(lambda n:n.tag=='img').attrs['src']=='/assets/images/team/team-ruba.webp'
        if general:assert len([n for n in root.walk() if n.has('team-card')])==14
        if rel.endswith('team/index.html'):
            groups=[n for n in root.walk() if n.has('team-directory-group')]
            assert [len([c for c in g.walk() if c.has('team-card')]) for g in groups]==[4,3,3,4]
            assert root.first(lambda n:n.has('team-directory-total')).first(lambda n:n.tag=='b').text()=='14'
            assert root.first(lambda n:n.attrs.get('id')=='team-leadership').first(lambda n:n.attrs.get('data-team-member')=='walaa-al-qarni')
            for key in ['omar-mansour','hadeel-al-qahtani']:assert root.first(lambda n:n.attrs.get('id')=='team-sales').first(lambda n:n.attrs.get('data-team-member')==key)
    assert 'أصول' not in members['omar-mansour']['ar']['bio'] and 'استرجاع' not in members['omar-mansour']['ar']['bio']
    print('PASS two new members with Ruba placeholder; Omar sales copy; 14 general profiles; other people/content/metadata/footer unchanged.')
