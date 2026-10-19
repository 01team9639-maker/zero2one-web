#!/usr/bin/env python3
"""Build bilingual pages from the owner's Google Docs snapshot, without translation.

Body copy is independent in each language. Every rendered source paragraph carries
its row/index provenance. Authoring instructions and unresolved placeholders are
recorded in the coverage report, never invented or silently rendered as facts.
This builder does not deploy, change analytics, or modify the contact endpoint.
"""
from pathlib import Path
import html, json, re, sys
from html.parser import HTMLParser
from iconly_icons import iconly_svg
from service_content_update import apply as apply_content_update, meta_value, is_faq

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'tools/refresh'
ORIGINAL_DOCS = json.loads((DATA / 'content-sources.json').read_text())['documents']
DOCS = apply_content_update(ORIGINAL_DOCS)
LEGACY = json.loads((DATA / 'legacy-blocks.json').read_text())
PROTECTED = json.loads((DATA / 'protected-design.json').read_text())
HOME_ORIGINAL = json.loads((DATA / 'home-original-sections.json').read_text())
WA = 'https://wa.me/966530307054'
BASE = 'https://zero2one.sa'
SERVICES = {
    'web-design-riyadh': (6, 7, 1),
    'brand-identity': (8, 9, 4),
    'digital-advertising': (10, 11, 3),
    'manage-google-adwords-campaigns': (13, 12, 3),
    'social-media-management': (14, 15, 5),
    'ecommerce-development': (16, 17, 6),
    'mobile-application': (18, 19, 1),
    'marketing-consulting': (21, 20, 3),
}
ROUTES = ['/', '/services/', '/team/', '/faqs/'] + [f'/services/{s}/' for s in SERVICES]
REPORT = []
MANIFEST = {}
BLOCKED = []


def esc(s):
    return html.escape(str(s), quote=True)


def local(route, lang):
    return ('/ar' if lang == 'ar' else '') + route


def paras(row, original=False):
    source=ORIGINAL_DOCS if original else DOCS
    return [dict(p, id=f'{row}:{i}') for i, p in enumerate(source[str(row)]['paragraphs'])]


def primary_action(ps):
    return next(p for p in ps if re.match(r'^\[(?:Main button|Primary Button|الزر الرئيسي)',clean(p),re.I))


def clean(p):
    text = p['text'].strip().lstrip('\ufeff')
    return re.sub(r'^[•*]\s+', '', text)


def record(p, status, reason=''):
    REPORT.append(dict(id=p['id'], text=p['text'], status=status, reason=reason))


def textnode(p, tag='p', cls='', **attrs):
    text = clean(p)
    if not text:
        record(p, 'authoring', 'Empty paragraph')
        return ''
    record(p, 'rendered')
    MANIFEST[p['id']] = text
    attr = ' '.join(f'{k.replace("_", "-")}="{esc(v)}"' for k, v in attrs.items())
    return f'<{tag} data-copy="{p["id"]}" class="{cls}" {attr}>{esc(text)}</{tag}>'


def authoring(p):
    t = clean(p)
    # Google Docs layout annotations, not customer-facing copy.
    if (not t or re.fullmatch(r'0[1-9]', t) or re.match(r'^القسم \d+$', t)
        or t.casefold() in ('client logos', 'side card:', 'highlight card:', '(packages)',
                            'شعارات العملاء', 'البطاقة الجانبية:', 'البطاقة البارزة:',
                            '(الباقات)', 'يبقى كما هو', 'تبقى كما هي')
        or t.startswith(('Slider cards (', 'شرائح السلايدر ('))
        or re.match(r'لا توجد أعمال منشورة.*(?:تعرض|تُعرض) البطاقة',t)):
        record(p, 'authoring', 'Layout instruction or structural marker')
        return True
    return False


def held(p, reason):
    record(p, 'held', reason)
    BLOCKED.append(dict(id=p['id'], text=p['text'], reason=reason))


def action(p, lang, href=None):
    t = clean(p)
    m = re.match(r'^\[([^]]+)\]\s*(.*)$', t)
    if not m or not m[2]:
        held(p, 'Unresolved editorial placeholder; not public copy')
        return ''
    instruction, label = m.groups()
    if href is None:
        if re.search(r'Work|أعمال|اعمال', instruction, re.I): href = local('/work/', lang)
        elif re.search(r'About|نحن', instruction, re.I): href = local('/about/', lang)
        elif re.search(r'Team|الفريق', instruction, re.I): href = local('/team/', lang)
        elif re.search(r'FAQ|الأسئلة', instruction, re.I): href = local('/faqs/', lang)
        elif re.search(r'Blog article|مقال في المدونة', instruction, re.I):
            article='/blog/ar/build-marketing-strategy/'
            if lang=='ar' and (ROOT/article.lstrip('/')/'index.html').exists(): href=article
            else:
                href='/blog/'
                BLOCKED.append(dict(id=p['id'],text=t,reason='English strategy article URL not available; CTA currently points to the English blog index'))
        elif re.search(r'Blog|المدونة', instruction, re.I): href = '/blog/ar/' if lang == 'ar' else '/blog/'
        elif re.search(r'Second(?:ary)? button|الزر الثاني', instruction, re.I): href = local('/work/', lang)
        else: href = WA
    q = dict(p, text=label)
    external = ' target="_blank" rel="noopener"' if href == WA else ''
    anchor=textnode(q, 'a', 'rf-button magnetic', href=href, data_strength='20', data_strength_text='10')
    return anchor.replace('>'+esc(label), external+'><span class="btn-text"><span class="btn-text-inner">'+esc(label)).replace('</a>','</span></span></a>')


def paragraph(p, lang):
    t = clean(p)
    if authoring(p): return ''
    if t.startswith('['): return action(p, lang)
    if '[' in t and ']' in t:
        held(p, 'Placeholder awaiting a real project or technical decision')
        return ''
    if re.search(r'Read: How to Build|اقرأ.*خطة تسويقية', t):
        # Keep the supplied words, but do not invent a missing article URL.
        BLOCKED.append(dict(id=p['id'], text=t, reason='Article destination not supplied; rendered as text, not a fabricated link'))
    return textnode(p, 'p', 'rf-list-line' if p.get('bullet') or p['text'].lstrip().startswith('•') else '')


def section(heading, body, n, kind='', ident=None):
    id_ = ident or 'section-'+str(n)
    skin = ['paper', 'ink', 'white', 'sand'][n % 4]
    return (f'<section class="rf-section rf-{skin} rf-{kind}" id="{id_}" data-scroll-section>'
            f'<div class="rf-inner"><div class="rf-section-heading" data-rf-reveal>'
            f'<span class="rf-index" aria-hidden="true">{n:02d} /</span>'
            f'{heading}</div>{body}</div></section>')


def clients(title, lang, n, intro=''):
    block = LEGACY[lang]['clients']
    marquee = block[block.index('<div class="logo-marquee"'):block.rindex('</section>')]
    title=re.sub(r'<h2(?=[ >])', '<h2 id="clients-heading"', title, count=1)
    return section(title, intro+marquee, n, 'clients', 'clients')


def team_cards(lang, slug=None):
    cards = re.findall(r'<li class="team-slide">[\s\S]*?</li>', LEGACY[lang]['team'])
    indices = {
        'web-design-riyadh':[3,7,9,10], 'ecommerce-development':[3,7,8,9,10],
        'mobile-application':[3,7,8,10], 'brand-identity':[3,10],
        'digital-advertising':[4,6], 'manage-google-adwords-campaigns':[4,6],
        'social-media-management':[4,6], 'marketing-consulting':[0,3,4],
        'seo-riyadh':[5],
    }.get(slug, list(range(len(cards))))
    return '<ul class="rf-team-grid">' + ''.join(cards[i] for i in indices if i < len(cards)) + '</ul>'


def groups(items):
    lead, cards = [], []
    for p in items:
        if p['style'] == 'HEADING_3': cards.append([p, []])
        elif cards: cards[-1][1].append(p)
        else: lead.append(p)
    return lead, cards


def is_process(t):
    return bool(re.search(r'How We Work|From Idea to Launch|آلية عملنا|كيف نعمل|موقعك من الفكرة', t, re.I))


def render_block(heading, items, n, lang, slug):
    title = clean(heading)
    h = textnode(heading, 'h2')
    lead, cards = groups(items)
    intro = ''.join(paragraph(p, lang) for p in lead)
    isfaq = is_faq(title)
    team = bool(re.search(r'Meet (?:Our|the)|Who.s Behind|تعرّ?ف على فريق|من يقف خلف', title, re.I))
    logos = bool(re.search(r'^Our Clients$|Clients.*Success|Clients We|عملاؤنا|عملاء أطلقنا|عملاء صممنا', title, re.I))
    packages = bool(re.search(r'Packages|^باقات', title, re.I))
    if logos: return clients(h, lang, n, intro)
    if team: return section(h, intro+team_cards(lang, slug), n, 'team')
    if packages:
        # Source supplies a heading but no package contents. Never fabricate prices.
        BLOCKED.append(dict(id=heading['id'], text=title, reason='No approved package prices or deliverables supplied; consultation link only'))
        cta = 'استشارتك المجانية' if lang == 'ar' else 'Get Your Free Consultation'
        return section(h, intro+f'<a class="rf-button" href="{WA}" target="_blank" rel="noopener">{cta}</a>', n, 'packages')
    if isfaq:
        answers = []
        for q, a in cards:
            answers.append('<details class="rf-faq-item"><summary>'+textnode(q, 'h3')+
                           '<span class="rf-faq-chevron" aria-hidden="true"></span></summary><div class="rf-answer">'+
                           ''.join(paragraph(p, lang) for p in a)+'</div></details>')
        return section(h, intro+'<div class="rf-faq-list">'+''.join(answers)+'</div>', n, 'faq', 'faq')
    if is_process(title):
        steps = []
        if cards:
            for q, a in cards:
                steps.append(textnode(q, 'h3')+''.join(paragraph(p, lang) for p in a))
            intro = ''  # only source step-number markers precede the first heading
        else:
            steps = [paragraph(p, lang) for p in items if clean(p)]
            intro = ''
        steps = [p for p in steps if p]
        body = '<ol class="rf-timeline">'+''.join(
            f'<li data-rf-reveal><span class="rf-step-no" aria-hidden="true">{i:02d}</span><div class="rf-step-card">{v}</div></li>'
            for i,v in enumerate(steps,1))+'</ol>'
        return section(h, intro+body, n, 'process')
    rendered = []
    tail = []
    for i,(q,a) in enumerate(cards, 1):
        # Drop only a card whose entire body is an explicit unfilled placeholder.
        nonempty = [p for p in a if clean(p)]
        if nonempty and all(clean(p).startswith('[') and not re.match(r'^\[(Button|زر|الزر|Main)',clean(p)) for p in nonempty):
            held(q, 'Card awaits approved technical detail')
            for p in nonempty: held(p, 'Explicit unfilled placeholder')
            continue
        paras_html = []
        for p in a:
            if re.match(r'^\[(?:Main button|Primary Button|Second(?:ary)? button|Button|الزر|زر)',clean(p),re.I):
                tail.append(action(p, lang))
            else: paras_html.append(paragraph(p, lang))
        rendered.append(f'<article class="rf-card" data-rf-reveal><span class="rf-card-no" aria-hidden="true">{i:02d}</span>'+
                        textnode(q,'h3')+''.join(paras_html)+'</article>')
    if rendered:
        body = intro+'<div class="rf-card-grid">'+''.join(rendered)+'</div>'
    else:
        # A short three-label line is supplied as text; render it verbatim, never split its wording.
        body = '<div class="rf-prose">'+intro+'</div>'
    return section(h,body+'<div class="rf-actions">'+''.join(tail)+'</div>',n,'cards')


