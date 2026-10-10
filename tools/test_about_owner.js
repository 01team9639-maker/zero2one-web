const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support'),assert=require('assert').strict,path=require('path'),cp=require('child_process');
// Freeze the approved pre-review prose; this remains valid after local commits.
const COPY_BASE='3b466483bcde38cfbf723b6f094c4a8184e8d2b6';
(async()=>{const {srv,origin}=await serve(),b=await chromium.launch();try{
 for(const lang of ['ar','en'])for(const width of [1440,1032,834,390,320]){
  const c=await b.newContext({viewport:{width,height:width===1032?1400:1000},hasTouch:width<1100});await isolate(c,origin);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   window.__aboutCountFrames=[];
   window.__aboutAnimationStarts=[];
   const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){
    if(this.matches('[data-about-step]'))window.__aboutAnimationStarts.push({step:[...document.querySelectorAll('[data-about-step]')].indexOf(this)+1,delay:options.delay,time:performance.now()});
    return animate.call(this,frames,options);
   };
   new MutationObserver(events=>events.forEach(event=>{
    const node=event.target.nodeType===1?event.target:event.target.parentElement;
    const el=node&&node.closest('.about-stats .stat-number');
    if(el){const val=parseInt(el.textContent.replace(/\D/g,''));if(Number.isFinite(val))window.__aboutCountFrames.push(val);}
   })).observe(document,{childList:true,characterData:true,subtree:true});
  });
  const route=(lang==='ar'?'/ar':'')+'/about/';await p.goto(origin+route);await p.waitForTimeout(8500);
  const before=cp.execFileSync('git',['show',COPY_BASE+':'+route.slice(1)+'index.html'],{encoding:'utf8',cwd:ROOT});
  await p.evaluate(before=>{
   const old=new DOMParser().parseFromString(before,'text/html'),clean=s=>s.replace(/\s+/g,' ').trim();
   for(const s of ['h1','.case-overview-body p','.case-include-item h3','.case-include-item p','.rf-step-card']){
    const a=[...old.querySelectorAll(s)].map(e=>clean(e.textContent)),z=[...document.querySelectorAll(s)].map(e=>clean(e.textContent));if(JSON.stringify(a)!==JSON.stringify(z))throw Error('Copy changed '+s);
   }
   const oldp=old.querySelector('.case-outcome'),newp=document.querySelector('.rf-about-audience .case-outcome'),cta=document.querySelector('.rf-about-audience .btn-text-inner');
   if(clean(oldp.textContent)!==clean(newp.textContent+' '+cta.textContent))throw Error('Audience copy changed');
  },before);
  assert.equal(await p.locator('.rf-about-team').count(),0);assert.equal(await p.locator('.rf-about-card-number').allTextContents().then(x=>x.join(',')),'1,2,3,4,5,6');
  assert.equal(await p.locator('.rf-about-audience').count(),1);
  assert.equal(await p.locator('.rf-about-audience a').getAttribute('href'),(lang==='ar'?'/ar':'')+'/contact/');
  const move=async s=>{await p.evaluate(s=>scroll.scrollTo(document.querySelector(s),{duration:0,disableLerp:true,offset:-100}),s);await p.waitForTimeout(120);};
  await move('.rf-about-counter-band');
  const numbers=()=>p.locator('.about-stats .stat-number').allTextContents().then(es=>es.map(s=>parseInt(s.replace(/\D/g,''))));
  await p.waitForTimeout(1900);assert.deepEqual(await numbers(),[5,80,124]);
  assert.ok(await p.evaluate(()=>window.__aboutCountFrames.some(x=>x>0&&x<80)),'actual intermediate count values on initial visibility or scrolling');
  assert.equal(await p.locator('.rf-about-counter-band').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(249, 70, 14)');
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-counter-${lang}-${width}.png`)});
  await move('.rf-about-values');await p.waitForTimeout(700);
  const box=await p.locator('.rf-about-values .case-includes').boundingBox();assert.ok(Math.abs(box.x+box.width/2-width/2)<2,'cards centered');
  const cards=p.locator('.rf-about-value');
  assert.equal(await cards.count(),6);
  if(width<1100){
   assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'one compact card initially open');
   for(const i of [1,3,5]){
    await move('.rf-about-value:nth-child('+(i+1)+')');
    await cards.nth(i).locator('summary').click();await p.waitForTimeout(200);
    assert.equal(await cards.nth(i).evaluate(e=>e.open),true);
    assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'exclusive compact cards');
    assert.equal(await cards.nth(i).locator('.rf-about-value-chevron').isVisible(),true);
    assert.equal(await cards.nth(i).locator('p').isVisible(),true);
   }
   await cards.nth(5).locator('summary').click();await p.waitForTimeout(200);
   assert.equal(await cards.nth(5).evaluate(e=>e.open),false,'click again closes');
   await cards.nth(5).locator('summary').focus();await p.keyboard.press('Enter');await p.waitForTimeout(200);
   assert.equal(await cards.nth(5).evaluate(e=>e.open),true,'keyboard opens');
  }else{
   assert.equal(await cards.evaluateAll(es=>es.every(e=>e.open)),true,'desktop content remains expanded');
   assert.equal(await cards.first().locator('.rf-about-value-chevron').isVisible(),false);
  }
  await move('.rf-about-values');
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-values-${lang}-${width}.png`)});
  // Each card has its own trigger: scrolling down exposes them in DOM order.
  for(let i=0;i<6;i++){
   await move('.rf-about-timeline li:nth-child('+(i+1)+')');await p.waitForTimeout(900);
   assert.equal(await p.locator('[data-about-step]').nth(i).getAttribute('data-about-revealed'),'true');
   assert.equal(await p.locator('[data-about-step]').nth(i).evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.equal(await p.locator('.rf-about-process').evaluate(e=>getComputedStyle(e).opacity),'1','process parent must never hide cards');
  }
  const revealed=await p.locator('[data-about-step]').evaluateAll(es=>es.map(e=>e.dataset.aboutRevealCount));
  assert.ok(revealed.every(x=>x==='1'),'each step animates once');
  const starts=await p.evaluate(()=>window.__aboutAnimationStarts);
  assert.deepEqual(starts.map(s=>s.step),[1,2,3,4,5,6],'actual animations run in step order');
  // Reproduce the reported up/down + resize/refresh interaction, not just
  // individual GSAP target opacity; assert visible ancestor and stable replay count.
  await p.evaluate(()=>scroll.scrollTo(0,{duration:0,disableLerp:true}));await p.waitForTimeout(900);
  await move('.rf-about-process');await p.waitForTimeout(900);
  await p.evaluate(()=>{ScrollTrigger.refresh();initEditorialRefresh();});await p.waitForTimeout(900);
  assert.equal(await p.locator('.rf-about-process').evaluate(e=>getComputedStyle(e).opacity),'1');
  assert.equal(await p.locator('[data-about-step]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true,'steps persist after up/down/refresh');
  assert.deepEqual(await p.locator('[data-about-step]').evaluateAll(es=>es.map(e=>e.dataset.aboutRevealCount)),revealed,'no replay on reinitialization');
  assert.equal(await p.evaluate(()=>window.__aboutAnimationStarts.length),6,'no actual animation re-created');
  await p.setViewportSize({width:width+1,height:width===1032?1400:1000});await p.waitForTimeout(600);
  await p.mouse.wheel(0,600);await p.waitForTimeout(700);await p.mouse.wheel(0,-600);await p.waitForTimeout(700);
  await move('.rf-about-process');await p.waitForTimeout(700);
  assert.equal(await p.locator('.rf-about-process').evaluate(e=>getComputedStyle(e).opacity),'1','visible parent after native scroll and resize');
  assert.equal(await p.evaluate(()=>window.__aboutAnimationStarts.length),6,'native up/down cannot replay steps');
  await p.setViewportSize({width,height:width===1032?1400:1000});await p.waitForTimeout(300);
  await move('.case-intro-split');await p.waitForTimeout(750);await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-process-${lang}-${width}.png`)});
  await move('.rf-about-audience');await p.waitForTimeout(600);await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-audience-${lang}-${width}.png`)});
  await move('.rf-about-clients');await p.waitForTimeout(600);
  assert.equal(await p.locator('.rf-about-clients').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 237)');
  const viewport=await p.locator('.rf-about-clients .logo-marquee-viewport').boundingBox();assert.ok(viewport.x<2&&Math.abs(viewport.width-width)<2,'full-bleed clients');
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-clients-${lang}-${width}.png`)});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'no sideways page overflow');assert.equal(errors.length,0,errors.join('\n'));
  if(width===1440){
   // A Barba revisit is NOT a browser refresh: preserve the lifetime reveal set.
   await p.evaluate(route=>barba.go(route),lang==='ar'?'/ar/services/':'/services/');await p.waitForTimeout(3500);
   await p.evaluate(route=>barba.go(route),route);await p.waitForTimeout(3500);
   await move('.rf-about-process');await p.waitForTimeout(1300);
   assert.equal(await p.locator('.rf-about-process').evaluate(e=>getComputedStyle(e).opacity),'1');
   assert.equal(await p.evaluate(()=>window.__aboutAnimationStarts.length),6,'no replay on Barba return');
   await p.reload();await p.waitForTimeout(8500);await move('.rf-about-process');await p.waitForTimeout(1300);
   assert.ok(await p.evaluate(()=>window.__aboutAnimationStarts.length)>0,'full reload permits animation again');
   assert.equal(errors.length,0,errors.join('\n'));
  }
  console.log('PASS About owner review',lang,width);await c.close();
 }
 const c=await b.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});await isolate(c,origin);const p=await c.newPage();await p.goto(origin+'/ar/about/');await p.waitForTimeout(8000);
 assert.deepEqual(await p.locator('.about-stats .stat-number').allTextContents(),['+5','80+','124+']);assert.equal(await p.locator('[data-about-step]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);await c.close();console.log('PASS About reduced motion');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
