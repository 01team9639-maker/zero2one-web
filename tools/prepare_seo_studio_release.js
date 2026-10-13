// Isolate the approved bilingual SEO Studio review from unrelated local work.
// Run once against a clean checkout of the verified published revision.
// No upload, push, original-image copy, form or tracking request is performed.
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const review=path.dirname(__dirname),target=path.resolve(process.argv[2]||'');
const base='2e183cfb087f8b466885b212e5dd2ebe400f4217';
if(!process.argv[2]||target===review)throw Error('Pass the separate clean release checkout');
const git=args=>cp.execFileSync('git',args,{cwd:target,encoding:'utf8'});
if(git(['rev-parse','HEAD']).trim()!==base)throw Error('Release base does not match the verified published revision');
if(git(['status','--porcelain','--untracked-files=no']).trim())throw Error('Release checkout has tracked edits; preserve them and stop');
const read=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(file,contents)=>{fs.mkdirSync(path.dirname(path.join(target,file)),{recursive:true});fs.writeFileSync(path.join(target,file),contents);};
const publicFiles=[];
function copy(file){const bytes=fs.readFileSync(path.join(review,file));write(file,bytes);publicFiles.push({file,sha256:sha(bytes),bytes:bytes.length});}
const routes=['ar/services/seo-riyadh/index.html','services/seo-riyadh/index.html'];
// Capture the non-SEO release tree independently, before copying either page.
const clean=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
const html=cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**'],{cwd:target,encoding:'utf8'}).trim().split('\n').sort();
const unrelated=Object.fromEntries(html.filter(f=>!routes.includes(f)).map(f=>[f,sha(clean(read(target,f)))]));

// Shared behavior is copied only at the SEO enhancement boundary. Form,
// portfolio, consent, navigation, About and all other initializers stay intact.
const original=read(target,'assets/js/index-new.js'),local=read(review,'assets/js/index-new.js');
const editorialStart=local.indexOf('function initEditorialRefresh()'),motionStart=local.indexOf('// SEO-only studio motion.');
const localInit=local.indexOf('function initScript()');
if(editorialStart<0||motionStart<editorialStart||localInit<motionStart)throw Error('Missing reviewed SEO enhancement boundaries');
let editorial=local.slice(editorialStart,motionStart);
const brandStart=editorial.indexOf('  // Brand deliverables disclose'),brandEnd=editorial.indexOf('  var whiteCards =',brandStart);
if(brandStart<0||brandEnd<brandStart)throw Error('Missing unrelated brand boundary');
editorial=editorial.slice(0,brandStart)+editorial.slice(brandEnd);
editorial=editorial.replace("var enhancedStep = card.dataset.revealScope === 'seo' || card.dataset.revealScope === 'brand';","var seoStep = card.dataset.revealScope === 'seo';").replace(/\benhancedStep\b/g,'seoStep');
if(/brand-owner|data-brand-|revealScope === 'brand'/.test(editorial))throw Error('Unapproved brand implementation remains');
const start=original.indexOf('function initEditorialRefresh()'),end=original.indexOf('function initScript()',start);
if(start<0||end<start||original.includes('function initSeoStudioMotion'))throw Error('Unexpected published script structure');
let script=original.slice(0,start)+editorial+local.slice(motionStart,localInit)+original.slice(end);
script=script.replace('  initEditorialRefresh();','  initEditorialRefresh();\n  initSeoStudioMotion();\n  initSEOFlow();');
write('assets/js/index-new.js',script);

