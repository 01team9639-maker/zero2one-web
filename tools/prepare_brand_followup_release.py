"""Prepare the approved bilingual brand follow-up over verified current main."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='42145553fbd332d96ba4092424f53776b6caaf84'
def git(*args):
    return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source):
    root=Tree(source).root
    investment=root.first(lambda n:n.tag=='section' and n.attrs.get('id')=='section-9')
    if investment:investment.detach()
    return {
        'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
        'links':[n.attrs for n in root.walk() if n.tag=='a'],
        'pictures':[n.render() for n in root.walk() if n.tag=='picture'],
        'head':unstamp(root.first(lambda n:n.tag=='head').render()),
        'footer':unstamp(root.first(lambda n:n.tag=='footer').render()),
    }
assert TARGET!=SOURCE and git('rev-parse','HEAD')==BASE
assert git('rev-parse','origin/main')==BASE,'Review newer main before preparing'
assert not git('status','--porcelain','--untracked-files=no'),'Do not overwrite release edits'
blog={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
brand={'ar/services/brand-identity/index.html','services/brand-identity/index.html'}
paths=[]
for rel in git('ls-files','*.html').splitlines():
    if rel.startswith('blog/'):continue
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    if rel in brand:assert protected(source.read_text())==protected(target.read_text()),'Retained brand content changed: '+rel
    else:assert unstamp(source.read_text())==unstamp(target.read_text()),'Unrelated page body changed: '+rel
    paths.append(rel)
paths += ['assets/css/bundle.min.css','assets/css/service-studio.css','tools/build_site_refresh.py','tools/service_studio.py','tools/refresh/README.md','tools/refresh/coverage.json','tools/refresh/copy-manifest.json','tools/test_brand_identity_followup.py','tools/test_brand_identity_followup_browser.js','tools/prepare_brand_followup_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes()
    if rel.endswith('.json'):
        data=data.decode().replace(str(Path.home())+'/Downloads/','owner-supplied/').replace(str(Path.home())+'/','local-workstation/').encode()
    dest=TARGET/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest(data)})
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual brand deliverable layout, larger audience CTA, alternating process, six homepage-style results and investment callout removal. Other main-site pages only receive CSS dependency stamps. Blog output unchanged.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/brand-followup-release-2026-10-18.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime files; preserved {len(blog)} published blog files. Not published.')
