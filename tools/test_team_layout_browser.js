// General roster geometry, not just new profiles; isolated local-only QA.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/team-layout-2026-10-22');
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-70,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(500);}
async function check(browser,origin,lang,route,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar/':'/')+route,{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
  const cards=page.locator('.team-card');assert.equal(await cards.count(),12);
  await cards.locator('img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));
  const fades=await cards.evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e.querySelector('.testi-card-media'),'::after');return {content:s.content,height:parseFloat(s.height),background:s.backgroundImage,pointer:s.pointerEvents};}));
  assert.ok(fades.every(s=>s.content==='""'&&s.height===(width<=600?72:88)&&s.background.includes('linear-gradient')&&s.background.includes('rgb(255, 253, 237)')&&s.pointer==='none'),'Every old/new portrait fades smoothly into the cream panel');
  const geometry=await cards.evaluateAll(es=>es.map(e=>{const media=e.querySelector('.testi-card-media'),body=e.querySelector('.testi-card-body'),image=media.querySelector('img'),m=media.getBoundingClientRect(),b=body.getBoundingClientRect(),r=e.getBoundingClientRect();return {height:r.height,portraitHeight:m.height,bodyTop:b.top,imageBottom:m.bottom,bodyWidth:b.width,cardWidth:r.width,bodyOverflow:body.scrollHeight>body.clientHeight+2,imageWidth:image.getBoundingClientRect().width,objectFit:getComputedStyle(image).objectFit,loaded:image.complete&&image.naturalWidth>0};}));
  assert.ok(Math.max(...geometry.map(g=>g.portraitHeight))-Math.min(...geometry.map(g=>g.portraitHeight))<1,'Old and new portraits have identical stages');
  for(const g of geometry){assert.ok(g.portraitHeight>=239&&g.portraitHeight<=360.1,JSON.stringify(g));assert.ok(g.height<800,'No intrinsically tall cards: '+JSON.stringify(g));assert.ok(g.bodyTop>=g.imageBottom-1&&Math.abs(g.bodyWidth-g.cardWidth)<2,'Text stays below image at full width');assert.ok(!g.bodyOverflow&&g.loaded&&g.objectFit==='cover');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  if(route==='team/'&&width<=600){const xs=await cards.evaluateAll(es=>es.map(e=>e.offsetLeft));assert.ok(xs.every(x=>Math.abs(x-xs[0])<2),'Single readable mobile column');}
  if(!route){await page.locator('.team-track').evaluate(e=>e.scrollTo({left:(getComputedStyle(e).direction==='rtl'?-1:1)*(e.scrollWidth-e.clientWidth),behavior:'instant'}));await page.waitForTimeout(300);}
  await jump(page,'[data-team-member="nadine-othman"]');
  await page.screenshot({path:path.join(report,lang+'-'+(route?'team':'home')+'-'+width+'.png')});
  console.log('PASS unified roster',lang,route||'home',width,'portrait',geometry[0].portraitHeight,'max card',Math.round(Math.max(...geometry.map(g=>g.height))));
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=['ar','en'].flatMap(lang=>['','team/'].flatMap(route=>[320,440,834,1440,1920].map(width=>()=>check(browser,origin,lang,route,width))));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 const context=await browser.newContext({viewport:{width:440,height:1000}});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await page.evaluate(()=>window.__rosterLayoutWarm=1);
 for(const url of ['/ar/team/','/ar/services/digital-advertising/','/ar/','/team/']){await page.evaluate(url=>barba.go(url),url);await settled(page,url);assert.equal(await page.evaluate(()=>window.__rosterLayoutWarm),1);if(!url.includes('services/'))assert.equal(await page.locator('.team-card').count(),12);else{const card=page.locator('.service-studio-person').first();assert.equal(await card.evaluate(e=>getComputedStyle(e).display),'grid');assert.equal(await card.locator('.testi-card-media').evaluate(e=>getComputedStyle(e).position),'relative');}}
 await context.close();console.log('PASS warm navigation; service-team card layout remains unchanged');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
