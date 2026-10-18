"""Latest owner-linked service copy, separate from the preserved original Docs.

Only hierarchy/layout annotations are normalized here. Authored wording stays
verbatim. Source comments, held technical decisions, and owner removals are not
silently published as marketing copy.
"""
import json
import re
from pathlib import Path

PATH=Path(__file__).resolve().parent/'refresh/content-update-2026-10-17.json'

def apply(original):
    if not PATH.exists():return original
    updates=json.loads(PATH.read_text())
    docs=dict(original)
    for row,doc in updates['documents'].items():
        ps=[dict(p) for p in doc['paragraphs']]
        faq=False
        for i,p in enumerate(ps):
            text=p['text'].strip()
            # These are structural labels incorrectly styled as body/H2 in
            # the source, not permission to rewrite their actual words.
            if row=='6' and text=='Real results from our work:':p['style']='NORMAL_TEXT'
            if row=='6' and text.startswith('Frequently Asked Questions About Website'):
                p['style']='HEADING_2'
            if row=='17' and text=='فكرة ثم تصميم ثم أول طلب: تصميم متجر إلكتروني متكامل':
                p['style']='HEADING_2'
            if row=='7' and text.startswith('نسلّمك لوحة تحكم سهلة'):
                p['style']='NORMAL_TEXT'
            if row=='7' and text=='حلول متنوعة تناسب احتياجات الشركات والأعمال على اختلاف أحجامها.':
                p['style']='NORMAL_TEXT'
            if row=='9' and text=='الهوية الاحترافية تعطي عملائك انطباعاً بالثقة من أول تواصل.':
                p['style']='NORMAL_TEXT'
            if row=='11' and text=='حملات تقاس بالطلبات والمبيعات، لا بالإعجابات.':
                p['style']='NORMAL_TEXT'
            if row=='6' and text=='Looking for a Website Development Company in Saudi Arabia?':
                p['style']='HEADING_2'
            if i>3 and p['style']=='HEADING_2':
                faq=bool(re.search(r'FAQs|Frequently Asked Questions|Common Questions|Questions Merchants|أسئلة',text,re.I))
            if faq and p['style']=='NORMAL_TEXT' and len(text)<200 and text.endswith(('?','؟')):
                p['style']='HEADING_3'
            # Pipe characters separate three display labels, not words. Match
            # the source's Arabic spacing convention for the same three tiles.
            if (row=='6' and text=='Fast Loading | Mobile-First Design | SEO & AI Ready'
                or row=='14' and text=='Content Strategy | Reels & Short Videos | Community Management'):
                p['source_text']=text
                p['text']=text.replace(' | ','          ')
        docs[row]={**doc,'paragraphs':ps,'fetched':updates['fetched']}
    return docs

def meta_value(text):
    # One updated English document supplies its title without the "Title:"
    # prefix. Both are valid source formats.
    return text.split(':',1)[1].strip() if ':' in text else text.strip()

def is_faq(text):
    return bool(re.search(r'FAQs|Frequently Asked Questions|Common Questions|Questions Merchants|أسئلة',text,re.I))
