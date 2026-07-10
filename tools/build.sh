#!/bin/sh
# Rebuild the minified CSS bundle + JS after editing any source file.
# NOTE: after changing a built file, bump the ?v=N stamp in the HTML
#       (index.html + pages/projects/*.html) so caches fetch it instantly.
# Usage:  sh tools/build.sh
cd "$(dirname "$0")/.." || exit 1

# 1) CSS bundle (order matters)
cat assets/css/normalize.css \
    assets/css/locomotive-scroll.css \
    assets/css/styleguide.css \
    assets/css/components.css \
    assets/css/style-new.css \
  | npx --yes esbuild --loader=css --minify --charset=utf8 > assets/css/bundle.min.css

# 2) site JS
npx --yes esbuild assets/js/i18n.js      --minify --charset=utf8 --outfile=assets/js/i18n.min.js
npx --yes esbuild assets/js/index-new.js --minify --charset=utf8 --outfile=assets/js/index-new.min.js

# 3) vendor bundle (exact library load order; sources in assets/js/vendor/)
{
  cat assets/js/vendor/jquery-3.5.1.min.js;        printf '\n;\n'
  cat assets/js/vendor/js.cookie-2.2.0.min.js;     printf '\n;\n'
  cat assets/js/vendor/gsap-3.9.1.min.js;          printf '\n;\n'
  cat assets/js/vendor/ScrollTrigger-3.9.1.min.js; printf '\n;\n'
  cat assets/js/vendor/barba-2.10.3.min.js;        printf '\n;\n'
  cat assets/js/vendor/lazyload-17.6.1.min.js;     printf '\n;\n'
  cat assets/js/vendor/locomotive-scroll.min.js;   printf '\n'
} > assets/js/vendor.min.js

echo "Rebuilt: bundle.min.css, i18n.min.js, index-new.min.js, vendor.min.js"
