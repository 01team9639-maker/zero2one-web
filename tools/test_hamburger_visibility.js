const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,path=require('path');
async function run(){const {srv,origin}=await serve(),browser=await chromium.launch();try{
 for(const lang of ['ar','en'])for(const width of [1440,1025,1024,390]){
  const ctx=await browser.newContext({viewport:{width,height:1000}});await isolate(ctx,origin);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+(lang==='ar'?'/ar/':'/'));await p.waitForTimeout(8500);
  const button=p.locator('.btn-hamburger .btn-click');
  const state=()=>p.evaluate(()=>({hidden:getComputedStyle(document.querySelector('.btn-hamburger')).visibility==='hidden',scrolled:document.querySelector('main').classList.contains('scrolled'),bar:document.querySelector('.nav-bar').getBoundingClientRect().bottom}));
  assert.equal((await state()).hidden,width>1024,'desktop toggle hidden at top; mobile visible');
  if(width>1024){
   // CSS visibility wins over the old focus-within reveal rule.
   await button.evaluate(e=>e.focus());assert.equal(await button.evaluate(e=>e===document.activeElement),false);
   const bottom=(await state()).bar;
   await p.evaluate(y=>scroll.scrollTo(y,{duration:0,disableLerp:true}),Math.max(0,bottom-15));await p.waitForTimeout(800);
   assert.equal((await state()).hidden,true,'no overlap while navbar partially visible');
   await p.evaluate(()=>scroll.scrollTo(600,{duration:0,disableLerp:true}));await p.waitForTimeout(800);
   assert.equal((await state()).hidden,false,'toggle available after navbar leaves');
   assert.equal((await state()).bar<0,true);
  }
  await button.click();await p.waitForTimeout(800);assert.equal(await button.getAttribute('aria-expanded'),'true');
  await p.keyboard.press('Escape');await p.waitForTimeout(800);assert.equal(await button.getAttribute('aria-expanded'),'false');
  assert.equal(await button.evaluate(e=>e===document.activeElement),true,'Escape returns focus');
  await p.evaluate(()=>scroll.scrollTo(0,{duration:0,disableLerp:true}));await p.waitForTimeout(800);
  assert.equal((await state()).hidden,width>1024,'correct state when returning to top');
  assert.equal((await state()).scrolled,false);
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`hamburger-${lang}-${width}.png`)});
  assert.equal(errors.length,0,errors.join('\n'));await ctx.close();console.log('PASS hamburger',lang,width);
 }
}finally{await browser.close();srv.close();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
