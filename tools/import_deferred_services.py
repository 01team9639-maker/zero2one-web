"""Read the three owner-linked briefs; leave original workbook/Docs untouched."""
import hashlib,json,urllib.request
from datetime import datetime,timezone
from pathlib import Path
from import_service_content_update import parse
ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'tools/refresh/deferred-services-2026-10-24.json'
SOURCES={22:'1BJXva3kTdxdNZ0aLSWACczOMXqgtL0iVg7kcfuMSDDo',24:'1WSU_6nQtV2ZJSKiz7jmbCbxDVcUHR7-4V-PX5EDmfLg',25:'1y4soop1dJBqDKVF2Bv8woalYz7YolA2snz4QfyUdz38'}
if __name__=='__main__':
    assert not DEST.exists(),'Keep the dated source snapshot immutable'
    docs={}
    for row,docid in SOURCES.items():
        url=f'https://docs.google.com/document/d/{docid}/export?format=html'
        with urllib.request.urlopen(url,timeout=45) as response:raw=response.read()
        paragraphs,comments=parse(raw.decode())
        archive=ROOT/f'tools/reports/site-refresh/deferred-services-2026-10-24/row-{row}.html'
        archive.parent.mkdir(parents=True,exist_ok=True);archive.write_bytes(raw)
        docs[str(row)]={'source':url,'export_sha256':hashlib.sha256(raw).hexdigest(),'paragraphs':paragraphs,'editorial_comments':comments}
    DEST.write_text(json.dumps({'fetched':datetime.now(timezone.utc).isoformat(),'scope':'Owner reactivated CRO and Email Marketing on 2026-10-24. No source documents edited.','documents':docs},ensure_ascii=False,indent=2)+'\n')
    for row,doc in docs.items():
        print('\nROW',row,len(doc['paragraphs']))
        for i,p in enumerate(doc['paragraphs']):print(i,p['style'],p['text'])
