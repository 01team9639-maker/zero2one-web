"""Package only the approved catalogue/social-ads changes and corrections."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='928f8cd2f646e47c2bb65463002318c38ba33b19'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source):
    root=Tree(source).root
    investment=root.first(lambda n:n.attrs.get('id')=='section-9')
    if investment:
        for image in [n for n in investment.walk() if n.tag=='img']:image.detach()
    seo=next((n for n in root.walk() if n.tag=='article' and n.first(lambda e:e.tag=='a' and '/services/seo-riyadh/' in e.attrs.get('href',''))),None)
    if seo:seo.first(lambda n:n.tag=='img').detach()
    return {'copy':[(n.attrs['data-copy'],norm(n.text())) for n in root.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in root.walk() if n.tag=='a'],
            'images':[n.attrs for n in root.walk() if n.tag=='img'],
            'head':unstamp(root.first(lambda n:n.tag=='head').render()),
            'footer':unstamp(root.first(lambda n:n.tag=='footer').render())}
assert TARGET!=SOURCE and git('rev-parse','HEAD')==BASE
assert git('rev-parse','origin/main')==BASE,'Review newer main before preparing'
assert not git('status','--porcelain','--untracked-files=no'),'Preserve release edits'
blog={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
owned={'services/index.html','ar/services/index.html','services/digital-advertising/index.html','ar/services/digital-advertising/index.html'}
paths=[]
for rel in git('ls-files','*.html').splitlines():
    if rel.startswith('blog/'):continue
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    if rel in owned:assert protected(source.read_text())==protected(target.read_text()),'Retained source content changed: '+rel
    else:assert unstamp(source.read_text())==unstamp(target.read_text()),'Unrelated page body changed: '+rel
    paths.append(rel)
paths+=['assets/css/bundle.min.css','assets/css/service-studio.css','tools/service_studio.py','tools/refresh/README.md','tools/test_social_revision.py','tools/test_catalogue_social_followup_browser.js','tools/prepare_catalogue_social_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes();dest=TARGET/rel
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest(data)})
for rel in ['assets/images/owner-services-2026-10/seo.webp','assets/images/alrahwanji-05-placement-results.webp','assets/images/work/kuwait-tutoring-campaign-results.webp','assets/images/work/barbarees-post-pregnancy-ad.webp']:
    assert (SOURCE/rel).read_bytes()==(TARGET/rel).read_bytes(),'Existing public evidence asset differs: '+rel
    runtime.append({'file':rel,'sha256':digest((TARGET/rel).read_bytes())})
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual homepage-style catalogue with current SEO photo; social-ads original benefit design with full-width distribution, CTA styling, white packages, alternating process, three-case investment bento and removed client pause control. Other main-site pages only receive CSS dependency stamps. Blog unchanged.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/catalogue-social-release-2026-10-19.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime checks; preserved {len(blog)} published blog files. Not published.')