def service_body(slug, lang):
    spec = SERVICES[slug]
    row = spec[1 if lang == 'ar' else 0]
    ps = paras(row)
    for p in ps[:3]: record(p, 'metadata' if ':' in p['text'] else 'authoring', 'Document title / supplied metadata')
    hero = ps[3]
    first_section = next(i for i,p in enumerate(ps[4:],4) if p['style']=='HEADING_2')
    lead = ''.join(paragraph(p,lang) for p in ps[4:first_section])
    if slug == 'mobile-application':
        visual = '<div class="rf-phone" aria-hidden="true"><div class="rf-phone-camera"></div><div class="rf-phone-orbit"></div><div class="rf-phone-bars"><i></i><i></i><i></i></div><div class="rf-phone-tiles"><i></i><i></i><i></i><i></i></div></div>'
    else:
        visual = f'<img src="/assets/images/service-{spec[2]}-900.webp" width="900" height="900" alt="" fetchpriority="high" decoding="async">'
    body = ('<section class="rf-hero" data-scroll-section><div class="rf-inner rf-hero-grid">'
            '<div class="rf-hero-copy" data-rf-reveal><span class="rf-eyebrow" aria-hidden="true">ZERO 2 ONE /</span>'+
            textnode(hero,'h1',id='main-content',tabindex='-1')+lead+'</div>'
            '<div class="rf-hero-art" aria-hidden="true">'+visual+'</div></div></section>')
    if slug in PROTECTED[lang]:
        # User explicitly protected existing hero designs. Change only the H1
        # words, retain the original header/nav/animation DOM and geometry.
        header=re.sub(r'<h1\b[^>]*>[\s\S]*?</h1>',lambda _:textnode(hero,'h1',id='main-content',tabindex='-1'),PROTECTED[lang][slug],count=1)
        body=header+'<section class="rf-preserved-hero-lead" data-scroll-section><div class="rf-inner">'+lead+'</div></section>'
    chunks=[]
    for p in ps[first_section:]:
        if p['style']=='HEADING_2': chunks.append([p,[]])
        elif chunks: chunks[-1][1].append(p)
    for n,(h,items) in enumerate(chunks,1):
        if slug=='brand-identity' and n==9:
            for p in [h]+items:
                record(p,'excluded','Owner removed the brand investment callout on 2026-10-18')
            continue
        if slug=='web-design-riyadh' and clean(h) in ('مواقع نفذناها بأنفسنا','Websites We Have Designed & Developed'):
            for p in [h]+items:
                record(p,'excluded','Owner removed the website-service portfolio callout on 2026-10-18')
            continue
        if slug=='brand-identity' and n in (6,10,11):
            # Owner removed packages, specialists and clients on this service
            # only. Record the exact source exclusions instead of losing copy.
            for p in [h]+items:
                record(p,'excluded','Owner removed this brand service section on 2026-10-10')
            continue
        body += render_block(h,items,n,lang,slug)
        if slug=='manage-google-adwords-campaigns' and n==10:
            for p in [h]+items:
                record(p,'excluded','Owner commented out the Google Ads investment section on 2026-10-19; original content retained in HTML comment')
    return body, meta_value(ps[1]['text']), meta_value(ps[2]['text'])


def home_faq(lang):
    src=LEGACY[lang]['faq']
    src=re.sub(r'<li class="faq-item">\s*<h3 class="faq-q">([\s\S]*?)</h3>\s*<p class="faq-a">([\s\S]*?)</p>\s*</li>',
               r'<li><details class="rf-faq-item"><summary><h3>\1</h3><span class="rf-faq-chevron" aria-hidden="true"></span></summary><div class="rf-answer"><p>\2</p></div></details></li>',src)
    src=src.replace('section faq-section','section faq-section rf-existing-faq')
    wave='<div class="rf-faq-wave" aria-hidden="true"><svg viewBox="0 0 1440 243.604" preserveAspectRatio="none"><path fill="#fffded" d="M0 0H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" /></svg></div>'
    return src.replace('<div class="container medium">',wave+'<div class="container medium">',1)


def original_home_layout(body,lang,ps):
    """Restore owner-selected original section layouts with the approved copy."""
    ar=lang=='ar'; originals=HOME_ORIGINAL[lang]
    def p(i,tag='p',cls='',**attrs): return textnode(ps[i],tag,cls,**attrs)
    def label(i):
        q=dict(ps[i],text=re.sub(r'^\[[^]]+\]\s*','',clean(ps[i])))
        return textnode(q,'span','btn-text-inner')
    def replace_section(pattern,new):
        nonlocal body
        body=re.sub(pattern+r'[\s\S]*?</section>',lambda _:new,body,count=1)
    stat=3 if ar else 2;button=4 if ar else 3
    record(ps[stat],'rendered');MANIFEST[ps[stat]['id']]=clean(ps[stat])
    values=[]
    for t in clean(ps[stat]).split('|'):
        m=re.match(r'([+\d]+)\s+(.*)',t.strip())
        values.append('<div class="stat"><div class="stat-number">'+esc(m[1])+'</div> <div class="stat-description">'+esc(m[2])+'</div></div>')
    stats=f'<div class="stats animate" data-copy="{ps[stat]["id"]}">'+ '<span class="home-stat-divider" aria-hidden="true"> | </span>'.join(values)+'</div>'
    intro=re.sub(r'<div class="stats animate">[\s\S]*?</div>\s*</div>\s*</div>\s*</div>',lambda _:stats+'</div>',originals['intro'],count=1)
    intro=re.sub(r'<span class="btn-text-inner">[\s\S]*?</span>',lambda _:label(button),intro,count=1)
    replace_section(r'<section class="rf-home-intro"',intro+'<div class="section-divider" data-scroll-section><div class="container"><div class="stripe"></div></div></div>')
    about=6 if ar else 4
    about_html=originals['about']
    about_html=re.sub(r'<p class="about-us-lead">[\s\S]*?</p>',lambda _:p(about,'p','about-us-lead'),about_html,count=1)
    about_body=p(about+1)+p(about+2)+'<ul>'+''.join(p(i,'li') for i in range(about+3,about+6))+'</ul>'
    about_html=re.sub(r'<div class="about-us-body">[\s\S]*?</div>',lambda _:'<div class="about-us-body">'+about_body+'</div>',about_html,count=1)
    about_html=re.sub(r'<span class="btn-text-inner">[\s\S]*?</span>\s*</span>',lambda _:label(about+6),about_html,count=1)
    replace_section(r'<section class="rf-section[^>]*rf-about"',about_html)
    services=originals['services']
    template=re.search(r'<article class="service-card">[\s\S]*?</article>',services)[0]
    start=16 if ar else 13
    cards=[]
    slugs=['web-design-riyadh','seo-riyadh','digital-advertising','brand-identity','social-media-management','ecommerce-development','marketing-consulting',None,None,'mobile-application']
    remaining_images={'brand-identity','social-media-management','ecommerce-development','marketing-consulting','mobile-application','manage-google-adwords-campaigns'}
    def remaining_image(slug):
        base='/assets/images/owner-services-2026-10/'+slug
        return f'<img src="{base}-800.webp" srcset="{base}-480.webp 480w, {base}-800.webp 800w, {base}-1440.webp 1440w" sizes="(max-width:500px) 78vw, 390px" width="1440" height="1024" loading="lazy" decoding="async" alt="">'
    for j,slug in enumerate(slugs):
        if slug is None: continue
        i=start+j*3;pic=2 if slug=='seo-riyadh' else SERVICES[slug][2]
        card=re.sub(r'service-1',f'service-{pic}',template)
        card=re.sub(r'<h3 class="service-card-title">[\s\S]*?</h3>',lambda _:p(i,'h3','service-card-title'),card,count=1)
        card=re.sub(r'<p class="service-card-text">[\s\S]*?</p>',lambda _:p(i+1,'p','service-card-text'),card,count=1)
        card=re.sub(r'href="[^"]+"',lambda _:'href="'+local('/services/'+slug+'/',lang)+'"',card,count=1)
        card=re.sub(r'aria-label="[^"]+"','',card,count=1)
        card=re.sub(r'alt="[^"]*"','alt=""',card,count=1)
        image={'web-design-riyadh':'web','seo-riyadh':'seo','digital-advertising':'ads'}.get(slug)
        if image:
            card=re.sub(r'<img\b[^>]*>',lambda _:f'<img src="/assets/images/owner-services-2026-10/{image}.webp" width="1440" height="1024" loading="lazy" decoding="async" alt="">',card,count=1)
        elif slug in remaining_images:
            card=re.sub(r'<img\b[^>]*>',lambda _:remaining_image(slug),card,count=1)
        card=re.sub(r'<span class="btn-text-inner">[\s\S]*?</span>',lambda _:label(i+2),card,count=1)
        cards.append(card)
    # Homepage copy is outside this content update. Retain its approved card,
    # independently of the new detail-page hero and source paragraph indices.
    ad=paras(12 if ar else 13,original=True)
    card=template.replace('service-1','service-3')
    card=re.sub(r'<img\b[^>]*>',lambda _:remaining_image('manage-google-adwords-campaigns'),card,count=1)
    card=re.sub(r'<h3 class="service-card-title">[\s\S]*?</h3>',lambda _:textnode(ad[3],'h3','service-card-title'),card,count=1)
    card=re.sub(r'<p class="service-card-text">[\s\S]*?</p>',lambda _:textnode(ad[4],'p','service-card-text'),card,count=1)
    card=re.sub(r'href="[^"]+"',lambda _:'href="'+local('/services/manage-google-adwords-campaigns/',lang)+'"',card,count=1)
    card=re.sub(r'aria-label="[^"]+"','',card,count=1)
    card=re.sub(r'alt="[^"]*"','alt=""',card,count=1)
    ad_button=dict(ad[7 if ar else 6],text=re.sub(r'^\[[^]]+\]\s*','',clean(ad[7 if ar else 6])))
    card=re.sub(r'<span class="btn-text-inner">[\s\S]*?</span>',lambda _:textnode(ad_button,'span','btn-text-inner'),card,count=1)
    cards.append(card)
    services=re.sub(r'<div class="services-cards">[\s\S]*?</article>\s*</div>',lambda _:'<div class="services-cards">'+''.join(cards)+'</div>',services,count=1)
    services=re.sub(r'<h2 class="services-title">[\s\S]*?</h2>',lambda _:p(14 if ar else 11,'h2','services-title'),services,count=1)
    services=re.sub(r'<p class="services-sub">[\s\S]*?</p>',lambda _:p(15 if ar else 12,'p','services-sub'),services,count=1)
    replace_section(r'<section class="rf-section[^>]*rf-services"',services)
    work=64 if ar else 59;wc=67 if ar else 62
    work_html=originals['work']
    work_html=re.sub(r'<p class="selected-work-title">[\s\S]*?</p>',lambda _:p(work,'p','selected-work-title'),work_html,count=1)
    work_html=re.sub(r'<p class="selected-work-lead">[\s\S]*?</p>',lambda _:p(work+1,'p','selected-work-lead'),work_html,count=1)
    work_html=re.sub(r'<span class="btn-text-inner">[\s\S]*?</span>\s*</span>',lambda _:label(79 if ar else 74),work_html,count=1)
    from portfolio_data import ITEMS
    slides=[]
    for j,slug in enumerate(['alostaz-seo','alhokail-seo','google-ads-conversion-value','alrahwanji-paints','kuwait-tutoring-instagram-ads','habba']):
        item=next(x for x in ITEMS if x['slug']==slug);c=item['cover'];src=c['src']
        src='/assets/images/'+src+('.webp' if '.' not in src else '')
        slides.append('<li class="selected-work-slide"><a class="selected-work-card" href="'+local('/work/'+slug+'/',lang)+'"><span class="selected-work-card-media selected-work-fit-contain">'+f'<img src="{src}" width="{c["w"]}" height="{c["h"]}" loading="lazy" decoding="async" alt=""></span><span class="selected-work-card-body">'+p(wc+j*2,'span','selected-work-card-title')+p(wc+j*2+1,'span','selected-work-card-description')+'</span></a></li>')
    work_html=re.sub(r'<ul class="slider-track" data-slider-track>[\s\S]*?</ul>',lambda _:'<ul class="slider-track" data-slider-track>'+''.join(slides)+'</ul>',work_html,count=1)
    # Existing left-arrow glyph is authoring decoration, not a second icon.
    work_html=work_html.replace('شاهد أعمالنا ←','شاهد أعمالنا <span class="rf-copy-arrow" aria-hidden="true">←</span>')
    work_wave='<div class="rf-work-wave" aria-hidden="true"><svg viewBox="0 0 1440 243.604" preserveAspectRatio="none"><path fill="#fffded" d="M0 0H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" /></svg></div>'
    work_html=work_html.replace('<div class="container">',work_wave+'<div class="container">',1)
    replace_section(r'<section class="rf-section[^>]*rf-work"',work_html)
    # Homepage-only owner refinements; retain every approved label and destination.
    def original_button(m):
        anchor=m[0].replace('class="rf-button magnetic"','class="btn-click magnetic"')
        anchor=anchor.replace('<span class="btn-text">','<div class="btn-fill"></div><span class="btn-text">',1)
        anchor=anchor.replace('</span></span></a>','</span><svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg></span></a>')
        return '<div class="btn btn-normal service-card-btn rf-home-action">'+anchor+'</div>'
    def difference_buttons(m):
        return re.sub(r'<a[^>]*class="rf-button magnetic"[^>]*>[\s\S]*?</a>',original_button,m[0])
    body=re.sub(r'<section\b[^>]*(?:rf-difference|rf-faq-more|rf-blog|rf-closing|class="section team")[^>]*>[\s\S]*?</section>',difference_buttons,body)
    def clients_refinement(m):
        block=m[0]
        wave='<div class="rf-clients-wave" aria-hidden="true"><svg viewBox="0 0 1440 243.604" preserveAspectRatio="none"><g transform="translate(0,243.604) scale(1,-1)"><path d="M687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036V243.604H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562Z" /></g></svg></div>'
        wave=wave.replace('<g transform="translate(0,243.604) scale(1,-1)">','').replace('</g>','')
        # Extend the filled polygon past the viewBox; no antialiased beige seam
        # at the straight bottom edge, even at fractional zoom/device pixels.
        wave=wave.replace('V243.604H1440','V300H1440')
        # Paint beige only ABOVE the curve, not behind the entire SVG. The
        # bottom is transparent over orange, so fractional layer edges cannot
        # blend beige into an orange horizontal hairline.
        wave=re.sub(r'<path d="[^"]+" />','<path fill="#fffded" d="M0 0H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" />',wave)
        block=block.replace('<div class="rf-inner">',wave+'<div class="rf-inner">',1)
        block=re.sub(r'<button[^>]*class="logo-marquee-toggle"[\s\S]*?</button>','',block,count=1)
        helptext='اضغط مفتاح المسافة لإيقاف حركة الشعارات أو استئنافها.' if ar else 'Press Space to pause or resume the logos.'
        block=block.replace('data-logo-marquee ',f'tabindex="0" role="region" aria-labelledby="clients-heading" aria-description="{helptext}" data-logo-marquee ',1)
        return block
    body=re.sub(r'<section[^>]*rf-clients[^>]*>[\s\S]*?</section>',clients_refinement,body,count=1)
    # Extend the cream polygon above the SVG viewport to avoid an antialiased
    # orange top-edge hairline at fractional transformed scroll positions.
    body=body.replace('M0 0H1440V28.6036','M0 -20H1440V28.6036')
    def compact_slider(m):
        track=m[0]
        kind='services' if 'services-cards' in track.split('>')[0] else 'blog'
        title=('خدماتنا' if kind=='services' else 'من مدونتنا') if ar else ('Our services' if kind=='services' else 'From our blog')
        track=track.replace('>',f' data-home-scroll-track tabindex="0" role="region" aria-label="{title}">',1)
        prev='السابق' if ar else 'Previous'; next_='التالي' if ar else 'Next'
        def control(direction,title):
            return f'<button type="button" data-home-scroll-{direction} aria-label="{title}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>'
        return '<div class="rf-home-scroll" data-home-scroll>'+track+'<div class="rf-home-scroll-controls" hidden>'+control('prev',prev)+control('next',next_)+'</div></div>'
    body=re.sub(r'<div class="services-cards">[\s\S]*?</article>\s*</div>|<ul class="rf-home-blog-cards">[\s\S]*?</ul>',compact_slider,body)
    # Scope the remaining editorial sections so original section/footer CSS wins.
    body=body.replace('class="rf-section ', 'class="rf-page rf-section ')
    return body


