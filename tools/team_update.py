"""Owner-approved roster overlay; keep original snapshots and slot indices intact.

Nadine writes articles only, not ads or social posts. The SEO team section stays
disabled under the owner's earlier instruction; this overlay never reopens it.
Omar's owner-confirmed surname is Mansour, not the one in the reference image.
"""
from pathlib import Path
import html,json,re

ROOT=Path(__file__).resolve().parent.parent
DATA=json.loads((ROOT/'tools/refresh/team-update-2026-10-21.json').read_text())
SLIDE=r'<li\b[^>]*class="[^"]*\bteam-slide\b[^"]*"[^>]*>[\s\S]*?</li>'

def retired(card):
    return DATA['retired_image'] in card or bool(re.search(r'Rona Hakimeh|رونا حكيمة',card,re.I))

def card(member,lang,general=False):
    text=member[lang];esc=html.escape;stem='/assets/images/team/team-'+member.get('image_id',member['id'])
    experience='<p class="team-exp">'+esc(text['experience'])+'</p>' if text.get('experience') else ''
    # General profiles share the same stylesheet as all retained people.
    # Never give new portraits separate intrinsic heights or inline layouts.
    return ('<li class="team-slide"><article class="testi-card team-card" data-team-member="'+member['id']+'">'
            '<div class="testi-card-media"><img decoding="async" fetchpriority="low" loading="lazy" src="'+stem+'.webp" '
            'srcset="'+stem+'-480.webp 480w, '+stem+'.webp 720w" '
            'sizes="(max-width: 600px) 80vw, (max-width: 980px) 45vw, 30vw" width="720" height="1029" alt="'+esc(text['name'])+'"></div>'
            '<div class="testi-card-body"><p class="testi-quote">'+esc(text['bio'])+'</p>'+experience+
            '<div class="testi-author"><p class="testi-name">'+esc(text['name'])+'</p><p class="testi-role">'+esc(text['role'])+'</p>'
            '</div></div></article></li>')

def update_cards(cards,lang,slug=None):
    kept=[c for c in cards if not retired(c)]
    for member in DATA['members']:
        if slug is not None and slug not in member['services']:continue
        if not any('data-team-member="'+member['id']+'"' in c for c in kept):kept.append(card(member,lang,slug is None))
    return kept

def home_team(block,lang):
    def replace(match):
        cards=re.findall(SLIDE,match[2])
        # Keep the original slider's whitespace and all retained cards verbatim.
        body=remove_retired(match[2])
        added=[c for c in update_cards(cards,lang) if c not in cards]
        return match[1]+body+''.join(added)+match[3]
    result,count=re.subn(r'(<ul class="slider-track team-track"[^>]*>)([\s\S]*?)(</ul>)',replace,block,count=1)
    assert count==1,'Expected the existing home team slider'
    return result

def remove_retired(page):
    return re.sub(SLIDE,lambda m:'' if retired(m[0]) else m[0],page)
