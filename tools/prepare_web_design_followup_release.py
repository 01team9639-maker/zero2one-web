"""Package only the approved October 18 web-service/footer follow-up."""
from pathlib import Path
import hashlib, json, re, subprocess, sys

SOURCE = Path(__file__).resolve().parent.parent
TARGET = Path(sys.argv[1]).resolve()
BASE = 'a68afac5b7c8076614fc2c504fa0f2347959016a'
def git(*args):
    return subprocess.check_output(['git', *args], cwd=TARGET, text=True).strip()
def digest(data):
    return hashlib.sha256(data).hexdigest()
assert TARGET != SOURCE and git('rev-parse', 'HEAD') == BASE
assert not git('status', '--porcelain', '--untracked-files=no')
blog = {str(p.relative_to(TARGET)): digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
unstamp = lambda s: re.sub(r'\?v=[a-f0-9]+', '?v=HASH', s)
web = {'services/web-design-riyadh/index.html', 'ar/services/web-design-riyadh/index.html'}
paths = []
for rel in git('ls-files', '*.html').splitlines():
    if rel.startswith('blog/'):
        continue
    src = SOURCE/rel
    assert src.exists(), rel
    if src.read_bytes() == (TARGET/rel).read_bytes():
        continue
    if rel not in web:
        assert unstamp(src.read_text()) == unstamp((TARGET/rel).read_text()), rel
    paths.append(rel)
paths += [
    'assets/css/bundle.min.css', 'assets/css/footer-layout.css', 'assets/css/service-studio.css',
    'tools/build_site_refresh.py', 'tools/service_studio.py', 'tools/refresh/coverage.json',
    'tools/refresh/copy-manifest.json', 'tools/refresh/README.md',
    'tools/prepare_web_technology_icons.py', 'tools/test_web_design_followup.py',
    'tools/test_web_design_followup_browser.js', 'tools/prepare_web_design_followup_release.py',
]
paths += [str(p.relative_to(SOURCE)) for p in (SOURCE/'assets/icons/web-technologies').iterdir() if p.is_file()]
runtime = []
for rel in paths:
    data = (SOURCE/rel).read_bytes()
    if rel.endswith('.json'):
        data = data.decode().replace(str(Path.home())+'/Downloads/', 'owner-supplied/').replace(str(Path.home())+'/', 'local-workstation/').encode()
    dest = TARGET/rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    if rel.startswith(('assets/', 'ar/','services/','about/','contact/','faqs/','team/','work/')) or rel == 'index.html':
        runtime.append({'file': rel, 'sha256': digest(data)})
assert blog == {str(p.relative_to(TARGET)): digest(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
receipt = {'baseline': BASE, 'scope': 'Bilingual web-service layout, requested removals, ten technology icons and shared footer contrast. Other pages only receive dependency stamps. Latest published blog retained byte-for-byte.', 'runtimeFiles': runtime, 'blogFilesPreserved': len(blog)}
(TARGET/'tools/web-design-followup-release-2026-10-18.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
print(f'Prepared {len(paths)} files; {len(runtime)} runtime files; preserved {len(blog)} blog files. Not published.')
