"""Independent guard for the October 19 social investment/hero revision."""
from pathlib import Path
import json,sys
from test_social_revision import snapshot,ROOT
from service_studio import Tree
REPORT=ROOT/'tools/reports/site-refresh/social-horizontal-2026-10-19'
BEFORE=REPORT/'before.json'
TARGETS=['ar/services/digital-advertising/index.html','services/digital-advertising/index.html']
if '--capture' in sys.argv:
    assert not BEFORE.exists(),'Never replace an independent baseline'
    REPORT.mkdir(parents=True,exist_ok=True)
    BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
    print('Captured exact pre-edit page/content scope.')
else:
    before=json.loads(BEFORE.read_text());after=snapshot()
    for rel,value in before['pages'].items():
        if rel not in TARGETS:assert value==after['pages'][rel],rel
    for rel in TARGETS:
        tree=Tree((ROOT/rel).read_text()).root
        accent=tree.first(lambda n:n.has('service-studio-title-accent'))
        assert accent and accent.text()=='Ads'
        assert accent.attrs.get('dir')=='ltr' and accent.attrs.get('lang')=='en'
        for record in after['protected'][rel]['copy']:
            if record[0] in ('10:3','11:3'):record[1]=record[1].replace(' Ads','',1)
        investment=tree.first(lambda n:n.has('social-investment'))
        assert not investment.first(lambda n:n.has('social-investment-orbit') or 'data-seo-flow' in n.attrs)
        assert investment.first(lambda n:'data-home-scroll-always' in n.attrs)
        assert len([n for n in investment.walk() if n.has('social-investment-case')])==3
    assert before['protected']==after['protected'],'Changes exceed the requested Ads word and presentation'
    print('PASS only social-ads pages changed; exact original copy/links/images retained apart from one requested Ads word per hero; no animated background; three cases in a rail.')
