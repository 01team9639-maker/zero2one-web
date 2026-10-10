// Local-only owner review: phone / iPad portrait sliders and exclusive cards.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,path=require('path');
const screens=[[320,780],[440,956],[744,1133],[768,1024],[820,1180],[834,1194],[1024,1366],[1032,1376],[1024,768],[1440,900]];
async function run(){
 const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  for(const lang of ['ar','en'])for(const [width,height] of screens){
   const compact=width<=760||(width<=1100&&height>=width);
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:true});await isolate(ctx,origin);
   const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(origin+(lang==='ar'?'/ar/':'/'));await p.waitForTimeout(8500);
   const move=async s=>{await p.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-100}),s);await p.waitForTimeout(450);};
   const cards=p.locator('.rf-difference-item');assert.equal(await cards.count(),4);
   assert.equal(await p.locator('.rf-bento>article').count(),1,'orange card unchanged as article');
   assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),compact?1:4);
   if(compact){
    for(let i=1;i<4;i++){
     await move('.rf-difference-item:nth-child('+(i+2)+')');
     await cards.nth(i).locator('summary').click();await p.waitForTimeout(200);
     assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1);
     assert.equal(await cards.nth(i).getAttribute('open'),'');
     assert.equal(await cards.nth(i).locator('p').isVisible(),true,'full answer revealed');
    }
    await cards.nth(0).locator('summary').focus();await p.keyboard.press('Enter');await p.waitForTimeout(200);
    assert.equal(await cards.nth(0).getAttribute('open'),'');assert.equal(await cards.nth(3).getAttribute('open'),null);
   }
   for(const s of ['.services-cards','.rf-home-blog-cards']){
    const track=p.locator(s);await move(s);
    const state=await track.evaluate(e=>({display:getComputedStyle(e).display,width:e.clientWidth,total:e.scrollWidth,count:e.children.length}));
    assert.equal(state.display,compact?'flex':'grid',s);
    const controls=track.locator('..').locator('.rf-home-scroll-controls');
    assert.equal(await controls.isVisible(),compact&&state.total>state.width+4);
    if(compact&&state.total>state.width+4){
     if(width===440&&lang==='ar'&&s==='.services-cards'){
      const client=await ctx.newCDPSession(p),r=await track.boundingBox();
      const x=r.x+70,y=r.y+60;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let step=1;step<=12;step++){
       await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+step*18,y}]});await p.waitForTimeout(16);
      }
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);
      assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'real touch swipe');
      await p.waitForTimeout(1200);
      await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await p.waitForTimeout(350);await client.detach();
     }
     await controls.locator('[data-home-scroll-next]').click();await p.waitForTimeout(250);
     assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'next advances '+s);
     assert.equal(await controls.locator('[data-home-scroll-prev]').isDisabled(),false);
     await controls.locator('[data-home-scroll-prev]').click();await p.waitForTimeout(250);
     assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)<4),'previous returns '+s+' '+await track.evaluate(e=>e.scrollLeft));
     await track.focus();await p.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await p.waitForTimeout(250);
     assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'RTL/LTR keyboard '+s);
     await track.evaluate(e=>e.scrollLeft=(getComputedStyle(e).direction==='rtl'?-1:1)*(e.scrollWidth-e.clientWidth));await p.waitForTimeout(250);
     assert.equal(await controls.locator('[data-home-scroll-next]').isDisabled(),true,'last card reachable');
    }
    await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`compact-${s.includes('blog')?'blog':'services'}-${lang}-${width}.png`)});
   }
   await move('.rf-difference');await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`compact-cards-${lang}-${width}.png`)});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'no page overflow');
   if(width===834){
    await p.setViewportSize({width:1194,height:834});await p.waitForTimeout(450);
    assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),4,'landscape restores all answers');
    assert.equal(await p.locator('.services-cards').evaluate(e=>getComputedStyle(e).display),'grid');
    await p.setViewportSize({width,height});await p.waitForTimeout(450);
    assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'portrait restores exclusive answer');
   }
   assert.equal(errors.length,0,errors.join('\n'));console.log('PASS compact homepage',lang,width,height);await ctx.close();
  }
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:440,height:956}});await isolate(ctx,origin);
  const p=await ctx.newPage();await p.goto(origin+'/ar/');assert.equal(await p.locator('.rf-difference-item[open]').count(),4,'no JS loses no copy');await ctx.close();
 }finally{await browser.close();srv.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
