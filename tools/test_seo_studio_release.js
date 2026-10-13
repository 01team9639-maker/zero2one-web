// Release isolation and Barba round trips; local GET-only testing, no analytics.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert').strict;
const {chromium}=require('playwright'),{ROOT,serve,isolate}=require('./test_support');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/seo-studio-release-2026-10-13.json')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const original=f=>cp.execFileSync('git',['show',manifest.baseline+':'+f],{cwd:ROOT,encoding:'utf8'});
const clean=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
for(const [file,hash] of Object.entries(manifest.nonSeoMarkup))assert.equal(sha(clean(read(file))),hash,'Non-SEO markup remains unchanged: '+file);
for(const file of ['.htaccess','_redirects','send.php','sitemap.xml','assets/css/style-new.css','assets/css/site-refresh.css','assets/js/i18n.js','assets/js/vendor.min.js'])assert.equal(read(file),original(file),'Protected production file unchanged: '+file);
assert.equal(cp.execFileSync('git',['diff','--name-only',manifest.baseline,'--','blog'],{cwd:ROOT,encoding:'utf8'}).trim(),'','Blog stays independently owned');
for(const item of manifest.publicFiles){
 if(item.file.endsWith('.html'))continue; // Cache stamps are checked separately.
 const bytes=fs.readFileSync(path.join(ROOT,item.file));assert.equal(sha(bytes),item.sha256,'Verified public output '+item.file);
 assert.ok(!/original(?:s)?\/|provenance\.json$/.test(item.file),'Private archives cannot be public release assets');
}
const script=read('assets/js/index-new.js'),baseScript=original('assets/js/index-new.js');
assert.equal(script.slice(0,script.indexOf('function initEditorialRefresh()')),baseScript.slice(0,baseScript.indexOf('function initEditorialRefresh()')),'Legacy script before SEO remains byte-identical');
assert.equal(script.slice(script.indexOf('function initScript()')).replace('  initSeoStudioMotion();\n','').replace('  initSEOFlow();\n',''),baseScript.slice(baseScript.indexOf('function initScript()')),'Contact, portfolio, consent and all other legacy behavior remain byte-identical');
assert.ok(!script.includes('data-brand-disclosures')&&!script.includes('brand-owner'),'Unapproved brand code cannot enter the release');
const palette=/    \/\* Reusable brand options; declaring these does not restyle other pages\. \*\/[\s\S]*?    --color-brand-ivory: #FFFEF8;\n\n/;
assert.equal(read('assets/css/styleguide.css').replace(palette,'').trimEnd(),original('assets/css/styleguide.css').trimEnd(),'Only passive brand palette variables enter shared CSS');
console.log('PASS SEO release boundary, exact assets and unchanged legacy behavior');

(async()=>{
 const browser=await chromium.launch(),{srv,origin}=await serve();
 try{
  for(const lang of ['ar','en']){
   const context=await browser.newContext({viewport:{width:440,height:956},hasTouch:true});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const home=lang==='ar'?'/ar/':'/',seo=(lang==='ar'?'/ar':'')+'/services/seo-riyadh/';
   await page.goto(origin+home,{waitUntil:'networkidle'});await page.waitForTimeout(1700);
   const homepage=await page.locator('.rf-home-page').count();assert.equal(homepage,1);
   const style=()=>page.locator('.rf-home-page h1').evaluate(e=>{const s=getComputedStyle(e);return [s.color,s.fontSize,s.lineHeight];});
   const before=await style();
   await page.evaluate(()=>barba.go(document.documentElement.lang==='ar'?'/ar/services/seo-riyadh/':'/services/seo-riyadh/'));
   await page.waitForSelector('.rf-seo-studio');await page.waitForTimeout(2100);
   assert.equal(await page.locator('link[data-seo-studio-review]').count(),1,'Head sync adds exactly one SEO stylesheet');
   assert.equal(await page.locator('.rf-seo-studio[data-seo-flow-connected]').count(),1,'SEO flow initializes when entering from home');
   assert.equal(await page.locator('#seo-packages .seo-plan-content').count(),4);
   const rail=page.locator('#seo-audience [data-home-scroll-track]');assert.equal(await rail.evaluate(e=>getComputedStyle(e).display),'flex');
   await page.evaluate(()=>barba.go(document.documentElement.lang==='ar'?'/ar/':'/'));
   await page.waitForSelector('.rf-home-page');await page.waitForTimeout(2100);
   assert.deepEqual(await style(),before,'Returning home restores the original computed styles');
   assert.equal(await page.locator('.rf-seo-studio').count(),0);
   await page.goto(origin+seo,{waitUntil:'networkidle'});await page.waitForTimeout(1700);
   assert.equal(await page.locator('.rf-seo-studio[data-seo-flow-connected]').count(),1,'Direct entry initializes too');
   assert.deepEqual(errors,[],'No direct-entry or transition errors');
   await context.close();console.log('PASS clean homepage → SEO → homepage round trip',lang);
  }
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
