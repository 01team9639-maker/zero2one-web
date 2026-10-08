const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,path=require('path');
async function run(){const {srv,origin}=await serve(),browser=await chromium.launch();try{
 for(const mobile of [false,true])for(const lang of ['en','ar']){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});await isolate(ctx,origin);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const prefix=lang==='ar'?'/ar':'';
  await p.goto(origin+prefix+'/');await p.waitForTimeout(8500);
  for(const scope of ['.nav-bar','.fixed-nav'])assert.equal(await p.locator(scope+' a[href="'+prefix+'/faqs/"]').count(),1);
  for(const scope of ['.nav-bar','.fixed-nav'])assert.equal(await p.locator(scope+' .links-wrap > li').last().evaluate(e=>e.classList.contains('btn-lang')),true,'language last');
  assert.equal(await p.locator('.fixed-nav .rf-nav-services details').count(),0);
  assert.equal(await p.locator('.fixed-nav .rf-sidebar-services a').getAttribute('href'),prefix+'/services/');
  assert.equal(await p.locator('.rf-existing-faq').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(249, 70, 14)');
  assert.equal(await p.locator('.rf-faq-wave').count(),1);
  assert.equal(await p.locator('.rf-blog').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 237)');
  for(const name of ['web','seo','ads'])assert.equal(await p.locator('.service-card img[src="/assets/images/owner-services-2026-10/'+name+'.webp"]').evaluate(e=>e.complete&&e.naturalWidth>0),true);
  assert.equal(await p.locator('.nav-bar .btn-contact a').getAttribute('href'),prefix+'/contact/');
  assert.equal(await p.locator('.nav-bar .btn-contact .btn-text-inner').evaluate(e=>getComputedStyle(e).color),await p.locator('.nav-bar .rf-nav-services summary').evaluate(e=>getComputedStyle(e).color),'nav contact color matches services');
  assert.equal(await p.locator('.rf-home-blog-cards .card').count(),lang==='ar'?3:1);
  assert.equal(await p.locator('.faq-cta-button.magnetic .btn-fill').count(),1);
  assert.equal(await p.locator('.rf-copy-arrow').count(),lang==='ar'?1:0);
  console.log('NAV',lang,mobile,await p.locator('.nav-bar .rf-nav-services summary').evaluate(e=>({font:getComputedStyle(e).fontSize,color:getComputedStyle(e).color,other:getComputedStyle(document.querySelector('.nav-bar .btn-contact .btn-text-inner')).color})));
  for(const [selector,name] of [['#selected-work','work'],['.rf-existing-faq','faq'],['.rf-blog','blog']]){
   await p.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-120}),selector);await p.waitForTimeout(900);
   await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`latest-${lang}-${mobile}-${name}.png`)});
  }
  const arrow=await p.locator('.rf-faq-more .service-card-arrow').evaluate(e=>getComputedStyle(e).transform);
  assert.equal(arrow,lang==='ar'?'matrix(-1, 0, 0, 1, 0, 0)':'none');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  assert.equal(errors.length,0,errors.join('\n'));await ctx.close();console.log('PASS homepage/nav',lang,mobile);
 }
}finally{await browser.close();srv.close();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
