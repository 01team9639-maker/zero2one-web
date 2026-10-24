"""Independent content/scope protection for the unified general team layout."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/team-layout-2026-10-22'
def stable(source):
    tree=Tree(source).root
    for card in [n for n in tree.walk() if 'data-team-member' in n.attrs]:
        for node in card.walk():
            if node.has('testi-card-media') or node.has('testi-card-body'):node.attrs.pop('style',None)
    return re.sub(r'\?v=[a-f0-9]+','?v=HASH',tree.render())
def snapshot():
    result={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('node_modules/','tools/','.git/','.codex-repos/')):continue
        result[rel]=hashlib.sha256(stable(file.read_text()).encode()).hexdigest()
    return result
if '--capture' in sys.argv:
    REPORT.mkdir(parents=True,exist_ok=True);file=REPORT/'before.json'
    assert not file.exists(),'Do not replace the independent baseline'
    file.write_text(json.dumps(snapshot(),indent=2)+'\n');print('Captured unchanged content/people and all page scope.')
else:
    assert snapshot()==json.loads((REPORT/'before.json').read_text()),'Page content/people changed beyond removal of new-card inline layout and cache stamps'
    for rel in snapshot():
        text=(ROOT/rel).read_text()
        assert not re.search(r'Rona Hakimeh|رونا حكيمة|team-rona|عمر غاندي|Omar Gandhi',text,re.I)
    print('PASS all team members/copy/images/links and all page bodies unchanged; only consistent presentation and cache stamps.')
