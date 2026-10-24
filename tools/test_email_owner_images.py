"""Independent current-change gate: only Email artwork may alter public HTML."""
from pathlib import Path
import hashlib,json,re,sys
from service_studio import Tree
ROOT=Path(__file__).resolve().parent.parent
BASE=ROOT/'tools/reports/site-refresh/email-owner-images-2026-10-24/before.json'
def normalized(source):
    tree=Tree(re.sub(r'\?v=[a-f0-9]+','?v=HASH',source)).root
    for node in tree.walk():
        if node.tag=='img' and ('/placeholders/email-marketing-' in node.attrs.get('src','') or '/email-owner-2026-10/' in node.attrs.get('src','')):
            node.attrs={'data-email-image':'IMAGE'}
        if node.attrs.get('data-service-image-slot','').startswith('email-marketing/'):
            node.attrs.pop('data-temporary-image',None);node.attrs.pop('data-owner-email-image',None)
    return tree.render()
def snapshot():
    result={}
    for file in ROOT.rglob('*.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('tools/','node_modules/','.git/','.codex-repos/')):continue
        result[rel]=hashlib.sha256(normalized(file.read_text()).encode()).hexdigest()
    return result
if '--capture' in sys.argv:
    assert not BASE.exists(),'Never overwrite the independent baseline'
    BASE.parent.mkdir(parents=True,exist_ok=True);BASE.write_text(json.dumps(snapshot(),indent=2));print('Captured public HTML before Email image changes.')
else:
    before=json.loads(BASE.read_text());now=snapshot()
    assert before==now,'Changed outside Email image slots: '+str([p for p in before if now.get(p)!=before[p]])
    data=json.loads((ROOT/'tools/refresh/email-owner-illustrations-2026-10-24.json').read_text())
    assert len(data['entries'])==38 and len(data['bindings'])==74
    entries={e['id']:e for e in data['entries']}
    for e in entries.values():
        assert hashlib.sha256(Path(e['source']).read_bytes()).hexdigest()==e['sourceSha256']
        assert len(e['outputs'])==3
        for output in e['outputs']:
            assert hashlib.sha256((ROOT/output['url'].lstrip('/')).read_bytes()).hexdigest()==output['sha256']
    for lang in ['ar','en']:
        prefix='ar/' if lang=='ar' else ''
        tree=Tree((ROOT/(prefix+'services/email-marketing/index.html')).read_text()).root
        assert not [n for n in tree.walk() if '/placeholders/email-marketing-' in n.attrs.get('src','')]
        assert len([n for n in tree.walk() if 'data-owner-email-image' in n.attrs])==37
        for binding in [b for b in data['bindings'] if b['lang']==lang]:
            section=tree.first(lambda n:n.attrs.get('data-service-stage')==binding['kind'])
            card=[n for n in section.walk() if n.has('service-studio-card')][binding['position']-1]
            title=card.first(lambda n:n.tag=='h3') or card.first(lambda n:n.has('service-studio-card-copy'))
            assert title.text().strip()==binding['title']
            image=card.first(lambda n:n.tag=='img');entry=entries[binding['image']]
            assert image.attrs['src']==entry['outputs'][1]['url'] and len(image.attrs['srcset'].split(','))==3
        for route in ['','services/','services/email-marketing/']:
            root=Tree((ROOT/(prefix+route+'index.html')).read_text()).root
            image=root.first(lambda n:n.tag=='img' and '/email-owner-2026-10/' in n.attrs.get('src',''))
            assert image and 'hero-01' in image.attrs['src']
    print('PASS 38 intact Email sources; 114 responsive assets; 74 exact bilingual bindings; hero/home/catalogue; all other public HTML unchanged.')