def home_body(lang,restore=True):
    ar=lang=='ar'; ps=paras(3 if ar else 2)
    def p(i, tag='p',cls='',**attrs): return textnode(ps[i],tag,cls,**attrs)
    def a(i, href=None): return action(ps[i],lang,href)
    hi=2 if ar else 1; stat=3 if ar else 2; button=4 if ar else 3
    body=re.sub(r'<h1\b[^>]*>[\s\S]*?</h1>',lambda _:p(hi,'h1','home-header-title',id='main-content',tabindex='-1'),PROTECTED[lang]['home_hero'],count=1)
    body+='<section class="rf-home-intro" data-scroll-section><div class="rf-inner">'+p(stat,'p','rf-home-stats')+a(button)+'</div></section>'
    about=6 if ar else 4
    aboutbody=''.join(paragraph(ps[i],lang) for i in range(about+1,(13 if ar else 11)))
    body+=section(p(about,'h2'),'<div class="rf-about-grid"><div>'+aboutbody+'</div><img src="/assets/images/about-us-zero2one.webp" width="900" height="900" loading="lazy" alt=""></div>',1,'about')
    start=16 if ar else 13
    slugs=['web-design-riyadh','seo-riyadh','digital-advertising','brand-identity','social-media-management','ecommerce-development','marketing-consulting',None,None,'mobile-application']
    cards=[]
    for i,slug in enumerate(slugs):
        index=start+i*3
        if slug is None:
            for q in ps[index:index+3]: record(q,'excluded','Owner explicitly excluded Email Marketing and CRO on 2026-10-07')
            continue
        pic=2 if slug=='seo-riyadh' else SERVICES[slug][2]
        cards.append('<article class="rf-service-card" data-rf-reveal>'+
                     f'<div class="rf-service-image"><img src="/assets/images/service-{pic}-640.webp" width="640" height="640" alt="" loading="lazy"></div>'+
                     '<div class="rf-service-content">'+p(index,'h3')+p(index+1)+a(index+2,local('/services/'+slug+'/',lang))+'</div></article>')
    # Google Ads has a dedicated approved document, even though the home brief groups paid ads.
    body+=section(p(14 if ar else 11,'h2'),p(15 if ar else 12)+'<div class="rf-services-grid">'+''.join(cards)+'</div>',2,'services','services')
    diff=47 if ar else 43; cstart=50 if ar else 46
    bento=[]
    for i in range(5):
        if i == 0:
            bento.append('<article class="rf-card" data-rf-reveal>'+p(cstart,'h3')+p(cstart+1)+'</article>')
        else:
            bento.append('<details class="rf-card rf-difference-item" open><summary>'+p(cstart+i*2,'h3')+'<svg class="rf-difference-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary><div class="rf-difference-answer">'+p(cstart+i*2+1)+'</div></details>')
    end=60 if ar else 56
    body+=section(p(diff,'h2'),p(diff+1)+'<div class="rf-bento">'+''.join(bento)+'</div>'+p(end)+'<div class="rf-actions">'+a(end+1)+a(end+2)+'</div>',3,'difference')
    work=64 if ar else 59; wc=67 if ar else 62
    from portfolio_data import ITEMS
    case_slugs=['alostaz-seo','alhokail-seo','google-ads-conversion-value','alrahwanji-paints','kuwait-tutoring-instagram-ads','habba']
    workcards=[]
    for i,slug in enumerate(case_slugs):
        item=next(x for x in ITEMS if x['slug']==slug); cover=item['cover']
        src=cover['src']; src='/assets/images/'+src+('.webp' if '.' not in src else '')
        workcards.append('<article class="rf-work-card">'+f'<a href="{local("/work/"+slug+"/",lang)}">'
                         f'<div class="rf-work-image"><img src="{src}" width="{cover["w"]}" height="{cover["h"]}" alt="" loading="lazy"></div>'+
                         p(wc+i*2,'h3')+p(wc+i*2+1)+'</a></article>')
    prev='السابق' if ar else 'Previous'; next_='التالي' if ar else 'Next'
    body+=section(p(work,'h2'),'<div class="rf-work-slider" data-rf-slider><div class="rf-work-track" tabindex="0" role="region" aria-label="'+('أعمالنا' if ar else 'Our work')+'">'+''.join(workcards)+
                  f'</div><div class="rf-slider-controls"><button type="button" data-rf-prev aria-label="{prev}">←</button><button type="button" data-rf-next aria-label="{next_}">→</button></div></div>'+p(work+1)+a(79 if ar else 74),4,'work','selected-work')
    th=p(75,'h2') if not ar else '<h2>'+re.search(r'<h2 class="team-title">([\s\S]*?)</h2>',LEGACY['ar']['team']).group(1)+'</h2>'
    team=LEGACY[lang]['team']
    if not ar:
        team=re.sub(r'<h2 class="team-title">[\s\S]*?</h2>',lambda _:p(75,'h2','team-title'),team,count=1)
    team=re.sub(r'<p class="team-sub">[\s\S]*?</p>',lambda _:p(81 if ar else 76,'p','team-sub'),team,count=1)
    team=re.sub(r'<div class="services-cta-wrap">[\s\S]*?</a>\s*</div>\s*</div>',lambda _:'<div class="services-cta-wrap">'+a(82 if ar else 77)+'</div>',team,count=1)
    body+=team
    body+=clients(p(84 if ar else 78,'h2'),lang,6,p(85 if ar else 79))
    body+=LEGACY[lang]['testimonials']
    body+=home_faq(lang)
    body+='<section class="rf-faq-more" data-scroll-section>'+a(92 if ar else 81)+'</section>'
    # Reuse three real blog-index cards, including their exact copy and images.
    blogfile=ROOT/('blog/ar/index.html' if ar else 'blog/index.html')
    blogcard=''
    if blogfile.exists():
        cards=re.findall(r'<li class=card>[\s\S]*?</li>',blogfile.read_text())[:3]
        blogcard='<ul class="rf-home-blog-cards">'+''.join(cards)+'</ul>'
    body+=section(p(94 if ar else 82,'h2'),p(95 if ar else 83)+blogcard+a(96 if ar else 84, '/blog/ar/' if ar else '/blog/'),8,'blog')
    body+=section(p(98 if ar else 85,'h2'),p(99 if ar else 86)+a(100 if ar else 87),9,'closing')
    for q in ps:
        if not any(r['id']==q['id'] for r in REPORT):
            if not authoring(q): record(q,'authoring','Document section label; not customer copy')
    return original_home_layout(body,lang,ps) if restore else body


def menu(lang):
    ar=lang=='ar'
    titles={s:clean(paras(spec[1 if ar else 0])[3]) for s,spec in SERVICES.items()}
    # Use existing concise service labels in the supplied home document.
    home=paras(3 if ar else 2); start=16 if ar else 13
    for i,s in enumerate(['web-design-riyadh','seo-riyadh','digital-advertising','brand-identity','social-media-management','ecommerce-development','marketing-consulting',None,None,'mobile-application']):
        if s: titles[s]=clean(home[start+i*3])
    titles['manage-google-adwords-campaigns']='إدارة إعلانات جوجل' if ar else 'Google Ads Management'
    links=''.join(f'<a href="{local("/services/"+s+"/",lang)}">{esc(titles[s])}</a>' for s in titles)
    return '<div class="rf-services-menu">'+links+'</div>'


def metadata(page, route, lang, title=None, description=None):
    url=BASE+local(route,lang); en=BASE+route; ar=BASE+'/ar'+route
    if title:
        page=re.sub(r'<title>[\s\S]*?</title>',lambda _: '<title>'+esc(title)+'</title>',page,count=1)
        page=re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)"\s+content=")[^"]*',lambda m:m[1]+esc(title),page)
    if description:
        page=re.sub(r'(<meta (?:property|name)="(?:description|og:description|twitter:description)"\s+content=")[^"]*',lambda m:m[1]+esc(description),page)
    page=re.sub(r'(<link rel="canonical" href=")[^"]*',lambda m:m[1]+url,page)
    page=re.sub(r'(<meta property="og:url" content=")[^"]*',lambda m:m[1]+url,page)
    for key,target in [('en',en),('ar',ar),('x-default',en)]:
        page=re.sub(r'(<link rel="alternate" hreflang="'+key+r'" href=")[^"]*',lambda m:m[1]+target,page)
    page=page.replace('href="/ar/services/seo-riyadh/"','href="'+('/ar'+route)+'"') if lang=='en' else page.replace('href="/services/seo-riyadh/"','href="'+route+'"')
    # Consolidate source scripts first. Mapping each old Service/Breadcrumb/FAQ
    # script separately would create the same new Service three times.
    pattern=r'<script type="application/ld\+json">([\s\S]*?)</script>'
    nodes=[]
    for block in re.findall(pattern,page):
        obj=json.loads(block); nodes.extend(obj.get('@graph',[obj]))
    keep=[n for n in nodes if not any(t in ('Service','WebPage','BreadcrumbList','FAQPage') for t in (n.get('@type') if isinstance(n.get('@type'),list) else [n.get('@type')]))]
    keep=list({n.get('@id',json.dumps(n,sort_keys=True)):n for n in keep}.values())
    actual_title=title or html.unescape(re.search(r'<title>([\s\S]*?)</title>',page)[1])
    actual_desc=description or html.unescape(re.search(r'<meta name="description"\s+content="([^"]*)',page)[1])
    webpage={'@type':'WebPage','@id':url+'#webpage','url':url,'name':actual_title,'description':actual_desc,'inLanguage':lang}
    if route.startswith('/services/') and route!='/services/':
        keep.append({'@type':'Service','@id':url+'#service','url':url,'name':actual_title,'description':actual_desc,'provider':{'@id':BASE+'/#organization'}})
        webpage['mainEntity']={'@id':url+'#service'}
    keep.append(webpage)
    page=re.sub(pattern,'',page)
    page=page.replace('</head>','<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':keep},ensure_ascii=False)+'</script>\n</head>',1)
    return page


