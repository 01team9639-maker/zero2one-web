#!/bin/sh
# Rebuild the minified CSS bundle + JS after editing any source file.
# Usage:  sh tools/build.sh
cd "$(dirname "$0")/.." || exit 1
cat assets/css/normalize.css \
    assets/css/locomotive-scroll.css \
    assets/css/styleguide.css \
    assets/css/components.css \
    assets/css/style-new.css \
  | npx --yes esbuild --loader=css --minify --charset=utf8 > assets/css/bundle.min.css
npx --yes esbuild assets/js/i18n.js     --minify --charset=utf8 --outfile=assets/js/i18n.min.js
npx --yes esbuild assets/js/index-new.js --minify --charset=utf8 --outfile=assets/js/index-new.min.js
echo "Rebuilt: bundle.min.css, i18n.min.js, index-new.min.js"
