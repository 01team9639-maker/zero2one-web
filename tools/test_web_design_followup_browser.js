// Owner review: website-service presentation and site-wide footer colors.
// External requests, analytics and contact destinations are isolated.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const {createPreviewServer}=require('./preview_site');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/web-design-followup-2026-10-18');
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-85,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});
 await page.waitForTimeout(1400);
}
async function check(browser,origin,lang,width,options={}){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<=1100,...options});await isolate(ctx,origin);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/web-design-riyadh/',{waitUntil:'networkidle'});
  if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-owner-web-art] img,[data-web-technology] img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  assert.equal(await page.locator('[data-web-technology]').count(),10);
  assert.equal(await page.locator('[data-owner-web-art]').count(),34);
  assert.equal(await page.locator('.service-studio-team .team-card').count(),4);
  assert.equal(await page.locator('.service-studio-team img[src*="team-karabala"]').count(),0);
  assert.equal(await page.locator('#section-9,.service-studio-clients .logo-marquee-toggle').count(),0);
  for(const selector of ['.service-studio-benefits','.service-studio-rail[data-web-site-types]','.service-studio-audience','.service-studio-process','.service-studio-technologies']){
   await jump(page,selector);
   if(selector==='.service-studio-benefits'){
    const fit=await page.locator(selector).evaluate(s=>{const rail=s.querySelector('.service-studio-rail'),inner=s.querySelector('.service-studio-inner');return Math.abs(rail.getBoundingClientRect().width-inner.getBoundingClientRect().width)<2;});
    assert.ok(fit,'Benefits use the full section width');
    const heights=await page.locator(selector+' .service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));
    assert.ok(Math.max(...heights)-Math.min(...heights)<3,'Benefit cards match in height');
    if(width>=1101)assert.ok(await page.locator(selector+' h3').evaluateAll(es=>es.every(e=>{const words=[...e.querySelectorAll('.seo-title-word')];return !words.length||Math.max(...words.map(w=>w.offsetTop))-Math.min(...words.map(w=>w.offsetTop))<3;})),'Whole heading words stay inline, never stacked by layout');
   }
   if(selector.includes('data-web-site-types')){
    const track=page.locator(selector+' [data-home-scroll-track]');
    assert.equal(await track.evaluate(e=>getComputedStyle(e).display),'flex');
    assert.ok(await track.evaluate(e=>e.scrollWidth>e.clientWidth+30),'Site types scroll horizontally at every width');
    const heights=await track.locator('.service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));
    assert.ok(Math.max(...heights)-Math.min(...heights)<3,'All type cards have equal heights with full copy');
    if(options.javaScriptEnabled!==false){
     assert.equal(await page.locator(selector+' .rf-home-scroll-controls').evaluate(e=>e.hidden),false);
     await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(500);
     assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Keyboard advances the rail');
     await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));
     await track.evaluate(e=>e.blur());
    }
   }
   if(selector==='.service-studio-audience'){
    assert.ok(await page.locator(selector+' h3').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='block')),'Arabic/English heading words keep natural inline spaces');
    const button=page.locator(selector+' .service-studio-action .btn-click');
    assert.ok(await button.evaluate(e=>e.getBoundingClientRect().width>=230&&e.getBoundingClientRect().width<360),'Consultation button stays a balanced pill');
    if(width>=1101){
     const heights=await page.locator(selector+' .service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));
     assert.ok(Math.max(...heights)-Math.min(...heights)<3,'Audience cards use equal measurements');
    }
   }
   if(selector==='.service-studio-process'){
    const steps=await page.locator(selector+' .service-studio-step').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,w:e.offsetWidth,y:e.offsetTop})));
    assert.ok(steps.every((e,i)=>i===0||e.y>steps[i-1].y),'Process remains sequential');
    if(width>=1101)assert.ok(Math.abs(steps[0].x-steps[1].x)>100&&Math.abs(steps[0].x-steps[2].x)<2,'Process alternates between both sides');
    else assert.ok(steps.every(e=>Math.abs(e.x-steps[0].x)<2),'Compact process stays readable in one column');
   }
   if(selector==='.service-studio-technologies'){
    assert.ok(await page.locator(selector+' img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain')));
    assert.ok(await page.locator(selector+' .service-studio-tech-chip').evaluateAll(es=>es.every(e=>getComputedStyle(e,'::before').display==='none')),'No stray old bullet on technology cards');
   }
   if(lang==='ar'&&[440,1440,1920].includes(width)&&!Object.keys(options).length)await page.screenshot({path:path.join(report,'web-'+width+'-'+selector.replace(/[^a-z-]/g,'')+'.png')});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No page overflow');
  assert.deepEqual(errors,[]);console.log('PASS web follow-up',lang,width,JSON.stringify(options));
 }finally{await ctx.close();}
}
async function footer(browser,origin,route,width){
 const ctx=await browser.newContext({viewport:{width,height:956}});await isolate(ctx,origin);const page=await ctx.newPage();
 try{
  await page.goto(origin+route,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await jump(page,'.footer');
  const allowed=['rgb(255, 253, 237)','rgb(255, 255, 255)'];
  const checkColors=async()=>{
   const bad=await page.locator('.footer').evaluate(f=>[...f.querySelectorAll('h2,h3,p,.bottom-footer .btn-text-inner,.footer-contacts .btn-text-inner')].filter(e=>e.textContent.trim()&&e.getBoundingClientRect().height>0&&!['rgb(255, 253, 237)','rgb(255, 255, 255)'].includes(getComputedStyle(e).color)).map(e=>({text:e.textContent.trim().slice(0,60),color:getComputedStyle(e).color})));
   assert.deepEqual(bad,[],'Light footer copy on orange');
  };
  await checkColors();
  for(const sel of ['.footer-contacts .btn-click','.bottom-footer .quick-links a','.bottom-footer .socials a']){
   await jump(page,'.footer '+sel);
   const target=page.locator('.footer '+sel).first();
   await target.hover({force:true});await page.waitForTimeout(500);await checkColors();
   await target.focus();await page.waitForTimeout(300);await checkColors();
  }
  assert.ok(allowed.includes(await page.locator('.footer .footer-contact-icon').first().evaluate(e=>getComputedStyle(e).backgroundColor)),'Contact icon matches light text');
  if(route==='/ar/services/web-design-riyadh/'&&width===1440)await page.screenshot({path:path.join(report,'footer-desktop.png')});
  console.log('PASS footer normal/hover/focus light copy',route,width);
 }finally{await ctx.close();}
}
(async()=>{
 fs.mkdirSync(report,{recursive:true});const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
 try{
  if(!process.argv.includes('--footer-only')){
   const tasks=['ar','en'].flatMap(lang=>[320,440,834,1100,1440,1920].map(width=>()=>check(browser,origin,lang,width)));
   let index=0;await Promise.all([0,1].map(async()=>{while(index<tasks.length)await tasks[index++]();}));
   await check(browser,origin,'ar',440,{reducedMotion:'reduce'});await check(browser,origin,'en',440,{javaScriptEnabled:false});
  }
  if(!process.argv.includes('--web-only'))for(const route of ['/ar/services/web-design-riyadh/','/ar/services/seo-riyadh/','/ar/','/','/ar/contact/','/blog/ar/','/blog/'])for(const width of [320,1440])await footer(browser,origin,route,width);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