// Only passive palette declarations enter the shared CSS. Every visual rule
// for Studio and its Iconly menu/footer chrome is gated by the SEO container.
const styleguide=read(review,'assets/css/styleguide.css');
const palette=/    \/\* Reusable brand options; declaring these does not restyle other pages\. \*\/[\s\S]*?    --color-brand-ivory: #FFFEF8;\n\n/;
if(!palette.test(styleguide)||styleguide.replace(palette,'').trimEnd()!==read(target,'assets/css/styleguide.css').trimEnd())throw Error('Unexpected shared stylesheet edits');
copy('assets/css/styleguide.css');
function selectors(text){
 let start=0,depth=0,parts=[];
 for(let i=0;i<text.length;i++){if(text[i]==='('||text[i]==='[')depth++;if(text[i]===')'||text[i]===']')depth--;if(text[i]===','&&!depth){parts.push(text.slice(start,i).trim());start=i+1;}}
 parts.push(text.slice(start).trim());return parts;
}
const icons=read(review,'assets/css/iconly-ui.css').replace(/\/\*[\s\S]*?\*\//g,'').replace(/([^{}]+)\{/g,(match,header)=>{
 if(header.trim().startsWith('@'))return match;
 return selectors(header).map(s=>'body:has(main.rf-seo-studio) '+s).join(',\n')+' {';
});
write('assets/css/seo-studio-review.css',read(review,'assets/css/seo-studio-review.css')+'\n/* SEO-only Iconly chrome; leaving SEO restores the existing site styles. */\n'+icons);
for(const route of routes)copy(route);
// Copy optimized public outputs only; keep supplied originals/local paths out
// of the hosting tree. The originals remain in the untouched review archive.
for(const directory of ['assets/images/seo/illustrations-2026-10-13','assets/images/seo/phone-mockups-2026-10-12','assets/icons/iconly']){
 function walk(dir){for(const entry of fs.readdirSync(path.join(review,dir),{withFileTypes:true})){
  const file=dir+'/'+entry.name;
  if(entry.isDirectory()){if(directory!=='assets/icons/iconly'&&entry.name!=='originals')walk(file);}
  else if(/\.(?:webp|svg)$/.test(entry.name))copy(file);
 }}walk(directory);
}
// Rebuild uses the established exact compiler/asset stamping workflow, without
// importing proposed brand styles or calling the historical partial packager.
let build=read(target,'tools/build.sh');
if(build.includes('seo-studio-review'))throw Error('Unexpected existing Studio build');
build=build.replace('# 2) JS', '# 2) JS');
const buildPoint='"$ESBUILD" assets/js/dom.js';
if(!build.includes(buildPoint))throw Error('Missing locked compiler boundary');
build=build.replace(buildPoint,'if [ -f assets/css/seo-studio-review.css ]; then\n  "$ESBUILD" assets/css/seo-studio-review.css --minify --charset=utf8 --outfile=assets/css/seo-studio-review.min.css\n  node tools/stamp_seo_studio_style.js\nfi\n\n'+buildPoint);
write('tools/build.sh',build);
write('tools/stamp_seo_studio_style.js',read(review,'tools/stamp_seo_studio_style.js'));
// Run the exact reviewed browser tests against this release tree, using local
// original-image records only when explicitly supplied for asset validation.
copy('tools/test_seo_studio.js');
let test=read(review,'tools/test_seo_premium.js');
test=test.replace(/unrelatedCount:79,unrelatedHash:'[^']+'/,"unrelatedCount:"+Object.keys(unrelated).length+",unrelatedHash:'"+sha(JSON.stringify(unrelated))+"'");
test=test.replace("const reports=path.join(ROOT,'tools/reports/site-refresh');","const reports=path.join(ROOT,'tools/reports/site-refresh');\nconst reviewRoot=path.resolve(process.env.SEO_STUDIO_REVIEW_ROOT||ROOT);");
test=test.replace("path.join(ROOT,'assets/icons/iconly/provenance.json')","path.join(reviewRoot,'assets/icons/iconly/provenance.json')");
test=test.replace("const directory=path.join(ROOT,phoneRoot),provenance=JSON.parse(fs.readFileSync(path.join(directory,'provenance.json'),'utf8'));","const directory=path.join(ROOT,phoneRoot),archive=path.join(reviewRoot,phoneRoot),provenance=JSON.parse(fs.readFileSync(path.join(archive,'provenance.json'),'utf8'));");
test=test.replace('path.join(directory,record.originalCopy)','path.join(archive,record.originalCopy)');
write('tools/test_seo_premium.js',test);
write('tools/prepare_seo_studio_release.js',fs.readFileSync(__filename));
write('tools/seo-studio-release-2026-10-13.json',JSON.stringify({baseline:base,scope:'Both SEO service pages and their dependencies only; other page edits are cache stamps.',nonSeoMarkup:unrelated,publicFiles,originals:'Unmodified originals retained only in the local review archive.',iconLicense:'Free Iconly Essential Light: https://piqodesign.gumroad.com/l/iconly',reviewedSource:{script:sha(local),stylesheet:sha(read(review,'assets/css/seo-studio-review.css'))}},null,2)+'\n');
console.log('Prepared SEO-only release: two pages, '+publicFiles.filter(f=>/\.webp$/.test(f.file)).length+' optimized images, '+publicFiles.filter(f=>/\.svg$/.test(f.file)).length+' free icons. No publication performed.');
