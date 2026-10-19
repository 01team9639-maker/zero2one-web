"""Package the approved static-gradient/light-card social-ads follow-up."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='93272dc43bbfe1edf1083e0e887474c835823b60'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source):
    root=Tree(source).root
    accents=[n for n in root.walk() if n.has('service-studio-title-accent')]
    if accents:
        assert len(accents)==1 and accents[0].text()=='Ads' and accents[0].attrs.get('dir')=='ltr'
        accents[0].detach()
    return {'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in root.walk() if n.tag=='a'],
            'images':[n.attrs for n in root.walk() if n.tag=='img'],
            'head':unstamp(root.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(root.first(lambda n:n.tag=='footer').render())}
assert TARGET!=SOURCE and git('rev-parse','HEAD')==BASE
assert git('rev-parse','origin/main')==BASE,'Review newer main before preparing'
assert not git('status','--porcelain','--untracked-files=no'),'Preserve release edits'
blog={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
owned={'ar/services/digital-advertising/index.html','services/digital-advertising/index.html'}
paths=[]
for rel in git('ls-files','*.html').splitlines():
    if rel.startswith('blog/'):continue
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    if rel in owned:assert protected(source.read_text())==protected(target.read_text()),'Retained source content changed: '+rel
    else:assert unstamp(source.read_text())==unstamp(target.read_text()),'Unrelated page body changed: '+rel
    paths.append(rel)
paths+=['assets/css/bundle.min.css','assets/css/service-studio.css','tools/service_studio.py','tools/test_refresh_copy.py','tools/refresh/README.md','tools/test_social_horizontal.py','tools/test_catalogue_social_followup_browser.js','tools/prepare_social_horizontal_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes();dest=TARGET/rel
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest(data)})
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual social-ads hero Ads accent and investment static orange gradient, light cards and fit-or-swipe horizontal row. Existing copy/images/links preserved apart from requested Ads addition. Other main-site pages only receive CSS cache stamps; generated blog untouched.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/social-horizontal-release-2026-10-19.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime checks; preserved {len(blog)} published blog files. Not published.')
