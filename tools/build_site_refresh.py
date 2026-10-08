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

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'tools/refresh'
DOCS = json.loads((DATA / 'content-sources.json').read_text())['documents']
LEGACY = json.loads((DATA / 'legacy-blocks.json').read_text())
PROTECTED = json.loads((DATA / 'protected-design.json').read_text())
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


def paras(row):
    return [dict(p, id=f'{row}:{i}') for i, p in enumerate(DOCS[str(row)]['paragraphs'])]


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
        or t.startswith(('Slider cards (', 'شرائح السلايدر ('))):
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
        elif re.search(r'Second button|الزر الثاني', instruction, re.I): href = local('/work/', lang)
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
        'web-design-riyadh':[3,7,8,9,10], 'ecommerce-development':[3,7,8,9,10],
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
    return bool(re.search(r'How We Work|آلية عملنا|كيف نعمل|موقعك من الفكرة', t, re.I))


def render_block(heading, items, n, lang, slug):
    title = clean(heading)
    h = textnode(heading, 'h2')
    lead, cards = groups(items)
    intro = ''.join(paragraph(p, lang) for p in lead)
    isfaq = bool(re.search(r'FAQs|أسئلة', title, re.I))
    team = bool(re.search(r'Meet Our|Who.s Behind|تعرف على فريق|من يقف خلف', title, re.I))
    logos = bool(re.search(r'Clients.*Success|Clients We|عملاؤنا|عملاء أطلقنا', title, re.I))
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
                           '<span aria-hidden="true">+</span></summary><div class="rf-answer">'+
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
            if re.match(r'^\[(?:Main button|Second button|Button|الزر|زر)',clean(p)):
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
    for n,(h,items) in enumerate(chunks,1): body += render_block(h,items,n,lang,slug)
    return body, ps[1]['text'].split(':',1)[1].strip(), ps[2]['text'].split(':',1)[1].strip()


def home_faq(lang):
    src=LEGACY[lang]['faq']
    src=re.sub(r'<li class="faq-item">\s*<h3 class="faq-q">([\s\S]*?)</h3>\s*<p class="faq-a">([\s\S]*?)</p>\s*</li>',
               r'<li><details class="rf-faq-item"><summary><h3>\1</h3><span aria-hidden="true">+</span></summary><div class="rf-answer"><p>\2</p></div></details></li>',src)
    return src.replace('section faq-section','section faq-section rf-existing-faq')


def home_body(lang):
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
    for i in range(5): bento.append('<article class="rf-card" data-rf-reveal>'+p(cstart+i*2,'h3')+p(cstart+i*2+1)+'</article>')
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
    # Only the actual published local article is linked; no invented blog cards.
    blogfile=ROOT/('blog/ar/how-to-choose-web-development-company/index.html' if ar else 'blog/how-to-choose-web-development-company/index.html')
    blogcard=''
    if blogfile.exists():
        bloghtml=blogfile.read_text(); title=re.search(r'<h1[^>]*>([\s\S]*?)</h1>',bloghtml)
        if title: blogcard=f'<a class="rf-blog-card" href="{local("/blog/how-to-choose-web-development-company/",lang).replace("/ar/blog/","/blog/ar/")}" data-barba-prevent><span aria-hidden="true">↗</span><h3>{title.group(1)}</h3></a>'
    body+=section(p(94 if ar else 82,'h2'),p(95 if ar else 83)+blogcard+a(96 if ar else 84, '/blog/ar/' if ar else '/blog/'),8,'blog')
    body+=section(p(98 if ar else 85,'h2'),p(99 if ar else 86)+a(100 if ar else 87),9,'closing')
    for q in ps:
        if not any(r['id']==q['id'] for r in REPORT):
            if not authoring(q): record(q,'authoring','Document section label; not customer copy')
    return body


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
        source=home_body(lang)
        body=re.search(r'<section class="rf-section[^>]*id="services"[\s\S]*?</section>',source).group(0)
        body=body.replace(textnode(h,'h2'),textnode(h,'h1',id='main-content',tabindex='-1'),1)
        # Add the dedicated Google Ads page to the catalogue using its own supplied copy.
        ad=paras(12 if ar else 13)
        card='<article class="rf-service-card"><div class="rf-service-image"><img src="/assets/images/service-3-640.webp" width="640" height="640" alt="" loading="lazy"></div><div class="rf-service-content">'+textnode(ad[3],'h3')+textnode(ad[4])+action(ad[7 if ar else 6],lang,local('/services/manage-google-adwords-campaigns/',lang))+'</div></article>'
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
            spec=SERVICES[slug]; ps=paras(spec[1 if lang=='ar' else 0]); a=next(i for i,p in enumerate(ps) if p['style']=='HEADING_2' and re.search(r'FAQs|أسئلة',p['text']))
            block=render_block(ps[a],ps[a+1:],n,lang,slug).replace('id="faq"',f'id="faq-{slug}"')
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
    if route=='/': page=page.replace('class="main home"','class="main home rf-page"').replace('class="main"','class="main home rf-page"')
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
    page=page.replace('<div class="main-wrap" data-scroll-container>','<div class="main-wrap" data-scroll-container>')
    from stamp_assets import STAMPED, digest
    page=STAMPED.sub(lambda m:f'{m["attr"]}="{m["path"]}?v={digest(m["path"]) or m["stamp"]}"',page)
    return re.sub(r'[ \t]+(?=\n)', '', page)


