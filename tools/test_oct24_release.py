"""Release gate: retain newer production fixes and every approved review change."""
from pathlib import Path
import hashlib,json,re,subprocess,xml.etree.ElementTree as ET
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
REVIEW=Path('/Users/mohammad/Desktop/zero2one_aa1')
plan=json.loads((ROOT/'tools/oct24-source-package.json').read_text());BASE=plan['baseline']
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
assert plan['blogBefore']=={p.relative_to(ROOT).as_posix():sha(p.read_bytes()) for p in (ROOT/'blog').rglob('*') if p.is_file()},'Blog changed'
for rel in ['.htaccess','ar/.htaccess','send.php','assets/images/work/google-ads-conversion-value-after.webp']:
    assert (ROOT/rel).read_bytes()==git('show',BASE+':'+rel),rel
script=(ROOT/'assets/js/index-new.js').read_text();css=(ROOT/'assets/css/style-new.css').read_text()
assert 'function loaderFailsafeTookOver()' in script and 'if (loaderFailsafeTookOver()) return;' in script
assert 'z2o-loader-failsafe' in css and "send_to: 'G-801242QR6K'" in script
assert "$('.post a[href^=\"#\"]').on" in script and 'details.post-toc' in script
assert "link.setAttribute('rel', 'noopener')" in script
from brand_loader import WORDS,BRANDS
pages=0;copy_diffs=[]
corrections=(('التجارية على في جوجل','التجارية في جوجل'),('بحث دقيقة للكلمات','بحث دقيق للكلمات'),('نقوم بدمج للبيانات','نقوم بدمج البيانات'))
def copy(source):
    root=Tree(source).root;result=[]
    for n in root.walk():
        if 'data-copy' not in n.attrs:continue
        t=re.sub(r'\s+',' ',n.text()).strip()
        for a,b in corrections:t=t.replace(a,b)
        # The already-published accent fix removes only the adjacent repeated Ads.
        if n.tag=='h1':t=re.sub(r'\bAds Ads\b','Ads',t)
        result.append((n.attrs['data-copy'],t))
    return result
for file in REVIEW.rglob('index.html'):
    rel=file.relative_to(REVIEW).as_posix()
    if rel.startswith(('tools/','node_modules/','.git/','.codex-repos/','blog/')):continue
    dest=ROOT/rel
    assert dest.is_file(),rel
    if copy(file.read_text())!=copy(dest.read_text()):copy_diffs.append(rel)
    root=Tree(dest.read_text()).root;loader=root.first(lambda n:n.has('loading-container'))
    if not loader:continue
    lang='ar' if rel.startswith('ar/') else 'en'
    assert [n.text() for n in loader.walk() if n.has('loading-word')]==WORDS[lang],rel
    assert loader.first(lambda n:n.has('loading-brand')).text()==BRANDS[lang],rel
    pages+=1
assert not copy_diffs,copy_diffs
for lang in ('ar','en'):
    prefix='ar/' if lang=='ar' else ''
    team=Tree((ROOT/(prefix+'team/index.html')).read_text()).root
    assert len([n for n in team.walk() if n.has('team-card')])==14
    assert not [n for n in team.walk() if n.attrs.get('data-team-member')=='rona']
    for slug,key in [('conversion-rate-optimization','cro'),('email-marketing','email')]:
        root=Tree((ROOT/(prefix+'services/'+slug+'/index.html')).read_text()).root
        assert len([n for n in root.walk() if 'data-owner-'+key+'-image' in n.attrs])==37
        assert root.first(lambda n:'data-owner-'+key+'-hero' in n.attrs)
    home=Tree((ROOT/(prefix+'index.html')).read_text()).root
    for key in ('web','seo','ads'):
        assert home.first(lambda n:n.tag=='img' and n.attrs.get('src')=='/assets/images/owner-services-2026-10/'+key+'-800.webp' and len(n.attrs.get('srcset','').split(','))==4),'Lost published responsive photo '+key
old=ET.fromstring(git('show',BASE+':sitemap.xml'));new=ET.parse(ROOT/'sitemap.xml').getroot();ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls=lambda root:{e.text for e in root.findall('s:url/s:loc',ns)}
assert urls(old)<=urls(new)
assert urls(new)-urls(old)=={'https://zero2one.sa/'+p+'services/'+s+'/' for p in ('ar/','') for s in ('conversion-rate-optimization','email-marketing')}
print(f'PASS {pages} reviewed pages/copy/loaders, 14-person roster, two services, responsive photos, {len(plan["blogBefore"])} untouched blog files and production safety/analytics/anchors retained.')
