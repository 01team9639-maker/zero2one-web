// Read-only local responsive QA; all measurement/external traffic is isolated.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const report=path.join(ROOT,'tools/reports/site-refresh/team-update-2026-10-21');
const slugs=['','team/','services/digital-advertising/','services/manage-google-adwords-campaigns/','services/social-media-management/','services/marketing-consulting/'];
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-80,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(500);}
async function check(browser,origin,lang,slug,width){
 const context=await browser.newContext({viewport:{width,height:956}});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar/':'/')+slug,{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
  const general=!slug.startsWith('services/');assert.equal(await page.locator('[data-team-member="nadine-othman"]').count(),general?1:0);assert.equal(await page.locator('[data-team-member="omar-mansour"]').count(),1);
  const cards=page.locator('[data-team-member]');
  for(const card of await cards.all()){
   await card.locator('img').evaluate(e=>{e.loading='eager';return e.decode();});const image=await card.locator('img').evaluate(e=>({complete:e.complete,w:e.naturalWidth,alt:e.alt}));assert.ok(image.complete&&image.w>0&&image.alt,JSON.stringify(image));
   assert.equal(await card.locator('.testi-name').textContent(),(await card.getAttribute('data-team-member'))==='nadine-othman'?(lang==='ar'?'نادين عثمان':'Nadine Othman'):(lang==='ar'?'عمر منصور':'Omar Mansour'));
   if(general){const geometry=await card.evaluate(e=>{const image=e.querySelector('.testi-card-media').getBoundingClientRect(),body=e.querySelector('.testi-card-body').getBoundingClientRect();return {imageBottom:image.bottom,bodyTop:body.top,bodyWidth:body.width,cardWidth:e.getBoundingClientRect().width};});assert.ok(geometry.bodyTop>=geometry.imageBottom-1&&Math.abs(geometry.bodyWidth-geometry.cardWidth)<2,'New general profiles keep full-width text below the photo');}
  }
  assert.equal(await page.locator('.team-card').count(),general?12:slug.includes('marketing-consulting')?4:2);
  assert.equal(await page.locator('img[src*="team-rona"]').count(),0);assert.ok(!/رونا حكيمة|Rona Hakimeh|عمر غاندي|Omar Gandhi/.test(await page.locator('body').innerText()));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  if(slug==='team/'||slug==='services/marketing-consulting/'||slug==='services/digital-advertising/'){
   await jump(page,'[data-team-member="omar-mansour"]');await page.screenshot({path:path.join(report,lang+'-'+slug.replaceAll('/','-')+width+'.png')});
  }
  console.log('PASS roster',lang,slug||'home',width);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 const tasks=['ar','en'].flatMap(lang=>slugs.flatMap(slug=>[440,1440].map(width=>()=>check(browser,origin,lang,slug,width))));let i=0;await Promise.all([0,1].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 for(const lang of ['ar','en'])await check(browser,origin,lang,'team/',320);
 const context=await browser.newContext({viewport:{width:440,height:956}});await isolate(context,origin);const page=await context.newPage();await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await page.evaluate(()=>window.__rosterWarm=1);
 for(const route of ['/ar/team/','/ar/services/digital-advertising/','/ar/services/marketing-consulting/','/ar/services/seo-riyadh/','/team/']){await page.evaluate(route=>barba.go(route),route);await settled(page,route);assert.equal(await page.evaluate(()=>window.__rosterWarm),1);if(route.includes('seo-riyadh'))assert.equal(await page.locator('#seo-team').count(),0);else assert.equal(await page.locator('[data-team-member="omar-mansour"]').count(),1);}
 await context.close();console.log('PASS warm navigation and still-hidden SEO team');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
