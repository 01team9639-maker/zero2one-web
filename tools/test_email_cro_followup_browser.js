const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const report=path.join(ROOT,'tools/reports/site-refresh/email-owner-images-2026-10-24');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/email-owner-illustrations-2026-10-24.json')));
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);}
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-60,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(1000);}
async function check(browser,origin,slug,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const prefix=lang==='ar'?'/ar':'';await page.goto(origin+prefix+'/services/'+slug+'/',{waitUntil:'networkidle'});await ready(page);
  if(slug==='email-marketing'){
   assert.equal(await page.locator('[data-owner-email-image]').count(),37);assert.equal(await page.locator('[data-owner-email-hero]').count(),1);assert.equal(await page.locator('img[src*="placeholders/email-marketing"]').count(),0);
   await page.locator('img[src*="email-owner-2026-10"]').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
   assert.ok(await page.locator('img[src*="email-owner-2026-10"]').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain'&&e.getAttribute('srcset').split(',').length===3)));
   for(const kind of ['benefits','know','deliverables','why','audience','outcomes']){
    const expected=data.bindings.filter(b=>b.lang===lang&&b.kind===kind).sort((a,b)=>a.position-b.position).map(b=>b.image);
    assert.deepEqual(await page.locator('[data-service-stage="'+kind+'"] [data-owner-email-image]').evaluateAll(es=>es.map(e=>e.dataset.ownerEmailImage)),expected);
   }
   if([440,1440].includes(width))await page.screenshot({path:path.join(report,lang+'-hero-'+width+'.png')});
   for(const stage of ['know','deliverables','why','audience','outcomes']){
    await jump(page,'[data-service-stage="'+stage+'"]');
    if([440,1440].includes(width))await page.screenshot({path:path.join(report,lang+'-'+stage+'-'+width+'.png')});
   }
   await jump(page,'.service-studio-deliverables');const track=page.locator('.service-studio-deliverables [data-home-scroll-track]');const before=await track.evaluate(e=>e.scrollLeft);await page.locator('.service-studio-deliverables [data-home-scroll-next]').click();await page.waitForTimeout(650);assert.ok(Math.abs(await track.evaluate(e=>e.scrollLeft)-before)>100);
  }else{
   await jump(page,'.service-studio-know');
   const cards=page.locator('.service-studio-know .service-studio-card');assert.equal(await cards.count(),7);
   const geometry=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,x:r.x,span:getComputedStyle(e).gridColumn};}));
   if(width>760){assert.ok(geometry[0].width>geometry[1].width*1.8,'First CRO card shares approved wide-card layout');assert.ok(geometry[6].width>geometry[1].width*1.8,'Last CRO card is wide');}
   if(width>1100){assert.ok(Math.abs(geometry[0].width-geometry[6].width)<2);assert.ok(Math.abs(geometry[5].width-geometry[1].width)<2);}
   if([440,834,1440].includes(width))await page.screenshot({path:path.join(report,lang+'-cro-know-'+width+'.png')});
   for(const stage of ['audience','packages','closing']){
    const selector='[data-service-stage="'+stage+'"]';await jump(page,selector+' .service-studio-action');
    const link=page.locator(selector+' .service-studio-action a');assert.equal(await link.count(),1);assert.ok((await link.getAttribute('href')).startsWith('https://wa.me/'));
    const box=await link.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),l=e.querySelector('.btn-text-inner').getBoundingClientRect();return {x:r.x,w:r.width,h:r.height,color:s.color,label:l.width,display:getComputedStyle(e.parentElement).display,container:e.closest('.service-studio-inner').getBoundingClientRect().toJSON()};});
    assert.ok(box.x>=0&&box.x+box.w<=width+1);assert.ok(box.w>Math.min(260,width*.7)&&box.w<=381);assert.ok(box.h>=(width>760?64:56));assert.equal(box.display,'flex');assert.equal(box.color,'rgb(255, 253, 237)');assert.ok(Math.abs(box.x+box.w/2-box.container.x-box.container.width/2)<2,'Centered CTA');
    await link.focus();assert.equal(await link.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
    if([440,1440].includes(width))await page.screenshot({path:path.join(report,lang+'-cro-'+stage+'-'+width+'.png')});
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS',slug,lang,width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=['email-marketing','conversion-rate-optimization'].flatMap(slug=>['ar','en'].flatMap(lang=>[320,440,834,1440].map(width=>()=>check(browser,origin,slug,lang,width))));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();
 for(const prefix of ['/ar',''])for(const route of ['/','/services/']){
  await page.goto(origin+prefix+route,{waitUntil:'networkidle'});await ready(page);const image=page.locator('img[data-owner-email-hero]');assert.equal(await image.count(),1);await image.evaluate(e=>{e.loading='eager';return e.decode();});assert.ok(await image.evaluate(e=>e.naturalWidth>0));
 }
 await page.goto(origin+'/ar/services/email-marketing/',{waitUntil:'networkidle'});await ready(page);await page.evaluate(()=>window.__emailWarm=1);
 for(const url of ['/services/email-marketing/','/ar/services/conversion-rate-optimization/','/ar/services/email-marketing/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__emailWarm),1);assert.equal(await page.locator('[data-owner-email-image]').count(),url.includes('/email-marketing/')?37:0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 await context.close();console.log('PASS Email hero on home/catalogue AR+EN; reduced-motion warm navigation');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
