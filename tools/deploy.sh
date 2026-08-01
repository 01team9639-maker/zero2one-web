#!/bin/sh
# ============================================================================
#  ZERO 2 ONE — deploy
#  ---------------------------------------------------------------------------
#  Uploads the site and then verifies the result. Two transports:
#
#      rsync over SSH   (preferred — Hostinger supports SSH on most plans)
#      lftp over FTP    (fallback)
#
#  Both are configured here to copy dotfiles. That matters: .htaccess is a
#  dotfile, and a drag-and-drop FTP upload usually skips it silently, which is
#  how the 301 redirects go missing. Using this script instead of the file
#  manager removes that failure mode.
#
#  Configure once (put these in your shell profile, never commit them):
#
#      export Z2O_SSH_HOST="u123456789@example.hostingersite.com"
#      export Z2O_SSH_PORT=65002
#      export Z2O_REMOTE_DIR="public_html"
#      # …or, for FTP:
#      export Z2O_FTP_HOST="ftp.zero2one.sa"
#      export Z2O_FTP_USER="u123456789"
#      export Z2O_FTP_PASS="…"
#
#  Usage:
#      sh tools/deploy.sh              # dry run — shows what WOULD change
#      sh tools/deploy.sh --live       # actually upload, then verify
# ============================================================================
set -e
cd "$(dirname "$0")/.." || exit 1

LIVE=0
[ "$1" = "--live" ] && LIVE=1

REMOTE_DIR="${Z2O_REMOTE_DIR:-public_html}"

# --- 1) make sure what we are about to ship is internally consistent ---------
echo "==> Pre-flight"
python3 tools/check_provenance.py
python3 tools/build_redirects.py --check
python3 tools/build_form.py --check
python3 tools/check_css_collisions.py >/dev/null && echo "  no CSS class collisions"
python3 tools/build_ar.py --check  >/dev/null && echo "  Arabic tree builds clean"
python3 tools/audit.py             >/dev/null && echo "  audit: 0 errors"
python3 tools/check_links.py --internal-only >/dev/null && echo "  links: none broken"
echo

# Everything that must NOT be uploaded. Note that .htaccess is deliberately
# absent from this list — it has to go up with every deploy.
EXCLUDES="
.git
.gitignore
.DS_Store
.vscode
.mcp.json
node_modules
tools
README.md
"

# --- 2) upload ---------------------------------------------------------------
if [ -n "$Z2O_SSH_HOST" ]; then
    echo "==> rsync over SSH -> $Z2O_SSH_HOST:$REMOTE_DIR"
    RSYNC_EXCLUDES=""
    for e in $EXCLUDES; do RSYNC_EXCLUDES="$RSYNC_EXCLUDES --exclude=$e"; done
    # -a copies dotfiles; --delete keeps the remote from accumulating stale files
    FLAGS="-az --delete --human-readable --itemize-changes"
    [ "$LIVE" -eq 1 ] || FLAGS="$FLAGS --dry-run"
    # shellcheck disable=SC2086
    rsync $FLAGS -e "ssh -p ${Z2O_SSH_PORT:-22}" $RSYNC_EXCLUDES \
        ./ "$Z2O_SSH_HOST:$REMOTE_DIR/"

elif [ -n "$Z2O_FTP_HOST" ]; then
    echo "==> lftp over FTP -> $Z2O_FTP_HOST/$REMOTE_DIR"
    command -v lftp >/dev/null 2>&1 || { echo "lftp not installed (brew install lftp)"; exit 1; }
    LFTP_EXCLUDES=""
    for e in $EXCLUDES; do LFTP_EXCLUDES="$LFTP_EXCLUDES --exclude-glob $e"; done
    MIRROR="mirror --reverse --delete --verbose --parallel=4"
    [ "$LIVE" -eq 1 ] || MIRROR="$MIRROR --dry-run"
    lftp -c "
        set ftp:ssl-allow true;
        set ssl:verify-certificate false;
        open -u '$Z2O_FTP_USER','$Z2O_FTP_PASS' '$Z2O_FTP_HOST';
        $MIRROR $LFTP_EXCLUDES ./ '$REMOTE_DIR';
        bye"

else
    cat <<'EOF'
No transport configured.

Set Z2O_SSH_HOST (preferred) or Z2O_FTP_HOST — see the header of this file.

Uploading by hand instead? Two things to get right:
  1. Turn on "show hidden files" in your FTP client, or .htaccess and the
     redirects it carries will be left behind.
  2. Upload .htaccess in the SAME session as everything else.
Then run:  python3 tools/verify_deploy.py
EOF
    exit 1
fi

# --- 3) verify what actually landed -----------------------------------------
echo
if [ "$LIVE" -eq 1 ]; then
    echo "==> Verifying the live site"
    python3 tools/verify_deploy.py
else
    echo "Dry run finished — nothing was uploaded."
    echo "Re-run with --live to deploy, then verify with tools/verify_deploy.py"
fi
