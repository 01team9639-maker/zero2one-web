const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/deferred-services-2026-10-24');
const slugs=['conversion-rate-optimization','email-marketing'];
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-60,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(450);}
async function check(browser,origin,slug,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/'+slug+'/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(700);
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.service-studio-benefits .service-studio-card').count(),3);
  assert.ok(await page.locator('h1 .service-studio-title-accent,h1 .service-studio-title-keyword').evaluate(e=>getComputedStyle(e).backgroundImage.includes('linear-gradient')&&getComputedStyle(e).backgroundClip==='text'),'Orange hero treatment');
  assert.ok(await page.locator('h1 .service-studio-title-accent .seo-title-word,h1 .service-studio-title-keyword .seo-title-word').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundImage.includes('linear-gradient'))),'Animated child words keep their own gradient paint');
  assert.equal(await page.locator('.service-studio-know .service-studio-card').count(),7);assert.equal(await page.locator('.service-studio-deliverables .service-studio-card').count(),9);
  assert.equal(await page.locator('.service-studio-step').count(),7);assert.equal(await page.locator('.rf-faq-item').count(),6);
  assert.equal(await page.locator('.logo-marquee-toggle').count(),0);assert.equal(await page.locator('.social-investment,.rf-section#section-9').count(),0);
  assert.equal(await page.locator('.service-studio-packages').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await page.locator('main').evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.locator('main img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  for(const e of await page.locator('main a[href*="wa.me"]').all())assert.equal(await e.getAttribute('href'),'https://wa.me/966530307054');
  if(width===440||width===1440)await page.screenshot({path:path.join(report,slug+'-'+lang+'-hero-'+width+'.png')});
  await jump(page,'.service-studio-deliverables');
  const track=page.locator('.service-studio-deliverables [data-home-scroll-track]');
  const dims=await track.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth,card:e.firstElementChild.getBoundingClientRect().width,left:e.scrollLeft}));
  assert.ok(dims.scroll>dims.width+100);if(width<=440)assert.ok(Math.abs(dims.width-dims.card)<8,'Mobile shows one whole card, no clipped current card');
  await page.locator('.service-studio-deliverables [data-home-scroll-next]').click();await page.waitForTimeout(650);
  assert.ok(Math.abs(await track.evaluate(e=>e.scrollLeft)-dims.left)>100,'Deliverable next control actually scrolls');
  if(width===440||width===1440)await page.screenshot({path:path.join(report,slug+'-'+lang+'-deliverables-'+width+'.png')});
  if(width===1440){
   const boxes=await page.locator('.service-studio-step').evaluateAll(es=>es.slice(0,3).map(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width})));
   assert.ok(Math.abs(boxes[0].left-boxes[1].left)>200&&Math.abs(boxes[0].left-boxes[2].left)<2,'Alternating desktop process');
   await jump(page,'.service-studio-process');await page.screenshot({path:path.join(report,slug+'-'+lang+'-process.png')});
  }
  await jump(page,'.service-studio-audience');const cta=page.locator('.service-studio-audience .service-studio-action');const box=await cta.boundingBox();assert.ok(box.width>=Math.min(260,width-60)&&box.width<=width);
  const question=page.locator('.rf-faq-item').first();await jump(page,'.rf-faq-item');await question.locator('summary').click();assert.equal(await question.getAttribute('open'),'');await question.locator('summary').click();assert.equal(await question.getAttribute('open'),null);
  assert.equal(await page.locator('main').getAttribute('data-seo-flow-connected'),'true');
  assert.deepEqual(errors,[]);console.log('PASS responsive/slider/FAQ/ribbon',slug,lang,width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=slugs.flatMap(slug=>['ar','en'].flatMap(lang=>[320,440,834,1440].map(width=>()=>check(browser,origin,slug,lang,width))));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+'/ar/team/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
 const versions=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/team-photo-versions-2026-10-24.json')));
 for(const id of ['moayad','mohammed']){
  const img=page.locator('.team-card img[src*="team-'+id+'.webp"]');assert.equal(await img.count(),1);assert.equal(await img.getAttribute('src'),'/assets/images/team/team-'+id+'.webp?v='+versions['/assets/images/team/team-'+id+'.webp']);
  await img.evaluate(e=>{e.loading='eager';return e.decode();});assert.ok(await img.evaluate(e=>e.naturalWidth>0&&Math.abs(e.naturalHeight/e.naturalWidth-1280/896)<.03),'Decoded, undistorted owner portrait (responsive density-corrected intrinsic dimensions)');
 }
 await page.screenshot({path:path.join(report,'team-hero-new-moayad.png')});await jump(page,'.team-card:has(img[src*="team-mohammed.webp"])');await page.screenshot({path:path.join(report,'team-new-mohammed.png')});
 await page.evaluate(()=>window.__serviceWarm=1);
 for(const url of ['/ar/services/','/ar/services/conversion-rate-optimization/','/ar/services/email-marketing/','/services/email-marketing/','/ar/team/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__serviceWarm),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 await context.close();
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});await isolate(plain,origin);const p=await plain.newPage();for(const slug of slugs){await p.goto(origin+'/ar/services/'+slug+'/');assert.ok((await p.locator('h1').textContent()).length>10);assert.equal(await p.locator('.service-studio-deliverables article').count(),9);assert.equal(await p.locator('.rf-faq-item').count(),6);}await plain.close();
 console.log('PASS owner photos; reduced-motion warm navigation; no-JS content');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
