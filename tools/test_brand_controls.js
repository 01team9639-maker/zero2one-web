// Local-only UI checks; external tracking and contact requests are isolated.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict;
const path=require('path');
const sharp=require('sharp');
async function run(){
 const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  for(const mobile of [false,true])for(const lang of ['en','ar']){
   const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
   await isolate(ctx,origin);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const prefix=lang==='ar'?'/ar':'';
   async function go(route){await p.goto(origin+prefix+route);await p.waitForFunction(()=>document.querySelector('.loading-screen').getBoundingClientRect().bottom<=1);await p.waitForTimeout(800);}
   async function scrollTo(s){await p.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-140}),s);await p.waitForTimeout(800);}
   await go('/');await scrollTo('#clients');
   const wave=await p.locator('.rf-clients-wave').evaluate(e=>({border:getComputedStyle(e.parentNode).borderTopWidth,top:e.getBoundingClientRect().top,section:e.parentNode.getBoundingClientRect().top,width:e.getBoundingClientRect().width,screen:innerWidth}));
   assert.equal(wave.border,'0px');assert.ok(wave.top<wave.section);assert.ok(wave.width>wave.screen);
   const image=await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`wave-fixed-${lang}-${mobile}.png`)});
   const edge=await p.locator('.rf-clients-wave svg').evaluate(e=>e.getBoundingClientRect().bottom);
   const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
   for(const x of [5,Math.floor(info.width/2),info.width-5])for(let y=Math.floor(edge)-2;y<=Math.floor(edge)+2;y++){
    const i=(y*info.width+x)*info.channels;
    assert.deepEqual([...data.subarray(i,i+3)],[249,70,14],`wave bottom seam at ${x},${y}`);
   }
   await scrollTo('.rf-existing-faq');const faq=p.locator('.rf-existing-faq details').first();
   assert.equal(await faq.locator('summary span').textContent(),'');
   assert.ok(await faq.locator('summary span').evaluate(e=>parseFloat(getComputedStyle(e,'::after').borderRightWidth)>=1));
   await faq.locator('summary').focus();await p.keyboard.press('Enter');await p.waitForTimeout(300);assert.equal(await faq.evaluate(e=>e.open),true);
   await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`chevron-fixed-${lang}-${mobile}.png`)});
   const cta=p.locator('.rf-faq-more .rf-button');await scrollTo('.rf-faq-more');
   assert.ok(await cta.evaluate(e=>getComputedStyle(e,'::after').maskImage.includes('M7')),'approved arrow mask');
   if(!mobile){await cta.hover();await p.waitForTimeout(600);assert.equal(await cta.evaluate(e=>getComputedStyle(e,'::before').transform),'matrix(1, 0, 0, 1, 0, 0)');}
   await go('/services/seo-riyadh/');
   assert.equal(await p.locator('.svc-faq-icon').first().evaluate(e=>getComputedStyle(e,'::after').display),'none');
   assert.ok(await p.locator('.svc-faq-icon').first().evaluate(e=>parseFloat(getComputedStyle(e,'::before').borderRightWidth)>=1));
   await go('/contact/');
   assert.ok(await p.locator('.contact-submit .btn-text').evaluate(e=>getComputedStyle(e,'::after').maskImage.includes('M7')),'legacy submit action icon');
   assert.equal(errors.length,0,errors.join('\n'));await ctx.close();console.log('PASS brand controls',lang,mobile);
  }
 }finally{await browser.close();srv.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
