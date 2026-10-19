"""Presentation-only service family based on the approved SEO studio.

The existing independent bilingual pages remain the content source. This adapter
never creates claims, package contents, prices, people or destinations.
"""
from html.parser import HTMLParser
from pathlib import Path
import html
import json
import re
import unicodedata
from iconly_icons import iconly_svg

ROOT = Path(__file__).resolve().parent.parent
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
SLUGS = ['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting']
ICONS = ['discovery','search','category','chart','setting','chat','work','tick-square','activity']
PHOTOS = {'web-design-riyadh':'web','digital-advertising':'ads','seo-riyadh':'seo'}
SLOTS = {}
WEB_ART = json.loads((ROOT/'tools/refresh/web-design-illustrations.json').read_text())['entries']
OWNER_ART = json.loads((ROOT/'tools/refresh/owner-service-illustrations.json').read_text())
OWNER_ENTRIES = {entry['id']:entry for entry in OWNER_ART['entries']}


def image_title(text):
    return re.sub(r'\s+',' ',unicodedata.normalize('NFC',text)).strip()


OWNER_BINDINGS = {(b['service'],b['lang'],b['kind'],image_title(b['title'])):b for b in OWNER_ART['bindings']}
OWNER_SERVICES = {b['service'] for b in OWNER_ART['bindings']}


class Node:
    def __init__(self, tag, attrs=None, children=None):
        self.tag, self.attrs, self.children, self.parent = tag, dict(attrs or {}), [], None
        self.set(children or [])

    def set(self, children):
        for child in self.children:
            if isinstance(child, Node): child.parent = None
        self.children = []
        for child in list(children): self.append(child)
        return self

    def append(self, child):
        if isinstance(child, Node):
            child.detach(); child.parent = self
        self.children.append(child)
        return child

    def detach(self):
        if self.parent and self in self.parent.children: self.parent.children.remove(self)
        self.parent = None
        return self

    def replace(self, new):
        parent = self.parent
        if parent:
            index = parent.children.index(self); self.detach(); new.detach()
            parent.children.insert(index,new); new.parent = parent
        return new

    def has(self, cls): return cls in self.attrs.get('class','').split()
    def add(self, *classes):
        self.attrs['class'] = ' '.join(dict.fromkeys(self.attrs.get('class','').split()+list(classes)))
        return self
    def walk(self):
        for child in list(self.children):
            if isinstance(child, Node):
                yield child
                yield from child.walk()
    def first(self, test): return next((n for n in self.walk() if test(n)),None)
    def text(self): return html.unescape(''.join(c.text() if isinstance(c,Node) else c for c in self.children))
    def render(self):
        attrs = ''.join(' '+key+(('="'+html.escape(value,quote=True)+'"') if value is not None else '') for key,value in self.attrs.items())
        start = '<'+self.tag+attrs+'>' if self.tag else ''
        return start+('' if self.tag in VOID else ''.join(c.render() if isinstance(c,Node) else c for c in self.children)+('</'+self.tag+'>' if self.tag else ''))


class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.root = Node(''); self.stack = [self.root]; self.feed(source)
    def handle_starttag(self, tag, attrs):
        node = self.stack[-1].append(Node(tag,attrs))
        if tag not in VOID: self.stack.append(node)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag == tag:
                self.stack = self.stack[:i]; break
    def handle_data(self, data): self.stack[-1].children.append(data)
    def handle_entityref(self, name): self.handle_data('&'+name+';')
    def handle_charref(self, name): self.handle_data('&#'+name+';')
    def handle_comment(self, data): self.handle_data('<!--'+data+'-->')


def n(tag, cls='', children=None, **attrs):
    return Node(tag,{'class':cls,**{key.replace('_','-'):value for key,value in attrs.items()}},children)


def icon(key): return iconly_svg(key,'service-studio-icon')
def reveal(node, kind='card'):
    node.attrs['data-seo-studio-reveal'] = kind
    return node


