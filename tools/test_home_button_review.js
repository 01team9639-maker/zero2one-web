// Owner's button/wave review: local browser only, tracking isolated.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,path=require('path'),sharp=require('sharp');
async function run(){const {srv,origin}=await serve(),browser=await chromium.launch();try{
 for(const lang of ['ar','en'])for(const width of [1440,440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:956},deviceScaleFactor:width===1440?1.25:1});await isolate(ctx,origin);
  const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+(lang==='ar'?'/ar/':'/'));await p.waitForTimeout(8500);
  const move=async s=>{await p.mouse.move(0,0);await p.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-120}),s);await p.waitForTimeout(800);};
  const style=e=>{const t=e.querySelector('.btn-text-inner'),arrow=e.querySelector('svg');return {text:getComputedStyle(t).color,stroke:getComputedStyle(arrow).stroke,radius:getComputedStyle(e).borderRadius,padding:getComputedStyle(e.querySelector('.btn-text')).padding,fill:getComputedStyle(e.querySelector('.btn-fill')).backgroundColor};};
  const reference=await p.locator('.rf-difference .btn-click').first().evaluate(style);
  for(const s of ['#team .rf-home-action','.rf-faq-more .rf-home-action','.rf-blog .rf-home-action','.rf-closing .rf-home-action']){
   const a=p.locator(s+' .btn-click');assert.equal(await a.count(),1,s);assert.equal(await a.locator('.btn-fill').count(),1);assert.equal(await a.locator('svg path').getAttribute('d'),'M7 17 17 7M9 7h8v8');
   await move(s);assert.deepEqual(await a.evaluate(style),reference,'same native button '+s);
   if(width===1440){await a.hover();await p.waitForTimeout(700);const hovered=await a.evaluate(style);assert.equal(hovered.text,'rgb(255, 253, 237)');assert.equal(hovered.stroke,hovered.text);assert.equal(await a.locator('.btn-fill').evaluate(e=>getComputedStyle(e).transform),'matrix(1, 0, 0, 1, 0, 0)');}
  }
  await move('.rf-blog .rf-home-action');
  const center=await p.locator('.rf-blog .rf-home-action').evaluate(e=>{const r=e.getBoundingClientRect();return (r.left+r.right)/2;});assert.ok(Math.abs(center-width/2)<2,'blog button centered');
  assert.equal(await p.locator('.quick-links details').count(),0,'footer is not dropdown');
  const footer=p.locator('.quick-links .rf-footer-services a');assert.equal(await footer.getAttribute('href'),(lang==='ar'?'/ar':'')+'/services/');
  await move('.quick-links');assert.equal(await footer.locator('.btn-text-inner').evaluate(e=>getComputedStyle(e).color),'rgb(255, 253, 237)');
  if(width===1440){await footer.hover();await p.waitForTimeout(600);assert.equal(await footer.locator('.btn-text-inner').evaluate(e=>getComputedStyle(e).color),'rgb(249, 70, 14)');}
  if(width<=720){
   await move('.home-intro');const b=await p.locator('.home-intro .btn-contact-round .btn-click').evaluate(e=>({r:e.getBoundingClientRect().toJSON(),radius:getComputedStyle(e).borderRadius,font:getComputedStyle(e.querySelector('.btn-text-inner')).fontSize}));
   assert.ok(b.r.height>=44&&b.r.height<=105,'compact mobile consultation button');assert.ok(b.r.width<=321,JSON.stringify(b));assert.equal(b.font,'15px');
   await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`button-review-intro-${lang}-${width}.png`)});
   await move('.rf-difference .rf-actions');const boxes=await p.locator('.rf-difference .rf-actions .rf-home-action').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
   assert.ok(boxes[0].right<=boxes[1].left||boxes[1].right<=boxes[0].left||boxes[0].bottom<=boxes[1].top||boxes[1].bottom<=boxes[0].top,'no overlap');
   if(Math.abs(boxes[0].top-boxes[1].top)>5)for(const r of boxes)assert.ok(Math.abs((r.left+r.right)/2-width/2)<2,'stacked buttons centered');
   await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`button-review-difference-${lang}-${width}.png`)});
  }
  await move('#selected-work');
  // Simulate fractional compositor coordinates, as in smooth scroll/zoom.
  await p.evaluate(()=>scroll.scrollTo(scroll.scroll.instance.scroll.y+.37,{duration:0,disableLerp:true}));await p.waitForTimeout(500);
  const top=await p.locator('.rf-work-wave').evaluate(e=>e.getBoundingClientRect().top);
  const png=await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`button-review-wave-${lang}-${width}.png`)});
  const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true}),ratio=info.width/width;
  for(const x of [5,Math.floor(info.width/2),info.width-5])for(let y=Math.floor(top*ratio)-2;y<=Math.ceil(top*ratio)+2;y++){
   const i=(y*info.width+x)*info.channels;assert.deepEqual([...data.subarray(i,i+3)],[255,253,237],`no top wave hairline ${lang} ${width} ${x},${y}`);
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS owner buttons/wave',lang,width);await ctx.close();
 }
}finally{await browser.close();srv.close();}}
run().catch(e=>{console.error(e);process.exitCode=1;});
