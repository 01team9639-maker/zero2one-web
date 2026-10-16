// Mechanical, fail-closed packaging of the owner's Oct 16 SEO-only update.
// No upload or push; retain the dirty local service-family review untouched.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert').strict;
const source=path.dirname(__dirname),target=path.resolve(process.argv[2]||''),baseline='ee52903c99b4ea1c88e37cf312b9b3fc0ae9684f';
const git=args=>cp.execFileSync('git',args,{cwd:target,encoding:'utf8'});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=(root,f)=>fs.readFileSync(path.join(root,f),'utf8');
const clean=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
if(!process.argv[2]||target===source||git(['rev-parse','HEAD']).trim()!==baseline||git(['status','--porcelain','--untracked-files=no']).trim())throw Error('Use the clean verified published release checkout');
const write=(f,s)=>{fs.mkdirSync(path.dirname(path.join(target,f)),{recursive:true});fs.writeFileSync(path.join(target,f),s);};
const routes=['services/seo-riyadh/index.html','ar/services/seo-riyadh/index.html'];
function protectedSeo(s){
 return clean(s).replace(/<!-- SEO TEAM DISABLED:2026-10-16\n([\s\S]*?)\n-->/,'$1')
 .replace(/<section\b[^>]*id="seo-packages"[\s\S]*?<\/section>/,'PACKAGE_SECTION')
 .replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,(all,a,json,z)=>{const value=JSON.parse(json);if(value['@type']!=='Service'||!value.hasOfferCatalog)return all;delete value.hasOfferCatalog.itemListElement;return a+JSON.stringify(value)+z;});
}
for(const f of routes)assert.equal(protectedSeo(read(source,f)),protectedSeo(read(target,f)),'Only the approved packages, offers and exact team comment may differ: '+f);
const pages=git(['ls-files','*.html']).trim().split('\n').sort();
const protectedMarkup=Object.fromEntries(pages.filter(f=>!routes.includes(f)).map(f=>[f,sha(clean(read(target,f)))]));
const copy=f=>write(f,fs.readFileSync(path.join(source,f)));
for(const f of ['tools/page-copy/seo-packages-2026-10.json','tools/seo_packages.py','tools/iconly_icons.py','tools/test_seo_packages.js'])copy(f);
// Capture scope before copying either HTML page; keep previous baselines intact.
cp.execFileSync('node',['tools/test_seo_packages.js','--capture'],{cwd:target,stdio:'inherit'});
const originalScript=read(target,'assets/js/index-new.js'),localScript=read(source,'assets/js/index-new.js');
const next="  root.querySelectorAll('[data-home-scroll]').forEach(function (slider) {";
const start=localScript.indexOf('  // Unlike the compact-only tiles, package disclosures are native'),end=localScript.indexOf(next,start);
if(start<0||end<start||originalScript.includes('.seo-package-disclosure'))throw Error('Unexpected package script boundary');
const scriptInsertion=localScript.slice(start,end);
if(/brand-owner|rf-service-studio|fetch\(|sendBeacon/.test(scriptInsertion))throw Error('Unrelated behavior in package insertion');
const at=originalScript.indexOf(next,originalScript.indexOf('function initEditorialRefresh()'));
if(at<0)throw Error('Missing existing editorial rail boundary');
write('assets/js/index-new.js',originalScript.slice(0,at)+scriptInsertion+originalScript.slice(at));
// Append only the package rules; keep the published SEO-only Iconly tail and
// every earlier SEO rule byte-identical. Shared site CSS is not replaced.
const localCss=read(source,'assets/css/seo-studio-review.css'),originalCss=read(target,'assets/css/seo-studio-review.css');
const cssStart=localCss.indexOf('/* Oct 16 PDF replacement: three complete package comparisons.'),cssEnd=localCss.indexOf('.rf-seo-studio .seo-audience-scroll',cssStart);
const iconMarker='/* SEO-only Iconly chrome; leaving SEO restores the existing site styles. */',cssAt=originalCss.indexOf(iconMarker);
if(cssStart<0||cssEnd<cssStart||cssAt<0||originalCss.includes('Oct 16 PDF replacement'))throw Error('Unexpected package stylesheet boundary');
const cssInsertion=localCss.slice(cssStart,cssEnd)+'\n';
write('assets/css/seo-studio-review.css',originalCss.slice(0,cssAt)+cssInsertion+originalCss.slice(cssAt));
for(const f of routes)copy(f);
write('tools/prepare_seo_packages_release.js',fs.readFileSync(__filename));
write('tools/seo-packages-release-2026-10-16.json',JSON.stringify({baseline,scope:'The two SEO package sections, matching structured offers, commented SEO team and narrowly scoped disclosure dependencies only.',routes,protectedMarkup,scriptInsertion,cssInsertion,publicImagesChanged:false,blog:'Generated output is untouched. Refresh only shared dependency hashes through its owning workflow, retaining published article revision.'},null,2)+'\n');
console.log('Prepared the bilingual SEO package/disclosure/team-comment release only. No publication performed.');
