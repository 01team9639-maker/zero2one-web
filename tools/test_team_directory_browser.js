// Real responsive directory/navigation tests; no analytics or external writes.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/team-roster-followup-2026-10-23');
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-70,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(400);}
async function check(browser,origin,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const prefix=lang==='ar'?'/ar/':'/';
 try{
  await page.goto(origin+prefix+'team/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.rf-team-directory').count(),1);assert.equal(await page.locator('.team-directory-group').count(),4);assert.equal(await page.locator('.team-card').count(),14);assert.equal(await page.locator('.team-directory-total b').textContent(),'14');
  // The 24 October owner photo refresh adds a content-hash cache stamp only.
  assert.deepEqual(await page.locator('.team-directory-preview img').evaluateAll(es=>es.map(e=>e.getAttribute('src').split('?')[0])),['/assets/images/team/team-kerolos.webp','/assets/images/team/team-moayad.webp']);
  assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('.team-directory-jump a').count(),4);
  await page.locator('.rf-team-directory img').evaluateAll(es=>Promise.all(es.filter(e=>e.closest('.team-directory-hero,.team-directory-group')).map(e=>{e.loading='eager';return e.decode();})));
  assert.deepEqual(await page.locator('.team-directory-group').evaluateAll(es=>es.map(e=>e.querySelectorAll('.team-card').length)),[4,3,3,4]);
  for(const id of ['walaa-al-qarni','hadeel-al-qahtani'])assert.equal(await page.locator('[data-team-member="'+id+'"] img').getAttribute('src'),'/assets/images/team/team-ruba.webp');
  assert.equal(await page.locator('[data-team-member="omar-mansour"] .testi-role').textContent(),lang==='ar'?'مدير قسم المبيعات':'Head of Sales');
  const geometry=await page.locator('.team-card').evaluateAll(es=>es.map(e=>{const m=e.querySelector('.testi-card-media').getBoundingClientRect(),b=e.querySelector('.testi-card-body').getBoundingClientRect(),s=getComputedStyle(e.querySelector('.testi-card-media'),'::after');return {portrait:m.height,bodyTop:b.top,imageBottom:m.bottom,overflow:b.height+2<e.querySelector('.testi-card-body').scrollHeight,fade:s.backgroundImage,token:getComputedStyle(e).getPropertyValue('--portrait-panel-fade').trim()};}));
  assert.ok(geometry.every(g=>g.portrait>=239&&g.portrait<=360.1&&g.bodyTop>=g.imageBottom-1&&!g.overflow&&g.fade.includes('0.135deg')&&g.fade.includes('55.11%')&&g.fade.includes('99.86%')),'Matching testimonial fade, bounded photos, no text overlap');
  assert.ok(geometry.every(g=>g.fade===geometry[0].fade&&g.token===geometry[0].token));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
  await page.screenshot({path:path.join(report,lang+'-hero-'+width+'.png')});
  await jump(page,'#team-marketing');await page.screenshot({path:path.join(report,lang+'-marketing-'+width+'.png')});
  if([320,440,1440].includes(width)){for(const group of ['leadership','sales']){await jump(page,'#team-'+group);await page.screenshot({path:path.join(report,lang+'-'+group+'-'+width+'.png')});}}
  await page.goto(origin+prefix,{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  assert.equal(await page.locator('.team-card').count(),14);assert.equal(await page.locator('[data-team-member="walaa-al-qarni"]').count(),1);assert.equal(await page.locator('[data-team-member="hadeel-al-qahtani"]').count(),1);
  const fade=await page.evaluate(()=>{const m=document.querySelector('.team-card .testi-card-media'),t=document.querySelector('.testimonials .testi-card-body');return {team:getComputedStyle(m,'::after').backgroundImage,client:getComputedStyle(t).backgroundImage,token:getComputedStyle(t).getPropertyValue('--portrait-panel-fade').trim()};});assert.equal(fade.team,geometry[0].fade);if(width>540)assert.equal(fade.team,fade.client,'Exact same computed gradient as actual client testimonials');assert.equal(fade.token,geometry[0].token);
  if(width>1024){const link=page.locator('.nav-bar [data-team-nav]');assert.ok(await link.isVisible());const boxes=await page.locator('.nav-bar .credits-top,.nav-bar .links-wrap').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));assert.ok(boxes.every(b=>b.width>30&&b.left>=0&&b.right<=width+1),'Navbar stays inside viewport');assert.ok(boxes[0].right<=boxes[1].left+1||boxes[1].right<=boxes[0].left+1,'Brand and expanded navbar do not overlap');await link.click();}
  else{await page.locator('.btn-hamburger .btn-click').click();await page.waitForTimeout(500);const link=page.locator('#site-menu [data-team-nav]');await link.scrollIntoViewIfNeeded();assert.ok(await link.isVisible());await link.click();}
  await settled(page,prefix+'team/');assert.equal(await page.locator('.rf-team-directory').count(),1);assert.deepEqual(errors,[]);
  console.log('PASS directory/fade/direct navigation',lang,width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=['ar','en'].flatMap(lang=>[320,440,834,1100,1280,1440,1920].map(width=>()=>check(browser,origin,lang,width)));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+'/ar/team/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>window.__directoryWarm=1);
 await page.locator('.team-directory-intro a[href="#team-directory"]').click();await page.waitForTimeout(1100);
 await page.locator('.team-directory-jump a[href="#team-marketing"]').click();await page.waitForTimeout(1100);
 assert.ok(await page.locator('#team-marketing').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=-5&&r.top<160;}),'Hero/category jumps reach the selected department');
 for(const url of ['/ar/services/digital-advertising/','/ar/team/','/team/','/ar/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__directoryWarm),1);assert.equal(await page.locator('.nav-bar [data-team-nav]').count(),1);assert.equal(await page.locator('#site-menu [data-team-nav]').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);if(url.includes('digital-advertising'))assert.equal(await page.locator('[data-team-member="omar-mansour"] .testi-role').textContent(),'مدير قسم المبيعات');}
 await context.close();console.log('PASS reduced-motion warm service → team → English → home navigation');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
