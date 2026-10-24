"""Editorial bilingual team directory; biographies/portraits stay verbatim."""
import html,re
from service_studio import Tree

GROUPS=[
    ('leadership',('الإدارة والقيادة','Leadership & Management'),
     ('الرؤية، إدارة العمل، وتوجيه الفريق.','The vision, operations and direction behind our work.'),
     ['oraini','hossam','moayad','walaa-al-qarni']),
    ('sales',('المبيعات وعلاقات العملاء','Sales & Client Relations'),
     ('حلول تناسب احتياجاتك، وعلاقات تنمو مع أعمالك.','Solutions for your needs and relationships that grow with your business.'),
     ['fahad','omar-mansour','hadeel-al-qahtani']),
    ('marketing',('التسويق والمحتوى','Marketing & Content'),
     ('من الاستراتيجية والإعلان إلى البحث والمقالات.','From strategy and advertising to search and article writing.'),
     ['kerolos-kareem','kerolos','nadine-othman']),
    ('design-development',('التصميم والتطوير','Design & Development'),
     ('واجهات وتجارب وأنظمة تحوّل الأفكار إلى منتجات.','Interfaces, experiences and systems that bring ideas to life.'),
     ['adel','karabala','mohammed','ruba'])]

def render(team_list,lang,description):
    ar=lang=='ar';i=0 if ar else 1;esc=html.escape
    cards=re.findall(r'<li class="team-slide">[\s\S]*?</li>',team_list)
    people={}
    for card in cards:
        profile=Tree(card).root.first(lambda n:'data-team-member' in n.attrs)
        key=profile.attrs['data-team-member'] if profile else re.search(r'/team-([\w-]+)\.webp',card)[1]
        assert key not in people,'A repeated portrait must never replace a different person'
        people[key]=card
    assert set(people)=={key for group in GROUPS for key in group[3]},'Every supplied profile must appear once'
    title=('تعرّف على','فريقنا') if ar else ('Meet Our','Team')
    total=len(people)
    arrow='<svg class="service-card-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>'
    portraits=[]
    for key in ['kerolos','moayad']:
        root=Tree(people[key]).root;image=root.first(lambda n:n.tag=='img')
        name=root.first(lambda n:n.has('testi-name')).text();role=root.first(lambda n:n.has('testi-role')).text()
        portraits.append('<figure class="team-directory-preview"><img src="'+image.attrs['src']+'" srcset="'+image.attrs['srcset']+'" sizes="(max-width:600px) 42vw, 240px" width="720" height="1029" alt="" decoding="async" fetchpriority="high"><figcaption><span>'+esc(name)+'</span><small>'+esc(role)+'</small></figcaption></figure>')
    hero=('<section class="team-directory-hero" data-scroll-section><div class="team-directory-shell team-directory-hero-grid">'
          '<div class="team-directory-intro"><p class="team-directory-eyebrow" dir="ltr">ZERO2ONE / PEOPLE</p>'
          '<h1 id="main-content" tabindex="-1"><span>'+title[0]+'</span> <strong>'+title[1]+'</strong></h1>'
          '<p class="team-directory-lead">'+esc(description)+'</p><div class="team-directory-hero-bottom">'
          '<a class="team-directory-button" href="#team-directory">'+('اكتشف الفريق' if ar else 'Meet the people')+arrow+'</a>'
          '<div class="team-directory-total"><b>'+str(total)+'</b><span>'+('خبرات متنوعة، فريق واحد' if ar else 'Different strengths. One team.')+'</span></div>'
          '</div></div><div class="team-directory-visual">'+''.join(portraits)+'<span class="team-directory-orbit" aria-hidden="true"></span></div>'
          '</div></section>')
    nav='<nav class="team-directory-jump" aria-label="'+('أقسام الفريق' if ar else 'Team departments')+'">'
    groups=[]
    for index,(key,labels,descriptions,ids) in enumerate(GROUPS,1):
        nav+='<a href="#team-'+key+'">'+labels[i]+'<span>'+str(len(ids))+'</span></a>'
        groups.append('<section class="team-directory-group" id="team-'+key+'" data-team-count="'+str(len(ids))+'" data-scroll-section>'
                      '<div class="team-directory-shell"><header class="team-directory-group-head"><div><span class="team-directory-kicker" dir="ltr">0'+str(index)+' /</span>'
                      '<h2>'+labels[i]+'</h2><p>'+descriptions[i]+'</p></div><span class="team-directory-group-count" aria-hidden="true">0'+str(len(ids))+'</span></header>'
                      '<ul class="rf-team-grid">'+''.join(people[p] for p in ids)+'</ul></div></section>')
    nav+='</nav>'
    closing=('<section class="team-directory-closing" data-scroll-section><div class="team-directory-shell"><div class="team-directory-closing-panel">'
             '<div><p class="team-directory-eyebrow" dir="ltr">LET’S WORK TOGETHER</p><h2>'+('لنبدأ العمل معاً' if ar else 'Let’s build something together')+'</h2></div>'
             '<a class="team-directory-button" href="https://wa.me/966530307054" target="_blank" rel="noopener">'+('تحدث مع فريقنا' if ar else 'Talk to our team')+arrow+'</a></div></div></section>')
    return hero+'<div class="team-directory-index" id="team-directory" data-scroll-section><div class="team-directory-shell">'+nav+'</div></div>'+''.join(groups)+closing
