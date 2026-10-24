"""Record the exact approved runtime package and verify it after Git deployment."""
from pathlib import Path
import concurrent.futures,hashlib,json,subprocess,sys,time,urllib.request
ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'tools/all-updates-release-2026-10-24.json'
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
if '--verify-live' in sys.argv:
    manifest=json.loads(DEST.read_text());failed=[];passed=[]
    def verify(entry):
        last=''
        for attempt in range(3):
            try:
                request=urllib.request.Request('https://zero2one.sa/'+entry['file']+'?release=20261024',headers={'User-Agent':'ZERO2ONE-release-check/1.0','Cache-Control':'no-cache'})
                with urllib.request.urlopen(request,timeout=25) as response:
                    actual=sha(response.read());status=response.status
                if status==200 and actual==entry['sha256']:return entry['file'],True,''
                last=f'HTTP {status}, checksum differs'
            except Exception as e:last=str(e)
            if attempt<2:time.sleep(1+attempt)
        return entry['file'],False,last
    # All changed pages/bundles, both portrait densities, each new hero density,
    # and one representative of every new illustration stage. The source
    # manifest also records all other runtime assets for exact reproducibility.
    checks=[e for e in manifest['runtimeFiles'] if e['file'].endswith(('.html','.css','.js','.xml','.txt')) or '/team/' in e['file'] or 'hero-2026-10-24' in e['file'] or ('-owner-2026-10/' in e['file'] and '-01-640.webp' in e['file'])]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for file,ok,error in pool.map(verify,checks):
            (passed if ok else failed).append(file)
            print(('PASS ' if ok else 'WAIT ')+file+(' '+error if error else ''),flush=True)
    report={'verifiedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'passed':passed,'failed':failed,'total':len(checks)}
    out=ROOT/'tools/reports/site-refresh/oct24-publication/live-verification.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
    print(f'LIVE {len(passed)}/{len(checks)} exact file matches.');sys.exit(bool(failed))
plan=json.loads((ROOT/'tools/oct24-source-package.json').read_text());base=plan['baseline']
paths=set(git('diff','--name-only',base).splitlines())|set(git('ls-files','--others','--exclude-standard').splitlines())
runtime=[]
for rel in sorted(paths):
    if rel.startswith(('tools/','blog/','node_modules','assets/icons/iconly/original/')) or rel=='README.md':continue
    file=ROOT/rel
    if file.is_file():runtime.append({'file':rel,'sha256':sha(file.read_bytes()),'bytes':file.stat().st_size})
record={'baseline':base,'authorized':'Owner requested all approved changes on 2026-10-24.',
        'scope':'Updated 14-person bilingual team and portraits; CRO and Email Marketing pages/navigation/home/catalogue/FAQ/sitemap, 76 supplied illustrations and two main photos; balanced CRO layout/CTAs; redesigned bilingual work listing with green results and light closing CTA; brand-only loader site-wide. Existing service refinements retained.',
        'retained':'Newer main production fixes: optimized images, 404/error pages, CSS pruning, loader failsafe, GA4 destination, Arabic language switch, Ads wording, SEO copy corrections and blog anchors. No generated blog or contact-handler edits.',
        'blogFilesPreserved':len(plan['blogBefore']),'runtimeFiles':runtime}
DEST.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print('Recorded',len(runtime),'runtime files;',sum(e['bytes'] for e in runtime)//1024,'KB.')
