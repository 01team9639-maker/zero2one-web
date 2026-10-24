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
    BLOCKS={'address','article','aside','blockquote','br','dd','details','div',
            'dl','dt','figcaption','figure','footer','form','h1','h2','h3','h4',
            'h5','h6','header','hr','li','main','nav','ol','p','section',
            'summary','table','td','th','tr','ul'}
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0; self.hidden=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        # Decorative card numbers and vector artwork must not interrupt a
        # source paragraph split across several visual cards. Never count them
        # as prose, or use duplicated hidden copy to satisfy completeness.
        studio_decoration=a.get('aria-hidden')=='true' and any(c.startswith('service-studio-') for c in a.get('class','').split())
        hidden=tag in ('script','style') or studio_decoration
        if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):
            self.hidden.append((tag,hidden))
            if hidden:self.skip+=1
        if not self.skip and tag in self.BLOCKS: self.parts.append(' ')
        if tag=='meta':
            if a.get('name')=='description': self.parts.extend([' ',a.get('content',''),' '])
    def handle_endtag(self,tag):
        for i in range(len(self.hidden)-1,-1,-1):
            if self.hidden[i][0]==tag:
                self.skip=max(0,self.skip-sum(int(v) for _,v in self.hidden[i:]))
                self.hidden=self.hidden[:i];break
        if not self.skip and tag in self.BLOCKS: self.parts.append(' ')
    def handle_data(self,data):
        if not self.skip: self.parts.append(data)

def norm(s): return re.sub(r'\s+',' ',html.unescape(s)).strip()

# Arabic wording fixes the owner approved on 2026-10-21 for the SEO page. The
# source snapshot keeps the document as written; the page shows the correction.
SEO_APPROVED_CORRECTIONS=(('التجارية على في جوجل','التجارية في جوجل'),
                          ('بحث دقيقة للكلمات','بحث دقيق للكلمات'),
                          ('نقوم بدمج للبيانات','نقوم بدمج البيانات'))

def check():
    coverage={v['id']:v for v in json.loads((ROOT/'tools/refresh/coverage.json').read_text())}
    routes={2:'/',3:'/ar/'}
    for slug,(en,ar,_) in SERVICES.items():
        routes[en]=f'/services/{slug}/';routes[ar]=f'/ar/services/{slug}/'
    results=[]
    for row,route in routes.items():
        source=(ROOT/(route.strip('/')+'/index.html' if route!='/' else 'index.html')).read_text()
        if row in (22,23,24,25):
            from service_studio import Tree
            tree=Tree(source).root
            for accent in [n for n in tree.walk() if n.has('service-studio-title-accent')]:
                assert accent.text()==('CRO' if row in (24,25) else 'Email Marketing')
                accent.detach()
            source=tree.render()
        if route in ('/services/digital-advertising/','/ar/services/digital-advertising/','/services/manage-google-adwords-campaigns/','/ar/services/manage-google-adwords-campaigns/','/services/social-media-management/','/ar/services/social-media-management/','/services/ecommerce-development/','/ar/services/ecommerce-development/') and 'service-studio-title-accent' in source:
            # The owner explicitly added Ads / Google Ads treatments on 19 Oct.
            # Compare all original source words after removing only that exact
            # audited addition, not an arbitrary region or hidden duplicate.
            from service_studio import Tree
            tree=Tree(source).root
            accents=[n for n in tree.walk() if n.has('service-studio-title-accent')]
            expected='E-commerce' if 'ecommerce-development' in route else 'Social Media' if 'social-media-management' in route else 'Google Ads' if 'manage-google-adwords-campaigns' in route else 'Ads'
            assert len(accents)==1 and accents[0].text()==expected
            with_accent=Text();with_accent.feed(source)
            accents[0].detach();source=tree.render()
        else: with_accent=None
        p=Text();p.feed(source)
        # Inline typography can split words and punctuation into spans. Preserve
        # their literal adjacency; only semantic block boundaries add spaces.
        page=norm(''.join(p.parts))
        # Where the highlighted word is the owner's own ("…Advertising: Ads That
        # Stop…" renders "Ads" once, as the accent), the copy reads in place.
        if with_accent: page+=' \0 '+norm(''.join(with_accent.parts))
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
        p=Text();p.feed((ROOT/route.strip('/')/'index.html').read_text());page=norm(''.join(p.parts))
        for i in range(start,end):
            para=DOCS['4']['paragraphs'][i];t=clean(para)
            if not t: continue
            if i in (106,108,227,228): status='owner-removed-2026-10-09'
            elif i in (0,98,109,220,229): status='authoring'
            elif i in (12,139): status='held-unverified-ranking-label'
            else:
                t=re.sub(r'^(Title|Description|العنوان|الوصف):\s*','',t)
                t=re.sub(r'^\[[^]]+\]\s*','',t)
                for a,b in SEO_APPROVED_CORRECTIONS: t=t.replace(a,b)
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