def button(anchor, secondary=False):
    label = anchor.first(lambda e:e.has('btn-text-inner'))
    children = list(label.children if label else anchor.children)
    anchor.attrs.update({'class':'btn-click magnetic service-studio-link','data-strength':'20','data-strength-text':'10'})
    arrow = '<svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>'
    anchor.set([n('div','btn-fill'),n('span','btn-text',[n('span','btn-text-inner',children),arrow])])
    return n('div','btn btn-normal service-studio-action'+(' service-studio-action--secondary' if secondary else ''),[anchor])


def photo(slug, hero=False):
    stem = PHOTOS.get(slug,slug)
    base = '/assets/images/owner-services-2026-10/'+stem
    attrs = {'src':base+('.webp' if slug in PHOTOS else '-800.webp'),'width':'1440','height':'1024','alt':'','decoding':'async'}
    if slug not in PHOTOS:
        attrs.update({'srcset':', '.join(base+'-'+str(w)+'.webp '+str(w)+'w' for w in (480,800,1440)),'sizes':'(max-width:760px) 92vw, 46vw'})
    attrs.update({'fetchpriority':'high'} if hero else {'loading':'lazy'})
    return Node('img',attrs)


def art(slug, kind, index, title, lang):
    if slug=='web-design-riyadh' and kind in ('benefits','know','deliverables','types','why','audience'):
        # Independent English copy puts language support before the CRM card.
        # Keep the supplied artwork (and its slot) tied to its meaning.
        ordinal = {6:7,7:6}.get(index,index) if kind=='deliverables' and lang=='en' else index
        entry = next(e for e in WEB_ART if e['kind']==kind and e['number']==ordinal+1)
        slot = slug+'/'+kind+'/'+str(entry['number']).zfill(2)
        base = entry['outputs'][1]['url']
        record = SLOTS.setdefault(slot,{'owner_supplied':True,'images':{},'titles':{}})
        record['titles'][lang]=title.strip(); record['images'][lang]=base
        return n('figure','service-studio-art seo-owner-illustration',[
            Node('img',{'src':base,'srcset':', '.join(o['url']+' '+str(o['width'])+'w' for o in entry['outputs']),
                        'sizes':'(min-width:761px) 215px, 195px','width':str(entry['width']),'height':str(entry['height']),
                        'alt':'','loading':'lazy','decoding':'async'}),
        ],aria_hidden='true',data_service_image_slot=slot,data_owner_web_art='true')
    if slug in OWNER_SERVICES:
        binding = OWNER_BINDINGS[(slug,lang,kind,image_title(title))]
        if binding['position']!=index+1:
            raise ValueError('Owner image binding position changed: '+slug+' '+lang+' '+title)
        entry = OWNER_ENTRIES[binding['image']]
        slot = slug+'/'+kind+'/'+str(index+1).zfill(2)
        base = entry['outputs'][1]['url']
        record = SLOTS.setdefault(slot,{'owner_supplied':True,'images':{},'titles':{}})
        record['titles'][lang]=title.strip();record['images'][lang]=base
        return n('figure','service-studio-art seo-owner-illustration',[
            Node('img',{'src':base,'srcset':', '.join(o['url']+' '+str(o['width'])+'w' for o in entry['outputs']),
                        'sizes':'(min-width:761px) 215px, 195px','width':str(entry['width']),'height':str(entry['height']),
                        'alt':'','loading':'lazy','decoding':'async'}),
        ],aria_hidden='true',data_service_image_slot=slot,data_owner_service_image=entry['id'])
    slot = slug+'/'+kind+'/'+str(index+1).zfill(2)
    key = ICONS[(index+['benefits','know','deliverables','why','audience','outcomes'].index(kind))%len(ICONS)]
    base = '/assets/images/service-studio/placeholders/'+slug+'-'+key+'.svg'
    SLOTS.setdefault(slot,{'temporary':base,'titles':{}})['titles'][lang] = title.strip()
    return n('figure','service-studio-art seo-owner-illustration',[
        Node('img',{'src':base,'width':'640','height':'420','alt':'','loading':'lazy','decoding':'async'}),
    ],aria_hidden='true',data_service_image_slot=slot,data_temporary_image='true')


