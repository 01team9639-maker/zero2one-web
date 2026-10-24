"""One approved brand/keyword loader; never derived from a page title."""
import re
WORDS={'en':['Web','SEO','Ads','Branding','Content','Commerce','Social Media'],
       'ar':['ويب','سيو','إعلانات','علامة','محتوى','متاجر','التواصل']}
BRANDS={'en':'ZERO 2 ONE','ar':'من الصفر إلى الواحد'}
def normalize_loader(page,lang):
    if 'class="loading-words"' not in page:return page
    words=[]
    for i,word in enumerate(WORDS[lang]):
        state='home-active-last' if i==len(WORDS[lang])-1 else 'home-active'+(' home-active-first' if i==0 else '')
        words.append('<div class="loading-word '+state+'">'+word+'<div class="dot"></div></div>')
    content='<div class="loading-words" data-brand-keywords="'+lang+'">'+''.join(words)+'</div>\n            <div class="loading-brand">'+BRANDS[lang]+'</div>\n            '
    # The next rounded edge is the end of loader text, outside all nested dots.
    page,count=re.subn(r'<div class="loading-words"(?: data-brand-keywords="[^"]*")?>[\s\S]*?(?=<div class="rounded-div-wrap bottom">)',lambda _:content,page,count=1)
    if count!=1:raise ValueError('Unexpected loader structure')
    return page.replace('class="loading-container loading-service"','class="loading-container"')
