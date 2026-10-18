// Image-only responsive QA. All external integrations are isolated.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const newBatch=process.argv.includes('--batch-2026-10-18');
const report=path.join(ROOT,'tools/reports/site-refresh/owner-service-images-'+(newBatch?'2026-10-18':'2026-10-17'));
const counts=newBatch?{
 'ecommerce-development':{ar:37,en:37},'mobile-application':{ar:40,en:40},'marketing-consulting':{ar:37,en:37}
}:{
 'brand-identity':{ar:30,en:31},'digital-advertising':{ar:37,en:37},
 'manage-google-adwords-campaigns':{ar:43,en:42},'social-media-management':{ar:38,en:38}
};
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top-85,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});
 await page.waitForTimeout(1200);
}
async function check(browser,origin,slug,lang,width,options={}){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<1101,...options});
 await isolate(ctx,origin);
 const page=await ctx.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/owner-illustrations-2026-10/'))missing.push(r.url());});
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/'+slug+'/',{waitUntil:'networkidle'});
  if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);
  const arts=page.locator('[data-owner-service-image]');assert.equal(await arts.count(),counts[slug][lang]);
  await arts.locator('img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  assert.equal(await page.locator('[data-temporary-image="true"]').count(),0);
  const dims=await arts.locator('img').evaluateAll(es=>es.map(e=>({loaded:e.complete&&e.naturalWidth>0,square:e.naturalWidth===e.naturalHeight,contain:getComputedStyle(e).objectFit==='contain',w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
  assert.ok(dims.every(e=>e.loaded&&e.square&&e.contain&&e.w>0&&e.h>0),'Artwork is full-frame, visible and loaded');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No page overflow');
  const kinds=['benefits','know','deliverables','complementary','technologies','why','audience','outcomes'];
  for(const kind of kinds){
   const selector='[data-owner-service-image][data-service-image-slot*="/'+kind+'/"]';
   if(!await page.locator(selector).count())continue;
   await jump(page,selector);
   const stage=page.locator(selector).first().locator('xpath=ancestor::section[1]');
   const positions=await stage.evaluate(section=>[...section.querySelectorAll('.service-studio-card')].map(card=>{
    const image=card.querySelector('[data-owner-service-image]'),copy=card.querySelector('.service-studio-card-copy,.service-studio-card-head');
    // Compare layout, not the independently staggered entrance transforms.
    return !!image&&!!copy&&copy.offsetTop>=image.offsetTop+image.offsetHeight-1;
   }));
   assert.ok(positions.every(Boolean),'Text below artwork: '+kind);
   if(width===440&&lang==='ar'&&!Object.keys(options).length)await page.screenshot({path:path.join(report,slug+'-ar-mobile-'+kind+'.png')});
   if(width===1440&&lang==='ar'&&kind==='deliverables')await page.screenshot({path:path.join(report,slug+'-ar-desktop-deliverables.png')});
  }
  if(width<761&&options.javaScriptEnabled!==false){
   await jump(page,'.service-studio-audience');
   const track=page.locator('.service-studio-audience [data-home-scroll-track]');
   assert.ok(await track.evaluate(e=>e.scrollWidth>e.clientWidth));
   await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(300);
   assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Horizontal rail keyboard navigation');
   await jump(page,'.service-studio-why');
   const details=page.locator('.service-studio-why details').nth(1);
   await details.locator('summary').focus();await page.keyboard.press('Enter');
   assert.equal(await details.evaluate(e=>e.open),true,'Native disclosure opens');
  }
  assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
  console.log('PASS owner images',slug,lang,width,JSON.stringify(options));
 }finally{await ctx.close();}
}
(async()=>{
 fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  const tasks=Object.keys(counts).flatMap(slug=>['ar','en'].flatMap(lang=>[320,440,834,1440].map(width=>()=>check(browser,origin,slug,lang,width))));
  let cursor=0;await Promise.all([0,1].map(async()=>{while(cursor<tasks.length)await tasks[cursor++]();}));
  await check(browser,origin,newBatch?'mobile-application':'manage-google-adwords-campaigns','ar',440,{reducedMotion:'reduce'});
  await check(browser,origin,newBatch?'marketing-consulting':'social-media-management','en',440,{javaScriptEnabled:false});
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
