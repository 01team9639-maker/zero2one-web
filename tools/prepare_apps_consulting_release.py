"""Package only the approved bilingual apps/consulting follow-up, not publish."""
from pathlib import Path
import hashlib,json,re,subprocess,sys,tempfile
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='7e95bd7ed752d424acf0b5a4d90c7ac5991beaaf'
REVIEW_BASE='10fae91c5f5c3ba95c15b31abbb4cc99be38cbba'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source,rel):
    root=Tree(source).root
    for section in list(root.walk()):
        if section.tag!='section' or 'mobile-application' not in rel:continue
        heading=section.first(lambda n:n.tag=='h2')
        if heading and heading.text() in {'باقات تطوير تطبيقات الجوال مصممة لتناسب احتياجات مشروعك',"Mobile App Packages Designed to Fit Your Project's Needs"}:section.detach()
    for toggle in [n for n in root.walk() if n.has('logo-marquee-toggle')]:toggle.detach()
    return {'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in root.walk() if n.tag=='a'],
            'images':[n.attrs for n in root.walk() if n.tag=='img'],
            'people':[n.render() for n in root.walk() if n.has('team-card')],
            'head':unstamp(root.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(root.first(lambda n:n.tag=='footer').render())}
assert TARGET!=SOURCE and git('rev-parse','HEAD')==BASE
assert git('rev-parse','origin/main')==BASE,'Review newer main before packaging'
assert not git('status','--porcelain','--untracked-files=no'),'Preserve release edits'
blog={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
owned={p+'services/'+slug+'/index.html' for p in ['ar/',''] for slug in ['mobile-application','marketing-consulting']}
paths=[]
for rel in sorted(owned):
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    assert protected(source.read_text(),rel)==protected(target.read_text(),rel),'Unapproved content difference: '+rel
    paths.append(rel)
paths+=['assets/css/service-studio.css',
        'tools/service_studio.py','tools/build_site_refresh.py','tools/refresh/README.md','tools/refresh/coverage.json','tools/refresh/copy-manifest.json',
        'tools/test_apps_consulting_followup.py','tools/test_apps_consulting_followup_browser.js','tools/prepare_apps_consulting_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes();dest=TARGET/rel
    if rel in {'tools/service_studio.py','tools/build_site_refresh.py'}:
        # Retain independently published audit fixes while applying only the
        # reviewed delta against its original baseline. Conflicts stop packaging.
        base=subprocess.check_output(['git','show',REVIEW_BASE+':'+rel],cwd=TARGET)
        with tempfile.TemporaryDirectory(prefix='apps-consulting-merge-') as tmp:
            inputs=[Path(tmp)/name for name in ['review','base','published']]
            for file,content in zip(inputs,[data,base,dest.read_bytes()]):file.write_bytes(content)
            result=subprocess.run(['git','merge-file','-p',*map(str,inputs)],capture_output=True)
            assert result.returncode==0,'Resolve concurrent source edits: '+rel
            data=result.stdout
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
subprocess.run(['sh','tools/build.sh'],cwd=TARGET,check=True)
for rel in git('diff','--name-only',BASE).splitlines():
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest((TARGET/rel).read_bytes())})
rel='tools/reports/site-refresh/apps-consulting-followup-2026-10-21/before.json'
dest=TARGET/rel;data=(SOURCE/rel).read_bytes()
assert not dest.exists() or dest.read_bytes()==data,'Do not replace a QA baseline'
dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual apps and consulting: balanced benefits, nine-card deliverables rails, audience CTA, alternating desktop process, no clients pause controls; consulting white packages/CTA; apps gradient existing title words, technology/outcome layout, light daily relationship panel and package removal. Other HTML only CSS stamps; published blog untouched.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/apps-consulting-release-2026-10-21.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime checks; preserved {len(blog)} blog files. Not published.')
