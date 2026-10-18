// Latest owner-source content in the existing service presentation, local only.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const slugs=['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting'];
const reports=path.join(ROOT,'tools/reports/site-refresh/content-update-2026-10-17');
async function jump(page,selector){
 await page.locator(selector).first().evaluate(e=>{let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top-85,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});
 await page.waitForTimeout(1100);
}
async function check(browser,origin,slug,lang,width){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<1101});await isolate(ctx,origin);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const route=(lang==='ar'?'/ar':'')+'/services/'+slug+'/';
  await page.goto(origin+route,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
  assert.equal(await page.locator('main.rf-service-studio').count(),1);
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('main').getAttribute('data-seo-flow-connected'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No horizontal page overflow');
  const heroActions=page.locator('.service-studio-hero .btn-click');
  assert.equal(await heroActions.count(),2,'Two source hero actions');
  assert.ok((await heroActions.nth(0).getAttribute('href')).startsWith('https://wa.me/'));
  assert.equal(await heroActions.nth(1).getAttribute('href'),(lang==='ar'?'/ar':'')+'/work/','Secondary CTA keeps its results destination');
  if(width<761){
   const rects=await heroActions.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));
   assert.ok(Math.abs(rects[0]-rects[1])<2,'Mobile actions remain side by side');
  }
  const broken=await page.locator('.service-studio-hero img').evaluateAll(es=>es.filter(e=>!e.complete||!e.naturalWidth).map(e=>e.src));assert.deepEqual(broken,[]);
  const stages=await page.locator('[data-service-stage]').evaluateAll(es=>es.map(e=>e.dataset.serviceStage));
  for(const stage of ['benefits','know','deliverables','why','audience','process','faq'])assert.ok(stages.includes(stage),'Required stage '+stage);
  assert.equal(await page.locator('#faq .rf-faq-item').count()>4,true);
  if(slug==='brand-identity'){
   assert.equal(stages.includes('packages'),false);assert.equal(stages.includes('team'),false);assert.equal(stages.includes('clients'),false);
   assert.equal(await page.locator('.service-studio-outcomes picture').count(),6,'Keep six owner outcome photographs');
  }
  if(slug==='web-design-riyadh')assert.equal(await page.locator('.service-studio-tech-chip').count(),10);
  if(slug==='ecommerce-development')assert.ok(await page.getByRole('heading',{name:lang==='ar'?'صفحات السياسات وبيانات التوثيق':'Policy Pages and Verification Details',exact:true}).count());
  if(slug==='social-media-management')assert.ok((await page.locator('.service-studio-deliverables').textContent()).includes(lang==='ar'?'قوة المؤثرين':'Influencer Marketing'));
  if(width===440&&['web-design-riyadh','brand-identity','social-media-management','ecommerce-development'].includes(slug)){
   for(const stage of ['deliverables','audience','faq']){
    const selector='.service-studio-'+stage;await jump(page,selector);
    const images=page.locator(selector+' img');await images.evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
    if(stage==='audience'){
     const track=page.locator(selector+' [data-home-scroll-track]');
     assert.ok(await track.evaluate(e=>e.scrollWidth>e.clientWidth),'Mobile audience rail overflows');
     await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(300);
     assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Rail responds to keyboard');
    }
    if(stage==='faq'){
     const item=page.locator(selector+' details').first();await item.locator('summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(150);assert.equal(await item.evaluate(e=>e.open),true);
    }
    await page.screenshot({path:path.join(reports,lang+'-'+slug+'-'+stage+'.png')});
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS updated content UI',lang,slug,width);
 }finally{await ctx.close();}
}
(async()=>{
 fs.mkdirSync(reports,{recursive:true});const browser=await chromium.launch(),{srv,origin}=await serve();
 try{
  const visual=process.argv.includes('--visual');
  const selected=visual?['web-design-riyadh','brand-identity','social-media-management','ecommerce-development']:slugs;
  const tasks=selected.flatMap(slug=>['en','ar'].flatMap(lang=>(visual?[440]:[320,440,834,1440]).map(width=>()=>check(browser,origin,slug,lang,width))));
  let cursor=0;await Promise.all([0,1,2].map(async()=>{while(cursor<tasks.length)await tasks[cursor++]();}));
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
