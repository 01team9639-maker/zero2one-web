const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const report=path.join(ROOT,'tools/reports/site-refresh/cro-owner-images-2026-10-24');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/cro-owner-illustrations-2026-10-24.json'))),entries=new Map(data.entries.map(e=>[e.id,e]));
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-60,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(1000);}
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);}
async function check(browser,origin,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const prefix=lang==='ar'?'/ar':'';await page.goto(origin+prefix+'/services/conversion-rate-optimization/',{waitUntil:'networkidle'});await ready(page);
  assert.equal(await page.locator('[data-owner-cro-image]').count(),37);assert.equal(await page.locator('[data-owner-cro-hero]').count(),1);assert.equal(await page.locator('img[src*="placeholders/conversion-rate-optimization"]').count(),0);
  await page.locator('img[src*="cro-owner-2026-10"]').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  assert.ok(await page.locator('img[src*="cro-owner-2026-10"]').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain'&&e.getAttribute('srcset').split(',').length===3)),'Decoded complete, contained, responsive images');
  for(const kind of ['benefits','know','deliverables','why','audience','outcomes']){
   const expected=data.bindings.filter(b=>b.lang===lang&&b.kind===kind).sort((a,b)=>a.position-b.position).map(b=>b.image);
   assert.deepEqual(await page.locator('[data-service-stage="'+kind+'"] [data-owner-cro-image]').evaluateAll(es=>es.map(e=>e.dataset.ownerCroImage)),expected);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);await page.screenshot({path:path.join(report,lang+'-hero-'+width+'.png')});
  for(const stage of ['benefits','know','deliverables','why','audience','outcomes']){
   await jump(page,'[data-service-stage="'+stage+'"]');
   if(width===440||width===1440)await page.screenshot({path:path.join(report,lang+'-'+stage+'-'+width+'.png')});
  }
  await jump(page,'.service-studio-deliverables');const track=page.locator('.service-studio-deliverables [data-home-scroll-track]');const before=await track.evaluate(e=>e.scrollLeft);await page.locator('.service-studio-deliverables [data-home-scroll-next]').click();await page.waitForTimeout(650);assert.ok(Math.abs(await track.evaluate(e=>e.scrollLeft)-before)>100);
  assert.deepEqual(errors,[]);console.log('PASS supplied CRO images and semantic mapping',lang,width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=['ar','en'].flatMap(lang=>[320,440,834,1440].map(width=>()=>check(browser,origin,lang,width)));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();
 for(const prefix of ['/ar',''])for(const route of ['/','/services/']){
  await page.goto(origin+prefix+route,{waitUntil:'networkidle'});await ready(page);const image=page.locator('img[data-owner-cro-hero]');assert.equal(await image.count(),1);await image.evaluate(e=>{e.loading='eager';return e.decode();});assert.ok(await image.evaluate(e=>e.naturalWidth>0));
 }
 await page.goto(origin+'/ar/services/conversion-rate-optimization/',{waitUntil:'networkidle'});await ready(page);await page.evaluate(()=>window.__croOwnerWarm=1);
 for(const url of ['/services/conversion-rate-optimization/','/ar/services/','/ar/services/conversion-rate-optimization/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__croOwnerWarm),1);assert.equal(await page.locator('[data-owner-cro-image]').count(),url.endsWith('/conversion-rate-optimization/')?37:0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 await context.close();console.log('PASS hero reuse on home/catalogue AR+EN, reduced-motion warm navigation');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
