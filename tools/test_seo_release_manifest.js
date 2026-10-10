// Fail closed if a scoped SEO release starts carrying other proposed pages.
const fs = require('fs'), cp = require('child_process'), path = require('path'), assert = require('assert').strict;
const root = path.dirname(__dirname), base = '3b068b8f81c6e62f362977b508f6cc96422a4185';
const git = args => cp.execFileSync('git', args, { cwd: root });
const changes = git(['diff', '--name-only', base]).toString().trim().split('\n');
const pages = changes.filter(p => p.endsWith('.html') && !p.endsWith('services/seo-riyadh/index.html'));
const clean = html => html.replace(/(\/assets\/js\/index-new.min.js\?v=)[\w]+/g, '$1HASH');
for (const page of pages) {
  assert.equal(clean(fs.readFileSync(path.join(root, page), 'utf8')), clean(git(['show', base + ':' + page]).toString()), 'out-of-scope page change: ' + page);
}
const allowed = new Set([
  'ar/services/seo-riyadh/index.html', 'services/seo-riyadh/index.html',
  'assets/js/index-new.js', 'assets/js/index-new.min.js',
  'assets/css/seo-owner-review.css', 'assets/css/seo-owner-review.min.css',
  'assets/js/seo-owner-review.js', 'assets/js/seo-owner-review.min.js',
  'tools/SEO-OWNER-RELEASE.md', 'tools/build_seo_release_dependencies.js',
  'tools/prepare_seo_owner_release.js', 'tools/seo-owner-release-copy.json',
  'tools/test_seo_owner_release.js', 'tools/test_seo_release_manifest.js',
  'tools/test_seo_release_navigation.js'
]);
for (const file of changes) {
  assert.ok(allowed.has(file) || pages.includes(file) || /^assets\/images\/seo\/owner-review-2026-10\/(?:[a-z0-9-]+\.webp|release-provenance\.json)$/.test(file), 'unapproved release file: ' + file);
}
for (const file of ['assets/css/bundle.min.css', 'assets/css/style-new.css', 'sitemap.xml', '.htaccess', 'send.php']) {
  assert.equal(fs.readFileSync(path.join(root, file)).equals(git(['show', base + ':' + file])), true, 'unapproved shared change: ' + file);
}
assert.equal(git(['diff', '--name-only', base, '--', 'blog']).toString().trim(), '', 'blog output changed');
for (const route of ['faqs/', 'ar/faqs/', 'team/', 'ar/team/', 'services/mobile-application/', 'services/marketing-consulting/', 'services/manage-google-adwords-campaigns/']) {
  assert.equal(fs.existsSync(path.join(root, route)), false, 'unapproved new destination: ' + route);
}
console.log('PASS scoped SEO release: ' + pages.length + ' other pages have cache-only edits; shared CSS, blog, sitemap, redirects and form are unchanged.');