def render_page(route,lang,unused_src=None):
    if route=='/':
        body=home_body(lang); title=description=None
    elif route=='/services/':
        ar=lang=='ar'; ps=paras(3 if ar else 2); h=ps[14 if ar else 11]; intro=ps[15 if ar else 12]
        title=clean(h); description=clean(intro)
        source=home_body(lang,restore=False)
        body=re.search(r'<section class="rf-section[^>]*id="services"[\s\S]*?</section>',source).group(0)
        body=body.replace(textnode(h,'h2'),textnode(h,'h1',id='main-content',tabindex='-1'),1)
        # Add the dedicated Google Ads page to the catalogue using its own supplied copy.
        ad=paras(12 if ar else 13)
        card='<article class="rf-service-card"><div class="rf-service-image"><img src="/assets/images/service-3-640.webp" width="640" height="640" alt="" loading="lazy"></div><div class="rf-service-content">'+textnode(ad[3],'h3')+textnode(ad[4])+action(primary_action(ad),lang,local('/services/manage-google-adwords-campaigns/',lang))+'</div></article>'
        body=body.replace('</div></div></section>',card+'</div></div></section>')
        body=body.replace('<h3 ', '<h2 ').replace('</h3>', '</h2>')
    elif route=='/team/':
        title= 'تعرّف على فريقنا' if lang=='ar' else 'Meet Our Team'
        body='<section class="rf-hero rf-simple-hero" data-scroll-section><div class="rf-inner"><h1 id="main-content" tabindex="-1">'+title+'</h1></div></section>'
        body+=section('',team_cards(lang),1,'team'); description=clean(paras(3 if lang=='ar' else 2)[81 if lang=='ar' else 76])
    elif route=='/faqs/':
        title='الأسئلة الشائعة' if lang=='ar' else 'Frequently asked questions'
        body='<section class="rf-hero rf-simple-hero" data-scroll-section><div class="rf-inner"><h1 id="main-content" tabindex="-1">'+title+'</h1></div></section>'+home_faq(lang)
        for n,slug in enumerate(SERVICES,1):
            spec=SERVICES[slug]; ps=paras(spec[1 if lang=='ar' else 0]); a=next(i for i,p in enumerate(ps) if p['style']=='HEADING_2' and is_faq(p['text']))
            z=next((i for i in range(a+1,len(ps)) if ps[i]['style']=='HEADING_2'),len(ps))
            block=render_block(ps[a],ps[a+1:z],n,lang,slug).replace('id="faq"',f'id="faq-{slug}"')
            body+=block
        seo=paras(4)
        # The English tab uses normal paragraphs even for its headings. Restore
        # semantic roles, never alter the six supplied questions or their answers.
        for i in (231,233,236,239,241,243): seo[i]['style']='HEADING_3'
        faq=seo[111:128] if lang=='ar' else seo[230:]
        body+=render_block(faq[0],faq[1:],9,lang,'seo-riyadh').replace('id="faq"','id="faq-seo-riyadh"')
        description=html.unescape(re.search(r'<h3 class="faq-q">([\s\S]*?)</h3>',LEGACY[lang]['faq']).group(1)).strip()
    else: body,title,description=service_body(route.strip('/').split('/')[-1],lang)
    prefix=LEGACY[lang]['prefix']
    if route=='/':
        prefix=PROTECTED[lang]['home_prefix']
    elif route.strip('/').split('/')[-1] in PROTECTED[lang]:
        prefix=prefix[:prefix.index('<header class="section default-header')]
    footer=LEGACY[lang]['footer']
    if route=='/': footer=footer.removeprefix('</section>\n')
    page=prefix+body+footer
    page=page.replace('class="main seo-service-page"','class="main rf-page"')
    if route=='/': page=page.replace('class="main home"','class="main home rf-home-page"').replace('class="main"','class="main home rf-home-page"')
    # Stable namespace avoids the old home-only loader's split-letter dependency.
    page=page.replace('data-barba-namespace="work-single"','data-barba-namespace="refresh"')
    if route!='/': page=re.sub(r'(<main\b[^>]*\bid=")[^"]*',r'\1refresh',page,count=1)
    page=metadata(page,route,lang,title,description)
    # A native disclosure works with keyboard, touch, and no JS. Keep its destination link.
    pattern=r'<li class="btn btn-link">\s*(<a href="'+re.escape(local('/services/',lang))+r'"[\s\S]*?</a>)\s*</li>'
    def nav(m):
        label='خدماتنا' if lang=='ar' else 'Our Services'
        return '<li class="rf-nav-services"><details><summary>'+label+'</summary>'+menu(lang)+'<a class="rf-all-services" href="'+local('/services/',lang)+'">'+label+' ↗</a></details></li>'
    page=re.sub(pattern,nav,page)
    if route=='/services/brand-identity/': page=refine_brand_owner(page,lang)
    if route=='/services/' or route.startswith('/services/'):
        from service_studio import refine
        page=refine(page,'catalogue' if route=='/services/' else route.strip('/').split('/')[-1],lang)
    page=page.replace('<div class="main-wrap" data-scroll-container>','<div class="main-wrap" data-scroll-container>')
    from stamp_assets import STAMPED, digest
    page=STAMPED.sub(lambda m:f'{m["attr"]}="{m["path"]}?v={digest(m["path"]) or m["stamp"]}"',page)
    return re.sub(r'[ \t]+(?=\n)', '', page)


def manages(route): return route in ROUTES


def refine_brand_owner(page,lang):
    """Local brand review, preserving each language's independent source copy."""
    marker='<!-- OWNER:BRAND-IDENTITY-2026-10-10 -->'
    if marker in page: return page
    page=page.replace('class="main rf-page"','class="main rf-page rf-brand-owner"',1)
    arrow='<svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>'
    chevron='<svg class="brand-owner-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>'
    symbols=['discovery','search','edit-square','category','chat','image','home','swap','folder']
    def symbol(index):
        return iconly_svg(symbols[index],'brand-owner-symbol')
    def wave(edge):
        # Include the original curve's shallow negative crest in the viewport:
        # clipping at y=0 would flatten the peak into a straight horizontal edge.
        return '<div class="brand-owner-wave brand-owner-wave--'+edge+'" aria-hidden="true"><svg viewBox="0 -20 1440 243.604" preserveAspectRatio="none"><path d="M0 -20H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" /></svg></div>'
    def button(anchor,variant):
        attrs=re.search(r'<a\b([^>]*)>',anchor)[1]
        attrs=re.sub(r'class="[^"]*"','class="btn-click magnetic"',attrs)
        return '<div class="btn btn-normal brand-owner-cta brand-owner-cta--'+variant+'"><a'+attrs+'><div class="btn-fill"></div><span class="btn-text"><span class="btn-text-inner">'+re.search(r'<span class="btn-text-inner">([\s\S]*?)</span>',anchor)[1]+'</span>'+arrow+'</span></a></div>'
    def hero(m):
        anchors=re.findall(r'<a\b[^>]*>[\s\S]*?</a>',m[0])
        if len(anchors)!=2: raise ValueError('Expected two brand hero CTAs')
        actions='<div class="brand-owner-actions">'+button(anchors[0],'primary')+button(anchors[1],'secondary')+'</div>'
        return m[0].replace(anchors[0]+anchors[1],actions,1)
    page,n=re.subn(r'<section class="rf-preserved-hero-lead"[\s\S]*?</section>',hero,page,count=1)
    if n!=1: raise ValueError('Missing protected brand hero lead')
    def section(id,fn):
        nonlocal page
        page,n=re.subn(r'<section\b[^>]*id="'+re.escape(id)+r'"[\s\S]*?</section>',lambda m:fn(m[0]),page,count=1)
        if n!=1: raise ValueError('Missing brand section '+id)
    def pillars(block):
        block=block.replace('rf-ink rf-cards','rf-ink rf-cards brand-owner-pillars',1)
        def cards(m):
            # One approved three-label paragraph remains one copy record. SVG
            # decorations contain no text; normalized labels are unchanged.
            labels=['Brand Strategy','Visual Identity','Brand Guidelines']
            if re.sub(r'\s+',' ',html.unescape(m[2])).strip()!=' '.join(labels):
                raise ValueError('Unexpected brand pillar source labels')
            tiles=' '.join('<article class="brand-owner-pillar" data-rf-reveal data-pillar-number="'+f'{i+1:02d}'+'">'+iconly_svg(['discovery','category','folder'][i],'brand-owner-symbol')+'<h3 lang="en" dir="ltr">'+label+'</h3></article>' for i,label in enumerate(labels))
            return '<div class="brand-owner-pillar-grid" data-copy="'+m[1]+'">'+tiles+'</div>'
        block=re.sub(r'<div class="rf-prose"><p data-copy="([^"]+)"[^>]*>([\s\S]*?)</p></div>',cards,block,count=1)
        block=block.replace('data-scroll-section>','data-scroll-section>'+wave('top'),1)
        return block.replace('</section>',wave('bottom')+'</section>')
    section('section-1',pillars)
    def know(block):
        block=block.replace('rf-white rf-cards','rf-white rf-cards brand-owner-know',1)
        count=[0]
        def card(m):
            count[0]+=1
            return '<article class="brand-owner-know-card" data-rf-reveal><span class="brand-owner-number" aria-hidden="true">'+str(count[0])+'</span>'+m[0]+'</article>'
        block=re.sub(r'<div class="rf-prose">([\s\S]*?)</div>',lambda m:'<div class="brand-owner-know-grid">'+re.sub(r'<p\b[^>]*>[\s\S]*?</p>',card,m[1])+'</div>',block,count=1)
        # Reuse the approved hero CTA label/destination, not invented copy.
        source=re.search(r'<a data-copy="(?:8|9):5"[\s\S]*?</a>',page)[0]
        source=source.replace('<div class="btn-fill"></div>','').replace(arrow,'')
        source=re.sub(r' data-copy="[^"]+"','',source,count=1)
        block=block.replace('<div class="rf-actions"></div>','<div class="brand-owner-actions">'+button(source,'light')+'</div>',1)
        return block.replace('</section>',wave('bottom')+'</section>')
    section('section-2',know)
    def deliverables(block):
        block=block.replace('rf-sand rf-cards','rf-sand rf-cards brand-owner-deliverables',1)
        block=block.replace('class="rf-card-grid"','class="brand-owner-disclosure-grid" data-brand-disclosures',1)
        count=[0]
        def disclosure(m):
            i=count[0]; count[0]+=1
            title=re.search(r'<h3\b[^>]*>[\s\S]*?</h3>',m[1])[0]
            answer=re.sub(r'<span class="rf-card-no"[\s\S]*?</span>','',m[1]).replace(title,'',1)
            return '<details class="brand-owner-disclosure" name="brand-deliverables"'+(' open' if i==0 else '')+' data-rf-reveal><summary class="brand-owner-summary"><span class="brand-owner-number" aria-hidden="true">'+f'{i+1:02d}'+'</span>'+symbol(i)+title+chevron+'</summary><div class="brand-owner-answer">'+answer+'</div></details>'
        block=re.sub(r'<article class="rf-card" data-rf-reveal>([\s\S]*?)</article>',disclosure,block)
        expected=8 if lang=='ar' else 9
        if count[0]!=expected: raise ValueError('Unexpected number of approved brand deliverables')
        return block
    section('section-3',deliverables)
    def compact_cards(block,kind):
        # The owner invited a creative layout for these two sections after the
        # initial request. Keep every approved title, sentence and CTA intact.
        block=block.replace('rf-cards"','rf-cards brand-owner-'+kind+'"',1)
        grid='brand-owner-proof-grid' if kind=='why' else 'brand-owner-audience-grid'
        block=block.replace('class="rf-card-grid"','class="'+grid+'" data-brand-compact',1)
        audience_symbols=['star','swap','chart','bag','activity','work']
        count=[0]
        def card(m):
            i=count[0]; count[0]+=1
            title=re.search(r'<h3\b[^>]*>[\s\S]*?</h3>',m[1])[0]
            answer=re.sub(r'<span class="rf-card-no"[\s\S]*?</span>','',m[1]).replace(title,'',1)
            decoration=('<span class="brand-owner-number" aria-hidden="true">'+f'{i+1:02d}'+'</span>' if kind=='why' else iconly_svg(audience_symbols[i],'brand-owner-symbol'))
            return '<details class="brand-owner-compact-card" open data-rf-reveal><summary class="brand-owner-summary">'+decoration+title+chevron+'</summary><div class="brand-owner-answer">'+answer+'</div></details>'
        block=re.sub(r'<article class="rf-card" data-rf-reveal>([\s\S]*?)</article>',card,block)
        if count[0]!=6: raise ValueError('Expected six brand '+kind+' cards')
        if kind=='why':
            block=block.replace('data-scroll-section>','data-scroll-section>'+wave('top'),1)
            block=block.replace('</section>',wave('bottom')+'</section>')
        else:
            block=block.replace('<div class="rf-actions">','<div class="brand-owner-actions">',1)
            block=re.sub(r'<a\b[^>]*class="rf-button magnetic"[\s\S]*?</a>',lambda m:button(m[0],'primary'),block)
        return block
    section('section-4',lambda b:compact_cards(b,'why'))
    section('section-5',lambda b:compact_cards(b,'audience'))
    def process(block):
        block=block.replace('rf-process"','rf-process brand-owner-process"',1)
        block=block.replace('data-scroll-section>','data-scroll-section>'+wave('top'),1)
        block=block.replace('<li data-rf-reveal>','<li>')
        block=block.replace('class="rf-step-card"','class="rf-step-card" data-about-step data-reveal-scope="brand"')
        return block.replace('</section>',wave('bottom')+'</section>')
    section('section-7',process)
    def outcomes(block):
        block=block.replace('rf-cards"','rf-cards brand-owner-outcomes"',1)
        stems=['01-brand-always-present','02-memorable-brand','03-consistent-presence','04-stand-out','05-build-trust','06-marketing-foundation']
        count=[0]
        def card(m):
            title=html.unescape(re.search(r'<h3\b[^>]*>([\s\S]*?)</h3>',m[1])[1])
            # The updated Arabic source reorders outcomes. Keep the supplied
            # owner photographs attached to their meaning, not an old index.
            mapping=[('دائماً','01-brand-always-present'),('يتذكرها','02-memorable-brand'),
                     ('متسق','03-consistent-presence'),('تميزك','04-stand-out'),
                     ('المصداقية','05-build-trust'),('أساس','06-marketing-foundation')]
            stem=next((image for term,image in mapping if term in title),stems[count[0]])
            count[0]+=1
            base='/assets/images/brand-benefits/'+stem
            sizes='(max-width:760px) 92vw, (max-width:1100px) 44vw, 29vw'
            sources=''.join('<source type="image/'+fmt+'" srcset="'+', '.join(base+'-'+str(w)+'.'+fmt+' '+str(w)+'w' for w in (480,800,1440))+'" sizes="'+sizes+'">' for fmt in ('avif','webp'))
            picture='<picture class="brand-owner-outcome-media">'+sources+'<img src="'+base+'.jpg" width="1440" height="1024" alt="" loading="lazy" decoding="async"></picture>'
            return '<article class="rf-card brand-owner-outcome-card" data-rf-reveal>'+picture+m[1]+'</article>'
        block=re.sub(r'<article class="rf-card" data-rf-reveal>([\s\S]*?)</article>',card,block)
        if count[0]!=6: raise ValueError('Expected six illustrated brand outcome cards')
        return block
    section('section-8',outcomes)
    # The investment callout was removed by the owner on 18 October.
    # It remains in the source archive/coverage, not as a rendered section.
    return page.replace('<section class="section case-top-wrap',marker+'<section class="section case-top-wrap',1)


