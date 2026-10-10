// Mechanical packaging of an approved local SEO review, never a full-site build.
// Usage: node tools/prepare_seo_owner_release.js /absolute/review/checkout
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const root = path.dirname(__dirname), review = path.resolve(process.argv[2] || '');
if (!process.argv[2] || review === root) throw Error('Pass the separate approved review checkout');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const stamp = asset => sha(fs.readFileSync(path.join(root, asset.slice(1)))).slice(0, 8);
const routes = ['ar/services/seo-riyadh/index.html', 'services/seo-riyadh/index.html'];
const unpublished = ['manage-google-adwords-campaigns', 'mobile-application', 'marketing-consulting'];
for (const route of routes) {
  let html = fs.readFileSync(path.join(review, route), 'utf8');
  // Keep the reviewed dropdown but only link to already-published destinations.
  for (const slug of unpublished) html = html.replace(new RegExp('<a href="/(?:ar/)?services/' + slug + '/">[^<]*</a>', 'g'), '');
  // The full FAQ page is not yet approved; this page already has its SEO FAQ.
  html = html.replace(/href="\/(?:ar\/)?faqs\/"/g, 'href="#faq"');
  html = html.replace(/(<link href="\/assets\/css\/bundle.min.css\?v=)[^"]+/,
    '$1' + stamp('/assets/css/bundle.min.css'));
  html = html.replace(/(<script defer src="\/assets\/js\/index-new.min.js\?v=)[^"]+/,
    '$1' + stamp('/assets/js/index-new.min.js'));
  html = html.replace('</head>', '<link rel="stylesheet" href="/assets/css/seo-owner-review.min.css?v=' + stamp('/assets/css/seo-owner-review.min.css') + '">\n</head>');
  fs.writeFileSync(path.join(root, route), html);
}
const assets = 'assets/images/seo/owner-review-2026-10';
fs.mkdirSync(path.join(root, assets), { recursive: true });
const privateProvenance = path.join(review, 'tools/refresh/image-archives/seo-owner-review-2026-10/provenance.json');
// Compatibility with the immutable earlier local review; new releases keep
// source paths and originals behind the existing /tools/ publication deny rule.
const provenance = JSON.parse(fs.readFileSync(fs.existsSync(privateProvenance) ? privateProvenance : path.join(review, assets, 'provenance.json')));
const images = provenance.map(item => {
  const outputs = item.outputs.map(output => {
    // Some source manifests use path strings, others output metadata records.
    const name = typeof output === 'string' ? output : output.file;
    const basename = path.basename(name);
    const original = path.join(review, assets, basename), target = path.join(root, assets, basename);
    fs.copyFileSync(original, target);
    return { file: basename, sha256: sha(fs.readFileSync(target)) };
  });
  return { original: path.basename(item.original_copy), original_sha256: item.sha256, outputs };
});
fs.writeFileSync(path.join(root, assets, 'release-provenance.json'), JSON.stringify({
  review_commit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: review, encoding: 'utf8' }).trim(),
  note: 'Owner originals remain unchanged in the local review archive. Mockups are illustrative, not independent ranking or endorsement evidence.',
  images
}, null, 2) + '\n');
console.log('Prepared exactly two SEO pages and ' + images.reduce((n, i) => n + i.outputs.length, 0) + ' optimized images. No other page content or stylesheet bundle changed.');
