"""Narrow owner-art regression: preserve all existing copy and all other pages."""
from pathlib import Path
import hashlib
import json
import re
import sys
from service_studio import Tree

ROOT=Path(__file__).resolve().parent.parent
REPORT=ROOT/'tools/reports/site-refresh/web-design-images-2026-10-17'
BASELINE=REPORT/'before.json'
TARGETS=['ar/services/web-design-riyadh/index.html','services/web-design-riyadh/index.html']
SHA=lambda b:hashlib.sha256(b).hexdigest()

def snapshot():
    result={'pages':{},'protected':{}}
    for file in ROOT.rglob('index.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','node_modules/','blog/','tools/')):continue
        text=file.read_text()
        result['pages'][rel]=SHA(re.sub(r'\?v=[a-f0-9]+','?v=STAMP',text).encode())
        if rel in TARGETS:
            tree=Tree(text).root
            result['protected'][rel]={
                'copy':re.sub(r'\s+',' ',tree.text()).strip(),
                'links':[n.attrs for n in tree.walk() if n.tag=='a'],
                'head':tree.first(lambda n:n.tag=='head').render(),
                'hero':tree.first(lambda n:n.has('service-studio-hero')).render(),
                'footer':tree.first(lambda n:n.tag=='footer').render(),
            }
    return result

def check():
    before=json.loads(BASELINE.read_text());after=snapshot()
    assert before['pages'].keys()==after['pages'].keys(),'No page additions/removals'
    for rel,sha in before['pages'].items():
        if rel not in TARGETS:assert sha==after['pages'][rel],'Unrelated page changed: '+rel
    assert before['protected']==after['protected'],'Copy, links, head, hero and footer must remain unchanged'
    manifest=json.loads((ROOT/'tools/refresh/web-design-illustrations.json').read_text())
    assert len(manifest['entries'])==34
    for item in manifest['entries']:
        assert SHA(Path(item['source']).read_bytes())==item['sourceSha256'],'Original changed'
        assert [o['width'] for o in item['outputs']]==[320,640,960]
        for output in item['outputs']:
            assert SHA((ROOT/output['url'].lstrip('/')).read_bytes())==output['sha256']
    groups={kind:[e for e in manifest['entries'] if e['kind']==kind] for kind in ['benefits','know','deliverables','types','why','audience']}
    slots=json.loads((ROOT/'tools/refresh/service-studio-image-slots.json').read_text())['slots']
    for rel in TARGETS:
        lang='ar' if rel.startswith('ar/') else 'en'
        tree=Tree((ROOT/rel).read_text()).root
        arts=[n for n in tree.walk() if n.attrs.get('data-owner-web-art')=='true']
        assert len(arts)==34
        assert len({n.attrs['data-service-image-slot'] for n in arts})==34,'Unique type/deliverable slots'
        assert not any(n.attrs.get('data-temporary-image')=='true' for n in tree.walk()),'No web placeholders remain'
        for kind,entries in groups.items():
            selected=[n for n in arts if '/'+kind+'/' in n.attrs['data-service-image-slot']]
            assert len(selected)==len(entries),kind
            for index,art in enumerate(selected):
                ordinal=(7 if index==6 else 6 if index==7 else index) if lang=='en' and kind=='deliverables' else index
                entry=entries[ordinal];img=art.first(lambda n:n.tag=='img')
                assert img.attrs['src']==entry['outputs'][1]['url'],(lang,kind,index)
                assert img.attrs['width']==img.attrs['height']=='1254'
                assert img.attrs['loading']=='lazy' and img.attrs['alt']==''
                assert len(img.attrs['srcset'].split(','))==3
                slot=slots[art.attrs['data-service-image-slot']]
                assert slot['images'][lang]==img.attrs['src'] and 'temporary' not in slot
    print('PASS: 34 correct owner illustrations in each language; 102 derivatives/originals verified; copy and all unrelated pages preserved.')

if __name__=='__main__':
    if '--capture' in sys.argv:
        assert not BASELINE.exists(),'Do not overwrite the pre-image baseline'
        REPORT.mkdir(parents=True,exist_ok=True)
        BASELINE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
        print('Captured pre-image baseline')
    else:check()