def decorate_existing(page, route, lang):
    """Idempotent additions to original SEO/About pages. Protected heroes untouched."""
    if route=='/services/seo-riyadh/':
        page=page.replace('class="main seo-service-page"','class="main seo-service-page rf-seo-page"',1)
        a='<!-- REFRESH:SEO-TEAM:BEGIN -->'; z='<!-- REFRESH:SEO-TEAM:END -->'
        heading=paras(4)[106 if lang=='ar' else 227]
        block=a+'<section class="section seo-sec rf-seo-team" data-scroll-section><div class="seo-sec-inner">'+textnode(heading,'h2','seo-sec-title')+team_cards(lang,'seo-riyadh')+'</div></section>'+z
        if a in page: page=re.sub(re.escape(a)+r'[\s\S]*?'+re.escape(z),lambda _:block,page)
        else: page=page.replace('<!-- CLIENTS:BEGIN',block+'\n<!-- CLIENTS:BEGIN',1)
        page=refine_seo_owner(page,lang)
        page=refine_seo_studio(page,lang)
        page=refine_seo_premium(page,lang)
        return re.sub(r'[ \t]+(?=\n)', '', page)
    if route!='/about/': return page
    if 'rf-about-page' not in page:
        page=re.sub(r'(<main\b[^>]*class=")([^"]*)',r'\1\2 rf-about-page',page,count=1)
    if '<!-- REFRESH:ABOUT -->' not in page:
        pat=r'<section class="section case-overview once-in"[\s\S]*?</section>'
        m=re.search(pat,page)
        if m:
            block=m[0]; cut=block.index('<div class="case-includes-head">')
            first=block[:cut]+'</div></div></div></section>'
            second='<section class="section case-overview rf-about-values" data-scroll-section><div class="container medium"><div class="row"><div class="flex-col">'+block[cut:]
            page=page[:m.start()]+first+second+page[m.end():]
        page=page.replace('<ul class="process-list">','<ol class="rf-timeline rf-about-timeline">',1)
        start=page.find('<ol class="rf-timeline rf-about-timeline">')
        if start>=0:
            end=page.index('</ul>',start); list_=page[start:end]; counter=[0]
            def step(m):
                counter[0]+=1
                return f'<li><span class="rf-step-no" aria-hidden="true">{counter[0]:02d}</span><div class="rf-step-card">'+m[1]+'</div></li>'
            list_=re.sub(r'<li>([\s\S]*?)</li>',step,list_)
            page=page[:start]+list_+'</ol>'+page[end+5:]
        page=page.replace('<div class="footer-rounded-div"','<!-- REFRESH:ABOUT --><div class="footer-rounded-div"',1)
    a='<!-- REFRESH:ABOUT-EXTRA:BEGIN -->'; z='<!-- REFRESH:ABOUT-EXTRA:END -->'
    title2='عملاؤنا في النجاح' if lang=='ar' else 'Our Clients in Success'
    block=a+clients('<h2>'+title2+'</h2>',lang,7).replace('rf-clients"','rf-clients rf-about-clients"',1)+z
    if a in page: page=re.sub(re.escape(a)+r'[\s\S]*?'+re.escape(z),lambda _:block,page)
    else: page=page.replace('<!-- REFRESH:ABOUT -->',block+'<!-- REFRESH:ABOUT -->')
    return refine_about_interactions(refine_about_owner(page,lang))


def refine_seo_owner(page,lang='ar'):
    """Bilingual SEO review; preserve each language's supplied copy independently."""
    # Repair a pre-existing duplicate paragraph injected into the closing tag.
    # The approved sentence remains in the fourth package card, unchanged.
    duplicate_fit=('نحوّل محركات البحث إلى مصدر نموّ مستمرّ لمشروعك.' if lang=='ar'
                   else 'Turns search engines into a steady source of demand for your business.')
    page=re.sub(r'</html<p class="seo-plan-fit">'+re.escape(duplicate_fit)+r'</p>\s*>','</html>',page)
    # Remove requested sections even when another generator restores the block.
    page=re.sub(r'<!-- REFRESH:SEO-TEAM:BEGIN -->[\s\S]*?<!-- REFRESH:SEO-TEAM:END -->\n?','',page)
    page=re.sub(r'<section\b[^>]*id="clients"[\s\S]*?</section>','',page)
    # Package orders use the site's approved WhatsApp destination in both
    # languages; preserve all package copy and the adopted arrow/fill markup.
    def package_link(m):
        attrs=re.sub(r'\s+(?:target|rel)="[^"]*"','',m[2])
        attrs=re.sub(r'href="[^"]*"','href="'+WA+'"',attrs,count=1)
        return m[1]+attrs+' target="_blank" rel="noopener noreferrer">'
    page,n=re.subn(r'(<div class="btn btn-normal seo-plan-cta">\s*<a\b)([^>]*)(>)',package_link,page)
    expected_plans=3 if 'data-seo-package-edition=' in page else 4
    if n!=expected_plans: raise ValueError('Unexpected WhatsApp SEO package order link count')
    marker='<!-- OWNER:SEO-2026-10-09 -->'
    if marker in page: return refine_seo_compact(page,lang)
    page=page.replace('rf-seo-page"','rf-seo-page rf-seo-owner"',1)
    arrow='<svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>'
    # Keep native magnetic/fill effects; the arrow inherits the label's color.
    start=page.index('<!-- ===== SEO HERO')
    end=page.index('<div class="footer-rounded-div"',start)
    page=page[:start]+re.sub(r'(<span class="btn-text"><span class="btn-text-inner">[^<]*</span>)(</span>)',lambda m:m[1]+arrow+m[2],page[start:end])+page[end:]
    def action():
        label='استشارتك المجانية' if lang=='ar' else 'Get Your Free Consultation'
        return '<div class="seo-section-cta"><div class="btn btn-normal seo-hero-cta seo-hero-cta-primary"><a href="https://wa.me/966530307054" target="_blank" rel="noopener" class="btn-click magnetic" data-strength="20" data-strength-text="10"><div class="btn-fill"></div><span class="btn-text"><span class="btn-text-inner">'+label+'</span>'+arrow+'</span></a></div></div>'
    def wave(edge='top'):
        return '<div class="seo-owner-wave seo-owner-wave--'+edge+'" aria-hidden="true"><svg viewBox="0 0 1440 243.604" preserveAspectRatio="none"><path d="M0 -20H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" /></svg></div>'
    def section(id,fn):
        nonlocal page
        pattern=r'<section\b[^>]*id="'+re.escape(id)+r'"[\s\S]*?</section>'
        page,n=re.subn(pattern,lambda m:fn(m[0]),page,count=1)
        if n!=1: raise ValueError('Missing SEO section '+id)
    base='/assets/images/seo/owner-review-2026-10/'
    def shots(block):
        names=iter(['google','maps','chatgpt'])
        def pic(m):
            name='illustration-'+next(names)+'-'+lang
            img=re.search(r'<img[\s\S]*?>',m[0])[0]
            img=re.sub(r'src="[^"]+"','src="'+base+name+'-1024.webp"',img)
            img=re.sub(r'srcset="[^"]+"','srcset="'+base+name+'-640.webp 640w, '+base+name+'-1024.webp 1024w"',img)
            return '<picture>'+img+'</picture>'
        return re.sub(r'<picture>[\s\S]*?</picture>',pic,block)
    section('seo-why',shots)
    def know(block):
        block=block.replace('data-scroll-section>','data-scroll-section>'+wave(),1)
        count=[0]
        def number(m):
            count[0]+=1
            return '<li><span class="seo-owner-number" aria-hidden="true">'+str(count[0])+'</span>'+m[1]+'</li>'
        block=re.sub(r'<li>([\s\S]*?)</li>',number,block)
        return block.replace('</ul>','</ul>'+action(),1)
    section('seo-know',know)
    def services(block):
        names=iter(['strategy','local','technical','keywords','content','ai','backlinks','ecommerce','reporting'])
        def media(m):
            name=next(names)
            return '<img class="seo-card-img" src="'+base+name+'-1200.webp" srcset="'+base+name+'-480.webp 480w, '+base+name+'-1200.webp 1200w" sizes="(max-width:700px) 92vw, (max-width:1100px) 45vw, 30vw" width="1200" height="675" alt="" loading="lazy" decoding="async">'
        return re.sub(r'<img class="seo-card-img"[^>]+>',media,block)
    section('whats-included',services)
    def why(block):
        block=block.replace('data-scroll-section>','data-scroll-section>'+wave(),1)
        count=[0]
        def number(m):
            count[0]+=1
            return m[0]+'<span class="seo-owner-number" aria-hidden="true">'+str(count[0])+'</span>'
        block=re.sub(r'<article class="seo-tile">',number,block)
        return block.replace('</section>',wave('bottom')+'</section>')
    section('seo-why-zero2one',why)
    def audience(block):
        icons=iter(['paper-plus','work','buy','category','setting','location'])
        return re.sub(r'<article class="seo-tile">',lambda m:m[0]+iconly_svg(next(icons),'seo-owner-icon'),block)
    section('seo-audience',audience)
    section('seo-packages',lambda b:re.sub(r'<p class="seo-plan-price">[\s\S]*?</p>','',b))
    def process(block):
        block=block.replace('data-scroll-section>','data-scroll-section>'+wave(),1)
        block=block.replace('seo-sec-title fade-in animate','seo-sec-title')
        return block.replace('class="seo-timeline-item"','class="seo-timeline-item" data-about-step data-reveal-scope="seo"')
    section('seo-process',process)
    return refine_seo_compact(page.replace('<!-- ===== SEO HERO',marker+'<!-- ===== SEO HERO',1),lang)


def refine_seo_compact(page,lang):
    """Accessible native disclosures and swipe tracks; compact behavior is enhanced by JS."""
    marker='<!-- OWNER:SEO-COMPACT-2026-10-10 -->'
    if marker in page: return page
    chevron='<svg class="seo-owner-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>'
    arrow='<svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>'
    def section(id,fn):
        nonlocal page
        pattern=r'<section\b[^>]*id="'+re.escape(id)+r'"[\s\S]*?</section>'
        page,n=re.subn(pattern,lambda m:fn(m[0]),page,count=1)
        if n!=1: raise ValueError('Missing SEO compact section '+id)
    def slider(block,cls):
        title=re.search(r'<h2\b[^>]*>([\s\S]*?)</h2>',block)[1]
        label=esc(html.unescape(re.sub(r'<[^>]+>','',title)).strip())
        prev='البطاقة السابقة' if lang=='ar' else 'Previous card'
        next_='البطاقة التالية' if lang=='ar' else 'Next card'
        def control(direction,label):
            return '<button type="button" data-home-scroll-'+direction+' aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>'
        # The existing track ends immediately before the section's inner wrapper.
        pat=r'(<div class="'+cls+r'">)([\s\S]*?)(</div>)(\s*</div>\s*</section>)'
        def track(m):
            opening=m[1].replace('>',' data-home-scroll-track tabindex="0" role="region" aria-label="'+label+'">',1)
            controls='<div class="rf-home-scroll-controls" hidden>'+control('prev',prev)+control('next',next_)+'</div>'
            return '<div class="seo-owner-scroll" data-home-scroll>'+opening+m[2]+m[3]+controls+'</div>'+m[4]
        block,n=re.subn(pat,track,block,count=1)
        if n!=1: raise ValueError('Missing SEO slider track '+cls)
        return block
    section('seo-why',lambda b:slider(b,'seo-shots'))
    section('whats-included',lambda b:slider(b,'seo-cards'))
    def tile_group(block):
        block=re.sub(r'(<div class="seo-tiles[^\"]*")',r'\1 data-seo-accordion',block,count=1)
        def tile(m):
            content=m[1]
            title=re.search(r'<h3\b[^>]*>[\s\S]*?</h3>',content)
            if not title: raise ValueError('Missing SEO card title')
            decoration=''.join(re.findall(r'<span class="seo-owner-number"[\s\S]*?</span>|<svg class="seo-owner-icon"[\s\S]*?</svg>',content))
            answer=content.replace(title[0],'',1)
            for item in re.findall(r'<span class="seo-owner-number"[\s\S]*?</span>|<svg class="seo-owner-icon"[\s\S]*?</svg>',content): answer=answer.replace(item,'',1)
            return '<details class="seo-tile seo-owner-accordion" open><summary>'+decoration+title[0]+chevron+'</summary><div class="seo-owner-answer">'+answer.strip()+'</div></details>'
        return re.sub(r'<article class="seo-tile">([\s\S]*?)</article>',tile,block)
    for id in ('seo-why-zero2one','seo-audience','seo-expected'): section(id,tile_group)
    def plans(block):
        block=block.replace('<div class="seo-plans-grid">','<div class="seo-plans-grid" data-seo-accordion>',1)
        def plan(m):
            content=m[2]
            title=re.search(r'<h3 class="seo-plan-name">[\s\S]*?</h3>',content)
            cta=re.search(r'<div class="btn btn-normal seo-plan-cta">[\s\S]*?</a>\s*</div>',content)
            if not title or not cta: raise ValueError('Missing SEO package heading or CTA')
            label='التفاصيل' if lang=='ar' else 'Details'
            summary='<summary>'+title[0]+'<span class="seo-owner-details-label">'+label+'</span>'+chevron+'</summary>'
            answer=content.replace(title[0],'',1).replace(cta[0],'',1).strip()
            # Brand arrows are inline, inherit currentColor, and mirror in RTL.
            action=cta[0]
            action=re.sub(r'<svg\b[\s\S]*?</svg>','',action)
            action=action.replace('</span></span>','</span>'+arrow+'</span>',1)
            return '<article class="'+m[1]+'"><details class="seo-owner-accordion" open>'+summary+'<div class="seo-owner-answer">'+answer+'</div></details>'+action+'</article>'
        return re.sub(r'<article class="(seo-plan[^"]*)">([\s\S]*?)</article>',plan,block)
    section('seo-packages',plans)
    return page.replace('<!-- OWNER:SEO-2026-10-09 -->',marker+'<!-- OWNER:SEO-2026-10-09 -->',1)


