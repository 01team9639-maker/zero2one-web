"""Package only the approved bilingual social-management presentation."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='a760dbc7a343f49a8208fea016d1b67161a1e3e4'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source):
    root=Tree(source).root
    accent=root.first(lambda n:n.has('service-studio-title-accent'))
    if accent:
        assert accent.text()=='Social Media' and accent.attrs.get('dir')=='ltr'
        accent.detach()
    for section in list(root.walk()):
        if section.tag!='section':continue
        heading=section.first(lambda n:n.tag=='h2')
        if heading and heading.text() in ('بعض من أعمالنا في حسابات التواصل الاجتماعي','Some of Our Social Media Work'):section.detach()
    for toggle in [n for n in root.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
    return {'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in root.walk() if n.tag=='a'],
            'images':[n.attrs for n in root.walk() if n.tag=='img'],
            'head':unstamp(root.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(root.first(lambda n:n.tag=='footer').render())}
assert TARGET!=SOURCE and git('rev-parse','HEAD')==BASE
assert git('rev-parse','origin/main')==BASE,'Review newer main before packaging'
assert not git('status','--porcelain','--untracked-files=no'),'Preserve release edits'
blog={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
owned={'ar/services/social-media-management/index.html','services/social-media-management/index.html'}
paths=[]
for rel in git('ls-files','*.html').splitlines():
    if rel.startswith('blog/'):continue
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    if rel in owned:assert protected(source.read_text())==protected(target.read_text()),'Unapproved content difference: '+rel
    else:assert unstamp(source.read_text())==unstamp(target.read_text()),'Unrelated page body changed: '+rel
    paths.append(rel)
paths+=['assets/css/bundle.min.css','assets/css/service-studio.css',
        'tools/service_studio.py','tools/build_site_refresh.py','tools/test_refresh_copy.py','tools/refresh/README.md','tools/refresh/coverage.json','tools/refresh/copy-manifest.json',
        'tools/test_social_management_followup.py','tools/test_social_management_followup_browser.js','tools/prepare_social_management_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes();dest=TARGET/rel
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest(data)})
for name in ['before.json','before-verified.json']:
    rel='tools/reports/site-refresh/social-management-followup-2026-10-20/'+name
    dest=TARGET/rel;data=(SOURCE/rel).read_bytes()
    assert not dest.exists() or dest.read_bytes()==data,'Do not replace a QA baseline'
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual social media management: Social Media hero accent; balanced benefits/outcomes; deliverables/complementary sliders; audience CTA; alternating desktop process; removed portfolio and clients pause control. Original retained content unchanged; other HTML only receives CSS cache stamps. Published blog untouched.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/social-management-release-2026-10-20.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime checks; preserved {len(blog)} blog files. Not published.')
