// Local-only SEO owner review: bilingual parity, native sliders and disclosures.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,cp=require('child_process'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const BASES={ar:'c833579',en:'750077373ccee3c1bce64f8e1afc0ccb507d1ade'};
const screens=[[1440,1000],[1100,1460],[834,1194],[390,844],[320,780],[1024,768]];
const reports=path.join(ROOT,'tools/reports/site-refresh');
const route=lang=>(lang==='ar'?'/ar':'')+'/services/seo-riyadh/';
const groups=[['#seo-why-zero2one',6],['#seo-audience',6],['#seo-packages',4],['#seo-expected',6]];
async function move(page,selector,offset=-100){await page.evaluate(({selector,offset})=>scroll.scrollTo(document.querySelector(selector),{duration:0,disableLerp:true,offset}),{selector,offset});await page.waitForTimeout(350);}
async function copy(page,before){
 await page.evaluate(before=>{
  const old=new DOMParser().parseFromString(before,'text/html');
  const clean=doc=>{
   const main=doc.querySelector('main').cloneNode(true);
   main.querySelectorAll('#clients,.rf-seo-team,.seo-plan-price,[aria-hidden="true"],script,style,#timeSpan,.seo-owner-details-label,.rf-home-scroll-controls').forEach(e=>e.remove());
   main.querySelector('#seo-know .seo-section-cta')?.remove();
   // Native disclosure wrappers may join text nodes across block boundaries;
   // those layout boundaries are spaces to a reader, not copy mutations.
   main.querySelectorAll('h1,h2,h3,h4,p,li,summary,article,figure,details,div,section').forEach(e=>e.appendChild(doc.createTextNode(' ')));
   return main.textContent.replace(/\s+/g,' ').trim();
  };
  if(clean(old)!==clean(document)){const a=clean(old),b=clean(document);let i=0;while(a[i]===b[i]&&i<a.length)i++;throw Error('Unapproved copy change at '+i+' BEFORE '+a.slice(i-70,i+150)+' AFTER '+b.slice(i-70,i+150));}
  const hero=s=>s.querySelector('.seo-hero-grid').textContent.replace(/\s+/g,' ').trim();
  if(hero(old)!==hero(document))throw Error('Hero text changed');
  if(old.querySelector('header').textContent!==document.querySelector('header').textContent)throw Error('Header text changed');
 },before);
}
async function buttons(page,lang){
 const bs=page.locator('.seo-hero-actions .btn-click,#seo-audience .btn-click,#seo-know .btn-click,.seo-plan-cta .btn-click');
 assert.equal(await page.locator('.seo-plan-cta .service-card-arrow').count(),4,'native request arrow per plan');
 for(let i=0;i<await bs.count();i++){
  const b=bs.nth(i);await b.evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-170}));await page.waitForTimeout(150);
  const state=()=>b.evaluate(e=>{const a=e.querySelector('.service-card-arrow'),s=getComputedStyle(a),r=a.getBoundingClientRect();return {text:getComputedStyle(e.querySelector('.btn-text-inner')).color,stroke:s.stroke,fill:s.fill,path:a.querySelector('path').getAttribute('d'),width:r.width,height:r.height,transform:s.transform};});
  const base=await state();assert.equal(base.stroke,base.text,'base arrow/text color');assert.equal(base.fill,'none');assert.equal(base.path,'M7 17 17 7M9 7h8v8');assert.ok(base.width>15&&base.width<=28&&base.height<=28,'icon not black triangle');
  assert.equal(base.transform,lang==='ar'?'matrix(-1, 0, 0, 1, 0, 0)':'none','directional arrow');
  await b.hover({force:true});await page.waitForTimeout(450);const hover=await state();assert.equal(hover.stroke,hover.text,'hover arrow/text color');await page.mouse.move(0,0);await page.waitForTimeout(120);
 }
}
async function accordions(page,compact){
 for(const [selector,count] of groups){
  const group=page.locator(selector+' [data-seo-accordion]'),cards=group.locator('.seo-owner-accordion');assert.equal(await group.count(),1,'group '+selector);assert.equal(await cards.count(),count);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),compact?1:count,'initial open count '+selector);
  assert.equal(await cards.locator(':scope > summary .seo-owner-chevron').count(),count,'chevrons '+selector);
  assert.equal(await cards.locator(':scope > summary').evaluateAll(es=>es.every(e=>e.tabIndex===(matchMedia('(max-width:760px), (max-width:1100px) and (orientation:portrait)').matches?0:-1))),true,'keyboard summary');
  if(!compact)continue;
  const last=cards.nth(count-1);await last.evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-160}));await page.waitForTimeout(250);await last.locator(':scope > summary').click();await page.waitForTimeout(350);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'single open '+selector);assert.equal(await last.getAttribute('open'),'');assert.equal(await last.locator('.seo-owner-answer').isVisible(),true);assert.equal(await cards.first().locator('.seo-owner-answer').isVisible(),false,'previous answer hidden');
  await cards.first().evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-160}));await page.waitForTimeout(250);await cards.first().locator(':scope > summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(300);
  assert.equal(await cards.first().getAttribute('open'),'');assert.equal(await last.getAttribute('open'),null,'keyboard opens only first');
 }
 if(!compact)return;
 const g1=page.locator(groups[0][0]+' .seo-owner-accordion'),g2=page.locator(groups[1][0]+' .seo-owner-accordion');await g2.nth(1).evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-160}));await page.waitForTimeout(250);await g2.nth(1).locator(':scope > summary').click();await page.waitForTimeout(250);assert.equal(await g1.first().getAttribute('open'),'','sections independent');
 const plans=page.locator('.seo-plan');
 for(let i=0;i<4;i++){
  const p=plans.nth(i);assert.equal(await p.locator('.seo-plan-cta').evaluate(e=>!!e.closest('.seo-owner-answer')),false,'request CTA outside disclosure');assert.equal(await p.locator('.seo-plan-name').evaluate(e=>!!e.closest('summary')),true);assert.equal(await p.locator('.seo-owner-details-label').isVisible(),true,'Details affordance');
  if(i>0){assert.equal(await p.locator('.seo-plan-lead').isVisible(),false,'collapsed prose');assert.equal(await p.locator('.seo-plan-more').isVisible(),false,'collapsed includes');}
  assert.equal(await p.locator('.seo-plan-cta').evaluate(e=>getComputedStyle(e).display!=='none'),true,'CTA stays visible');
 }
 await plans.first().evaluate(e=>scroll.scrollTo(e,{duration:0,disableLerp:true,offset:-100}));await page.waitForTimeout(300);const includes=plans.first().locator('.seo-plan-more');assert.equal(await includes.locator('.seo-plan-list').isVisible(),true,'one outer tap exposes all package prose and features');
}
async function sliders(page,ctx,lang,width,compact){
 for(const [selector,count] of [['#seo-why',3],['#whats-included',9]]){
  const slider=page.locator(selector+' .seo-owner-scroll[data-home-scroll]'),track=slider.locator('[data-home-scroll-track]');assert.equal(await slider.count(),1);assert.equal(await track.evaluate(e=>e.children.length),count);await move(page,selector);
  const layout=await track.evaluate(e=>({display:getComputedStyle(e).display,width:e.clientWidth,total:e.scrollWidth,snap:getComputedStyle(e).scrollSnapType}));assert.equal(layout.display,compact?'flex':'grid');const controls=slider.locator('.rf-home-scroll-controls');assert.equal(await controls.isVisible(),compact&&layout.total>layout.width+4);
  if(compact){
   assert.ok(layout.total>layout.width+4,'native horizontal overflow');assert.equal(layout.snap,'x mandatory');const next=controls.locator('[data-home-scroll-next]'),prev=controls.locator('[data-home-scroll-prev]');
   await next.click();await page.waitForTimeout(800);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'next progresses');assert.equal(await prev.isDisabled(),false);await prev.click();await page.waitForTimeout(800);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)<4),'previous returns first');
   await move(page,selector);await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(800);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'directional keyboard progression');await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(250);
   if(width===390){
    const c=await ctx.newCDPSession(page),r=await track.boundingBox(),x=lang==='ar'?r.x+60:r.x+r.width-60,y=r.y+80;await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let n=1;n<=12;n++){await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(lang==='ar'?1:-1)*n*18,y}]});await page.waitForTimeout(16);}await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);await c.detach();assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>100),'real touch swipe');
   }
   await track.evaluate(e=>e.scrollLeft=(getComputedStyle(e).direction==='rtl'?-1:1)*(e.scrollWidth-e.clientWidth));await page.waitForTimeout(300);assert.equal(await next.isDisabled(),true,'last card reachable');
  }
  await page.screenshot({path:path.join(reports,`seo-bilingual-slider-${selector.slice(1)}-${lang}-${width}.png`)});
 }
}
async function nav(page,lang){
 await page.evaluate(()=>scroll.scrollTo(0,{duration:0,disableLerp:true}));await page.waitForTimeout(500);const d=page.locator('.nav-bar .rf-nav-services details');await d.locator('summary').click();await page.waitForTimeout(350);assert.equal(await d.getAttribute('open'),'');
 const result=await d.locator('.rf-services-menu').evaluate(menu=>{const r=menu.getBoundingClientRect(),h=document.querySelector('.seo-hero-grid').getBoundingClientRect(),x=r.left+r.width/2,y=Math.min(r.bottom-10,Math.max(r.top+20,h.top+30)),top=document.elementFromPoint(x,y);return {overlaps:y>=h.top&&y<=h.bottom&&x>=h.left&&x<=h.right,above:!!top?.closest('.rf-services-menu'),left:r.left,right:r.right,viewport:innerWidth};});
 assert.equal(result.overlaps,true,'dropdown/hero test point');assert.equal(result.above,true,'dropdown paints above hero');assert.ok(result.left>=0&&result.right<=result.viewport+1,'dropdown fits viewport');await page.screenshot({path:path.join(reports,`seo-bilingual-nav-${lang}.png`)});await d.locator('summary').focus();await page.keyboard.press('Escape');assert.equal(await d.getAttribute('open'),null);
}
(async()=>{
 fs.mkdirSync(reports,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  for(const lang of ['ar','en']){
   const before=cp.execFileSync('git',['show',BASES[lang]+':'+route(lang).slice(1)+'index.html'],{cwd:ROOT,encoding:'utf8'});
   for(const [width,height] of screens){
    const compact=width<=760||(width<=1100&&height>=width),ctx=await browser.newContext({viewport:{width,height},hasTouch:compact});await isolate(ctx,origin);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.addInitScript(()=>{window.__seoReveals=[];const orig=Element.prototype.animate;Element.prototype.animate=function(frames,opts){if(this.matches('[data-reveal-scope="seo"]'))window.__seoReveals.push([...document.querySelectorAll('[data-reveal-scope="seo"]')].indexOf(this)+1);return orig.call(this,frames,opts);};});
    await p.goto(origin+route(lang));await p.waitForTimeout(8500);await copy(p,before);assert.equal(await p.locator('.rf-seo-team,#clients,.seo-plan-price').count(),0);assert.equal(await p.locator('#seo-know .seo-owner-number').count(),7);assert.equal(await p.locator('#seo-why-zero2one .seo-owner-number').count(),6);assert.equal(await p.locator('#seo-audience .seo-owner-icon').count(),6);
    // Verify the chronological scroll reveal before jumping between controls
    // in later sections, which may naturally enter the timeline from below.
    for(let i=0;i<7;i++)await move(p,'#seo-process li:nth-child('+(i+1)+')');await p.waitForTimeout(1800);assert.deepEqual(await p.evaluate(()=>window.__seoReveals),[1,2,3,4,5,6,7]);
    assert.equal(await p.locator('.seo-shot,.seo-card,.seo-tile,.seo-plan,.seo-know-list li,.seo-timeline-item').evaluateAll(es=>es.every(e=>getComputedStyle(e).boxShadow!=='none')),true,'card depth also exists without hover on touch screens');
    await buttons(p,lang);await accordions(p,compact);await sliders(p,ctx,lang,width,compact);
    for(const id of ['seo-why','seo-know','whats-included','seo-why-zero2one','seo-audience','seo-packages','seo-process']){
     await move(p,'#'+id);await p.locator('#'+id+' img').evaluateAll(es=>Promise.all(es.map(e=>e.complete?Promise.resolve():new Promise(r=>{e.onload=r;e.onerror=r}))));
     if(id==='whats-included'){const imgs=p.locator('#'+id+' .seo-card-img');assert.equal(await imgs.count(),9);assert.equal(await imgs.evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0&&!e.src.includes('placeholders'))),true);}
     const color=await p.locator('#'+id).evaluate(e=>getComputedStyle(e).backgroundColor);if(['seo-know','seo-process'].includes(id))assert.equal(color,'rgb(249, 70, 14)');if(id==='seo-audience')assert.equal(color,'rgb(255, 253, 237)');if(id==='seo-why-zero2one'){assert.equal(await p.locator('#'+id+' .seo-owner-wave').count(),2);assert.equal(await p.locator('#'+id+' .seo-tile').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgb(255, 253, 237)')),true);assert.equal(await p.locator('#'+id+' h3').first().evaluate(e=>getComputedStyle(e).fontWeight),'700');}
     assert.equal(await p.locator('#'+id).evaluate(e=>{const s=getComputedStyle(e);return parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth);}),0,'no section divider lines');await p.screenshot({path:path.join(reports,`seo-bilingual-${id}-${lang}-${width}.png`)});
    }
    await move(p,'.seo-hero-shell');await move(p,'#seo-process');await p.evaluate(()=>{ScrollTrigger.refresh();initEditorialRefresh();});await p.waitForTimeout(1500);assert.deepEqual(await p.evaluate(()=>window.__seoReveals),[1,2,3,4,5,6,7],'no replay');assert.equal(await p.locator('#seo-process li').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);
    if(width===834){
     assert.equal(await p.locator('.seo-plan-more').evaluateAll(es=>es.every(e=>e.open&&e.dataset.seoDesktopIncludes==='false')),true,'compact reinitialization preserves prior closed desktop includes state');
     await p.setViewportSize({width:1194,height:834});await p.waitForTimeout(500);for(const [s,n] of groups)assert.equal(await p.locator(s+' .seo-owner-accordion').evaluateAll(es=>es.filter(e=>e.open).length),n,'landscape all open');
     assert.equal(await p.locator('.seo-plan-more').evaluateAll(es=>es.every(e=>!e.open&&e.dataset.seoCompactIncludes===undefined)),true,'returning to desktop restores prior includes state after compact reinitialization');
     for(const s of ['#seo-why','#whats-included'])assert.equal(await p.locator(s+' [data-home-scroll-track]').evaluate(e=>getComputedStyle(e).display),'grid');await p.setViewportSize({width,height});await p.waitForTimeout(500);for(const [s] of groups)assert.equal(await p.locator(s+' .seo-owner-accordion').evaluateAll(es=>es.filter(e=>e.open).length),1,'portrait single open');
    }
    if(width===1440)await nav(p,lang);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'no page overflow');assert.equal(errors.length,0,errors.join('\n'));console.log('PASS SEO bilingual owner review',lang,width,height);await ctx.close();
   }
   const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await isolate(ctx,origin);const p=await ctx.newPage();await p.goto(origin+route(lang));await p.waitForTimeout(8500);assert.equal(await p.locator('[data-reveal-scope="seo"]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);await ctx.close();console.log('PASS reduced motion',lang);
   const noScript=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});await isolate(noScript,origin);const fallback=await noScript.newPage();await fallback.goto(origin+route(lang));for(const [s,n] of groups)assert.equal(await fallback.locator(s+' .seo-owner-accordion[open]').count(),n,'no JS loses no copy');
   const nativeIncludes=fallback.locator('.seo-plan-more').first();assert.equal(await nativeIncludes.getAttribute('open'),null,'script-free includes starts as a native closed detail');
   assert.equal(await nativeIncludes.locator('summary').evaluate(e=>getComputedStyle(e).pointerEvents),'auto','no JS keeps native includes clickable');await nativeIncludes.locator('summary').click();assert.equal(await nativeIncludes.getAttribute('open'),'');assert.equal(await nativeIncludes.locator('.seo-plan-list').isVisible(),true,'script-free native click exposes all package features');
   await nativeIncludes.locator('summary').click();assert.equal(await nativeIncludes.getAttribute('open'),null,'script-free native click closes features');await noScript.close();console.log('PASS native no-JS package details',lang);
  }
  const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),provenance=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/images/seo/owner-review-2026-10/provenance.json'),'utf8'));for(const e of provenance){if(fs.existsSync(e.original))assert.equal(sha(fs.readFileSync(e.original)),e.sha256);assert.equal(sha(fs.readFileSync(path.join(ROOT,'assets/images/seo/owner-review-2026-10',e.original_copy))),e.sha256);}console.log('PASS all archived owner originals preserved');
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
