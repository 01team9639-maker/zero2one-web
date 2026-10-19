// Local-only catalogue/social advertising presentation, with external traffic isolated.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/social-revision-2026-10-18');
async function ready(page,scripts=true){
 if(scripts)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
 await page.evaluate(()=>document.fonts.ready);
}
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-80,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(1200);
}
async function capture(page,label,selector){await jump(page,selector);await page.screenshot({path:path.join(report,label+'.png')});}
async function check(browser,origin,kind,lang,width,options={}){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<=1100,...options});await isolate(ctx,origin);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const url=(lang==='ar'?'/ar':'')+'/services/'+(kind==='ads'?'digital-advertising/':'');
  await page.goto(origin+url,{waitUntil:'networkidle'});await ready(page,options.javaScriptEnabled!==false);
  if(kind==='catalogue'){
   await page.locator('.catalogue-home-card img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
   assert.equal(await page.locator('.catalogue-home-card').count(),9);assert.equal(await page.locator('h1').count(),1);
   const seoCard=page.locator('.catalogue-home-card').filter({has:page.locator('a[href*="/services/seo-riyadh/"]')});
   assert.equal(await seoCard.locator('img').getAttribute('src'),'/assets/images/owner-services-2026-10/seo.webp','Catalogue SEO uses the current homepage photo');
   const heights=await page.locator('.catalogue-home-card').evaluateAll(es=>es.map(e=>e.offsetHeight));assert.ok(Math.max(...heights)-Math.min(...heights)<3,'All nine catalogue cards match in height');
   assert.ok(await page.locator('.catalogue-home-card').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderRadius==='48px'&&getComputedStyle(e.querySelector('.service-card-body')).backgroundImage.includes('linear-gradient')&&getComputedStyle(e.querySelector('.service-card-media')).position==='relative')),'Homepage photo/gradient/rounding anatomy');
   assert.ok(await page.locator('.catalogue-home-card .service-card-media').evaluateAll(es=>es.every(e=>Math.abs(e.offsetWidth-e.offsetHeight)<2&&getComputedStyle(e).minHeight==='0px')),'Square edge-to-edge image stage');
   assert.ok(await page.locator('.catalogue-home-card .service-card-text').evaluateAll(es=>es.length===9&&es.every(e=>e.offsetHeight>20&&getComputedStyle(e).display!=='none')),'No description is hidden on mobile');
   assert.ok(await page.locator('.catalogue-home-card h2').evaluateAll((es,dir)=>es.every(e=>getComputedStyle(e).direction===dir&&getComputedStyle(e).display==='block'),lang==='ar'?'rtl':'ltr'),'Title words retain correct language direction');
   assert.ok(await page.locator('.catalogue-home-card a').evaluateAll(es=>es.length===9&&es.every(e=>e.getAttribute('href').includes('/services/')&&e.offsetHeight>=46&&e.offsetWidth<320)),'All original detail controls remain balanced and available');
   if(lang==='ar'&&[440,1440].includes(width)&&!Object.keys(options).length){await capture(page,'catalogue-'+width,'.catalogue-home-card');await capture(page,'catalogue-last-'+width,'.catalogue-home-card:last-child');}
  }else{
   const benefits=page.locator('.service-studio-benefits');await jump(page,'.service-studio-benefits');
   await benefits.locator('img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
   assert.equal(await benefits.locator('.service-studio-card').count(),3);
   assert.ok(await benefits.evaluate(e=>Math.abs(e.querySelector('.service-studio-rail').offsetWidth-e.querySelector('.service-studio-inner').offsetWidth)<2),'Platforms fill the section width');
   const heights=await benefits.locator('.service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));assert.ok(Math.max(...heights)-Math.min(...heights)<3,'Three consistent benefit cards');
   assert.ok(await benefits.locator('.service-studio-card').evaluateAll(es=>es.every(e=>getComputedStyle(e).borderRadius==='25px')),'Original platform card rounding restored');
   assert.ok(await benefits.locator('.service-studio-card-copy').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(e).borderTopWidth==='0px')),'Original unsegmented card body, no new cream panel');
   if(width<=760&&options.javaScriptEnabled!==false){const track=benefits.locator('[data-home-scroll-track]');await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(450);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40));await track.evaluate(e=>{e.scrollTo({left:0,behavior:'instant'});e.blur();});}
   for(const kind of ['audience','packages']){
    const selector='.service-studio-'+kind;await jump(page,selector);
    if(kind==='packages')assert.equal(await page.locator(selector).evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)','Pure white package background');
    const button=page.locator(selector+' .service-studio-action .btn-click'),bounds=await button.boundingBox();
    assert.ok(bounds.width>=Math.min(284,width-36)&&bounds.width<=381&&bounds.height>=68,'Large consistent '+kind+' CTA');
    assert.ok((await button.getAttribute('href')).startsWith('https://wa.me/'));
    assert.equal(await button.evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');
    if(options.javaScriptEnabled!==false){await button.focus();await page.waitForTimeout(300);assert.equal(await button.locator('.btn-text-inner').evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');await button.evaluate(e=>e.blur());}
   }
   await jump(page,'.service-studio-process');
   const steps=await page.locator('.service-studio-step').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop})));
   assert.equal(steps.length,7);assert.ok(steps.every((e,i)=>!i||e.y>steps[i-1].y));
   if(width>1100)assert.ok(Math.abs(steps[0].x-steps[1].x)>100&&steps[0].x===steps[2].x,'Alternating process');else assert.ok(steps.every(e=>e.x===steps[0].x));
   await jump(page,'.social-investment');
   assert.equal(await page.locator('.social-investment-case').count(),3);
   await page.locator('.social-investment-media img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
   assert.ok(await page.locator('.social-investment-case p').evaluateAll(es=>es.length===3&&es.every(e=>e.offsetHeight>20&&e.textContent.includes(':'))),'All original case descriptions remain available');
   assert.ok(await page.locator('.social-investment-media img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain')),'Original case evidence is shown without cropping');
   assert.equal(await page.locator('.service-studio-clients .logo-marquee-toggle').count(),0,'No pause control in the clients section');
   if(options.reducedMotion==='reduce')assert.equal(await page.locator('.social-investment-orbit').evaluate(e=>getComputedStyle(e).animationName),'none');
   if(lang==='ar'&&[440,1440].includes(width)&&!Object.keys(options).length){for(const k of ['benefits','audience','packages','process'])await capture(page,'ads-'+k+'-'+width,'.service-studio-'+k);await capture(page,'ads-investment-'+width,'.social-investment');}
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No document overflow');assert.deepEqual(errors,[]);
  console.log('PASS catalogue/social follow-up',kind,lang,width,JSON.stringify(options));
 }finally{await ctx.close();}
}
async function lifecycle(browser,origin){
 const ctx=await browser.newContext({viewport:{width:1440,height:956}});await isolate(ctx,origin);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await ready(page);await page.evaluate(()=>window.__catalogueSocialJourney=1);
  for(const url of ['/ar/services/','/ar/services/digital-advertising/','/services/','/services/digital-advertising/','/ar/services/brand-identity/','/ar/']){
   await page.evaluate(url=>barba.go(url),url);await settled(page,url);await ready(page);assert.equal(await page.evaluate(()=>window.__catalogueSocialJourney),1);
   assert.equal(await page.locator('.seo-title-word .seo-title-word').count(),0);
   if(url.endsWith('/services/'))assert.equal(await page.locator('.catalogue-home-card').count(),9);
   if(url.includes('/digital-advertising/'))assert.equal(await page.locator('.service-studio-step').count(),7);
  }assert.deepEqual(errors,[]);console.log('PASS home → catalogue → social ads → English catalogue/ads → brand → home lifecycle');
 }finally{await ctx.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();
 try{const tasks=['catalogue','ads'].flatMap(kind=>['ar','en'].flatMap(lang=>[320,440,834,1100,1440,1920].map(width=>()=>check(browser,origin,kind,lang,width))));let index=0;await Promise.all([0,1].map(async()=>{while(index<tasks.length)await tasks[index++]();}));for(const kind of ['catalogue','ads']){await check(browser,origin,kind,'ar',440,{reducedMotion:'reduce'});await check(browser,origin,kind,'en',440,{javaScriptEnabled:false});}await lifecycle(browser,origin);}
 finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
