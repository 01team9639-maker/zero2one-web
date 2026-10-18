"""Download the owner's requested SVG Repo technology marks, without editing geometry.

Each selected primary asset page explicitly lists CC0. Keep the source/license
record with the local assets. Technology names are descriptive, not endorsements.
"""
from pathlib import Path
import hashlib,json,time,urllib.request,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/icons/web-technologies'
ASSETS={
 'wordpress':(38867,'wordpress-logo'), 'elementor':(313877,'elementor'),
 'php':(150351,'php-programming-language'),'react':(303157,'react-logo'),
 'nodejs':(452075,'node-js'),'html5':(306204,'html5'),
 'css3':(303263,'css3-logo'),'javascript':(303206,'javascript-logo'),
 'mysql':(373848,'mysql'),'woocommerce':(354569,'woocommerce-icon'),
}
def main():
    OUT.mkdir(parents=True,exist_ok=True);records=[]
    for key,(ident,slug) in ASSETS.items():
        url=f'https://www.svgrepo.com/show/{ident}/{slug}.svg';file=OUT/(key+'.svg')
        data=file.read_bytes() if file.exists() else urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
        tree=ET.fromstring(data)
        assert tree.tag.endswith('svg') and tree.attrib.get('viewBox'),key
        for node in tree.iter():
            assert node.tag.rsplit('}',1)[-1] not in ('script','foreignObject'),key
            assert not any(k.lower().startswith('on') or k.endswith('href') for k in node.attrib),key
        file.write_bytes(data)
        records.append({'key':key,'page':f'https://www.svgrepo.com/svg/{ident}/{slug}','download':url,'license':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'geometryChanged':False})
        print('Ready',key,len(data));time.sleep(.25)
    (OUT/'provenance.json').write_text(json.dumps({'source':'SVG Repo','requestedCollection':'https://www.svgrepo.com/vectors/programming-languages/','purpose':'Descriptive technology marks on the website design service page. No endorsement or trademark rights claimed.','assets':records},indent=2)+'\n')
if __name__=='__main__':main()
