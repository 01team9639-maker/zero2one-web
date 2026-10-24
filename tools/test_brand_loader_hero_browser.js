const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),assert=require('assert').strict;
const report=path.join(ROOT,'tools/reports/site-refresh/brand-loader-hero-2026-10-24');
const labels={ar:{brand:'من الصفر إلى الواحد',words:['ويب','سيو','إعلانات','علامة','محتوى','متاجر','التواصل']},en:{brand:'ZERO 2 ONE',words:['Web','SEO','Ads','Branding','Content','Commerce','Social Media']}};
const photos=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/deferred-hero-photos-2026-10-24.json')));
async function monitor(context){await context.addInitScript(()=>{
 window.__loaderWords=[];window.__loaderBrands=[];window.__loaderClip=false;
 function sample(){
  const screen=document.querySelector('.loading-screen'),group=document.querySelector('.loading-words'),brand=document.querySelector('.loading-brand');
  if(screen&&screen.getBoundingClientRect().bottom>0){
   if(brand&&getComputedStyle(brand).display!=='none'){
    const text=brand.textContent.trim();if(!window.__loaderBrands.includes(text))window.__loaderBrands.push(text);
    const r=brand.getBoundingClientRect();if(r.left< -2||r.right>innerWidth+2)window.__loaderClip=true;
   }
   if(group&&Number(getComputedStyle(group).opacity)>.1)for(const word of group.querySelectorAll('.loading-word')){
    const style=getComputedStyle(word);if(style.display!=='none'&&Number(style.opacity)>.1){const text=word.textContent.trim();if(!window.__loaderWords.includes(text))window.__loaderWords.push(text);}
   }
  }
  requestAnimationFrame(sample);
 }
 requestAnimationFrame(sample);
});}
async function ready(page){await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1)&&getComputedStyle(document.documentElement).cursor!=='wait');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);}
async function verifyLoader(page,lang){
 assert.equal(await page.locator('.loading-service,.loading-brand-name,.loading-brand-site').count(),0);
 assert.equal(await page.locator('.loading-brand').textContent(),labels[lang].brand);
 assert.deepEqual(await page.locator('.loading-word').allTextContents(),labels[lang].words);
 const sample=await page.evaluate(()=>({words:window.__loaderWords,brands:window.__loaderBrands,clipped:window.__loaderClip}));
 assert.deepEqual(sample.brands,[labels[lang].brand]);assert.ok(sample.words.length>=5,'Keywords actually rotate, not just static markup: '+sample.words);assert.ok(sample.words.every(w=>labels[lang].words.includes(w)));assert.equal(sample.clipped,false,'Brand fits viewport');
}
async function check(browser,origin,route,lang,width){
 const context=await browser.newContext({viewport:{width,height:1000}});await isolate(context,origin);await monitor(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+(lang==='ar'?'/ar':'')+route,{waitUntil:'domcontentloaded'});
  if(route.includes('conversion-rate-optimization')&&width===1440){await page.waitForFunction(()=>document.querySelector('.loading-brand')&&typeof gsap!=='undefined'&&Number(getComputedStyle(document.querySelector('.loading-words')).opacity)>.5);await page.screenshot({path:path.join(report,lang+'-brand-loader.png')});}
  await ready(page);await verifyLoader(page,lang);
  if(route==='/'||route==='/services/'||route.includes('/services/conversion-rate-optimization/')||route.includes('/services/email-marketing/')){
   for(const [slug,key] of [['conversion-rate-optimization','cro'],['email-marketing','email']]){
    const image=page.locator('img[data-owner-'+key+'-hero]');if(!await image.count())continue;
    const entry=photos[slug];assert.equal(await image.getAttribute('src'),entry.outputs[1].url);assert.equal(await image.getAttribute('width'),'1536');assert.equal(await image.getAttribute('height'),'1024');
    await image.evaluate(e=>{e.loading='eager';return e.decode();});assert.ok(await image.evaluate(e=>e.naturalWidth>0&&e.complete));assert.equal((await image.getAttribute('srcset')).split(',').length,3);
    if(route.includes(slug)){
     assert.equal(await image.evaluate(e=>getComputedStyle(e).objectFit),'contain');const box=await image.boundingBox();assert.ok(Math.abs(box.width/box.height-1.5)<.01,'Full photo frame, no letterbox or stretch');
     assert.equal(await page.locator('[data-owner-'+key+'-image]').count(),37,'Vector card illustrations preserved');
     if([440,1440].includes(width))await page.screenshot({path:path.join(report,lang+'-'+key+'-hero-'+width+'.png')});
    }
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS brand loader/photos',lang,width,route);
 }finally{await context.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();try{
 if(!process.argv.includes('--legacy-only')){
 const routes=['/','/services/','/services/conversion-rate-optimization/','/services/email-marketing/','/services/seo-riyadh/','/team/','/work/','/work/alostaz-seo/'];
 const tasks=['ar','en'].flatMap(lang=>routes.flatMap(route=>[440,1440].map(width=>()=>check(browser,origin,route,lang,width))));
 for(const lang of ['ar','en'])for(const route of routes.slice(2,4))for(const width of [320,834])tasks.push(()=>check(browser,origin,route,lang,width));
 let i=0;await Promise.all([0,1,2].map(async()=>{while(i<tasks.length)await tasks[i++]();}));
 for(const lang of ['ar','en']){
  const context=await browser.newContext({viewport:{width:440,height:1000},reducedMotion:'reduce'});await isolate(context,origin);await monitor(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const prefix=lang==='ar'?'/ar':'';
  await page.goto(origin+prefix+'/services/conversion-rate-optimization/');await ready(page);await page.evaluate(()=>window.__brandWarm=1);
  for(const route of ['/services/email-marketing/','/team/','/work/','/services/seo-riyadh/','/']){
   await page.evaluate(()=>{window.__loaderWords=[];window.__loaderBrands=[];});
   const url=prefix+route;await page.evaluate(url=>barba.go(url),url);await settled(page,url);await ready(page);await verifyLoader(page,lang);assert.equal(await page.evaluate(()=>window.__brandWarm),1);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});await isolate(context,origin);const page=await context.newPage();
 for(const slug of Object.keys(photos)){await page.goto(origin+'/ar/services/'+slug+'/');assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('[data-owner-cro-image],[data-owner-email-image]').count(),37);assert.equal(await page.locator('.loading-service').count(),0);}
 await context.close();console.log('PASS warm brand-only loader on service/team/work/home; reduced motion; no-JS content');
 }
 // Blog is generated in its own repository. Test its older shell against shared
 // local assets without rewriting the generated output or fetching production.
 const legacy=await browser.newContext({viewport:{width:440,height:1000}});await isolate(legacy,origin,{mapProduction:true});await monitor(legacy);const blog=await legacy.newPage(),blogErrors=[];blog.on('pageerror',e=>blogErrors.push(e.message));
 for(const route of ['/blog/','/blog/ar/']){await blog.goto(origin+route,{waitUntil:'networkidle'});await ready(blog);assert.equal(await blog.locator('.loading-container').count(),0,'Blog has no intro overlay; do not inject one');assert.equal(await blog.locator('main').count(),1);}
 assert.deepEqual(blogErrors,[]);await legacy.close();console.log('PASS loader-free blog shells still work with shared bundle; generated blog files untouched');
}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
