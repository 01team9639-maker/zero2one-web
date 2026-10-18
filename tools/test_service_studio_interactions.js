// Deeper local-only checks for the common service presentation. External
// analytics/contact requests are isolated by test_support, never forwarded.
const {chromium}=require('playwright');
const {serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const reports=path.join(ROOT,'tools/reports/site-refresh');
const route=(lang,slug)=>(lang==='ar'?'/ar':'')+'/services/'+slug+'/';
async function ready(page){
 await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
}
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top-85,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});
 await page.waitForTimeout(1000);
}
async function capture(page,label,section){
 await jump(page,section);await page.screenshot({path:path.join(reports,'service-detail-'+label+'-'+section.replaceAll('.','').replaceAll(',','-')+'.png')});
}
async function swipe(page,track,rtl){
 await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(200);
 const box=await track.boundingBox(),y=Math.min(680,box.y+190),left=box.x+45,right=box.x+box.width-45;
 const start=rtl?left:right,end=rtl?right:left,client=await page.context().newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
 for(let i=1;i<=12;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/12,y}]});await page.waitForTimeout(18);}
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(450);await client.detach();
 assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>80),'Real touch gesture moves the horizontal rail');
}
async function detail(browser,origin,lang,slug,width){
 const context=await browser.newContext({viewport:{width,height:956},hasTouch:width<1101});await isolate(context,origin);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__studioWordEffects=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.seo-title-word'))window.__studioWordEffects.push(this.textContent);return animate.call(this,frames,options);};});
 try{
  await page.goto(origin+route(lang,slug),{waitUntil:'networkidle'});await ready(page);
  const root=page.locator('main.rf-service-studio'),label=lang+'-'+slug+'-'+width;
  assert.equal(await root.getAttribute('data-seo-flow-connected'),'true');
  assert.equal(await root.getAttribute('data-seo-flow-opacity'),'0.56');
  assert.equal(await root.locator('.seo-flow-ribbon').evaluateAll(es=>new Set(es.map(e=>e.getAttribute('d'))).size),1,'Every section is a window on one continuous path');
  const before=await root.getAttribute('data-seo-flow-draw');await page.mouse.move(25,250);await page.mouse.move(width-25,500);await page.waitForTimeout(250);
  assert.equal(await root.getAttribute('data-seo-flow-draw'),before,'The ribbon ignores pointer movement');
  assert.equal(await root.locator('.seo-title-word .seo-title-word').count(),0,'Title enhancement never nests word wrappers');
  assert.ok(await page.evaluate(()=>window.__studioWordEffects.length>0),'Visible title words receive their entrance effect');
  if(width<761){
   const rects=await root.locator('.service-studio-hero-copy .btn-click').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {y:b.y,bottom:b.bottom};}));
   if(rects.length>1)assert.ok(Math.abs(rects[0].y-rects[1].y)<3,'Mobile hero CTAs remain side by side');
  }
  for(const kind of ['know','deliverables','why','audience','process','outcomes','team']){
   const selector='.service-studio-'+kind;if(!await root.locator(selector).count())continue;
   await capture(page,label,selector);
   const cards=root.locator(selector+' .service-studio-card');
   await cards.locator('img').evaluateAll(es=>{es.forEach(e=>e.loading='eager');return Promise.all(es.map(e=>e.decode()));});
   assert.equal(await cards.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)),true,'Card illustrations load '+kind);
   if(['know','deliverables','audience'].includes(kind)){
    assert.equal(await cards.evaluateAll(es=>es.every(e=>{const image=e.querySelector('.service-studio-art'),copy=e.querySelector('.service-studio-card-copy');return !image||!copy||image.getBoundingClientRect().bottom<=copy.getBoundingClientRect().top+2;})),true,'Text stays below the image '+kind);
   }
   if(width<761&&kind==='audience'){
    assert.equal(await cards.locator('details').count(),0,'Audience content stays permanently open');
    await swipe(page,root.locator(selector+' [data-home-scroll-track]'),lang==='ar');
   }
   if(['why','outcomes'].includes(kind)&&width<761&&await cards.count()>1){
    assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'One compact card is initially open '+kind);
    const summary=cards.nth(1).locator('summary');await jump(page,selector+' details:nth-child(2)');await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(350);
    assert.equal(await cards.nth(1).evaluate(e=>e.open),true,'Keyboard opens the selected card '+kind);
    assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'Only the selected compact card remains open '+kind);
    await page.keyboard.press('Space');await page.waitForTimeout(300);assert.equal(await cards.nth(1).evaluate(e=>e.open),false,'Space closes the selected card '+kind);
   }
   if(kind==='team'){
    assert.equal(await root.locator(selector+' .testi-card-media').evaluateAll(es=>es.every(e=>getComputedStyle(e).position==='relative')),true,'Old absolute portrait layout is not inherited');
    if(width<761)assert.equal(await root.locator(selector+' .testi-quote').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().width>e.closest('.team-card').getBoundingClientRect().width*.8)),true,'Mobile biographies use the full card width');
    assert.equal(await root.locator(selector+' .testi-card-body').evaluateAll(es=>es.every(e=>getComputedStyle(e,'::after').content==='none')),true,'No old gradient masks the biography');
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  console.log('PASS imagery, gestures, disclosures, heading effects and connected ribbon',label);
 }finally{await context.close();}
}
async function fallback(browser,origin,javaScriptEnabled,reducedMotion){
 const context=await browser.newContext({viewport:{width:440,height:956},hasTouch:true,javaScriptEnabled,reducedMotion});await isolate(context,origin);
 const page=await context.newPage();
 try{
  await page.goto(origin+route('ar','web-design-riyadh'),{waitUntil:'networkidle'});if(javaScriptEnabled)await ready(page);
  const root=page.locator('main.rf-service-studio');
  assert.equal(await root.locator('details.seo-owner-accordion').evaluateAll((es,scripts)=>es.every(e=>scripts||e.open),javaScriptEnabled),true,'Script-free accordion answers remain available');
  if(javaScriptEnabled){
   assert.equal(await root.getAttribute('data-seo-flow-draw'),'1','Reduced-motion ribbon is static and complete');
   assert.equal(await root.locator('.seo-studio-motion-active').count(),0);
   assert.equal(await root.evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.effect?.target?.matches('.seo-title-word,[data-seo-studio-reveal]')).length),0,'No service entrance motion with reduced motion');
  }
  const heading=root.locator('h1');assert.equal(await heading.evaluate(e=>getComputedStyle(e).opacity),'1');
  const track=root.locator('.service-studio-audience [data-home-scroll-track]');assert.equal(await track.evaluate(e=>e.scrollWidth>e.clientWidth),true,'Script-free/reduced-motion cards retain native overflow');
  console.log('PASS service fallback',javaScriptEnabled?'reduced motion':'no scripts');
 }finally{await context.close();}
}
async function lifecycle(browser,origin){
 const context=await browser.newContext({viewport:{width:1440,height:956}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await ready(page);
  // Using the site's actual Barba navigator exercises teardown/re-init without
  // a document reload; the marker deliberately survives the whole journey.
  await page.evaluate(()=>window.__serviceJourney=1);
  for(const [lang,slug] of [['ar','web-design-riyadh'],['ar','brand-identity'],['en','mobile-application'],['ar','seo-riyadh']]){
   const url=route(lang,slug);await page.evaluate(url=>barba.go(url),url);await settled(page,url);await ready(page);
   assert.equal(await page.evaluate(()=>window.__serviceJourney),1,'Navigation does not hide lifecycle errors with a reload');
   assert.equal(await page.locator('main').getAttribute('data-seo-flow-connected'),'true');
   assert.equal(await page.locator('.seo-flow-ribbon').evaluateAll(es=>new Set(es.map(e=>e.getAttribute('d'))).size),1,'One geometry after navigation');
   assert.equal(await page.locator('.seo-title-word .seo-title-word').count(),0);
   assert.equal(await page.locator('main').evaluate(e=>getComputedStyle(e).getPropertyValue('--studio-orange').trim().toLowerCase()),'#f9460e');
  }
  await page.evaluate(()=>barba.go('/ar/'));await settled(page,'/ar/');await ready(page);
  assert.equal(await page.locator('[data-seo-flow]').count(),0,'Other pages gain no service ribbon');assert.equal(await page.locator('.rf-service-studio,.rf-seo-studio').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS home → service → brand → English service → SEO → home navigation');
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch(),{srv,origin}=await serve();fs.mkdirSync(reports,{recursive:true});
 try{
  if(process.argv.includes('--lifecycle')){await lifecycle(browser,origin);return;}
  if(process.argv.includes('--seo')){
   // Reuse the unchanged SEO regression helpers, not its now-obsolete
   // SEO-only route scope. test_service_studio separately proves the exact
   // allowed 18-page scope and unchanged SEO markup against its baseline.
   const source=fs.readFileSync(path.join(__dirname,'test_seo_premium.js'),'utf8'),boundary=source.lastIndexOf('\n(async()=>{'),mod={exports:{}};
   new Function('require','module','process','console','__dirname',source.slice(0,boundary)+'\nmodule.exports={go,copyCheck,structure,flowMotion,fallbacks};')(p=>require(p.startsWith('.')?path.resolve(__dirname,p):p),mod,process,console,__dirname);
   for(const lang of ['ar','en']){
    await mod.exports.fallbacks(browser,origin,lang);
    const context=await browser.newContext({viewport:{width:440,height:956},hasTouch:true});await isolate(context,origin);const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    try{await mod.exports.go(p,origin,lang);await mod.exports.copyCheck(p,lang);await mod.exports.structure(p,lang);await mod.exports.flowMotion(p);assert.deepEqual(errors,[]);console.log('PASS unchanged SEO content and motion',lang);}finally{await context.close();}
   }
   return;
  }
  await detail(browser,origin,'ar','web-design-riyadh',440);
  await detail(browser,origin,'en','mobile-application',1440);
  await detail(browser,origin,'ar','brand-identity',440);
  await detail(browser,origin,'en','marketing-consulting',440);
  await fallback(browser,origin,false,'no-preference');await fallback(browser,origin,true,'reduce');await lifecycle(browser,origin);
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
