const {chromium}=require('playwright');
const {serve,isolate,ROOT,settled}=require('./test_support');
const fs=require('fs'),path=require('path');
const assert=require('assert').strict;
async function run(){
 const {srv,origin}=await serve();const browser=await chromium.launch();
 const out=path.join(ROOT,'tools/reports/site-refresh');const results=[];
 try{
 for(const mobile of [false,true])for(const lang of ['en','ar']){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});await isolate(ctx,origin);
  await ctx.addInitScript(()=>{window.__rfAnimationCalls=0;const orig=Element.prototype.animate;Element.prototype.animate=function(...a){if(this.hasAttribute('data-rf-reveal'))window.__rfAnimationCalls++;return orig.apply(this,a);};});
  const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const prefix=lang==='ar'?'/ar':'';
  async function ready(){await p.waitForFunction(()=>getComputedStyle(document.documentElement).cursor!=='wait'&&document.querySelector('.loading-screen').getBoundingClientRect().bottom<=1);await p.waitForTimeout(700);}
  async function scrollTo(selector){await p.evaluate(s=>{const el=document.querySelector(s);if(typeof scroll==='object'&&scroll.scrollTo)scroll.scrollTo(el,{duration:0,disableLerp:true,offset:-120});else el.scrollIntoView({block:'start'});},selector);await p.waitForTimeout(1100);}
  await p.goto(origin+prefix+'/');await ready();
  assert.equal(await p.locator('.home-header .personal-image picture').count(),1,'original hero background preserved');
  assert.equal(await p.locator('.home-header .big-name').count(),1,'original wordmark preserved');
  assert.equal(await p.locator('.team [data-slider-track]').count(),1,'team stays a slider');
  assert.equal(await p.locator('.home-intro .stats .stat').count(),3,'original three-counter layout');
  assert.equal(await p.locator('.home-intro .btn-contact-round').count(),1,'original round consultation CTA');
  assert.equal(await p.locator('#about.about-us').count(),1,'original About layout');
  assert.equal(await p.locator('#services.our-services .service-card').count(),9,'original service design with three additional cards');
  await scrollTo('.selected-work-slider');
  const track=p.locator('.selected-work [data-slider-track]');const old=await track.evaluate(e=>e.scrollLeft);
  await scrollTo('.selected-work [data-slider-next]');await p.locator('.selected-work [data-slider-next]').click();await p.waitForTimeout(750);assert.notEqual(await track.evaluate(e=>e.scrollLeft),old,'original work slider next');
  await p.screenshot({path:path.join(out,`section-work-${lang}-${mobile}.png`)});
  await scrollTo('#team');
  const team=p.locator('.team [data-slider-track]');const before=await team.evaluate(e=>e.scrollLeft);
  await scrollTo('.team [data-slider-next]');await p.locator('.team [data-slider-next]').click();await p.waitForTimeout(750);assert.notEqual(await team.evaluate(e=>e.scrollLeft),before,'team slider next');
  await p.screenshot({path:path.join(out,`section-team-${lang}-${mobile}.png`)});
  await scrollTo('#clients');await p.waitForTimeout(1200);
  const colors=await p.locator('#clients').evaluate(e=>({background:getComputedStyle(e).backgroundColor,width:e.querySelector('.logo-marquee-viewport').getBoundingClientRect().width,screen:innerWidth}));
  assert.equal(colors.background,'rgb(249, 70, 14)','orange client section');assert.ok(Math.abs(colors.width-colors.screen)<3,'client slider spans viewport');
  assert.equal(await p.locator('.rf-closing').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 237)','beige pre-footer');
  const logo=p.locator('[data-logo-marquee]');assert.equal(await logo.getAttribute('data-running'),'true','logo animation runs');
  assert.equal(await logo.locator('button').count(),0,'homepage visible pause button removed');
  await logo.focus();await p.keyboard.press('Space');assert.equal(await logo.getAttribute('data-manual'),'paused','keyboard pause works');
  await p.keyboard.press('Space');assert.equal(await logo.getAttribute('data-running'),'true','keyboard resumes');
  assert.equal(await p.locator('.rf-difference').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 237)','brand beige difference section');
  assert.equal(await p.locator('.rf-difference .service-card-arrow').count(),2,'service SVG arrows reused');
  const buttons=await p.locator('.rf-difference .service-card-btn').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
  assert.ok(buttons[0].right<=buttons[1].left||buttons[1].right<=buttons[0].left||buttons[0].bottom<=buttons[1].top||buttons[1].bottom<=buttons[0].top,'difference buttons do not overlap');
  assert.equal(await p.locator('#clients .rf-clients-wave').count(),1,'original orange wave reused');
  assert.equal(await p.locator('#clients h2').evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)','cream clients heading');
  assert.ok(await p.evaluate(()=>window.__rfAnimationCalls)>0,'scroll reveal is used');
  await p.goto(origin+prefix+'/services/web-design-riyadh/');await ready();
  await scrollTo('.rf-process');await p.screenshot({path:path.join(out,`section-process-${lang}-${mobile}.png`)});
  await scrollTo('#faq');const first=p.locator('#faq details').first();await first.locator('summary').focus();await p.keyboard.press('Enter');assert.ok(await first.evaluate(e=>e.open),'FAQ keyboard opens');
  await p.screenshot({path:path.join(out,`section-faq-${lang}-${mobile}.png`)});
  await p.keyboard.press('Enter');assert.equal(await first.evaluate(e=>e.open),false,'FAQ keyboard closes');
  if(!mobile){await scrollTo('.nav-bar');const nav=p.locator('.nav-bar .rf-nav-services details');await nav.locator('summary').click();assert.equal(await nav.locator('.rf-services-menu a').count(),9);await p.keyboard.press('Escape');assert.equal(await nav.evaluate(e=>e.open),false);}
  await ctx.close();assert.equal(errors.length,0,errors.join('\n'));results.push({mobile,lang,pass:true});console.log('PASS interactions',mobile,lang);
 }
 // Content and FAQs remain available without scripting.
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});await isolate(nojs,origin);const page=await nojs.newPage();await page.goto(origin+'/ar/services/mobile-application/');assert.equal(await page.locator('h1').count(),1);assert.ok(await page.locator('.rf-faq-item').count()>0);await nojs.close();
 }finally{await browser.close();srv.close();}
 fs.writeFileSync(path.join(out,'interactions.json'),JSON.stringify(results,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