def manages(route): return route in ROUTES


def decorate_existing(page, route, lang):
    """Idempotent additions to original SEO/About pages. Protected heroes untouched."""
    if route=='/services/seo-riyadh/':
        page=page.replace('class="main seo-service-page"','class="main seo-service-page rf-seo-page"',1)
        a='<!-- REFRESH:SEO-TEAM:BEGIN -->'; z='<!-- REFRESH:SEO-TEAM:END -->'
        heading=paras(4)[106 if lang=='ar' else 227]
        block=a+'<section class="section seo-sec rf-seo-team" data-scroll-section><div class="seo-sec-inner">'+textnode(heading,'h2','seo-sec-title')+team_cards(lang,'seo-riyadh')+'</div></section>'+z
        if a in page: page=re.sub(re.escape(a)+r'[\s\S]*?'+re.escape(z),lambda _:block,page)
        else: page=page.replace('<!-- CLIENTS:BEGIN',block+'\n<!-- CLIENTS:BEGIN',1)
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
    title=clean(paras(2)[75]) if lang=='en' else re.search(r'<h2 class="team-title">([\s\S]*?)</h2>',LEGACY[lang]['team']).group(1)
    title2='عملاؤنا في النجاح' if lang=='ar' else 'Our Clients in Success'
    block=a+'<section class="section rf-about-team" data-scroll-section><div class="container medium"><h2>'+esc(title)+'</h2>'+team_cards(lang)+f'<a class="rf-button magnetic" data-strength="20" href="{local("/team/",lang)}">'+('تعرّف على فريقنا' if lang=='ar' else 'Meet Our Team')+'</a></div></section>'+clients('<h2>'+title2+'</h2>',lang,7)+z
    if a in page: page=re.sub(re.escape(a)+r'[\s\S]*?'+re.escape(z),lambda _:block,page)
    else: page=page.replace('<!-- REFRESH:ABOUT -->',block+'<!-- REFRESH:ABOUT -->')
    return page


def build(check=False):
    changed=[]
    for route in ROUTES:
        for lang in ('en','ar'):
            p=ROOT/(local(route,lang).strip('/')+'/index.html' if route!='/' or lang=='ar' else 'index.html')
            result=render_page(route,lang)
            # Reuse content hashes from existing build stamps; build.sh restamps later.
            # stamp_assets' CLI owns stamping; avoid assumptions about its function API.
            if not p.exists() or p.read_text()!=result:
                changed.append(str(p.relative_to(ROOT)))
                if not check:
                    p.parent.mkdir(parents=True,exist_ok=True); p.write_text(result)
    for route in ('/about/','/services/seo-riyadh/'):
        for lang in ('en','ar'):
            p=ROOT/(local(route,lang).strip('/')+'/index.html')
            cur=p.read_text(); new=decorate_existing(cur,route,lang)
            if new!=cur:
                changed.append(str(p.relative_to(ROOT)))
                if not check: p.write_text(new)
    return changed


if __name__=='__main__':
    changed=build('--check' in sys.argv)
    if '--check' not in sys.argv:
        # Stable per-ID coverage, including explicitly held/excluded copy.
        coverage={r['id']:r for r in REPORT}
        (DATA/'copy-manifest.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2))
        (DATA/'coverage.json').write_text(json.dumps(list(coverage.values()),ensure_ascii=False,indent=2))
        (DATA/'pending.json').write_text(json.dumps(list({r['id']:r for r in BLOCKED}.values()),ensure_ascii=False,indent=2))
    print('Refresh pages:',len(changed),'changed; no deployment performed.')
    if '--check' in sys.argv and changed: sys.exit(1)