def refine_seo_studio(page,lang='ar'):
    """SEO-only presentation hooks; preserve supplied copy and native controls.

    Every insertion checks its own class rather than relying only on the page
    marker. This keeps the transformation idempotent when the FAQ generator
    refreshes its block independently of the rest of the page.
    """
    marker='<!-- OWNER:SEO-STUDIO-2026-10-12 -->'
    if 'seo-service-page' not in page: return page

    def attr(tag,name,value):
        if re.search(r'\b'+re.escape(name)+r'(?:=|\s|>)',tag): return tag
        return tag[:-1]+' '+name+'="'+esc(value)+'">'

    def classes(tag,add=(),remove=()):
        def value(m):
            names=[n for n in m[1].split() if n not in remove]
            names.extend(n for n in add if n not in names)
            return 'class="'+' '.join(names)+'"'
        return re.sub(r'class="([^"]*)"',value,tag,count=1)

    def reveal(tag,kind='card'):
        return attr(tag,'data-seo-studio-reveal',kind)

    def index(n,cls='seo-studio-index'):
        return '<span class="'+cls+'" aria-hidden="true">'+f'{n:02d}'+'</span>'

    def icon(key):
        return iconly_svg(key,'seo-studio-icon')

    def section(id,fn):
        nonlocal page
        pattern=r'<section\b[^>]*id="'+re.escape(id)+r'"[\s\S]*?</section>'
        page,n=re.subn(pattern,lambda m:fn(m[0]),page,count=1)
        if n!=1: raise ValueError('Missing SEO studio section '+id)

    page=re.sub(r'<main\b[^>]*class="[^"]*\bseo-service-page\b[^"]*"[^>]*>',
                lambda m:classes(m[0],('rf-seo-studio',)),page,count=1)
    # Keep an existing content-hash stamp; the build's asset stamper owns it.
    if not re.search(r'<link\b[^>]*href="/assets/css/seo-studio-review\.min\.css(?:\?[^"\s]*)?"',page):
        css='<link href="/assets/css/seo-studio-review.min.css?v=0" rel="stylesheet" data-seo-studio-review>'
        page=page.replace('</head>','   '+css+'\n</head>',1)

    def hero(block):
        block=re.sub(r'<div\b[^>]*class="[^"]*\bseo-hero-card\b[^"]*"[^>]*>',
                     lambda m:classes(m[0],remove=('once-in',)),block,count=1)
        return re.sub(r'<div\b[^>]*class="(?:seo-hero-copy|seo-hero-visual)"[^>]*>',
                      lambda m:reveal(m[0],'hero'),block)
    page=re.sub(r'<section\b[^>]*class="[^"]*\bseo-hero-shell\b[^"]*"[^>]*>[\s\S]*?</section>',
                lambda m:hero(m[0]),page,count=1)

    def shots(block):
        chips=[('search','Google'),('location','Maps'),('chat','AI')]
        count=[0]
        def shot(m):
            count[0]+=1
            opening=reveal(m[1])
            if 'seo-studio-shot-head' in m[2]: return opening+m[2]+m[3]
            key,label=chips[count[0]-1]
            head='<div class="seo-studio-shot-head" aria-hidden="true">'+index(count[0])+icon(key)+'<span class="seo-studio-shot-label">'+label+'</span></div>'
            return opening+head+m[2]+m[3]
        block=re.sub(r'(<figure\b[^>]*class="seo-shot"[^>]*>)([\s\S]*?)(</figure>)',shot,block)
        if count[0]!=3: raise ValueError('Expected three SEO studio visibility shots')
        return block
    section('seo-why',shots)

    def know(block):
        keys=['search','activity','location','work','swap','chat','chart']
        count=[0]
        def card(m):
            count[0]+=1
            opening=reveal(m[1])
            if 'seo-studio-card-head' in m[2]: return opening+m[2]+m[3]
            number=re.search(r'<span class="seo-owner-number"[\s\S]*?</span>',m[2])
            if not number: raise ValueError('Missing SEO studio customer card number')
            copy=m[2].replace(number[0],'',1)
            head='<div class="seo-studio-card-head">'+index(count[0],'seo-owner-number seo-studio-index')+icon(keys[count[0]-1])+'</div>'
            return opening+head+'<div class="seo-studio-copy">'+copy+'</div>'+m[3]
        block=re.sub(r'(<li\b[^>]*>)([\s\S]*?)(</li>)',card,block)
        if count[0]!=7: raise ValueError('Expected seven SEO studio customer cards')
        return block
    section('seo-know',know)

    def services(block):
        keys=['discovery','location','setting','search','edit-square','chat','swap','buy','chart']
        count=[0]
        def card(m):
            count[0]+=1
            opening=reveal(m[1])
            content=m[2]
            if 'seo-studio-service-head' not in content:
                head='<div class="seo-studio-service-head">'+index(count[0])+icon(keys[count[0]-1])+'</div>'
                content=content.replace('<div class="seo-card-body">','<div class="seo-card-body">'+head,1)
            return opening+content+m[3]
        block=re.sub(r'(<article\b[^>]*class="seo-card"[^>]*>)([\s\S]*?)(</article>)',card,block)
        if count[0]!=9: raise ValueError('Expected nine SEO studio service cards')
        return block
    section('whats-included',services)

    def summary_icons(block,keys,art=False):
        count=[0]
        def summary(m):
            count[0]+=1
            key=keys[count[0]-1]
            return m[1]+(icon(key) if 'seo-studio-icon' not in m[2] else '')+m[2]+m[3]
        block=re.sub(r'(<summary\b[^>]*>)([\s\S]*?)(</summary>)',summary,block)
        if count[0]!=len(keys): raise ValueError('Unexpected SEO studio summary count')
        block=re.sub(r'<details\b[^>]*class="seo-tile seo-owner-accordion"[^>]*>',lambda m:reveal(m[0]),block)
        if art:
            count=[0]
            def answer(m):
                count[0]+=1
                if 'seo-studio-result-art' in m[2]: return m[0]
                key=keys[count[0]-1]
                drawing=('<div class="seo-studio-result-art seo-studio-result-art--'+key+'" aria-hidden="true">'
                         '<span class="seo-studio-art-orbit"></span>'
                         '<span class="seo-studio-art-dot"></span><span class="seo-studio-art-dot"></span><span class="seo-studio-art-dot"></span>'
                         '<span class="seo-studio-art-bars"><span class="seo-studio-art-bar"></span><span class="seo-studio-art-bar"></span><span class="seo-studio-art-bar"></span></span>'
                         '<span class="seo-studio-art-line"></span></div>')
                return m[1]+drawing+m[2]+m[3]
            block=re.sub(r'(<div class="seo-owner-answer">)([\s\S]*?)(</div>)',answer,block)
            if count[0]!=len(keys): raise ValueError('Unexpected SEO studio answer count')
        return block
    section('seo-why-zero2one',lambda b:summary_icons(b,['work','star','swap','location','tick-square','discovery']))

    def audience(block):
        count=[0]
        def summary(m):
            count[0]+=1
            return m[1]+(index(count[0]) if 'seo-studio-index' not in m[2] else '')+m[2]+m[3]
        block=re.sub(r'(<summary\b[^>]*>|<div class="seo-audience-heading">)([\s\S]*?)(</summary>|</div>)',summary,block)
        if count[0]!=6: raise ValueError('Expected six SEO studio audience cards')
        return re.sub(r'<(?:details|article)\b[^>]*class="seo-tile seo-owner-accordion[^\"]*"[^>]*>',lambda m:reveal(m[0]),block)
    section('seo-audience',audience)

    def plans(block):
        block=re.sub(r'<section\b[^>]*>',lambda m:classes(m[0],remove=('once-in',)),block,count=1)
        block=re.sub(r'<div\b[^>]*class="[^"]*\bflex-col\b[^"]*"[^>]*>',
                     lambda m:classes(m[0],remove=('fade-in','animate')),block)
        block=re.sub(r'<h2\b[^>]*class="case-overview-sub"[^>]*>',lambda m:reveal(m[0],'heading'),block,count=1)
        keys=['discovery','activity','chart','star']
        count=[0]
        def plan(m):
            count[0]+=1
            content=m[2]
            def summary(s):
                return s[1]+(icon(keys[count[0]-1]) if 'seo-studio-icon' not in s[2] else '')+s[2]+s[3]
            content=re.sub(r'(<summary\b[^>]*>)([\s\S]*?)(</summary>)',summary,content,count=1)
            return reveal(m[1])+content+m[3]
        block=re.sub(r'(<article\b[^>]*class="seo-plan[^"]*"[^>]*>)([\s\S]*?)(</article>)',plan,block)
        expected=3 if 'data-seo-package-edition=' in block else 4
        if count[0]!=expected: raise ValueError('Unexpected legacy/replacement SEO studio plan count')
        return block
    section('seo-packages',plans)

    def process(block):
        block=re.sub(r'<ol\b[^>]*class="seo-timeline"[^>]*>',lambda m:attr(m[0],'data-seo-studio-process',''),block,count=1)
        keys=['discovery','search','work','setting','activity','chart','swap']
        count=[0]
        def step(m):
            count[0]+=1
            content=m[2]
            if 'seo-studio-icon' not in content:
                content=icon(keys[count[0]-1])+content
            if count[0]==1 and 'seo-studio-process-line' not in content:
                # A decorative descendant keeps the ordered list at seven real
                # steps. CSS/JS can size this line to the whole timeline.
                content='<span class="seo-studio-process-line" aria-hidden="true"><span class="seo-studio-process-progress"></span></span>'+content
            return m[1]+content+m[3]
        block=re.sub(r'(<li\b[^>]*class="seo-timeline-item"[^>]*>)([\s\S]*?)(</li>)',step,block)
        if count[0]!=7: raise ValueError('Expected seven SEO studio process steps')
        return block
    section('seo-process',process)

    def expected(block):
        block=summary_icons(block,['activity','search','chat','chart','tick-square','work'],art=True)
        block=re.sub(r'<aside\b[^>]*class="seo-side"[^>]*>',lambda m:reveal(m[0]),block,count=1)
        # This existing screenshot is documented in PORTFOLIO_EVIDENCE.md,
        # page 9 of the owner's portfolio, and already used by its case study.
        if 'seo-studio-side-evidence' not in block and (ROOT/'assets/images/work/alostaz-search-console.webp').is_file():
            thumb=('<figure class="seo-studio-side-evidence" aria-hidden="true">'
                   '<img src="/assets/images/work/alostaz-search-console.webp" width="717" height="255" alt="" loading="lazy" decoding="async">'
                   '</figure>')
            block=re.sub(r'(<aside\b[^>]*class="seo-side"[^>]*>)',lambda m:m[1]+thumb,block,count=1)
        return block
    section('seo-expected',expected)

    def faq(block):
        return re.sub(r'<details\b[^>]*class="svc-faq-item"[^>]*>',lambda m:reveal(m[0]),block)
    section('faq',faq)

    ids=['seo-why','seo-know','whats-included','seo-why-zero2one','seo-audience','seo-packages','seo-process','seo-expected','faq']
    for n,id in enumerate(ids,1):
        def presentation(block,n=n,id=id):
            block=re.sub(r'<h2\b[^>]*class="[^"]*\bseo-sec-title\b[^"]*"[^>]*>',
                         lambda m:reveal(classes(m[0],remove=('fade-in','animate')),'heading'),block)
            if 'seo-studio-divider' not in block:
                divider=('<div class="seo-studio-divider" aria-hidden="true" data-seo-studio-reveal="divider">'
                         +index(n,'seo-studio-divider-index')+
                         '<span class="seo-studio-divider-line"></span><span class="seo-studio-divider-orbits">'
                         '<span class="seo-studio-divider-orbit"></span><span class="seo-studio-divider-orbit"></span><span class="seo-studio-divider-orbit"></span>'
                         '</span></div>')
                inner='container medium' if id=='seo-packages' else r'seo-sec-inner[^"]*'
                block,count=re.subn(r'(?=<div class="'+inner+r'">)',lambda _:divider,block,count=1)
                if count!=1: raise ValueError('Missing SEO studio divider anchor '+id)
            return block
        section(id,presentation)
    if marker not in page:
        page=page.replace('<!-- OWNER:SEO-COMPACT-2026-10-10 -->',marker+'<!-- OWNER:SEO-COMPACT-2026-10-10 -->',1)
    return page


