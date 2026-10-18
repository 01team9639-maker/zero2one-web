// Local brand-only follow-up. Analytics and all external destinations isolated.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/brand-followup-2026-10-18');
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-80,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});
 await page.waitForTimeout(1300);
}
async function check(browser,origin,lang,width,options={}){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<=1100,...options});await isolate(ctx,origin);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/brand-identity/',{waitUntil:'networkidle'});
  if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('.service-studio-deliverables img,.service-studio-outcomes img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  assert.equal(await page.locator('#section-9').count(),0,'Investment section removed');
  assert.equal(await page.locator('.service-studio-deliverables .service-studio-card').count(),lang==='ar'?8:9,'Independent approved bilingual card counts retained');
  for(const selector of ['.service-studio-deliverables','.service-studio-audience','.service-studio-process','.service-studio-outcomes']){
   await jump(page,selector);
   if(selector==='.service-studio-deliverables'){
    const heights=await page.locator(selector+' .service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));
    assert.ok(Math.max(...heights)-Math.min(...heights)<3,'Deliverables all share equal measurements');
    assert.ok(await page.locator(selector+' h3').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='block')),'Natural title word spacing');
    assert.ok(await page.locator(selector+' .service-studio-art').evaluateAll(es=>es.every(e=>e.offsetHeight===230)),'Consistent image stages');
   }
   if(selector==='.service-studio-audience'){
    const button=page.locator(selector+' .service-studio-action .btn-click');
    const bounds=await button.boundingBox();assert.ok(bounds.width>=Math.min(284,width-36)&&bounds.width<=381&&bounds.height>=68,'Large balanced CTA pill');
    assert.equal(await button.evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');
    assert.ok((await button.getAttribute('href')).startsWith('https://wa.me/'),'Existing consultation destination retained');
    if(options.javaScriptEnabled!==false){await button.focus();await page.waitForTimeout(300);assert.equal(await button.locator('.btn-text-inner').evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');await button.evaluate(e=>e.blur());}
   }
   if(selector==='.service-studio-process'){
    const steps=await page.locator(selector+' .service-studio-step').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop})));
    assert.equal(steps.length,7);assert.ok(steps.every((e,i)=>!i||e.y>steps[i-1].y),'Seven steps remain in source order');
    if(width>1100)assert.ok(Math.abs(steps[0].x-steps[1].x)>100&&steps[0].x===steps[2].x,'Alternating two-sided desktop timeline');
    else assert.ok(steps.every(e=>e.x===steps[0].x),'Compact process stays a single readable column');
   }
   if(selector==='.service-studio-outcomes'){
    assert.equal(await page.locator(selector+' .service-card').count(),6);assert.equal(await page.locator(selector+' details,'+selector+' summary').count(),0,'Result content permanently visible');
    assert.equal(await page.locator(selector+' picture').count(),6,'All six original responsive photographs');
    assert.ok(await page.locator(selector+' h3').evaluateAll((es,dir)=>es.every(e=>getComputedStyle(e).direction===dir),lang==='ar'?'rtl':'ltr'),'Result title words follow the page language, including mobile');
    assert.ok(await page.locator(selector+' .service-card-text').evaluateAll(es=>es.length===6&&es.every(e=>getComputedStyle(e).display!=='none'&&e.offsetHeight>20)),'All six descriptions remain visible even on small screens');
    assert.ok(await page.locator(selector+' .service-card-media').evaluateAll(es=>es.every(e=>getComputedStyle(e).position==='relative'&&Math.abs(e.offsetWidth-e.offsetHeight)<2)),'Square full-width image stages at every breakpoint');
    assert.ok(await page.locator(selector+' .service-card').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderRadius==='48px'&&e.querySelector('.service-card-media > picture')&&e.querySelector('.service-card-body > h3')&&getComputedStyle(e.querySelector('.service-card-body')).backgroundImage.includes('linear-gradient'))),'Homepage image/cream-gradient anatomy');
    assert.ok(await page.locator(selector+' img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth&&getComputedStyle(e).objectFit==='cover')),'Images fill the card without inner gutters');
    const heights=await page.locator(selector+' .service-card').evaluateAll(es=>es.map(e=>e.offsetHeight));assert.ok(Math.max(...heights)-Math.min(...heights)<3,'Equal result card measurements');
    const track=page.locator(selector+' [data-home-scroll-track]');
    if(await page.evaluate(()=>matchMedia('(max-width:760px), (max-width:1100px) and (orientation:portrait)').matches)){
     assert.ok(await track.evaluate(e=>e.scrollWidth>e.clientWidth+30),'Mobile/tablet results scroll horizontally');
     if(options.javaScriptEnabled!==false){await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(500);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Keyboard result rail works');await track.evaluate(e=>{e.scrollTo({left:0,behavior:'instant'});e.blur();});}
    }
    else assert.equal(await track.evaluate(e=>getComputedStyle(e).display),'grid','Desktop results form a grid');
   }
   if(lang==='ar'&&[440,1440].includes(width)&&!Object.keys(options).length)await page.screenshot({path:path.join(report,'brand-'+width+'-'+selector.slice(1)+'.png')});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No page overflow');assert.deepEqual(errors,[]);
  console.log('PASS brand follow-up',lang,width,JSON.stringify(options));
 }finally{await ctx.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();
 try{const tasks=['ar','en'].flatMap(lang=>[320,440,834,1100,1440,1920].map(width=>()=>check(browser,origin,lang,width)));let index=0;await Promise.all([0,1].map(async()=>{while(index<tasks.length)await tasks[index++]();}));await check(browser,origin,'ar',440,{reducedMotion:'reduce'});await check(browser,origin,'en',440,{javaScriptEnabled:false});}
 finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
