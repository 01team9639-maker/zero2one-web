#!/bin/sh
# ============================================================================
#  ZERO 2 ONE — send.php test suite
#  ---------------------------------------------------------------------------
#  Exercises the contact-form handler end to end: validation, the <select>
#  whitelist, header-injection stripping, the honeypot, CSRF guards, the rate
#  limiter, and the UTF-8 mail composition.
#
#  mail() is pointed at a capture script instead of a real MTA, so the exact
#  message send.php produces can be inspected — that is how the Bcc-injection
#  and Arabic-encoding assertions work.
#
#  Needs PHP 8. Uses a local `php` if there is one, otherwise Docker.
#
#  Usage:  sh tools/test_send.sh
# ============================================================================
set -e
cd "$(dirname "$0")/.." || exit 1

if command -v php >/dev/null 2>&1; then
    exec sh "$(dirname "$0")/_test_send_inner.sh"
fi
if ! command -v docker >/dev/null 2>&1; then
    echo "Needs either php or docker on PATH."
    exit 1
fi
if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but the daemon is not running."
    exit 1
fi
echo "No local php — running the suite in php:8.3-cli"
exec docker run --rm -v "$PWD":/app -w /app php:8.3-cli sh tools/_test_send_inner.sh
