"""Independent before/after guard: work redesign must not rewrite evidence/copy."""
import hashlib,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'tools/reports/site-refresh/work-refresh-2026-10-24/before.json'
def snapshot():
    out={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('tools/','node_modules/','.git/','.codex-repos/')):continue
        source=re.sub(r'(/assets/(?:css|js)/[^"?]+)\?v=[a-f0-9]+',r'\1?v=HASH',file.read_text())
        out[rel]=hashlib.sha256(source.encode()).hexdigest()
    out['portfolio_data.py']=hashlib.sha256((ROOT/'tools/portfolio_data.py').read_bytes()).hexdigest()
    return out
if '--capture' in sys.argv:
    assert not BASE.exists(),'Never overwrite the independent original baseline'
    BASE.parent.mkdir(parents=True,exist_ok=True);BASE.write_text(json.dumps(snapshot(),indent=2));print('Captured all public copy and portfolio data')
else:
    before=json.loads(BASE.read_text());now=snapshot()
    assert before==now,'Unintended source/content change: '+str([p for p in before if now.get(p)!=before[p]])
    print('PASS all public HTML, result values, links, source evidence and other pages unchanged (asset stamps excepted)')
