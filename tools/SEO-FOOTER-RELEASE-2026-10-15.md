# Approved SEO and shared footer publication — 2026-10-15

Based on published revision `ea331efaa47fc4d4406851f0f92c3c8b64e70735`.
The two SEO pages receive the approved Arabic phone mockups, responsive hero
frame, permanently expanded audience cards, opposite-side process icons,
Kerolos-only landscape profile after FAQ, localized phone captions without the
small illustration label, and a further-softened scroll ribbon (56% strength).

The approved footer layout is promoted into the common CSS bundle. Destinations,
social accounts, text, certificate and the local clock are preserved. Only footer
layout is changed outside SEO. Unapproved local brand designs are excluded.
Original supplied files and private provenance remain outside the release.

Build with `sh tools/build.sh`; independently verify the scope with
`node tools/test_seo_footer_release.js`. The full shared-footer and SEO browser
suites use local isolation, and never send analytics, forms or messages.
The generated blog must receive current dependency hashes through its owning
build workflow; do not manually edit its generated output.
