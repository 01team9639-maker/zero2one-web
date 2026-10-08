#!/usr/bin/env python3
"""Read-only, source-to-output copy completeness check (not just DOM-to-manifest).

The independently approved SEO page uses its existing builder. Its source gaps
are reported separately, never counted as verified rendered copy.
"""
import html, json, re
from html.parser import HTMLParser
from pathlib import Path
from build_site_refresh import ROOT, DOCS, SERVICES, clean

class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag=='meta':
            a=dict(attrs)
            if a.get('name')=='description': self.parts.append(a.get('content',''))
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip: self.parts.append(data)

def norm(s): return re.sub(r'\s+',' ',html.unescape(s)).strip()

def check():
    coverage={v['id']:v for v in json.loads((ROOT/'tools/refresh/coverage.json').read_text())}
    routes={2:'/',3:'/ar/'}
    for slug,(en,ar,_) in SERVICES.items():
        routes[en]=f'/services/{slug}/';routes[ar]=f'/ar/services/{slug}/'
    results=[]
    for row,route in routes.items():
        p=Text();p.feed((ROOT/(route.strip('/')+'/index.html' if route!='/' else 'index.html')).read_text())
        page=norm(' '.join(p.parts))
        for i,para in enumerate(DOCS[str(row)]['paragraphs']):
            key=f'{row}:{i}';t=clean(para)
            if not t: continue
            status=coverage.get(key,{}).get('status','UNACCOUNTED')
            if status in ('authoring','metadata','held','excluded'):
                results.append(dict(id=key,route=route,status=status));continue
            t=re.sub(r'^\[[^]]+\]\s*','',t)
            results.append(dict(id=key,route=route,status='PASS' if norm(t) in page else 'FAIL',text=t))
    # Check the already-authored SEO page independently, including its metadata.
    # The mock ranking labels are explicit review holds, not reported as present.
    for lang,start,end in [('ar',0,131),('en',131,len(DOCS['4']['paragraphs']))]:
        route=('/ar' if lang=='ar' else '')+'/services/seo-riyadh/'
        p=Text();p.feed((ROOT/route.strip('/')/'index.html').read_text());page=norm(' '.join(p.parts))
        for i in range(start,end):
            para=DOCS['4']['paragraphs'][i];t=clean(para)
            if not t: continue
            if i in (0,98,109,220,229): status='authoring'
            elif i in (12,139): status='held-unverified-ranking-label'
            else:
                t=re.sub(r'^(Title|Description|العنوان|الوصف):\s*','',t)
                t=re.sub(r'^\[[^]]+\]\s*','',t)
                status='PASS' if norm(t) in page else 'FAIL'
            results.append(dict(id=f'4:{i}',route=route,status=status,text=t))
    out=ROOT/'tools/reports/site-refresh/copy-completeness.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(results,ensure_ascii=False,indent=2))
    bad=[r for r in results if r['status']=='FAIL']
    print(f'{len(results)} nonempty source paragraphs checked; {len(bad)} missing rendered paragraphs.')
    for r in bad: print(r)
    return len(bad)

if __name__=='__main__': raise SystemExit(bool(check()))
