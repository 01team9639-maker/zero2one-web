const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const report=path.join(ROOT,'tools/reports/site-refresh/work-refresh-2026-10-24');
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-60,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(450);}
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);}
async function check(browser,origin,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/work/',{waitUntil:'networkidle'});await ready(page);
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.z2o-gallery > .z2o-card').count(),16);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.locator('.z2o-card-media img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  const metrics=await page.locator('.z2o-card .z2o-metric-after').evaluateAll(es=>es.map(e=>({value:e.textContent,color:getComputedStyle(e).color,opacity:getComputedStyle(e).opacity})));
  assert.equal(metrics.length,14);assert.ok(metrics.every(e=>e.color==='rgb(23, 107, 67)'&&e.opacity==='1'));
  assert.ok(await page.locator('.z2o-card .z2o-metric-label').evaluateAll(es=>es.every(e=>getComputedStyle(e).color==='rgb(71, 85, 75)')));
  const columns=await page.locator('.z2o-gallery').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(columns,width>=700?2:1);
  const clipped=await page.locator('.z2o-card .z2o-metric-value,.z2o-card-title,.z2o-card-summary').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent));assert.deepEqual(clipped,[],'No clipped numbers/headings/descriptions');
  await page.screenshot({path:path.join(report,lang+'-hero-'+width+'.png')});await jump(page,'.z2o-gallery');await page.screenshot({path:path.join(report,lang+'-gallery-'+width+'.png')});
  await jump(page,'.z2o-card:has(a[href*="riyadh-curtains"])');await page.screenshot({path:path.join(report,lang+'-results-'+width+'.png')});
  for(const key of ['branding','seo','advertising','creative','all']){
   await jump(page,'.z2o-filters');const button=page.locator('[data-z2o-filter="'+key+'"]');await button.click();await page.waitForTimeout(150);
   const expected=Number(await button.locator('.z2o-filter-count').textContent());assert.equal(await page.locator('.z2o-gallery > .z2o-card:not([hidden])').count(),expected);
   assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  }
  const opener=page.locator('.z2o-card-link[data-z2o-viewer]').last();await jump(page,'.z2o-card:has(a[href*="riyadh-curtains"])');await opener.click();
  const dialog=page.locator('.z2o-viewer');assert.ok(await dialog.isVisible());await dialog.locator('[data-img]').evaluate(e=>e.decode());await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await dialog.getAttribute('open'),null);
  await jump(page,'.z2o-work-cta');
  assert.deepEqual(await page.locator('.z2o-work-cta').evaluate(e=>({background:getComputedStyle(e).backgroundColor,title:getComputedStyle(e.querySelector('h2')).color,body:getComputedStyle(e.querySelector('.z2o-work-cta-body')).color})),{background:'rgb(255, 253, 240)',title:'rgb(28, 29, 32)',body:'rgb(98, 100, 94)'});
  const cta=page.locator('.z2o-work-cta .btn-click');const box=await cta.boundingBox();assert.ok(box.height>=58&&box.width>=240&&box.width<=440&&box.width<width);assert.equal(await cta.getAttribute('href'),'https://wa.me/966530307054');
  await page.screenshot({path:path.join(report,lang+'-closing-'+width+'.png')});assert.deepEqual(errors,[]);
  console.log('PASS work listing/filter/viewer/results',lang,width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 let i=0;const tasks=['ar','en'].flatMap(lang=>[320,440,834,1440].map(width=>()=>check(browser,origin,lang,width)));await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await ready(page);await page.evaluate(()=>window.__workWarm=1);
 for(const url of ['/ar/work/','/ar/work/alostaz-seo/','/work/','/ar/services/conversion-rate-optimization/','/ar/work/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__workWarm),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
 await context.close();const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});await isolate(plain,origin);const p=await plain.newPage();await p.goto(origin+'/ar/work/');assert.equal(await p.locator('.z2o-gallery > .z2o-card:not([hidden])').count(),16);assert.ok(await p.locator('.z2o-card-link[data-z2o-viewer]').first().getAttribute('href'));await plain.close();console.log('PASS reduced-motion warm navigation/no-JS gallery');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
