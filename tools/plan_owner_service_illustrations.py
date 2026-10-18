"""Map supplied artwork to existing independent bilingual card copy.

CSV guides are source data only. This plan never adds or rewrites card text.
English source differences are explicitly mapped by meaning, not by position.
"""
import csv
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from service_studio import Tree

ROOT=Path(__file__).resolve().parent.parent
SOURCES={
    'brand-identity':('02_brand_identity',['benefits','know','deliverables','why','audience']),
    'digital-advertising':('03_social_media_ads',['benefits','know','deliverables','why','audience','outcomes']),
    'manage-google-adwords-campaigns':('04_google_ads',['benefits','know','deliverables','complementary','why','audience','outcomes']),
    'social-media-management':('05_social_media_content',['benefits','know','deliverables','complementary','why','audience','outcomes']),
    'ecommerce-development':('06_ecommerce_stores',['benefits','know','deliverables','why','audience','outcomes']),
    'mobile-application':('07_mobile_apps',['benefits','know','deliverables','technologies','why','audience','outcomes']),
    'marketing-consulting':('08_marketing_consulting',['benefits','know','deliverables','why','audience','outcomes']),
}
def key(text):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',text)).strip()

def main():
    entries=[];bindings=[]
    for slug,(folder,kinds) in SOURCES.items():
        source=Path('/Users/mohammad/Downloads')/folder
        guides=list(source.glob('*.csv'));assert len(guides)==1
        rows=list(csv.reader(guides[0].open(encoding='utf-8-sig')))[1:]
        assert len(rows)==len(list(source.rglob('*.png')))
        for row in rows:
            section,_,number,title,relative=row
            ident=f'{slug}/{kinds[int(section)-1]}/{int(number):02d}'
            matches=[p for p in source.rglob('*.png') if key(p.relative_to(source).as_posix())==key(relative)]
            assert len(matches)==1,(ident,relative)
            entries.append({'id':ident,'service':slug,'kind':kinds[int(section)-1],'number':int(number),
                            'sourceTitle':title,'source':str(matches[0]),'sourceSha256':hashlib.sha256(matches[0].read_bytes()).hexdigest()})
        for lang in ('ar','en'):
            file=ROOT/('ar' if lang=='ar' else '')/'services'/slug/'index.html'
            tree=Tree(file.read_text()).root
            for section in tree.walk():
                kind=section.attrs.get('data-service-stage')
                if not kind:continue
                if kind=='extra' and slug in ('manage-google-adwords-campaigns','social-media-management'):kind='complementary'
                if kind=='extra' and slug=='mobile-application':kind='technologies'
                if kind not in kinds:continue
                cards=[c for c in section.walk() if c.has('service-studio-card')]
                for i,card in enumerate(cards,1):
                    title=card.first(lambda n:n.tag=='h3') or card.first(lambda n:n.has('service-studio-card-copy'))
                    assert title is not None,(slug,lang,kind,i)
                    number=i;asset_slug=slug
                    if lang=='en':
                        if slug=='digital-advertising' and kind=='audience':number={2:3,3:2}.get(i,i)
                        if slug=='digital-advertising' and kind=='outcomes':number=[4,5,1,3,6,2][i-1]
                        if slug=='manage-google-adwords-campaigns':
                            if kind=='know':number=[3,5,6,7,2,4,1][i-1]
                            if kind=='deliverables':number=[1,2,3,4,5,6,8,9,10][i-1]
                            if kind=='why':
                                number=[1,2,4,2,5,6][i-1]
                                # EN retains its approved 95% retention card;
                                # use the supplied retention illustration, not
                                # the AR-only "We care about your success" art.
                                if i==2:asset_slug='brand-identity'
                        if slug=='mobile-application':
                            if kind=='why':number=[2,3,1,4,5,6][i-1]
                            if kind=='audience':number=[1,4,2,3,5,6][i-1]
                            if kind=='outcomes':number=[6,1,2,3,4,5][i-1]
                    ident=f'{asset_slug}/{kind}/{number:02d}'
                    assert any(e['id']==ident for e in entries) or asset_slug=='brand-identity',ident
                    bindings.append({'service':slug,'lang':lang,'kind':kind,'position':i,'title':key(title.text()),'image':ident})
    assert len(entries)==264
    assert len(bindings)==524
    assert {b['image'] for b in bindings}=={e['id'] for e in entries},'Every supplied image has a meaningful placement'
    dest=ROOT/'tools/refresh/owner-service-illustration-plan.json'
    dest.write_text(json.dumps({'note':'Owner image guides matched to existing cards without copy changes. AR brand has eight deliverables; its ninth image belongs to the existing EN ninth card. Existing brand outcome photos stay unchanged.',
                                'entries':entries,'bindings':bindings},ensure_ascii=False,indent=2)+'\n')
    print(f'Planned {len(entries)} originals and {len(bindings)} bilingual placements; no page changes.')

if __name__=='__main__':main()
