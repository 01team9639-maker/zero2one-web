const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support'),assert=require('assert').strict,path=require('path'),cp=require('child_process');
// Freeze the approved pre-review prose; this remains valid after local commits.
const COPY_BASE='3b466483bcde38cfbf723b6f094c4a8184e8d2b6';
(async()=>{const {srv,origin}=await serve(),b=await chromium.launch();try{
 for(const lang of ['ar','en'])for(const width of [1440,834,390,320]){
  const c=await b.newContext({viewport:{width,height:1000},hasTouch:width<1000});await isolate(c,origin);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
   window.__aboutCountFrames=[];
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
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-values-${lang}-${width}.png`)});
  // Each card has its own trigger: scrolling down exposes them in DOM order.
  for(let i=0;i<6;i++){
   await move('.rf-about-timeline li:nth-child('+(i+1)+')');await p.waitForTimeout(900);
   assert.equal(await p.locator('[data-about-step]').nth(i).getAttribute('data-about-revealed'),'true');
   assert.equal(await p.locator('[data-about-step]').nth(i).evaluate(e=>getComputedStyle(e).opacity),'1');
  }
  await move('.case-intro-split');await p.waitForTimeout(750);await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-process-${lang}-${width}.png`)});
  await move('.rf-about-audience');await p.waitForTimeout(600);await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-audience-${lang}-${width}.png`)});
  await move('.rf-about-clients');await p.waitForTimeout(600);
  assert.equal(await p.locator('.rf-about-clients').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 253, 237)');
  const viewport=await p.locator('.rf-about-clients .logo-marquee-viewport').boundingBox();assert.ok(viewport.x<2&&Math.abs(viewport.width-width)<2,'full-bleed clients');
  await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`about-clients-${lang}-${width}.png`)});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'no sideways page overflow');assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS About owner review',lang,width);await c.close();
 }
 const c=await b.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});await isolate(c,origin);const p=await c.newPage();await p.goto(origin+'/ar/about/');await p.waitForTimeout(8000);
 assert.deepEqual(await p.locator('.about-stats .stat-number').allTextContents(),['+5','80+','124+']);assert.equal(await p.locator('[data-about-step]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);await c.close();console.log('PASS About reduced motion');
}finally{await b.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
