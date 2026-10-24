"""Roster-only regression gate with an independent immutable page baseline."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
from team_update import DATA,SLIDE
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/team-update-2026-10-21'
ALLOWED={p+s+'index.html' for p in ('','ar/') for s in ('','team/','services/digital-advertising/','services/manage-google-adwords-campaigns/','services/social-media-management/','services/marketing-consulting/')}
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def protected(source):
    tree=Tree(source).root
    for node in list(tree.walk()):
        if node.has('team-slide'):node.detach()
    return re.sub(r'\s+',' ',tree.render()).strip()
def snapshot():
    pages={};nonteam={};people={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('node_modules/','tools/','.git/','.codex-repos/')):continue
        source=file.read_text();pages[rel]=sha(source)
        if rel in ALLOWED:
            nonteam[rel]=sha(protected(source))
            people[rel]=[c for c in re.findall(SLIDE,source) if 'team-rona' not in c]
    return {'pages':pages,'nonteam':nonteam,'people':people}
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);dest=REPORT/'before.json'
    assert not dest.exists(),'Do not overwrite the independent baseline'
    dest.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n');print('Captured site scope and unchanged non-team content.')
else:
    before=json.loads((REPORT/'before.json').read_text());now=snapshot()
    assert before['pages'].keys()==now['pages'].keys()
    for rel,digest in before['pages'].items():
        if rel not in ALLOWED:assert now['pages'][rel]==digest,'Unrelated page changed: '+rel
    assert now['nonteam']==before['nonteam'],'Non-team content changed'
    for rel,people in before['people'].items():
        for old in people:assert old in (ROOT/rel).read_text(),'Another team member changed: '+rel
    for rel in now['pages']:
        source=(ROOT/rel).read_text()
        assert not re.search(r'Rona Hakimeh|رونا حكيمة|team-rona|عمر غاندي|Omar Gandhi',source,re.I),rel
    for rel in ALLOWED:
        tree=Tree((ROOT/rel).read_text()).root
        for member in DATA['members']:
            expected=not 'services/' in rel or any('/'+slug+'/' in '/'+rel for slug in member['services'])
            nodes=[n for n in tree.walk() if n.attrs.get('data-team-member')==member['id']]
            assert len(nodes)==int(expected),(rel,member['id'],len(nodes))
            if nodes:
                lang='ar' if rel.startswith('ar/') else 'en'
                assert nodes[0].first(lambda n:n.has('testi-name')).text()==member[lang]['name']
                assert nodes[0].first(lambda n:n.has('testi-role')).text()==member[lang]['role']
                for image in [n for n in nodes[0].walk() if n.tag=='img']:
                    assert (ROOT/image.attrs['src'].lstrip('/')).is_file()
                    assert image.attrs['alt']==member[lang]['name']
        expected=12 if 'services/' not in rel else 4 if 'marketing-consulting' in rel else 2
        assert len([n for n in tree.walk() if n.has('team-card')])==expected,rel
    for prefix in ('','ar/'):
        seo=(ROOT/(prefix+'services/seo-riyadh/index.html')).read_text()
        assert 'SEO TEAM DISABLED:2026-10-16' in seo
    print('PASS 12 roster pages; no Rona anywhere; Nadine articles only; Omar marketing services; all other people/content and hidden SEO team preserved.')
