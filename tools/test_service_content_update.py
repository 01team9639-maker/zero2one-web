#!/usr/bin/env python3
"""Independent pre-update preservation and owner-source coverage checks."""
import hashlib
import html
import json
import re
import subprocess
import sys
from pathlib import Path
from service_studio import Tree

ROOT=Path(__file__).resolve().parent.parent
REPORTS=ROOT/'tools/reports/site-refresh/content-update-2026-10-17'
BASELINE=REPORTS/'before.json'
SLUGS=['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting']
ALLOWED={f'{prefix}services/{slug}/index.html' for slug in SLUGS for prefix in ('','ar/')}
ALLOWED.update({'faqs/index.html','ar/faqs/index.html','services/index.html','ar/services/index.html'})

def norm(s):return re.sub(r'\s+',' ',html.unescape(s)).strip()
def unstamped(s):return re.sub(r'\?v=[a-f0-9]+','?v=HASH',s)
def sha(b):return hashlib.sha256(b).hexdigest()
def scope():
    paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
    return {p:sha(unstamped((ROOT/p).read_text()).encode()) for p in paths if p.endswith('.html') and not p.startswith('node_modules/') and (ROOT/p).is_file()}
def protected(source):
    tree=Tree(source).root
    selected={}
    for key,find in [('navbar',lambda n:n.has('nav-bar')),('footer',lambda n:n.has('footer')),('side-menu',lambda n:n.attrs.get('id')=='site-menu')]:
        node=tree.first(find);selected[key]=unstamped(node.render()) if node else None
    selected['people']=[n.render() for n in tree.walk() if n.has('team-card')]
    selected['logos']=[n.render() for n in tree.walk() if n.has('logo-marquee')]
    selected['integrations']=re.findall(r'(?:GTM-[A-Z0-9]+|G-[A-Z0-9]+)',source)
    selected['canonical']=[n.attrs for n in tree.walk() if n.tag=='link' and n.attrs.get('rel')=='canonical']
    selected['languages']=[n.attrs for n in tree.walk() if n.tag=='link' and n.attrs.get('hreflang')]
    return selected

def main():
    if '--capture' in sys.argv:
        if BASELINE.exists():raise SystemExit('Refusing to overwrite independent pre-update baseline')
        REPORTS.mkdir(parents=True,exist_ok=True)
        data={'scope':scope(),'pages':{p:protected((ROOT/p).read_text()) for p in ALLOWED}}
        BASELINE.write_text(json.dumps(data,ensure_ascii=False,indent=2))
        print('Saved pre-update hashes, people, logo marquees, footer, navigation, integrations and routes.');return
    old=json.loads(BASELINE.read_text());now=scope()
    for p,digest in old['scope'].items():
        if p not in ALLOWED:assert now.get(p)==digest,'Unrelated page changed: '+p
    assert set(now)-set(old['scope'])==set(),'No new service routes may be created'
    for p,expected in old['pages'].items():
        assert protected((ROOT/p).read_text())==expected,'Protected content changed: '+p
    print('PASS unchanged unrelated pages, SEO, homepage, navigation/footer, profiles, logos, integrations and canonical/language links')
    from build_site_refresh import DOCS, SERVICES, paras, clean, meta_value
    updates=json.loads((ROOT/'tools/refresh/content-update-2026-10-17.json').read_text())
    assert updates['arabic_variant']=='primary','Only the primary Arabic variants were authorized'
    assert '1krJlP5-2q9y9obxYVC5TOgpsJH727VkrnhXIu_thjyY' in updates['documents']['12']['source']
    assert '1OURdaej2LWM3gkm-HI45kzh5K1UQIADY0EEmVIN98a4' in updates['documents']['15']['source']
    coverage={v['id']:v for v in json.loads((ROOT/'tools/refresh/coverage.json').read_text())}
    results=[]
    for slug,(en,ar,_) in SERVICES.items():
        for lang,row in [('en',en),('ar',ar)]:
            route=f'{"ar/" if lang=="ar" else ""}services/{slug}/index.html'
            source=(ROOT/route).read_text();tree=Tree(source).root
            title=meta_value(DOCS[str(row)]['paragraphs'][1]['text'])
            description=meta_value(DOCS[str(row)]['paragraphs'][2]['text'])
            assert tree.first(lambda n:n.tag=='title').text()==title,route+' source title'
            assert tree.first(lambda n:n.tag=='meta' and n.attrs.get('name')=='description').attrs['content']==description,route+' source description'
            for script in [n for n in tree.walk() if n.tag=='script' and n.attrs.get('type')=='application/ld+json']:
                obj=json.loads(script.text())
                for entity in obj.get('@graph',[obj]):
                    if entity.get('@type') in ('Service','WebPage'):
                        assert entity['name']==title and entity['description']==description,route+' matching structured data'
            for n in list(tree.walk()):
                if n.tag in ('script','style') or n.attrs.get('aria-hidden')=='true':n.detach()
            text=norm(tree.text())
            for p in paras(row):
                state=coverage.get(p['id'])
                assert state,'Unaccounted source paragraph '+p['id']
                if state['status']=='rendered':
                    expected=clean(p)
                    expected=re.sub(r'^\[[^]]+\]\s*','',expected)
                    assert norm(expected) in text,(route,p['id'],expected)
                results.append({'route':route,**state})
            assert len(re.findall(r'<h1\b',source))==1,route
            assert not re.search(r'\[([a-z])\]</a>|cmnt_ref|#cmnt\d',source),'No document annotation markers'
            assert 'content-update-2026-10-17' not in tree.text(),'No internal authoring notes'
    (REPORTS/'coverage.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('PASS',len(results),'source paragraphs individually accounted for; every rendered paragraph exists in the DOM')

if __name__=='__main__':main()
