"""Prepare only approved Google Ads presentation and desktop service CTAs."""
from pathlib import Path
import hashlib,json,re,subprocess,sys
from service_studio import Tree
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='b8ad5a568316177c29c0d26c8f50c210fc61e85b'
MARKER='GOOGLE ADS INVESTMENT DISABLED:2026-10-19'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET,text=True).strip()
def digest(data):return hashlib.sha256(data).hexdigest()
unstamp=lambda s:re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
norm=lambda s:re.sub(r'\s+',' ',s).strip()
def protected(source):
    source=re.sub(r'<!-- '+re.escape(MARKER)+r'\n([\s\S]*?)\n-->',lambda m:m[1],source)
    root=Tree(source).root
    accent=root.first(lambda n:n.has('service-studio-title-accent'))
    if accent:
        assert accent.text()=='Google Ads' and accent.attrs.get('dir')=='ltr'
        accent.detach()
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
owned={'ar/services/manage-google-adwords-campaigns/index.html','services/manage-google-adwords-campaigns/index.html'}
paths=[]
for rel in git('ls-files','*.html').splitlines():
    if rel.startswith('blog/'):continue
    source=SOURCE/rel;target=TARGET/rel
    assert source.is_file(),rel
    if source.read_bytes()==target.read_bytes():continue
    if rel in owned:assert protected(source.read_text())==protected(target.read_text()),'Unapproved content difference: '+rel
    else:assert unstamp(source.read_text())==unstamp(target.read_text()),'Unrelated body change: '+rel
    paths.append(rel)
paths+=['assets/css/bundle.min.css','assets/css/service-studio.css','assets/css/seo-studio-review.css','assets/css/seo-studio-review.min.css','assets/js/index-new.js','assets/js/index-new.min.js',
        'tools/service_studio.py','tools/build_site_refresh.py','tools/test_refresh_copy.py','tools/refresh/README.md','tools/refresh/coverage.json','tools/refresh/copy-manifest.json',
        'tools/test_google_ads_followup.py','tools/test_google_ads_followup_browser.js','tools/prepare_google_ads_followup_release.py']
runtime=[]
for rel in paths:
    data=(SOURCE/rel).read_bytes();dest=TARGET/rel
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    if not rel.startswith('tools/'):runtime.append({'file':rel,'sha256':digest(data)})
# Immutable QA baselines are local reports, never deployed or staged.
for name in ['before.json','compact-cta-before.json']:
    rel='tools/reports/site-refresh/google-ads-followup-2026-10-19/'+name
    dest=TARGET/rel;data=(SOURCE/rel).read_bytes()
    assert not dest.exists() or dest.read_bytes()==data,'Do not replace a baseline'
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
assert blog=={str(p.relative_to(TARGET)):digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
record={'baseline':BASE,'scope':'Bilingual Google Ads follow-up and desktop-only CTA enlargement across nine services. Investment section retained in one HTML comment. Other HTML only receives cache stamps; no generated blog changes.','runtimeFiles':runtime,'blogFilesPreserved':len(blog)}
(TARGET/'tools/google-ads-followup-release-2026-10-19.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime checks; preserved {len(blog)} blog files. Not published.')
