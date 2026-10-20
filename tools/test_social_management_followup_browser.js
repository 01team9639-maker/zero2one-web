// Local-only social management review, with all external traffic isolated.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/social-management-followup-2026-10-20');
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-80,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(700);}
async function touch(page,ctx,track,rtl){
 await track.evaluate(e=>{e.blur();e.scrollTo({left:0,behavior:'instant'});});await page.waitForTimeout(250);
 const b=await track.boundingBox(),from=b.x+(rtl?35:b.width-35),to=b.x+(rtl?b.width-35:35),y=b.y+130,cdp=await ctx.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
 for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/12,y}]});await page.waitForTimeout(18);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);
 assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Real touch swipe moves cards');
 assert.ok(await track.evaluate(e=>{const b=e.getBoundingClientRect();return [...e.children].filter(n=>{const r=n.getBoundingClientRect();return r.right>b.left+4&&r.left<b.right-4;}).every(n=>{const r=n.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;});}),'Whole visible cards after swipe');
}
async function check(browser,origin,lang,width,options={}){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<=1100,...options});await isolate(ctx,origin);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/social-media-management/',{waitUntil:'networkidle'});
  if(options.javaScriptEnabled!==false)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);
  const accent=page.locator('.service-studio-title-accent');assert.equal(await accent.textContent(),'Social Media');assert.equal(await accent.getAttribute('dir'),'ltr');
  assert.ok(await accent.evaluate(e=>{const s=getComputedStyle(e);return s.display==='block'&&s.backgroundClip==='text'&&s.backgroundImage.includes('linear-gradient');}),'New-line gradient accent');
  const benefits=page.locator('.service-studio-benefits');assert.equal(await benefits.locator('.service-studio-card').count(),3);
  assert.ok(await benefits.evaluate(e=>Math.abs(e.querySelector('.service-studio-rail').offsetWidth-e.querySelector('.service-studio-inner').offsetWidth)<2),'Benefit cards fill section width');
  if(width>1100){const heights=await benefits.locator('.service-studio-card').evaluateAll(es=>es.map(e=>e.offsetHeight));assert.ok(Math.max(...heights)-Math.min(...heights)<2);}
  for(const kind of ['deliverables','complementary']){
   const selector='[data-social-content-rail="'+kind+'"]';await jump(page,selector);const rail=page.locator(selector),track=rail.locator('[data-home-scroll-track]');
   const layout=await track.evaluate(e=>({count:e.children.length,rows:new Set([...e.children].map(c=>c.offsetTop)).size,overflow:e.scrollWidth>e.clientWidth+3,snap:getComputedStyle(e).scrollSnapType,heights:[...e.children].map(c=>c.offsetHeight)}));
   assert.equal(layout.count,kind==='deliverables'?8:4);assert.equal(layout.rows,1);assert.equal(layout.overflow,true);assert.equal(layout.snap,'x mandatory');assert.ok(Math.max(...layout.heights)-Math.min(...layout.heights)<2);
   await rail.locator('img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
   assert.ok(await rail.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain')),'Original pictures visible without cropping');
   if(options.javaScriptEnabled!==false){assert.ok(await rail.locator('.rf-home-scroll-controls').isVisible());await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(600);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Keyboard arrows work');}
   if(width<=440)await touch(page,ctx,track,lang==='ar');
   await track.evaluate(e=>e.scrollTo({left:(getComputedStyle(e).direction==='rtl'?-1:1)*(e.scrollWidth-e.clientWidth),behavior:'instant'}));await page.waitForTimeout(300);
   assert.ok(await track.evaluate(e=>{const b=e.getBoundingClientRect(),r=e.lastElementChild.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;}),'Final card is fully reachable');
   if(options.javaScriptEnabled!==false){assert.ok(await rail.locator('[data-home-scroll-next]').isDisabled());const before=await track.evaluate(e=>Math.abs(e.scrollLeft));await rail.locator('[data-home-scroll-prev]').click();await page.waitForTimeout(600);assert.ok(await track.evaluate((e,before)=>Math.abs(e.scrollLeft)<before-40,before),'Previous button returns from the final card');}
  }
  await jump(page,'.service-studio-audience');const cta=page.locator('.service-studio-audience .service-studio-action .btn-click'),bounds=await cta.boundingBox();assert.ok(bounds.width>=Math.min(width-36,284)&&bounds.width<=381&&bounds.height>=64);assert.ok((await cta.getAttribute('href')).startsWith('https://wa.me/'));assert.equal(await cta.evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');
  await jump(page,'.service-studio-process');const steps=await page.locator('.service-studio-step').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop})));assert.ok(steps.length>=3&&steps.every((e,i)=>!i||e.y>steps[i-1].y));
  if(width>1100)assert.ok(Math.abs(steps[0].x-steps[1].x)>100&&steps[0].x===steps[2].x);else assert.ok(steps.every(e=>e.x===steps[0].x));
  await jump(page,'.service-studio-outcomes');const outcomes=page.locator('.service-studio-outcomes');assert.equal(await outcomes.locator('.service-studio-card').count(),4);
  await outcomes.locator('img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  if(width>=761){const layout=await outcomes.locator('.service-studio-card').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth})));assert.equal(layout[0].y,layout[1].y);assert.equal(layout[2].y,layout[3].y);assert.ok(layout[2].y>layout[0].y);assert.ok(Math.max(...layout.map(e=>e.w))-Math.min(...layout.map(e=>e.w))<2);}
  assert.equal(await page.locator('h2').filter({hasText:lang==='ar'?'بعض من أعمالنا في حسابات التواصل الاجتماعي':'Some of Our Social Media Work'}).count(),0);
  assert.equal(await page.locator('.service-studio-clients .logo-marquee-toggle').count(),0);
  if(lang==='ar'&&[440,1440].includes(width)&&!Object.keys(options).length){for(const [label,selector] of [['hero','.service-studio-hero'],['benefits','.service-studio-benefits'],['deliverables','[data-social-content-section="deliverables"]'],['complementary','[data-social-content-section="complementary"]'],['audience','.service-studio-audience'],['process','.service-studio-process'],['outcomes','.service-studio-outcomes']]){await jump(page,selector);await page.locator(selector+' img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));await page.screenshot({path:path.join(report,label+'-'+width+'.png')});}}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No document overflow');assert.deepEqual(errors,[]);console.log('PASS social management',lang,width,JSON.stringify(options));
 }finally{await ctx.close();}
}
async function lifecycle(browser,origin){const ctx=await browser.newContext({viewport:{width:1440,height:956}});await isolate(ctx,origin);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>window.__socialManagementJourney=1);for(const url of ['/ar/services/social-media-management/','/ar/services/seo-riyadh/','/services/social-media-management/','/ar/services/manage-google-adwords-campaigns/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>window.__socialManagementJourney),1);if(url.includes('social-media-management')){assert.equal(await page.locator('[data-social-content-rail]').count(),2);await jump(page,'[data-social-content-rail="complementary"]');await page.locator('[data-social-content-rail="complementary"] [data-home-scroll-next]').click();await page.waitForTimeout(600);assert.ok(await page.locator('[data-social-content-rail="complementary"] [data-home-scroll-track]').evaluate(e=>Math.abs(e.scrollLeft)>40));}}assert.deepEqual(errors,[]);console.log('PASS warm home → Arabic social management → SEO → English social management → Google Ads');}finally{await ctx.close();}}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{const tasks=['ar','en'].flatMap(lang=>[320,440,834,1100,1440,1920].map(width=>()=>check(browser,origin,lang,width)));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));for(const lang of ['ar','en']){await check(browser,origin,lang,320,{javaScriptEnabled:false});await check(browser,origin,lang,440,{reducedMotion:'reduce'});}await lifecycle(browser,origin);}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