def refine_seo_premium(page,lang):
    """Owner's split hero, supplied phone mockups and replaceable image slots."""
    def section(id,fn):
        nonlocal page
        page,n=re.subn(r'<section\b[^>]*id="'+re.escape(id)+r'"[\s\S]*?</section>',lambda m:fn(m[0]),page,count=1)
        if n!=1: raise ValueError('Missing premium SEO section '+id)
    def title(m):
        if 'seo-hero-title-primary' in m[2]: return m[0]
        primary,separator,secondary=m[2].partition(': ')
        if not separator: raise ValueError('Expected the approved two-part SEO title')
        primary=re.sub(r'\bSEO\b','<span class="seo-hero-title-accent">SEO</span>',primary,count=1)
        return m[1]+'<span class="seo-hero-title-primary">'+primary+'</span><span class="seo-hero-title-separator">:</span> <span class="seo-hero-title-secondary">'+secondary+'</span>'+m[3]
    page=re.sub(r'(<h1\b[^>]*class="seo-hero-title"[^>]*>)([\s\S]*?)(</h1>)',title,page,count=1)
    def phones(block):
        stems=['google-search','google-maps','chatgpt-search']
        labels=(['رقم ١ في بحث جوجل','رقم ١ في بحث خرائط جوجل','رقم ١ في بحث ChatGPT'] if lang=='ar' else
                ['#1 in Google Search','#1 in Google Maps Search','#1 in ChatGPT Search'])
        count=[0]
        def shot(m):
            i=count[0]; count[0]+=1
            content=m[2]
            content=re.sub(r'<figcaption class="seo-studio-shot-caption">[\s\S]*?</figcaption>','',content)
            directory='phone-mockups-ar-2026-10-14' if lang=='ar' else 'phone-mockups-2026-10-12'
            base='/assets/images/seo/'+directory+'/'+stems[i]
            height=1736 if lang=='ar' and i==0 else 1700
            alt=('تصوّر توضيحي للظهور في ' if lang=='ar' else 'Illustrative search visibility on ')+['Google Search','Google Maps','ChatGPT'][i]
            caption='<figcaption class="seo-studio-shot-caption"><span class="seo-studio-shot-rank" lang="'+lang+'" dir="'+('rtl' if lang=='ar' else 'ltr')+'">'+labels[i]+'</span></figcaption>'
            pic='<picture style="--seo-phone-ratio:1000 / '+str(height)+'"><img src="'+base+'-700.webp" srcset="'+', '.join(base+'-'+str(w)+'.webp '+str(w)+'w' for w in (400,700,1000))+'" sizes="(max-width:760px) 88vw, (max-width:1100px) 58vw, 31vw" width="1000" height="'+str(height)+'" alt="'+esc(alt)+'" loading="lazy" decoding="async"></picture>'
            content=re.sub(r'<picture\b[^>]*>[\s\S]*?</picture>',lambda _:caption+pic,content,count=1)
            return m[1]+content+m[3]
        block=re.sub(r'(<figure\b[^>]*class="seo-shot"[^>]*>)([\s\S]*?)(</figure>)',shot,block)
        if count[0]!=3: raise ValueError('Expected three supplied phone mockups')
        return block
    section('seo-why',phones)
    supplied=json.loads((ROOT/'assets/images/seo/illustrations-2026-10-13/provenance.json').read_text())['images']
    def illustration(group,stem):
        meta=next(i for i in supplied if i['group']==group and i['stem']==stem)
        base='/assets/images/seo/illustrations-2026-10-13/'+group+'/'+stem
        return '<figure class="seo-owner-illustration" data-seo-illustration="'+group+'/'+stem+'" aria-hidden="true"><img src="'+base+'.webp" srcset="'+base+'-320.webp 320w, '+base+'.webp '+str(meta['width'])+'w" sizes="(max-width:760px) 38vw, (max-width:1100px) 28vw, 22vw" width="'+str(meta['width'])+'" height="'+str(meta['height'])+'" alt="" loading="lazy" decoding="async"></figure>'
    def know(block):
        keys=['01_new_website_visibility','02_no_traffic_or_leads','03_missing_google_maps','04_competitors_dominating','05_algorithm_rankings_drop','06_ai_search_changes','07_high_ppc_cost']; count=[0]
        def card(m):
            i=count[0];count[0]+=1
            content=m[2]
            content=re.sub(r'<figure class="(?:seo-card-placeholder|seo-owner-illustration)[^"]*"[\s\S]*?</figure>','',content)
            content=content.replace('<div class="seo-studio-copy">',illustration('know',keys[i])+'<div class="seo-studio-copy">',1)
            return m[1]+content+m[3]
        block=re.sub(r'(<li\b[^>]*>)([\s\S]*?)(</li>)',card,block)
        if count[0]!=7: raise ValueError('Expected seven reserved customer image slots')
        return block
    section('seo-know',know)
    def covers(block,group,keys):
        count=[0]
        def summary(m):
            i=count[0];count[0]+=1
            content=re.sub(r'<figure class="(?:seo-card-placeholder|seo-owner-illustration)[^"]*"[\s\S]*?</figure>','',m[2])
            if 'seo-studio-summary-copy' not in content:
                content='<span class="seo-studio-summary-copy">'+content+'</span>'
            return m[1]+illustration(group,keys[i])+content+m[3]
        block=re.sub(r'(<summary\b[^>]*>|<div class="seo-audience-heading">)([\s\S]*?)(</summary>|</div>)',summary,block)
        if count[0]!=6: raise ValueError('Expected six image-led premium summaries')
        return block
    section('seo-why-zero2one',lambda b:covers(b,'why',['01_all_sectors','02_customer_retention','03_monthly_reports','04_saudi_market_strategy','05_safe_tools','06_research_and_development']))
    section('seo-audience',lambda b:covers(b,'audience',['03_new_websites','02_company_websites','01_ecommerce','06_digital_platforms','05_service_websites','04_local_businesses']))
    def audience_slider(block):
        if 'seo-audience-scroll' in block: return block
        title=re.search(r'<h2\b[^>]*>([\s\S]*?)</h2>',block)[1]
        label=esc(html.unescape(re.sub(r'<[^>]+>','',title)).strip())
        labels=['البطاقة السابقة','البطاقة التالية'] if lang=='ar' else ['Previous card','Next card']
        controls='<div class="rf-home-scroll-controls" hidden>'
        for direction,text in zip(('prev','next'),labels):
            controls+='<button type="button" data-home-scroll-'+direction+' aria-label="'+text+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>'
        controls+='</div>'
        def wrap(m):
            opening=m[1][:-1]+' data-home-scroll-track tabindex="0" role="region" aria-label="'+label+'">'
            return '<div class="seo-audience-scroll" data-home-scroll data-home-scroll-auto-height>'+opening+m[2]+'</div>'+controls+'</div>'
        block,n=re.subn(r'(<div class="seo-tiles[^\"]*"[^>]*>)([\s\S]*?</details>\s*)</div>(?=\s*<div class="seo-section-cta")',wrap,block,count=1)
        if n!=1: raise ValueError('Missing six-card SEO audience rail')
        return block
    section('seo-audience',audience_slider)
    def expanded_audience(block):
        block=block.replace(' data-seo-accordion','').replace(' data-home-scroll-auto-height','')
        def card(m):
            opening=m[1].replace('<details','<article',1).replace(' open','').replace('seo-tile seo-owner-accordion','seo-tile seo-owner-accordion seo-audience-card')
            content=m[2].replace('<summary>','<div class="seo-audience-heading">',1).replace('</summary>','</div>',1)
            content=re.sub(r'<svg class="seo-owner-chevron"[\s\S]*?</svg>','',content)
            return opening+content+'</article>'
        return re.sub(r'(<details\b[^>]*class="seo-tile seo-owner-accordion"[^>]*>)([\s\S]*?)</details>',card,block)
    section('seo-audience',expanded_audience)
    def expanded_packages(block):
        # Permanent content is not a disabled disclosure: use ordinary headings
        # and lists, so every detail remains available even without JavaScript.
        block=block.replace(' data-seo-accordion','')
        def card(m):
            content=m[2]
            if 'seo-plan-content' in content: return m[0]
            if content.count('<details')!=2 or content.count('</details>')!=2:
                raise ValueError('Expected the two existing package disclosures')
            content=re.sub(r'<details\b[^>]*class="seo-owner-accordion"[^>]*>','<div class="seo-plan-content">',content,count=1)
            content=content.replace('<summary>','<div class="seo-plan-heading">',1).replace('</summary>','</div>',1)
            content=content.replace('<span class="seo-owner-details-label">','<span class="seo-owner-details-label" hidden>',1)
            content=re.sub(r'<svg class="seo-owner-chevron"[\s\S]*?</svg>','',content,count=1)
            content=re.sub(r'<details\b[^>]*class="seo-plan-more"[^>]*>','<div class="seo-plan-more">',content,count=1)
            content=content.replace('<summary class="seo-plan-toggle">','<p class="seo-plan-toggle">',1).replace('</summary>','</p>',1)
            content=content.replace('</details>','</div>')
            return m[1]+content+m[3]
        block,n=re.subn(r'(<article\b[^>]*class="seo-plan[^\"]*"[^>]*>)([\s\S]*?)(</article>)',card,block)
        expected=3 if 'data-seo-package-edition=' in block else 4
        if n!=expected: raise ValueError('Unexpected permanently expanded SEO package count')
        return block
    section('seo-packages',expanded_packages)
    def package_slider(block):
        if 'seo-plans-scroll' in block: return block
        title='باقات تحسين محركات البحث' if lang=='ar' else 'SEO packages'
        labels=['الباقة السابقة','الباقة التالية'] if lang=='ar' else ['Previous package','Next package']
        controls='<div class="rf-home-scroll-controls" hidden>'
        for direction,label in zip(('prev','next'),labels):
            controls+='<button type="button" data-home-scroll-'+direction+' aria-label="'+label+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>'
        controls+='</div>'
        def wrap(m):
            opening=m[1][:-1]+' data-home-scroll-track tabindex="0" role="region" aria-label="'+title+'">'
            return '<div class="seo-plans-scroll" data-home-scroll data-home-scroll-always>'+opening+m[2]+'</div>'+controls+'</div>'
        block,n=re.subn(r'(<div class="seo-plans-grid"[^>]*>)([\s\S]*?</article>\s*)</div>(?=\s*<p class="seo-plans-note")',wrap,block,count=1)
        if n!=1: raise ValueError('Missing four-card SEO package rail')
        return block
    section('seo-packages',package_slider)
    # The Oct 16 owner-supplied comparison replaces package copy and the hidden
    # offer catalogue only; the surrounding SEO presentation stays untouched.
    from seo_packages import refine as refine_seo_packages
    page=refine_seo_packages(page,lang)
    # The owner confirmed Kerolos as the only SEO team member. Reuse his exact
    # existing bilingual profile; don't assign unrelated staff to the SEO team.
    cards=team_cards(lang,'seo-riyadh')
    card=re.search(r'<article class="testi-card team-card">([\s\S]*?)</article>',cards)
    if not card: raise ValueError('Missing confirmed SEO team profile')
    profile=card[1]
    image=re.search(r'<img\b[^>]*>',profile)[0]
    image=re.sub(r' sizes="[^"]*"',' sizes="(max-width:760px) 100px, 260px"',image)
    def field(cls): return re.search(r'<p class="'+cls+r'">([\s\S]*?)</p>',profile)[1]
    heading='تعرف على فريق متخصصين السيو' if lang=='ar' else 'Meet Our SEO Team'
    team='<!-- SEO-STUDIO:TEAM:BEGIN --><section class="section seo-sec seo-team" id="seo-team" data-scroll-section><div class="seo-studio-divider" aria-hidden="true" data-seo-studio-reveal="divider"><span class="seo-studio-divider-index">10</span><span class="seo-studio-divider-line"></span></div><div class="seo-sec-inner"><h2 class="seo-sec-title" data-seo-studio-reveal="heading">'+heading+'</h2><article class="seo-team-card" data-seo-studio-reveal="card"><div class="seo-team-photo">'+image+'</div><div class="seo-team-identity"><h3 class="seo-team-name">'+field('testi-name')+'</h3><p class="seo-team-role">'+field('testi-role')+'</p><p class="seo-team-experience">'+field('team-exp')+'</p></div><p class="seo-team-bio">'+field('testi-quote')+'</p></article></div></section><!-- SEO-STUDIO:TEAM:END -->'
    if '<!-- SEO-STUDIO:TEAM:BEGIN -->' in page:
        page=re.sub(r'<!-- SEO-STUDIO:TEAM:BEGIN -->[\s\S]*?<!-- SEO-STUDIO:TEAM:END -->',lambda _:team,page,count=1)
    else: page=page.replace('<!-- FAQ:END seo-riyadh -->','<!-- FAQ:END seo-riyadh -->\n'+team,1)
    # Broad scroll-drawn ribbon, with one clipped window per section palette.
    pattern=r'<section\b[^>]*class="[^"]*(?:seo-sec|seo-hero-shell|seo-plans)[^"]*"[^>]*>[\s\S]*?</section>'
    index=[0]
    def flow(m):
        i=index[0];index[0]+=1
        block=re.sub(r'<div class="seo-flow-trace"[\s\S]*?</div>', '', m[0])
        tone='light' if re.search(r'id="(?:seo-know|seo-why-zero2one|seo-process)"',m[0]) else 'orange'
        d='M 790 -80 C 790 50 160 20 210 210 C 235 360 835 130 810 340 C 765 520 -90 420 160 580 C 470 800 980 570 850 790 C 790 910 790 990 790 1080'
        gradient='seo-ribbon-'+lang+'-'+str(i)
        window='<div class="seo-flow-trace" data-seo-flow="'+str(i)+'" data-seo-flow-tone="'+tone+'" aria-hidden="true"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" focusable="false"><defs><linearGradient id="'+gradient+'" x1="0" y1="0" x2="1" y2="1"><stop class="seo-flow-bridge-top" offset="0"/><stop class="seo-flow-bridge-top-end" offset="0"/><stop class="seo-flow-start" offset=".01"/><stop class="seo-flow-end" offset=".99"/><stop class="seo-flow-bridge-bottom" offset="1"/><stop class="seo-flow-bridge-bottom-end" offset="1"/></linearGradient></defs><path class="seo-flow-ribbon" pathLength="1" stroke="url(#'+gradient+')" d="'+d+'"/></svg></div>'
        return re.sub(r'(<section\b[^>]*>)',lambda s:s[1]+window,block,count=1)
    page=re.sub(pattern,flow,page)
    if index[0]!=11: raise ValueError('Expected eleven connected SEO flow chapters')
    # Owner follow-up: retain the full confirmed profile in an HTML comment,
    # not a hidden/live section. Rebuilding first restores its canonical block
    # above, so this wrapper cannot nest or accidentally re-enable the team.
    page=re.sub(r'(<!-- SEO-STUDIO:TEAM:BEGIN -->)([\s\S]*?)(<!-- SEO-STUDIO:TEAM:END -->)',
                lambda m:m[1]+'<!-- SEO TEAM DISABLED:2026-10-16\n'+m[2]+'\n-->'+m[3],page,count=1)
    return page


