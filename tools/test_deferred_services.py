"""Independent pre-change protection plus new route/photo/source checks."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'tools/reports/site-refresh/deferred-services-2026-10-24/before.json'
SLUGS={'conversion-rate-optimization','email-marketing'}
def normalize(source):
    source=re.sub(r'\?v=[a-f0-9]+','?v=HASH',source)
    # New cache-busting stamps on these exact two owner-updated portraits only.
    source=re.sub(r'(/team-(?:mohammed|moayad)(?:-480)?\.webp)\?v=HASH',r'\1',source)
    tree=Tree(source).root
    for node in list(tree.walk()):
        if node.has('rf-nav-services'):node.detach()
        if (node.has('service-card') or node.has('rf-service-card')) and any('/services/'+s+'/' in node.render() for s in SLUGS):node.detach()
        if node.attrs.get('id') in {'faq-'+s for s in SLUGS}:node.detach()
    return re.sub(r'\s+',' ',tree.render()).strip()
def snapshot():
    files={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('node_modules/','tools/','.git/','.codex-repos/')):continue
        if any('/'+s+'/' in '/'+rel for s in SLUGS):continue
        files[rel]=hashlib.sha256(normalize(file.read_text()).encode()).hexdigest()
    return files
if '--capture' in sys.argv:
    assert not OUT.exists(),'Never overwrite the independent baseline'
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(snapshot(),indent=2));print('Captured pre-change pages')
else:
    before=json.loads(OUT.read_text());now=snapshot()
    assert before==now, 'Unrelated content changed: '+str([p for p in before if before[p]!=now.get(p)])
    from build_site_refresh import DOCS
    for lang in ['ar','en']:
        prefix='ar/' if lang=='ar' else ''
        for slug in SLUGS:
            file=ROOT/(prefix+'services/'+slug+'/index.html');text=file.read_text();tree=Tree(text).root
            assert len([n for n in tree.walk() if n.tag=='h1'])==1
            assert tree.first(lambda n:n.attrs.get('data-studio-service')==slug)
            assert tree.first(lambda n:n.attrs.get('data-service-stage')=='deliverables').first(lambda n:'data-home-scroll-always' in n.attrs)
            assert tree.first(lambda n:n.has('service-studio-timeline'))
            assert len([n for n in tree.walk() if n.has('rf-faq-item')])>=5
            for image in [n for n in tree.walk() if n.tag=='img']:
                src=image.attrs.get('src','').split('?')[0]
                if src.startswith('/'):assert (ROOT/src.lstrip('/')).exists(),src
            assert 'href="https://zero2one.sa/'+prefix+'services/'+slug+'/"' in text
            row={'email-marketing':23 if lang=='ar' else 22,'conversion-rate-optimization':25 if lang=='ar' else 24}[slug]
            from build_site_refresh import clean
            public={n.attrs.get('data-copy'):n.text().strip() for n in tree.walk() if 'data-copy' in n.attrs}
            for i,p in enumerate(DOCS[str(row)]['paragraphs']):
                if p['style']=='HEADING_3':assert public.get(f'{row}:{i}')==p['text'],(slug,lang,i)
        for route in ['', 'services/']:
            text=(ROOT/(prefix+route+'index.html')).read_text()
            tree=Tree(text).root
            cards=[n for n in tree.walk() if n.has('rf-service-card') or n.tag=='article' and n.has('service-card') and n.first(lambda e:e.has('service-card-title'))]
            assert len(cards)==11,(prefix,route,len(cards))
            for slug in SLUGS:assert any(f'href="/{prefix}services/{slug}/"' in n.render() for n in cards)
    versions=json.loads((ROOT/'tools/refresh/team-photo-versions-2026-10-24.json').read_text())
    for src,version in versions.items():assert hashlib.sha256((ROOT/src.lstrip('/')).read_bytes()).hexdigest()[:8]==version
    for lang in ['','ar/']:
        text=(ROOT/(lang+'team/index.html')).read_text()
        for src,version in versions.items():assert src+'?v='+version in text
    print('PASS preserved existing pages/copy; bilingual new services; working local assets; source cards; two cache-busted owner portraits.')
