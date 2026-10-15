// Verify the deployment boundary independently of the dirty review checkout.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert').strict;
const root=path.dirname(__dirname),manifest=require('./seo-footer-release-2026-10-15.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const before=f=>cp.execFileSync('git',['show',manifest.baseline+':'+f],{cwd:root,encoding:'utf8'});
const clean=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
for(const [file,hash] of Object.entries(manifest.protectedMarkup))assert.equal(sha(clean(read(file))),hash,'Only dependency versions change outside the two SEO pages: '+file);
for(const file of ['.htaccess','_redirects','send.php','sitemap.xml','assets/css/styleguide.css','assets/css/style-new.css','assets/css/site-refresh.css','assets/js/i18n.js','assets/js/vendor.min.js'])assert.equal(read(file),before(file),'Protected production file: '+file);
const script=read('assets/js/index-new.js'),original=before('assets/js/index-new.js');
const normalize=s=>s.replace(/var seoStudioStylesheet='[^']+';/,"var seoStudioStylesheet='CONTENT_HASH';");
assert.equal(normalize(script.slice(0,script.indexOf('function initSEOFlow()'))),normalize(original.slice(0,original.indexOf('function initSEOFlow()'))),'All script behavior before the flow initializer remains identical');
assert.equal(script.slice(script.indexOf('function initScript()')),original.slice(original.indexOf('function initScript()')),'All legacy behavior after the flow initializer remains identical');
assert.ok(!script.includes('brand-owner')&&!script.includes('data-brand-disclosures'),'No unapproved brand code');
const marker='/* SEO-only Iconly chrome; leaving SEO restores the existing site styles. */';
assert.equal(read('assets/css/seo-studio-review.css').split(marker)[1],before('assets/css/seo-studio-review.css').split(marker)[1],'Previously approved SEO-only icons remain gated');
assert.ok(!read('tools/build.sh').includes('brand-identity-owner.css'),'No unapproved brand styles');
for(const item of manifest.publicFiles){if(item.file.endsWith('.html'))continue;assert.equal(sha(fs.readFileSync(path.join(root,item.file))),item.sha256,'Reviewed public dependency '+item.file);}
const supplied=fs.readdirSync(path.join(root,'assets/images/seo/phone-mockups-ar-2026-10-14'));
assert.equal(supplied.length,9);assert.ok(supplied.every(f=>f.endsWith('.webp')),'Only optimized public images are uploaded');
console.log('PASS exact approved assets, non-SEO copy, shared footer scope and protected behavior');
