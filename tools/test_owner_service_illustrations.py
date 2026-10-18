"""Narrow image-only regression against the local state before this request."""
from pathlib import Path
import hashlib
import json
import re
import sys
from service_studio import Tree

ROOT=Path(__file__).resolve().parent.parent
NEW_BATCH='--batch-2026-10-18' in sys.argv
REPORT=ROOT/('tools/reports/site-refresh/owner-service-images-2026-10-18' if NEW_BATCH else 'tools/reports/site-refresh/owner-service-images-2026-10-17')
BEFORE=REPORT/'before.json'
SLUGS=['brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management']
if NEW_BATCH:SLUGS=['ecommerce-development','mobile-application','marketing-consulting']
TARGETS=[prefix+'services/'+slug+'/index.html' for prefix in ('','ar/') for slug in SLUGS]
SHA=lambda b:hashlib.sha256(b).hexdigest()
NORM=lambda s:re.sub(r'\s+',' ',s).strip()

def snapshot():
    result={'pages':{},'protected':{}}
    for file in ROOT.rglob('index.html'):
        rel=file.relative_to(ROOT).as_posix()
        if rel.startswith(('.git/','node_modules/','blog/','tools/')):continue
        text=file.read_text();result['pages'][rel]=SHA(text.encode())
        if rel not in TARGETS:continue
        tree=Tree(text).root
        result['protected'][rel]={
            'text':NORM(tree.text()),
            'copy':[[n.attrs['data-copy'],NORM(n.text())] for n in tree.walk() if 'data-copy' in n.attrs],
            'links':[n.attrs for n in tree.walk() if n.tag=='a'],
            'head':tree.first(lambda n:n.tag=='head').render(),
            'hero':tree.first(lambda n:n.has('service-studio-hero')).render(),
            'footer':tree.first(lambda n:n.tag=='footer').render(),
            'photos':[n.render() for n in tree.walk() if n.tag=='picture'],
            'cards':[n.attrs for n in tree.walk() if n.has('service-studio-card')],
        }
    return result

def check():
    before=json.loads(BEFORE.read_text());after=snapshot()
    assert before['pages'].keys()==after['pages'].keys(),'No page creation/removal'
    for rel,digest in before['pages'].items():
        if rel not in TARGETS:assert digest==after['pages'][rel],'Unrelated page changed: '+rel
    assert before['protected']==after['protected'],'Existing copy, links, layout, photos, hero, head or footer changed'
    data=json.loads((ROOT/'tools/refresh/owner-service-illustrations.json').read_text())
    selected=[b for b in data['bindings'] if b['service'] in SLUGS]
    assert len(selected)==(228 if NEW_BATCH else 296)
    ids={b['image'] for b in selected}
    entries={e['id']:e for e in data['entries'] if e['id'] in ids}
    assert len(entries)==(115 if NEW_BATCH else 149)
    for e in entries.values():
        assert SHA(Path(e['source']).read_bytes())==e['sourceSha256'],'PNG original changed'
        assert [o['width'] for o in e['outputs']]==[320,640,960]
        for output in e['outputs']:
            assert output['width']==output['height']
            assert SHA((ROOT/output['url'].lstrip('/')).read_bytes())==output['sha256']
    actual_ids=set()
    for rel in TARGETS:
        slug=rel.split('/')[-2];lang='ar' if rel.startswith('ar/') else 'en'
        tree=Tree((ROOT/rel).read_text()).root
        arts=[n for n in tree.walk() if 'data-owner-service-image' in n.attrs]
        wanted=[b for b in data['bindings'] if b['service']==slug and b['lang']==lang]
        assert len(arts)==len(wanted),(slug,lang,len(arts),len(wanted))
        assert not any(n.attrs.get('data-temporary-image')=='true' for n in tree.walk()),'No placeholders should remain'
        assert len({a.attrs['data-service-image-slot'] for a in arts})==len(arts),'Distinct complementary/deliverable slots'
        for art,binding in zip(arts,wanted):
            ident=art.attrs['data-owner-service-image'];assert ident==binding['image'],(slug,lang,binding['title'],ident)
            actual_ids.add(ident);entry=entries[ident];img=art.first(lambda n:n.tag=='img')
            assert img.attrs['src']==entry['outputs'][1]['url']
            assert len(img.attrs['srcset'].split(','))==3
            assert img.attrs['width']==img.attrs['height']=='1254'
            assert img.attrs['alt']=='' and img.attrs['loading']=='lazy'
    assert actual_ids==entries.keys(),'All supplied images must have a correct existing placement'
    print(f'PASS {len(entries)} intact owner originals, {len(entries)*3} verified derivatives, {len(selected)} correct bilingual placements; exact copy, photos and all unrelated pages preserved.')

if __name__=='__main__':
    if '--capture' in sys.argv:
        assert not BEFORE.exists(),'Do not overwrite the pre-request baseline'
        REPORT.mkdir(parents=True,exist_ok=True)
        BEFORE.write_text(json.dumps(snapshot(),ensure_ascii=False,indent=2)+'\n')
        print(f'Captured pre-request state of {len(TARGETS)} pages and all unrelated page hashes.')
    else:check()
