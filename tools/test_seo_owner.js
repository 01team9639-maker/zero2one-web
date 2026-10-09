const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,cp=require('child_process'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const BASE='750077373ccee3c1bce64f8e1afc0ccb507d1ade';
const route='/ar/services/seo-riyadh/';
(async()=>{
 const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  const before=cp.execFileSync('git',['show',BASE+':ar/services/seo-riyadh/index.html'],{cwd:ROOT,encoding:'utf8'});
  for(const width of [1440,1032,834,390,320]){
   const context=await browser.newContext({viewport:{width,height:width===1032?1400:1000},hasTouch:width<1100});await isolate(context,origin);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__seoReveals=[];const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
     if(this.matches('[data-reveal-scope="seo"]'))window.__seoReveals.push([...document.querySelectorAll('[data-reveal-scope="seo"]')].indexOf(this)+1);
     return original.call(this,frames,options);
    };
   });
   await page.goto(origin+route);await page.waitForTimeout(8500);
   await page.evaluate(before=>{
    const old=new DOMParser().parseFromString(before,'text/html');
    const clean=doc=>{
     const main=doc.querySelector('main').cloneNode(true);
     main.querySelectorAll('#clients,.rf-seo-team,.seo-plan-price,[aria-hidden="true"],script,style,#timeSpan').forEach(e=>e.remove());
     // Explicit added CTA is a duplicate of the approved hero label.
     main.querySelector('#seo-know .seo-section-cta')?.remove();
     return main.textContent.replace(/\s+/g,' ').trim();
    };
    if(clean(old)!==clean(document)){
     const a=clean(old),b=clean(document);let i=0;while(a[i]===b[i]&&i<a.length)i++;
     throw Error('Unapproved copy change at '+i+' BEFORE '+a.slice(i-70,i+150)+' AFTER '+b.slice(i-70,i+150));
    }
    const hero=s=>s.querySelector('.seo-hero-grid').textContent.replace(/\s+/g,' ').trim();
    if(hero(old)!==hero(document))throw Error('Hero text changed');
    if(old.querySelector('header').textContent!==document.querySelector('header').textContent)throw Error('Header text changed');
   },before);
   assert.equal(await page.locator('.rf-seo-team,#clients,.seo-plan-price').count(),0);
   assert.equal(await page.locator('#seo-know .seo-owner-number').count(),7);
   assert.equal(await page.locator('#seo-why-zero2one .seo-owner-number').count(),6);
   assert.equal(await page.locator('#seo-audience .seo-owner-icon').count(),6);
   const move=async selector=>{await page.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-80}),selector);await page.waitForTimeout(900);};
   const buttons=page.locator('.seo-hero-actions .btn-click,#seo-audience .btn-click,#seo-know .btn-click');
   for(let i=0;i<await buttons.count();i++){
    const button=buttons.nth(i);await button.evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-160}));await page.waitForTimeout(350);
    const same=()=>button.evaluate(e=>getComputedStyle(e.querySelector('.btn-text-inner')).color===getComputedStyle(e.querySelector('.service-card-arrow')).stroke);
    assert.equal(await same(),true,'default arrow and text color');await button.hover({force:true});await page.waitForTimeout(450);assert.equal(await same(),true,'hover arrow and text color');
    await page.mouse.move(0,0);await page.waitForTimeout(350);
   }
   for(const id of ['seo-why','seo-know','whats-included','seo-why-zero2one','seo-audience','seo-packages','seo-process']){
    await move('#'+id);await page.locator('#'+id+' img').evaluateAll(es=>Promise.all(es.map(e=>e.complete?Promise.resolve():new Promise(r=>{e.onload=r;e.onerror=r}))));
    if(id==='whats-included'){
     const images=page.locator('#whats-included .seo-card-img');assert.equal(await images.count(),9);
     assert.equal(await images.evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&!e.src.includes('placeholders'))),true);
    }
    const color=await page.locator('#'+id).evaluate(e=>getComputedStyle(e).backgroundColor);
    if(['seo-know','seo-process'].includes(id))assert.equal(color,'rgb(249, 70, 14)');
    if(id==='seo-audience')assert.equal(color,'rgb(255, 253, 237)');
    if(id==='seo-why-zero2one'){
     assert.equal(await page.locator('#'+id+' .seo-owner-wave').count(),2);
     assert.equal(await page.locator('#'+id+' .seo-tile').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgb(255, 253, 237)')),true);
     assert.equal(await page.locator('#'+id+' h3').first().evaluate(e=>getComputedStyle(e).fontWeight),'700');
    }
    await page.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`seo-owner-${id}-${width}.png`)});
   }
   for(let i=0;i<7;i++)await move('#seo-process li:nth-child('+(i+1)+')');
   await page.waitForTimeout(1000);assert.deepEqual(await page.evaluate(()=>window.__seoReveals),[1,2,3,4,5,6,7]);
   await move('.seo-hero-shell');await move('#seo-process');await page.evaluate(()=>{ScrollTrigger.refresh();initEditorialRefresh();});await page.waitForTimeout(1500);
   assert.deepEqual(await page.evaluate(()=>window.__seoReveals),[1,2,3,4,5,6,7],'no replay after return/reinitialization');
   assert.equal(await page.locator('#seo-process li').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'no horizontal overflow');assert.equal(errors.length,0,errors.join('\n'));
   console.log('PASS Arabic SEO owner review',width);await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+route);await page.waitForTimeout(8500);
  assert.equal(await page.locator('[data-reveal-scope="seo"]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);await context.close();console.log('PASS SEO reduced motion');
  const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
  const provenance=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/images/seo/owner-review-2026-10/provenance.json'),'utf8'));
  for(const entry of provenance){
   if(fs.existsSync(entry.original))assert.equal(sha(fs.readFileSync(entry.original)),entry.sha256,'owner original preserved');
   assert.equal(sha(fs.readFileSync(path.join(ROOT,'assets/images/seo/owner-review-2026-10',entry.original_copy))),entry.sha256,'archived original preserved');
  }
  console.log('PASS all 12 original images preserved');
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
