"""Plan/merge approved local source changes over current main; never publish.

Generated pages are rebuilt in the release checkout, never copied over newer
production content. Conflicts are written to a private scratch directory for
explicit review; no conflicted text reaches the release checkout.
"""
from pathlib import Path
import hashlib,json,subprocess,sys,tempfile
SOURCE=Path(__file__).resolve().parent.parent
TARGET=Path(sys.argv[1]).resolve()
BASE='10fae91c5f5c3ba95c15b31abbb4cc99be38cbba'
def git(*args):return subprocess.check_output(['git',*args],cwd=TARGET)
def sha(b):return hashlib.sha256(b).hexdigest()
assert TARGET!=SOURCE
assert not git('status','--porcelain','--untracked-files=no').strip(),'Release checkout must start clean'
head=git('rev-parse','HEAD').decode().strip()
assert head==git('rev-parse','origin/main').decode().strip(),'Review newer main first'
if '--apply-prepared' in sys.argv:
    import re
    scratch=Path(sys.argv[sys.argv.index('--apply-prepared')+1]).resolve()
    plan=json.loads((scratch/'plan.json').read_text());assert plan['baseline']==head
    # Inspected three-way conflict blocks: retain the newly approved deferred
    # services/brand loader; preserve every non-conflicting production edit.
    expected={'assets/js/index-new.js':1,'tools/build.sh':1,'tools/build_site_refresh.py':1,'tools/service_studio.py':3,'tools/refresh/README.md':1}
    assert set(plan['conflicts'])==set(expected)
    for rel in plan['conflicts']:
        source=(scratch/(rel+'.conflict')).read_text()
        def resolve(m):
            if rel=='tools/build.sh':return m[1]+m[2] # portfolio + production 404 CSS
            return m[1]
        data,count=re.subn(r'^<<<<<<<[^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>[^\n]*\n',resolve,source,flags=re.M)
        assert count==expected[rel] and not re.search(r'^(<<<<<<<|=======|>>>>>>>)',data,re.M)
        if rel=='assets/js/index-new.js':
            assert 'if (loaderFailsafeTookOver()) return;' in data
            assert "send_to: 'G-801242QR6K'" in data and "$('.post a[href^=\"#\"]').on" in data
        if rel=='tools/build.sh':assert 'prune_css.py' in data and 'build_404.py' in data
        file=scratch/'ready'/rel;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(data)
        old=(TARGET/rel).read_bytes();plan['changes'].append({'file':rel,'mode':'reviewed-merge','before':sha(old),'sha256':sha(data.encode())})
    plan['resolvedConflicts']=plan.pop('conflicts')
    for entry in plan['changes']:
        rel=entry['file'];dest=TARGET/rel;current=sha(dest.read_bytes()) if dest.exists() else None
        assert current==entry['before'],'Release file changed since plan: '+rel
    plan['blogBefore']={p.relative_to(TARGET).as_posix():sha(p.read_bytes()) for p in (TARGET/'blog').rglob('*') if p.is_file()}
    for entry in plan['changes']:
        rel=entry['file'];dest=TARGET/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((scratch/'ready'/rel).read_bytes())
    (TARGET/'tools/oct24-source-package.json').write_text(json.dumps(plan,indent=2)+'\n')
    print('Applied',len(plan['changes']),'reviewed sources; production fixes and blog retained. No commit/push.');sys.exit(0)
scratch=Path(tempfile.mkdtemp(prefix='zero2one-oct24-release-'))
basefiles=set(git('ls-tree','-r','--name-only',BASE).decode().splitlines())
paths=set(['README.md','llms.txt','sitemap.xml'])
for prefix in ('assets/css','assets/icons','assets/images','tools/refresh','tools/page-copy'):
    paths.update(p.relative_to(SOURCE).as_posix() for p in (SOURCE/prefix).rglob('*') if p.is_file() and p.name!='.DS_Store')
paths.update(p.relative_to(SOURCE).as_posix() for p in (SOURCE/'tools').iterdir() if p.suffix in ('.py','.js','.sh'))
paths.add('assets/js/index-new.js')
skip={'assets/css/bundle.min.css','assets/css/seo-studio-review.min.css','tools/refresh/copy-manifest.json','tools/refresh/coverage.json','tools/refresh/pending.json','tools/refresh/service-studio-image-slots.json'}
changes=[];conflicts=[]
for rel in sorted(paths-skip):
    source=SOURCE/rel
    if not source.exists():continue
    data=source.read_bytes();base=git('show',BASE+':'+rel) if rel in basefiles else None
    if base==data:continue # Never downgrade production-only changes.
    dest=TARGET/rel;published=dest.read_bytes() if dest.exists() else None
    if data==published:continue
    mode='new' if published is None else 'review'
    if published is not None and published!=base:
        if b'\0' in data or (base is None and data!=published):
            conflicts.append(rel);continue
        directory=scratch/rel;directory.parent.mkdir(parents=True,exist_ok=True)
        inputs=[Path(str(directory)+'.'+name) for name in ('review','base','published')]
        for file,body in zip(inputs,(data,base,published)):file.write_bytes(body)
        merged=subprocess.run(['git','merge-file','-p',*map(str,inputs)],capture_output=True)
        data=merged.stdout;mode='merged'
        if merged.returncode:
            Path(str(directory)+'.conflict').write_bytes(data);conflicts.append(rel);continue
    output=scratch/'ready'/rel;output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(data)
    changes.append({'file':rel,'mode':mode,'before':sha(published) if published is not None else None,'sha256':sha(data)})
record={'baseline':head,'reviewBase':BASE,'scratch':str(scratch),'changes':changes,'conflicts':conflicts}
(scratch/'plan.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'baseline':head,'scratch':str(scratch),'files':len(changes),'conflicts':conflicts},indent=2))
if '--apply' in sys.argv:
    assert not conflicts,'Resolve the inspected conflicts first'
    for entry in changes:
        rel=entry['file'];dest=TARGET/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((scratch/'ready'/rel).read_bytes())
    (TARGET/'tools/oct24-source-package.json').write_text(json.dumps(record,indent=2)+'\n')
    print('Applied source files only. Rebuild and QA before any commit/push.')
