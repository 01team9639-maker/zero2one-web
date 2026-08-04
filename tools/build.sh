#!/bin/sh
# Rebuild the minified CSS bundle + JS after editing any source file.
# The ?v= stamps are rewritten automatically from each file's content hash
# by tools/stamp_assets.py at the end of this script — never bump them by hand.
# Usage:  sh tools/build.sh
set -eu
cd "$(dirname "$0")/.." || exit 1

ESBUILD="./node_modules/.bin/esbuild"
if [ ! -x "$ESBUILD" ]; then
  echo "esbuild is not installed. Run: npm ci"
  exit 1
fi

# 1) CSS bundle (order matters)
cat assets/css/normalize.css \
    assets/css/locomotive-scroll.css \
    assets/css/styleguide.css \
    assets/css/components.css \
    assets/css/style-new.css \
  | "$ESBUILD" --loader=css --minify --charset=utf8 > assets/css/bundle.min.css

# 2) site JS
"$ESBUILD" assets/js/dom.js       --minify --charset=utf8 --outfile=assets/js/dom.min.js
"$ESBUILD" assets/js/i18n.js      --minify --charset=utf8 --outfile=assets/js/i18n.min.js
"$ESBUILD" assets/js/index-new.js --minify --charset=utf8 --outfile=assets/js/index-new.min.js

# 3) vendor bundle (exact library load order; sources in assets/js/vendor/)
{
  # our own 5 KB jQuery subset (assets/js/dom.js) in place of jQuery's 87 KB —
  # see the header of that file for why, and tools/test_dom.js for the tests
  cat assets/js/dom.min.js;                        printf '\n;\n'
  cat assets/js/vendor/js.cookie-2.2.0.min.js;     printf '\n;\n'
  cat assets/js/vendor/gsap-3.9.1.min.js;          printf '\n;\n'
  cat assets/js/vendor/ScrollTrigger-3.9.1.min.js; printf '\n;\n'
  cat assets/js/vendor/barba-2.10.3.min.js;        printf '\n;\n'
  cat assets/js/vendor/locomotive-scroll.min.js;   printf '\n'
} > assets/js/vendor.min.js

# 4) re-stamp every ?v= in the HTML with a hash of the file it points at, so a
#    changed bundle always gets a fresh URL and the 1-year cache stays correct
python3 tools/stamp_assets.py

echo "Rebuilt: bundle.min.css, i18n.min.js, index-new.min.js, vendor.min.js"