def refine_about_interactions(page):
    """Keep process parents visible; native compact disclosures preserve all copy."""
    marker='<!-- OWNER:ABOUT-INTERACTIONS-2026-10-09 -->'
    if marker in page: return page
    page=re.sub(r'<div class="flex-col fade-in animate">(?=\s*<h2 class="case-overview-label">(?:كيف نعمل|How We Work)</h2>)',
                '<div class="flex-col rf-about-process">',page)
    def disclosure(m):
        content=m[1]
        title=re.search(r'<h3>[\s\S]*?</h3>',content)
        number=re.search(r'<span class="rf-about-card-number"[\s\S]*?</span>',content)
        if not title or not number: raise ValueError('Expected numbered About value card')
        answer=content.replace(title[0],'',1).replace(number[0],'',1).strip()
        chevron='<svg class="rf-about-value-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>'
        return '<details class="case-include-item rf-about-value" open><summary>'+number[0]+title[0]+chevron+'</summary><div class="rf-about-value-answer">'+answer+'</div></details>'
    page=re.sub(r'<div class="case-include-item">([\s\S]*?)</div>',disclosure,page)
    return page.replace('<!-- OWNER:ABOUT-2026-10-09 -->',marker+'<!-- OWNER:ABOUT-2026-10-09 -->',1)


def refine_about_owner(page,lang):
    """Owner's About-only review; preserve prose, metrics and original destinations."""
    marker='<!-- OWNER:ABOUT-2026-10-09 -->'
    if marker in page: return page
    def button(label,href,external=False):
        attrs=' target="_blank" rel="noopener"' if external else ''
        return '<div class="btn btn-normal service-card-btn rf-about-action"><a class="btn-click magnetic" data-strength="20" data-strength-text="10" href="'+href+'"'+attrs+'><div class="btn-fill"></div><span class="btn-text"><span class="btn-text-inner">'+label+'</span><svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg></span></a></div>'
    stats=re.search(r'<div class="about-stats">[\s\S]*?<div class="stat-description">[^<]*</div>\s*</div>\s*</div>',page)
    head=re.search(r'<div class="case-includes-head">[\s\S]*?</div>\s*<div class="stripe"></div>',page)
    if not stats or not head: raise ValueError('Expected original About stats and consultation block')
    label=re.search(r'<span class="btn-text-inner">([\s\S]*?)<div class="arrow">',head[0])[1].strip()
    href=re.search(r'<a href="([^"]+)"',head[0])[1]
    title=re.search(r'<h2\b[^>]*>[\s\S]*?</h2>',head[0])[0]
    page=page.replace(stats[0],'',1).replace(head[0],'<div class="case-includes-head">'+title+'</div>',1)
    wave='<div class="rf-about-wave" aria-hidden="true"><svg viewBox="0 0 1440 243.604" preserveAspectRatio="none"><path d="M0 -20H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z" /></svg></div>'
    band=marker+'<section class="section rf-about-counter-band" data-scroll-section>'+wave+'<div class="container"><div class="rf-about-counter-inner">'+stats[0].replace('class="about-stats"','class="about-stats stats animate"')+button(label,href,True)+'</div></div></section>'
    page=page.replace('<section class="section case-overview rf-about-values"',band+'<section class="section case-overview rf-about-values"',1)
    page=page.replace('class="section case-overview once-in"','class="section case-overview once-in rf-about-story"',1)
    count=[0]
    def numbered(m):
        count[0]+=1
        return m[0]+'<span class="rf-about-card-number" aria-hidden="true">'+str(count[0])+'</span>'
    page=re.sub(r'<div class="case-include-item">',numbered,page)
    page=page.replace('class="rf-step-card"','class="rf-step-card" data-about-step')
    def who(m):
        anchor=re.search(r'<a href="([^"]+)">([\s\S]*?)</a>',m[0])
        if not anchor: raise ValueError('Expected About audience contact link')
        content=m[0].replace(anchor[0],'').replace('class="flex-col"','class="flex-col rf-about-audience"',1)
        return content.replace('</p>','</p>'+button(anchor[2],anchor[1]),1)
    page=re.sub(r'<div class="flex-col">\s*<h2 class="case-overview-label">(?:مع من نعمل|Who We Work With)</h2>[\s\S]*?<p class="case-outcome">[\s\S]*?</p>\s*</div>',who,page)
    return page


def polish_iconly(page):
    """Update already-reviewed SEO pages without touching arrows or chevrons."""
    if 'class="seo-owner-icon"' not in page: return page
    icons=iter(['paper-plus','work','buy','category','setting','location'])
    page,count=re.subn(r'<svg\b[^>]*class="seo-owner-icon"[^>]*>[\s\S]*?</svg>',
                       lambda _:iconly_svg(next(icons),'seo-owner-icon'),page)
    if count!=6: raise ValueError('Expected six SEO audience icons')
    return page


def polish_chrome(page,lang):
    faq_label='كل الأسئلة الشائعة' if lang=='ar' else 'All FAQs'
    def navlist(m):
        block=m[0]
        label='خدماتنا' if lang=='ar' else 'Our Services'
        pattern=r'<li class="btn btn-link">\s*<a href="'+re.escape(local('/services/',lang))+r'"[\s\S]*?</a>\s*</li>'
        block=re.sub(pattern,lambda _:'<li class="rf-nav-services"><details><summary>'+label+'</summary>'+menu(lang)+'</details></li>',block)
        def contact(a):
            if re.search(r'تواصل معنا|Contact',a[0],re.I):
                return re.sub(r'href="[^"]*"','href="'+local('/contact/',lang)+'"',a[0],count=1).replace(' target="_blank"','')
            return a[0]
        block=re.sub(r'<a\b[^>]*>[\s\S]*?</a>',contact,block)
        if local('/faqs/',lang) not in block:
            link='<li class="btn btn-link rf-nav-faq"><a href="'+local('/faqs/',lang)+'" class="btn-click magnetic" data-strength="20" data-strength-text="10"><span class="btn-text"><span class="btn-text-inner">'+faq_label+'</span></span></a></li>'
            block=block.replace('</ul>',link+'</ul>')
        languages=re.findall(r'<li\b[^>]*class="[^"]*btn-lang[^"]*"[\s\S]*?</li>',block)
        for item in languages: block=block.replace(item,'',1)
        block=block.replace('</ul>',''.join(languages)+'</ul>')
        return block
    page=re.sub(r'<ul class="links-wrap">[\s\S]*?</ul>',navlist,page)
    # Sidebar is a direct destination; only the desktop navbar has a dropdown.
    before,marker,after=page.partition('<div class="main-wrap"')
    label='خدماتنا' if lang=='ar' else 'Our Services'
    direct='<li class="btn btn-link rf-sidebar-services"><a href="'+local('/services/',lang)+'" class="btn-click magnetic" data-strength="20" data-strength-text="10"><span class="btn-text"><span class="btn-text-inner">'+label+'</span></span></a></li>'
    before=re.sub(r'<li class="rf-nav-services"><details>[\s\S]*?</details></li>',lambda _:direct,before)
    page=before+marker+after
    def footerlinks(m):
        direct='<li class="btn btn-link rf-footer-services"><a href="'+local('/services/',lang)+'" class="btn-click magnetic" data-strength="20" data-strength-text="10"><span class="btn-text"><span class="btn-text-inner">'+label+'</span></span></a></li>'
        return re.sub(r'<li class="rf-nav-services"><details>[\s\S]*?</details></li>',lambda _:direct,m[0])
    page=re.sub(r'<div class="quick-links">[\s\S]*?</ul>',footerlinks,page)
    def faqcta(m):
        if 'btn-text' in m[0]: return m[0]
        return m[0].replace('class="faq-cta-button"','class="faq-cta-button btn-click magnetic" data-strength="20" data-strength-text="10"').replace('>'+m[1]+'</a>','><div class="btn-fill"></div><span class="btn-text"><span class="btn-text-inner">'+m[1]+'</span></span></a>')
    page=re.sub(r'<a[^>]*class="faq-cta-button"[^>]*>([^<]+)</a>',faqcta,page)
    return polish_iconly(re.sub(r'[ \t]+(?=\n)', '', page))


def build(check=False):
    changed=[]
    for route in ROUTES:
        for lang in ('en','ar'):
            p=ROOT/(local(route,lang).strip('/')+'/index.html' if route!='/' or lang=='ar' else 'index.html')
            result=polish_chrome(render_page(route,lang),lang)
            # Reuse content hashes from existing build stamps; build.sh restamps later.
            # stamp_assets' CLI owns stamping; avoid assumptions about its function API.
            if not p.exists() or p.read_text()!=result:
                changed.append(str(p.relative_to(ROOT)))
                if not check:
                    p.parent.mkdir(parents=True,exist_ok=True); p.write_text(result)
    for route in ('/about/','/services/seo-riyadh/'):
        for lang in ('en','ar'):
            p=ROOT/(local(route,lang).strip('/')+'/index.html')
            cur=p.read_text(); new=polish_chrome(decorate_existing(cur,route,lang),lang)
            if new!=cur:
                changed.append(str(p.relative_to(ROOT)))
                if not check: p.write_text(new)
    # Existing case/contact pages share navigation but are not reauthored here.
    for p in ROOT.rglob('index.html'):
        rel=p.relative_to(ROOT)
        if rel.parts[0] in ('blog','node_modules','.git','tools'): continue
        cur=p.read_text(); new=polish_chrome(cur,'ar' if rel.parts[0]=='ar' else 'en')
        if new!=cur:
            changed.append(str(rel))
            if not check: p.write_text(new)
    return changed


if __name__=='__main__':
    changed=build('--check' in sys.argv)
    if '--check' not in sys.argv:
        from service_studio import write_manifest
        write_manifest()
        # Stable per-ID coverage, including explicitly held/excluded copy.
        coverage={r['id']:r for r in REPORT}
        (DATA/'copy-manifest.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2))
        (DATA/'coverage.json').write_text(json.dumps(list(coverage.values()),ensure_ascii=False,indent=2))
        (DATA/'pending.json').write_text(json.dumps(list({r['id']:r for r in BLOCKED}.values()),ensure_ascii=False,indent=2))
    print('Refresh pages:',len(changed),'changed; no deployment performed.')
    if '--check' in sys.argv and changed: sys.exit(1)
