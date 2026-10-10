"""One-time preserve the pre-refresh service shell used by case-study builds."""
from pathlib import Path
import tarfile
root=Path(__file__).resolve().parent.parent
out=root/'tools/refresh/case-shell.html.txt'
assert not out.exists(), 'Do not replace the preserved source'
with tarfile.open('/Users/mohammad/Documents/Codex/2026-09-06/id-x20/work/site-refresh-2026-10-07/pre-existing-source.tgz') as tar:
    out.write_bytes(tar.extractfile('./services/brand-identity/index.html').read())
