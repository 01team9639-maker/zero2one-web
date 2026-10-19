// Regression: the investment rail must settle on whole, shadow-free cards.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/social-investment-snap-2026-10-19');
async function whole(track,count){
 const state=await track.evaluate(e=>{
  const b=e.getBoundingClientRect(),s=getComputedStyle(e);
  const left=b.left+parseFloat(s.paddingLeft),right=b.right-parseFloat(s.paddingRight);
  return {snap:s.scrollSnapType,cards:[...e.children].map(n=>{
   const r=n.getBoundingClientRect();
   return {width:r.width,visible:Math.max(0,Math.min(right,r.right)-Math.max(left,r.left)),shadow:getComputedStyle(n).boxShadow,filter:getComputedStyle(n.querySelector('img')).filter};
  })};
 });
 assert.equal(state.snap,'x mandatory');
 const visible=state.cards.filter(c=>c.visible>2);
 assert.equal(visible.length,count,JSON.stringify(state));
 assert.ok(visible.every(c=>Math.abs(c.width-c.visible)<2),'No half card after scrolling: '+JSON.stringify(state));
 assert.ok(state.cards.every(c=>c.shadow==='none'&&c.filter==='none'),'No card/image shadows');
}
async function check(browser,origin,lang,width){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:true});
 await isolate(ctx,origin);const page=await ctx.newPage();
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/digital-advertising/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);
  const track=page.locator('.social-investment-grid');
  await track.evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-90,{duration:0,disableLerp:true});else e.scrollIntoView({block:'start',behavior:'instant'});});
  await page.locator('.social-investment-media img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  await page.waitForTimeout(800);
  const ribbon=page.locator('.social-investment > [data-seo-flow]');
  const flow=await ribbon.evaluate(e=>{
   const next=e.parentElement.nextElementSibling.querySelector('[data-seo-flow]');
   return {visible:getComputedStyle(e).visibility,tone:e.dataset.seoFlowTone,ready:e.dataset.seoFlowReady,
    color:getComputedStyle(e.querySelector('stop')).stopColor,
    connected:!!next&&e.querySelector('path').getAttribute('d')===next.querySelector('path').getAttribute('d')&&Math.abs(Number(e.dataset.seoFlowEnd)-Number(next.dataset.seoFlowStart))<2,
    progress:Number(e.dataset.seoFlowProgress)};
  });
  assert.equal(flow.visible,'visible');assert.equal(flow.tone,'light');assert.equal(flow.ready,'true');
  assert.ok(flow.connected,'The same ribbon geometry continues into the next section');
  assert.ok(flow.color!=='rgb(249, 70, 14)'&&flow.progress>0,'Light ribbon is drawn over the orange background');
  await page.locator('.social-investment-actions').evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-300,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant'});});
  await page.waitForTimeout(400);
  assert.ok(await ribbon.evaluate((e,before)=>Number(e.dataset.seoFlowProgress)>before,flow.progress),'Ribbon responds to scroll through this section');
  await track.evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-90,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant'});});
  await page.waitForTimeout(400);
  const count=width<=760?1:width<=1100?2:3;
  await whole(track,count);
  if(count<3){
   const box=await track.boundingBox(),rtl=lang==='ar',y=box.y+140;
   const from=box.x+(rtl?40:box.width-40),to=box.x+(rtl?box.width-40:40);
   const cdp=await ctx.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
   for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/12,y}]});await page.waitForTimeout(18);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(1000);
   assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Real swipe moves the rail');
   await whole(track,count);
   const next=page.locator('.social-investment [data-home-scroll-next]');
   for(let i=0;i<2;i++){if(await next.isEnabled()){await next.click();await page.waitForTimeout(800);await whole(track,count);}}
   assert.ok(await track.evaluate(e=>{const b=e.getBoundingClientRect(),r=e.lastElementChild.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;}),'Last card fully reachable');
   if(width===440)await page.screenshot({path:path.join(report,lang+'-440-last.png')});
   await page.locator('.social-investment [data-home-scroll-prev]').click();await page.waitForTimeout(800);await whole(track,count);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  console.log('PASS whole shadow-free investment cards',lang,width);
 }finally{await ctx.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{for(const lang of ['ar','en'])for(const width of [320,440,834,1100,1440])await check(browser,origin,lang,width);}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
