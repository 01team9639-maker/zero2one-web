"""Generate replaceable code-native SVG illustrations from the free local icons.
No supplied original, portrait or approved brand photograph is modified.
"""
from pathlib import Path
import re
from service_studio import SLUGS, ICONS

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/images/service-studio/placeholders'


def build(check=False):
    changed=[]
    for service,slug in enumerate(SLUGS):
        for index,key in enumerate(ICONS):
            original=(ROOT/'assets/icons/iconly'/f'{key}.svg').read_text()
            geometry=re.fullmatch(r'<svg\b[^>]*>([\s\S]*?)</svg>\s*',original)[1]
            tilt=[-5,4,-3,5][(index+service)%4]
            bars=''.join(f'<rect x="{128+i*58}" y="{300-h}" width="30" height="{h}" rx="9" fill="'+('#F9460E' if i==3 else '#EAE7DC')+'"/>' for i,h in enumerate([32,54,72,100]))
            content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" fill="none">
<desc>Temporary service illustration using free commercial Iconly Essential Light geometry. Replace with final owner artwork.</desc>
<defs><linearGradient id="warm" x1="110" y1="70" x2="540" y2="350" gradientUnits="userSpaceOnUse"><stop stop-color="#F9460E"/><stop offset="1" stop-color="#FF8000"/></linearGradient><filter id="depth" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dy="12" stdDeviation="14" flood-color="#1C1D20" flood-opacity=".09"/></filter></defs>
<ellipse cx="321" cy="345" rx="213" ry="24" fill="#1C1D20" opacity=".035"/>
<path d="M76 226C30 115 158 34 295 83S573 126 548 265" stroke="#FF8000" stroke-opacity=".16" stroke-width="36" stroke-linecap="round"/>
<g transform="rotate({tilt} 320 210)" filter="url(#depth)"><rect x="100" y="76" width="440" height="254" rx="24" fill="#FFFEF8" stroke="#DCD9CF"/><path d="M100 120H540" stroke="#E6E3D8"/><circle cx="125" cy="99" r="5" fill="#F9460E"/><circle cx="142" cy="99" r="5" fill="#FF8000" opacity=".55"/><circle cx="159" cy="99" r="5" fill="#E8E4D8"/>
<rect x="128" y="147" width="142" height="10" rx="5" fill="#D6D4CB"/><rect x="128" y="169" width="101" height="7" rx="3.5" fill="#E7E4D9"/>{bars}
<rect x="363" y="148" width="145" height="150" rx="25" fill="#FFFDED" stroke="#F9460E" stroke-opacity=".15"/><g transform="translate(394 183) scale(3.4)" color="#F9460E">{geometry}</g></g>
<g filter="url(#depth)"><rect x="47" y="260" width="119" height="83" rx="22" fill="url(#warm)"/><path d="M75 309L94 289L111 299L139 277M124 277H139V292" stroke="#FFFDED" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="463" y="41" width="107" height="83" rx="24" fill="#FFFDED" stroke="#DEDACF"/><rect x="484" y="62" width="64" height="8" rx="4" fill="#F9460E"/><rect x="484" y="80" width="46" height="6" rx="3" fill="#D7D3C8"/><rect x="484" y="96" width="55" height="6" rx="3" fill="#E4E0D5"/></g>
<circle cx="565" cy="284" r="10" fill="#F9460E"/><circle cx="73" cy="139" r="6" fill="#FF8000"/>
</svg>'''
            dest=OUT/f'{slug}-{key}.svg'
            if not dest.exists() or dest.read_text()!=content:
                changed.append(dest.name)
                if not check:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content)
    return changed


if __name__=='__main__':
    import sys
    check='--check' in sys.argv
    changed=build(check)
    print(f'Service placeholder illustrations: {len(changed)} '+('out of date' if check else 'generated')+'. No originals changed.')
    if check and changed:sys.exit(1)