def divider(index):
    return reveal(n('div','service-studio-divider',[
        n('span','service-studio-index',[f'{index:02d}']),n('span','service-studio-divider-line seo-studio-divider-line'),
        n('span','service-studio-divider-dots',['<i></i><i></i><i></i>'])
    ],aria_hidden='true'),'divider')


def wave(edge):
    return n('div','service-studio-wave seo-owner-wave--'+edge,[
        '<svg viewBox="0 -20 1440 243.604" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M0 -20H1440V28.6036C1264.45 46.0335 1058.46 150.417 687.43 46.3562C317.5 -57.3952 153.84 43.218 0 58.6036Z"/></svg>'
    ],aria_hidden='true')


def flow(index, lang, tone):
    ident = 'service-flow-'+lang+'-'+str(index)
    stops = ''.join('<stop offset="'+offset+'"/>' for offset in ('0','0','.01','.99','1','1'))
    return n('div','seo-flow-trace',[
        '<svg viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" focusable="false"><defs><linearGradient id="'+ident+'">'+stops+'</linearGradient></defs><path class="seo-flow-ribbon" pathLength="1" stroke="url(#'+ident+')" d="M 730 0 C 730 180 200 240 500 500 C 800 760 450 840 600 1000"/></svg>'
    ],data_seo_flow=str(index),data_seo_flow_tone=tone,aria_hidden='true')


def rail(grid, lang, label, always=False):
    grid.attrs.update({'data-home-scroll-track':None,'tabindex':'0','role':'region','aria-label':label})
    grid.add('service-studio-track')
    labels = ['البطاقة السابقة','البطاقة التالية'] if lang=='ar' else ['Previous card','Next card']
    controls = n('div','rf-home-scroll-controls',hidden=None)
    for direction,label in zip(('prev','next'),labels):
        control = n('button','',[
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
        ],type='button',aria_label=label)
        control.attrs['data-home-scroll-'+direction] = None
        controls.append(control)
    wrapper=n('div','service-studio-rail',[grid,controls],data_home_scroll=None)
    if always:wrapper.attrs['data-home-scroll-always']=None
    return wrapper


def section_kind(section, index):
    title = section.first(lambda e:e.tag=='h2')
    text = title.text() if title else ''
    if index==1: return 'benefits'
    if index==2: return 'know'
    if section.has('rf-process'): return 'process'
    if section.has('rf-packages'): return 'packages'
    if section.has('rf-team'): return 'team'
    if section.has('rf-clients'): return 'clients'
    if section.has('rf-faq'): return 'faq'
    if re.search(r'Programming Technologies We Work With|اللغات البرمجية التي نعمل بها',text,re.I): return 'technologies'
    # New source documents insert callouts and additional sections. Semantic
    # roles must not shift just because the source's section count changes.
    if re.search(r'هل تناسب|لمن |Is .*Right|Are .*Right|Who .*For|Who Are',text,re.I): return 'audience'
    if re.search(r'Why .*Zero|Why Merchants|لماذا شركة|لماذا يختار|ليش تختار|لماذا.*من الصفر|Why Choose',text,re.I): return 'why'
    if re.search(r'النتائج المتوقعة|أرقامنا|ما يمكنك|ماذا توقع|ماذا يتغير|حضورك على|Expected|What Changes|Your Social Media Presence|Our Numbers',text,re.I): return 'outcomes'
    if text=='Our Social Media Management Process': return 'deliverables'
    if index==3 and section.first(lambda e:e.has('rf-card-grid')): return 'deliverables'
    if index==3 and not text.startswith('Relax.'): return 'deliverables'
    return 'extra'


