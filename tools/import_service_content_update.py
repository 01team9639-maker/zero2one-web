#!/usr/bin/env python3
"""Read public, owner-linked Docs into a versioned local content overlay.

Never edits the workbook, source documents, original snapshot, or live site.
Comment anchors and comment bodies are editorial annotations, not public copy.
"""
import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from service_studio import Tree, Node

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'tools/refresh/content-update-2026-10-17.json'
ARCHIVE = ROOT / 'tools/reports/site-refresh/content-update-2026-10-17'
SOURCE_IDS = {
    6:'1v7yNsYoZewrW4vkAFOARVXXD5HLlfRj2jJbanhYrZUs',
    7:'1FuOMlvCXpQ7cUReqvRjrsJj8zmKMZe71JtFyZaBIn9o',
    8:'13JwudeHKpN5K7lhsfvjZtIXGCztJav3gFYR7efCBITo',
    9:'13G9DRq0Xsc0cFCYAmdn8NvQxkKyHGSZVGTHgOI6ksmM',
    10:'1CFSRN79IxGdnf0I4xeLKLgaIiHrrymGdZbdqQ1MWZ90',
    11:'1_mnLXoiKpslo7ymG4wPwRYYKprnQVp8g4F86vkd_x7Y',
    12:'1krJlP5-2q9y9obxYVC5TOgpsJH727VkrnhXIu_thjyY',
    13:'1ivmGeu7u1PMaczfO7-7Nzte3v5RL_1b6ov7rsB6BROE',
    14:'1ThFTKYmSh0kqGaAWMwJxqkN3ZLResTjSfbtaVqIOsXs',
    15:'1OURdaej2LWM3gkm-HI45kzh5K1UQIADY0EEmVIN98a4',
    16:'1gM64X13AylBfD1dkd7PfPoaRpw2LVgDbzLUQoTL_S3g',
    17:'1r-wH59a6iO0PUfBGhU3Ywy1sg8ENe29VP68Lx0BRskQ',
    18:'1zsq_hfxI0G7WNvAmpWha7IWjbAI0XRFSYaJreV1e0J8',
    19:'13lQlj0HJFXsGwZ748Og4ARYLqsIuyPdtOt1Nz2Lv2WY',
    20:'1dD93rzpdPLRSv4UleRE28k8fE_To4mtB9tgis_Tbk1g',
    21:'1_olK9sx7gQvT1lYsYHe5Ir8ryYZWKNk2WBivx3cCLZc',
}
SAUDI_IDS = {12:'1VtT8Zhk-2tDflo7mVhSTJyrhkTJoByCeeID_d7Ho9tQ',15:'1FBvEYVA5TPDQONR9LFUnNgWqozRQ3DzvOMWVdXcaIXU'}

def ancestors(node):
    while node.parent:
        node=node.parent
        yield node

def parse(source):
    tree=Tree(source).root
    body=tree.first(lambda n:n.tag=='body')
    if not body: raise ValueError('Expected a public Google Docs HTML export')
    comments=[]
    for block in list(body.walk()):
        if block.tag=='a' and block.attrs.get('id','').startswith('cmnt'):
            if block.attrs.get('id','').startswith('cmnt_ref'):
                (block.parent if block.parent.tag=='sup' else block).detach()
            else:
                paragraph=next((a for a in ancestors(block) if a.tag=='p'),None)
                if paragraph:
                    comments.append(paragraph.text().strip());paragraph.detach()
    paragraphs=[]
    for node in body.walk():
        if node.tag not in ('p','h1','h2','h3','h4','li'):continue
        # A list item containing paragraph elements is represented by those
        # paragraphs, not an additional duplicated parent record.
        if node.tag=='li' and any(n.tag in ('p','h1','h2','h3','h4') for n in node.walk()):continue
        text=node.text().replace('\xa0',' ').strip().lstrip('\ufeff')
        if not text:continue
        paragraphs.append({'text':text,'style':'HEADING_'+node.tag[1] if node.tag.startswith('h') else 'NORMAL_TEXT',
                           'bullet':node.tag=='li' or any(a.tag=='li' for a in ancestors(node)),
                           'bold':False,'size':0})
    return paragraphs,comments

def fetch(row,docid):
    url=f'https://docs.google.com/document/d/{docid}/export?format=html'
    with urllib.request.urlopen(url,timeout=45) as response:raw=response.read()
    ps,comments=parse(raw.decode('utf-8'))
    ARCHIVE.mkdir(parents=True,exist_ok=True)
    (ARCHIVE/f'row-{row}.html').write_bytes(raw)
    return str(row),{'source':f'https://docs.google.com/document/d/{docid}/edit',
                     'export_sha256':hashlib.sha256(raw).hexdigest(),'paragraphs':ps,'editorial_comments':comments}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--saudi',action='store_true',help='Only after the owner chooses the Saudi Arabic variants')
    args=parser.parse_args()
    sources={**SOURCE_IDS,**(SAUDI_IDS if args.saudi else {})}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        documents=dict(pool.map(lambda item:fetch(*item),sources.items()))
    data={'fetched':datetime.now(timezone.utc).isoformat(),'workbook':'Main Pages - Zero2One.xlsx',
          'scope':'Existing service pages only. Email Marketing and CRO remain excluded. Original sources remain unchanged.',
          'arabic_variant':'saudi' if args.saudi else 'primary','documents':documents}
    DEST.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    for key,doc in sorted(documents.items(),key=lambda p:int(p[0])):
        print(key,len(doc['paragraphs']),len(doc['editorial_comments']),'comments removed')
        print(json.dumps([p['text'] for p in doc['paragraphs'] if p['style'] in ('HEADING_1','HEADING_2')],ensure_ascii=False))

if __name__=='__main__':main()
