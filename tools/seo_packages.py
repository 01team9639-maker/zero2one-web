"""The owner's Oct 16 PDF replaces the older four SEO offers, not other copy.

The PDF is a content source only. Preserve the native swipe rail, approved
arrows/WhatsApp destination and all 25 values. The owner's follow-up makes each
card a native disclosure at every size; the request button stays outside it.
"""
from pathlib import Path
import html
import json
import re
from iconly_icons import iconly_svg

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT/'tools/page-copy/seo-packages-2026-10.json').read_text())
WA = 'https://wa.me/966530307054'


def esc(text): return html.escape(str(text), quote=True)


def render_cards(lang):
    assert len(DATA['plans']) == 3 and len(DATA['features']) == 25
    cards = []
    for index, plan in enumerate(DATA['plans']):
        rows = []
        for feature in DATA['features']:
            value = feature['values'][index]
            if isinstance(value, bool):
                text = ('مشمول' if value else 'غير مشمول') if lang == 'ar' else ('Included' if value else 'Not included')
                visible = '<span aria-hidden="true">✓</span><span class="seo-package-sr">'+text+'</span>' if value else esc(text)
                status = 'included' if value else 'excluded'
            else:
                visible, status = esc(value[lang]), 'specified'
            rows.append('<div class="seo-package-spec" data-package-feature="'+feature['id']+'"><dt>'+esc(feature['label'][lang])+'</dt><dd class="seo-package-value seo-package-value--'+status+'">'+visible+'</dd></div>')
        alternate = '<span class="seo-package-english" lang="en" dir="ltr">'+esc(plan['name']['en'])+'</span>' if lang == 'ar' else ''
        audience = 'الفئة المستهدفة' if lang == 'ar' else 'Designed for'
        includes = 'خدمات الباقة' if lang == 'ar' else 'Package services'
        request = 'اطلب هذه الباقة' if lang == 'ar' else 'Request this package'
        name = esc(plan['name'][lang])
        label = ('طلب باقة ' if lang == 'ar' else 'Request the ')+plan['name'][lang]+(' package' if lang == 'en' else '')
        # The previous featured treatment is visual only, not an invented
        # "most popular" or "recommended" sales claim.
        classes = 'seo-plan seo-plan-pdf'+(' seo-plan-featured' if index == 1 else '')
        cards.append('<article class="'+classes+'" data-seo-studio-reveal="card" data-seo-package="'+plan['id']+'">'
            '<details class="seo-plan-content seo-package-disclosure"><summary class="seo-plan-heading seo-package-summary">'+iconly_svg(plan['icon'],'seo-studio-icon')+
            '<h3 class="seo-plan-name">'+name+alternate+'</h3><svg class="seo-owner-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>'
            '<div class="seo-owner-answer"><p class="seo-package-audience-label">'+audience+'</p><p class="seo-plan-fit">'+esc(plan['audience'][lang])+'</p>'
            '<div class="seo-plan-more"><p class="seo-plan-toggle" id="package-services-'+plan['id']+'">'+includes+'</p>'
            '<dl class="seo-package-specs" aria-labelledby="package-services-'+plan['id']+'">'+''.join(rows)+'</dl></div></div></details>'
            '<div class="btn btn-normal seo-plan-cta"><a href="'+WA+'" class="btn-click magnetic" data-strength="20" data-strength-text="10" target="_blank" rel="noopener noreferrer" aria-label="'+esc(label)+'">'
            '<div class="btn-fill"></div><span class="btn-text"><span class="btn-text-inner">'+request+'</span><svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg></span></a></div></article>')
    return '\n'.join(cards)


def refine(page, lang):
    def packages(match):
        block = match[0]
        pattern = r'(<div class="seo-plans-grid"[^>]*>)([\s\S]*?</article>\s*)</div>(?=\s*<div class="rf-home-scroll-controls")'
        def replace_grid(m):
            opening = re.sub(r' data-seo-package-edition="[^"]*"', '', m[1])
            opening = opening[:-1]+' data-seo-package-edition="'+DATA['edition']+'">'
            return opening+render_cards(lang)+'</div>'
        block, count = re.subn(pattern, replace_grid, block, count=1)
        if count != 1: raise ValueError('Missing existing SEO package rail')
        # Follow the height of visible cards when swiping away from an expanded
        # package, rather than leaving a tall blank area under a closed card.
        block=re.sub(r'<div class="seo-plans-scroll"[^>]*>',lambda m:m[0] if 'data-home-scroll-auto-height' in m[0] else m[0][:-1]+' data-home-scroll-auto-height>',block,count=1)
        # The new source gives no prices, VAT or contract/billing terms. Do not
        # attach the superseded four-plan commercial note to these new offers.
        return re.sub(r'\s*<p class="seo-plans-note">[\s\S]*?</p>', '', block, count=1)
    page, count = re.subn(r'<section\b[^>]*id="seo-packages"[\s\S]*?</section>', packages, page, count=1)
    if count != 1: raise ValueError('Missing SEO package section')
    def schema(match):
        data = json.loads(match[2])
        if data.get('@type') != 'Service' or 'hasOfferCatalog' not in data: return match[0]
        service_type = data['hasOfferCatalog']['itemListElement'][0]['itemOffered']['serviceType']
        data['hasOfferCatalog']['itemListElement'] = [
            {'@type':'Offer','name':plan['name'][lang],'url':data['url'],
             'itemOffered':{'@type':'Service','name':plan['name'][lang],'serviceType':service_type}}
            for plan in DATA['plans']
        ]
        return match[1]+json.dumps(data, ensure_ascii=False, separators=(',',':'))+match[3]
    # Retire hidden legacy prices as well as visible legacy cards. Keep every
    # other Service field and every other JSON-LD block unchanged.
    return re.sub(r'(<script\b[^>]*type="application/ld\+json"[^>]*>)([\s\S]*?)(</script>)', schema, page)