def refine(page, slug, lang):
    start = re.search(r'<main\b[^>]*>',page)
    end = page.index('</main>',start.end())+len('</main>')
    main = Tree(page[start.start():end]).root.first(lambda e:e.tag=='main')
    main.attrs['class'] = ' '.join(c for c in main.attrs.get('class','').split() if c!='rf-brand-owner')
    main.add('rf-service-studio'); main.attrs['data-studio-service'] = slug
    catalogue = slug=='catalogue'
    for node in main.walk():
        for attr in ('data-rf-reveal','data-about-step','data-reveal-scope','data-brand-disclosures','data-brand-compact'):
            node.attrs.pop(attr,None)
    h1 = main.first(lambda e:e.tag=='h1')
    if not h1: raise ValueError('Service page is missing its H1: '+slug)
    if not catalogue:
        lead = main.first(lambda e:e.has('rf-preserved-hero-lead'))
        old_hero = main.first(lambda e:e.has('rf-hero'))
        source = lead.first(lambda e:e.has('rf-inner')) if lead else old_hero.first(lambda e:e.has('rf-hero-copy'))
        if not source: raise ValueError('Missing independent service hero copy: '+slug)
        paragraphs = [e for e in source.walk() if e.tag=='p' and 'data-copy' in e.attrs]
        actions = [e for e in source.walk() if e.tag=='a']
        if not actions: raise ValueError('Missing approved hero action: '+slug)
        h1.detach(); h1.add('service-studio-title')
        words = h1.text()
        split = words.find(':')+1 if ':' in words else (words.find('،')+1 if '،' in words else 0)
        if split<8 or split>len(words)*.65:
            matches = list(re.finditer(r'\S+',words)); split=matches[min(4,max(1,len(matches)//3))-1].end()
        h1.set([n('span','service-studio-title-primary',[html.escape(words[:split])]),' ',n('span','service-studio-title-secondary',[html.escape(words[split:].lstrip())])])
        copy = reveal(n('div','service-studio-hero-copy',[h1]+paragraphs+[n('div','service-studio-actions',[button(a,i>0) for i,a in enumerate(actions)])]),'hero')
        visual = reveal(n('figure','service-studio-hero-art',[photo(slug,True)],aria_hidden='true',data_service_image_slot=slug+'/hero'),'hero')
        hero = n('section','service-studio-hero',[flow(0,lang,'orange'),n('div','service-studio-inner service-studio-hero-grid',[copy,visual])],data_scroll_section=None)
        if lead:
            header = main.first(lambda e:e.tag=='header' and e.has('case-header'))
            nav = header.first(lambda e:e.has('nav-bar'))
            if not nav: raise ValueError('Missing original navbar')
            header.set([nav]); lead.replace(hero)
        else: old_hero.replace(hero)
    sections = [e for e in main.walk() if e.has('rf-section')]
    for index,section in enumerate(sections,1):
        if catalogue:
            section.add('service-studio-catalogue'); section.attrs['data-seo-flow-scope']='true'
            title = section.first(lambda e:e.tag=='h1'); reveal(title,'heading')
            grid = section.first(lambda e:e.has('rf-services-grid')); grid.add('service-studio-catalogue-grid')
            for card in [e for e in grid.children if isinstance(e,Node) and e.has('rf-service-card')]:
                card.add('service-studio-card','service-card','catalogue-home-card'); reveal(card)
                link = card.first(lambda e:e.tag=='a'); key=link.attrs['href'].rstrip('/').split('/')[-1]
                image=card.first(lambda e:e.tag=='img')
                if key in SLUGS or key=='seo-riyadh': image.replace(photo(key))
                media=card.first(lambda e:e.has('rf-service-image'))
                media.add('service-card-media');media.append(n('span','service-card-tint',aria_hidden='true'))
                content=card.first(lambda e:e.has('rf-service-content'));content.add('service-card-body')
                card.first(lambda e:e.tag=='h2').add('service-card-title')
                for paragraph in content.children:
                    if isinstance(paragraph,Node) and paragraph.tag=='p':paragraph.add('service-card-text')
                parent=link.parent;position=parent.children.index(link)
                replacement=n('div','service-studio-actions',[button(link)])
                parent.children.insert(position,replacement);replacement.parent=parent
            continue
        kind = section_kind(section,index)
        section.add('service-studio-section','service-studio-'+kind)
        section.attrs['data-service-stage']=kind
        # Supersede old brand-only decoration while keeping its content/photos.
        for old in list(section.walk()):
            if old.has('brand-owner-wave'): old.detach()
        inner = section.first(lambda e:e.has('rf-inner')); inner.add('service-studio-inner')
        heading = inner.first(lambda e:e.has('rf-section-heading'))
        if heading:
            old_index=heading.first(lambda e:e.has('rf-index'))
            if old_index: old_index.detach()
            title=heading.first(lambda e:e.tag=='h2')
            if title: reveal(title,'heading')
        inner.children.insert(0,divider(index)); inner.children[0].parent=inner
        tone='orange'
        if kind in ('know','process','clients'):
            section.add('service-studio-orange'); tone='light'
        elif kind in ('why',) or kind=='extra' and index>7:
            section.add('service-studio-ink'); tone='light'
        else: section.add('service-studio-paper')
        if kind in ('know','process','why','clients'):
            section.append(wave('bottom')); section.children.insert(0,wave('top')); section.children[0].parent=section
        section.children.insert(0,flow(index,lang,tone)); section.children[0].parent=section
        title_text=section.first(lambda e:e.tag=='h2').text()
        cards=[]; grid=None
        if kind=='benefits':
            grid=section.first(lambda e:e.has('brand-owner-pillar-grid'))
            if grid: cards=[e for e in grid.children if isinstance(e,Node) and e.tag=='article']
            else:
                prose=section.first(lambda e:e.has('rf-prose'))
                supplied=prose.first(lambda e:e.tag=='p' and 'data-copy' in e.attrs) if prose else None
                if supplied:
                    labels=[t.strip() for t in re.split(r'\t+|\s{2,}',supplied.text()) if t.strip()]
                    if len(labels)!=3: raise ValueError('Expected three approved benefit labels: '+slug+' '+lang)
                    grid=Node('div',{'class':'service-studio-grid','data-copy':supplied.attrs['data-copy']})
                    for label in labels:
                        if grid.children:grid.append(' ')
                        grid.append(n('article','service-studio-card',[n('h3','',[html.escape(label)],lang='en',dir='ltr')]))
                    supplied.replace(grid)
                    cards=[e for e in grid.children if isinstance(e,Node)]
        elif kind=='know':
            grid=section.first(lambda e:e.has('brand-owner-know-grid'))
            if grid: cards=[e for e in grid.children if isinstance(e,Node) and e.tag=='article']
            else:
                prose=section.first(lambda e:e.has('rf-prose'))
                if prose:
                    paragraphs=[e for e in list(prose.children) if isinstance(e,Node) and e.tag=='p']
                    grid=n('div','service-studio-grid')
                    for paragraph in paragraphs: grid.append(n('article','service-studio-card',[paragraph]))
                    prose.replace(grid);cards=[e for e in grid.children if isinstance(e,Node)]
        else:
            grid=section.first(lambda e:e.has('rf-card-grid') or e.has('brand-owner-disclosure-grid') or e.has('brand-owner-proof-grid') or e.has('brand-owner-audience-grid'))
            if grid: cards=[e for e in grid.children if isinstance(e,Node) and e.tag in ('article','details')]
        if grid and cards:
            grid.add('service-studio-grid')
            for i,card in enumerate(cards):
                # Flatten the old brand disclosure into the same source title
                # and answer nodes before choosing the new native presentation.
                old_summary=card.first(lambda e:e.tag=='summary') if card.tag=='details' else None
                if old_summary:
                    head=old_summary.first(lambda e:e.tag=='h3')
                    answer=card.first(lambda e:e.has('brand-owner-answer'))
                    card.set(([head] if head else [])+list(answer.children if answer else []))
                    card.tag='article';card.attrs.pop('name',None);card.attrs.pop('open',None)
                for old in list(card.walk()):
                    if old.attrs.get('aria-hidden')=='true' and old.tag!='picture': old.detach()
                card.attrs['class']='service-studio-card';reveal(card)
                title=card.first(lambda e:e.tag=='h3')
                existing_picture=card.first(lambda e:e.tag=='picture')
                art_kind=kind if kind in ('benefits','know','deliverables','why','audience','outcomes') else 'deliverables'
                if slug=='web-design-riyadh' and kind=='extra' and title_text in ('خدمات تصميم المواقع الإلكترونية لدينا','Our Website Design & Development Services'):
                    art_kind='types'
                if slug in ('manage-google-adwords-campaigns','social-media-management') and kind=='extra' and title_text in (
                    'خدمات تكميلية نقدمها تعزز من أداء إعلانات جوجل لعملك','Complementary Services That Boost Your Google Ads Performance',
                    'خدمات مكملة تعزز أداء حساباتك','Additional Services to Strengthen Your Social Presence'):
                    art_kind='complementary'
                if slug=='mobile-application' and kind=='extra' and title_text in (
                    'التقنيات المستخدمة لإنتاج تطبيقات جوال احترافية','The Tools We Use to Build Professional Mobile Apps'):
                    art_kind='technologies'
                drawing=existing_picture or art(slug,art_kind,i,title.text() if title else card.text(),lang)
                drawing.add('service-studio-art')
                homepage_result=slug=='brand-identity' and kind=='outcomes'
                if homepage_result:
                    # Use the homepage's image/cream-gradient card anatomy,
                    # retaining this service's exact photograph and source copy.
                    content=[e for e in list(card.children) if e is not existing_picture]
                    if title:title.add('service-card-title')
                    for paragraph in content:
                        if isinstance(paragraph,Node) and paragraph.tag=='p':paragraph.add('service-card-text')
                    card.add('service-card','brand-studio-result')
                    card.set([n('div','service-card-media',[drawing,n('span','service-card-tint',aria_hidden='true')]),n('div','service-card-body',content)])
                elif kind in ('why','outcomes'):
                    answer_nodes=[e for e in list(card.children) if e is not title and e is not existing_picture]
                    summary=n('summary','service-studio-summary',[drawing,n('span','service-studio-card-head',[n('span','service-studio-index',[f'{i+1:02d}'],aria_hidden='true'),title] if title else []),'<svg class="service-studio-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'])
                    card.tag='details';card.add('seo-owner-accordion');card.attrs['open']=None
                    card.set([summary,n('div','seo-owner-answer service-studio-answer',answer_nodes)])
                else:
                    content=[e for e in list(card.children) if e is not existing_picture]
                    card.set([n('div','service-studio-card-top',[n('span','service-studio-index',[f'{i+1:02d}']),icon(ICONS[i%len(ICONS)])],aria_hidden='true'),drawing,n('div','service-studio-card-copy',content)])
            if kind in ('why','outcomes') and not (slug=='brand-identity' and kind=='outcomes'):grid.attrs['data-seo-accordion']=None
            site_types=slug=='web-design-riyadh' and art_kind=='types'
            if site_types:section.attrs['data-web-site-types']='true'
            if kind in ('benefits','deliverables','audience') or site_types or (slug=='brand-identity' and kind=='outcomes'):
                parent=grid.parent;position=parent.children.index(grid)
                wrapper=rail(grid,lang,title_text,site_types)
                if site_types:wrapper.attrs['data-web-site-types']='true'
                parent.children.insert(position,wrapper);wrapper.parent=parent
        if kind=='process':
            timeline=section.first(lambda e:e.has('rf-timeline'))
            if timeline:
                timeline.add('service-studio-timeline');timeline.attrs['data-seo-studio-process']=None
                steps=[e for e in timeline.children if isinstance(e,Node) and e.tag=='li']
                for i,step in enumerate(steps):
                    reveal(step);step.add('service-studio-step')
                    body=step.first(lambda e:e.has('rf-step-card'))
                    body.children.insert(0,icon(ICONS[i%len(ICONS)]))
                    if i==0:step.append(n('span','service-studio-progress',['<i></i>'],aria_hidden='true'))
        if kind=='team':
            for card in [e for e in section.walk() if e.has('team-card')]:
                card.add('service-studio-person');reveal(card)
        if kind=='clients' and slug in ('web-design-riyadh','digital-advertising'):
            for toggle in [e for e in section.walk() if e.has('logo-marquee-toggle')]:toggle.detach()
        if kind=='faq':
            for card in [e for e in section.walk() if e.has('rf-faq-item')]:reveal(card)
        if kind=='packages':
            section.add('service-studio-package-prompt')
        if slug=='digital-advertising' and section.attrs.get('id')=='section-9':
            section.add('social-investment')
            heading=section.first(lambda e:e.tag=='h2')
            text=heading.text()
            emphasis=re.search(r'استثمار يُقاس بالريال|Investment Measured in Riyals',text)
            if emphasis:
                heading.set([html.escape(text[:emphasis.start()]),n('span','social-investment-highlight',[html.escape(emphasis[0])]),html.escape(text[emphasis.end():])])
            prose=section.first(lambda e:e.has('rf-prose'));prose.add('social-investment-copy')
            paragraphs=[e for e in prose.children if isinstance(e,Node) and e.tag=='p']
            assert len(paragraphs)==4,'Expected original investment intro and three approved cases'
            actions=[e for e in prose.children if isinstance(e,Node) and e not in paragraphs]
            cases=n('div','social-investment-grid')
            evidence=[('/assets/images/alrahwanji-05-placement-results.webp',1138,709),('/assets/images/work/kuwait-tutoring-campaign-results.webp',762,108),('/assets/images/work/barbarees-post-pregnancy-ad.webp',318,398)]
            for i,(paragraph,(image,width,height)) in enumerate(zip(paragraphs[1:],evidence)):
                name,separator,body=paragraph.text().partition(':')
                if separator:paragraph.set([n('strong','social-investment-name',[html.escape(name+separator)]),' '+html.escape(body.lstrip())])
                visual=n('figure','social-investment-media',[
                    Node('img',{'src':image,'width':str(width),'height':str(height),'alt':'','loading':'lazy','decoding':'async'}),
                    n('span','social-investment-marker',[f'{i+1:02d}',icon(['chart','chat','activity'][i])]),
                ],aria_hidden='true')
                cases.append(reveal(n('article','social-investment-case',[visual,paragraph])))
            prose.set([paragraphs[0],cases,n('div','social-investment-actions service-studio-actions',actions)])
            section.append(n('div','social-investment-orbit',aria_hidden='true'))
        if kind=='technologies':
            prose=section.first(lambda e:e.has('rf-prose'))
            if prose:
                paragraphs=[e for e in list(prose.children) if isinstance(e,Node) and e.tag=='p']
                labels=[e for e in paragraphs if len(e.text().strip())<32]
                if labels:
                    chips=n('div','service-studio-tech-grid')
                    for label in labels:
                        label.add('service-studio-tech-chip');chips.append(label)
                        if slug=='web-design-riyadh':
                            keys={'WordPress':'wordpress','Elementor':'elementor','PHP':'php','React':'react','Node.js':'nodejs','HTML5':'html5','CSS3':'css3','JavaScript':'javascript','MySQL':'mysql','WooCommerce':'woocommerce'}
                            key=keys[label.text().strip()]
                            label.attrs['data-web-technology']=key
                            content=list(label.children)
                            label.set([Node('img',{'src':'/assets/icons/web-technologies/'+key+'.svg','width':'48','height':'48','alt':'','loading':'lazy','decoding':'async','aria-hidden':'true'}),n('span','',content)])
                    prose.append(chips)
        # Normalize existing CTA labels and URLs, never invent a second action.
        actions=[e for e in section.walk() if e.tag=='a' and (e.has('rf-button') or e.has('btn-click') and e.parent and e.parent.has('brand-owner-cta'))]
        for anchor in actions:
            parent=anchor.parent
            if parent.has('brand-owner-cta'): parent.replace(button(anchor))
            else:
                position=parent.children.index(anchor);replacement=button(anchor)
                parent.children.insert(position,replacement);replacement.parent=parent
        for group in [e for e in section.walk() if e.has('rf-actions') or e.has('brand-owner-actions')]:group.add('service-studio-actions')
    return page[:start.start()]+main.render()+page[end:]


def write_manifest():
    dest=ROOT/'tools/refresh/service-studio-image-slots.json'
    dest.write_text(json.dumps({'note':'Card image slots: owner-supplied illustrations matched to independent bilingual copy across all eight non-SEO services; existing brand outcome photos are preserved. Any remaining temporary images are explicitly marked.','slots':SLOTS},ensure_ascii=False,indent=2)+'\n')
