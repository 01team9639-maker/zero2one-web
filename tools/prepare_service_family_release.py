"""Package the approved local site on top of current main, without publishing.

Keep the published blog tree and historical release tooling. Private source
images and local audit files never enter the public deployment. Runtime files
are byte-identical to the owner-reviewed checkout.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASELINE='c9d5bcd6a1667f57798503bd2947909dc976772e'
def git(root,*args):return subprocess.check_output(['git',*args],cwd=root,text=True).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
assert TARGET!=SOURCE and (TARGET/'.git').exists()
assert git(TARGET,'rev-parse','HEAD')==BASELINE,'Release checkout must start from verified current main'
dirty=git(TARGET,'status','--porcelain','--untracked-files=no')
if dirty:
    prepared=TARGET/'tools/service-family-release-2026-10-18.json'
    assert '--refresh-prepared' in sys.argv and prepared.exists() and json.loads(prepared.read_text())['baseline']==BASELINE,'Do not overwrite local release edits'
assert git(SOURCE,'rev-parse','origin/main')==BASELINE,'Fetch/review current main before packaging'
blog={p.relative_to(TARGET).as_posix():sha(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
paths=set(git(SOURCE,'diff','--name-only','HEAD').splitlines())|set(git(SOURCE,'ls-files','--others','--exclude-standard').splitlines())
historic=('tools/prepare_seo_','tools/test_seo_')
copied=[];private=[];preserved=[]
for rel in sorted(paths):
    src=SOURCE/rel
    assert src.is_file(),'Unexpected deletion or non-file: '+rel
    assert not rel.startswith(('blog/','.git/','node_modules/','tools/reports/')),'Unsafe copy scope: '+rel
    assert rel=='README.md' or rel.startswith(('assets/','tools/','ar/','services/','about/','contact/','faqs/','team/','work/')) or rel=='index.html',rel
    if rel.startswith(historic) and (TARGET/rel).exists():
        preserved.append(rel);continue
    public_fallback=rel.startswith('assets/images/brand-benefits/') and src.suffix=='.jpg'
    if rel.startswith('assets/') and not public_fallback and (src.suffix.lower() in ('.png','.jpg','.jpeg') or 'originals' in src.parts or 'original' in src.parts):
        # These are read-only owner originals, never referenced by new pages.
        private.append(rel);continue
    data=src.read_bytes()
    dest=TARGET/rel
    if src.suffix=='.json':
        # Strip workstation identities from provenance, retaining hashes,
        # licenses, logical source names and every output URL.
        clean=data.decode().replace(str(Path.home())+'/Downloads/','owner-supplied/').replace(str(Path.home())+'/','local-workstation/')
        data=clean.encode()
    dest.parent.mkdir(parents=True,exist_ok=True)
    if not dest.exists() or dest.read_bytes()!=data:
        dest.write_bytes(data)
    if rel.startswith(('assets/','ar/','services/','about/','contact/','faqs/','team/','work/')) or rel=='index.html':
        if dest==TARGET/rel:copied.append({'file':rel,'sha256':sha(data)})
assert blog=={p.relative_to(TARGET).as_posix():sha(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()},'Published blog changed'
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=ASSET_HASH',s)
for rel in ('services/seo-riyadh/index.html','ar/services/seo-riyadh/index.html'):
    old=git(TARGET,'show',BASELINE+':'+rel)
    assert unstamp(old)==unstamp((TARGET/rel).read_text().strip()),'Published SEO body/package/team must stay intact'
record={'baseline':BASELINE,'scope':'All owner-approved local service designs, independent bilingual source updates, supplied illustrations and shared UI/footer dependencies.',
        'runtimeFiles':copied,'privateOriginalsRetainedLocally':private,'historicalPublishedToolsPreserved':preserved,'blogHashes':blog,
        'blogContentRevision':'23cf16185fc3e0a224e4c3e63ef1b687857386bc','notes':'No blog output edited. Refresh its chrome through the owning build workflow, pinning the published article revision.'}
(TARGET/'tools/service-family-release-2026-10-18.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Packaged {len(copied)} runtime files. Preserved published SEO copy and all {len(blog)} blog files. Excluded {len(private)} private originals. No publication performed.')
