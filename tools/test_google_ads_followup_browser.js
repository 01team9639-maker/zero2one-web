const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const slugs=['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting','seo-riyadh'];
const report=path.join(ROOT,'tools/reports/site-refresh/google-ads-followup-2026-10-19'),capture=process.argv.includes('--capture');
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-80,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant'});});await page.waitForTimeout(500);}
async function metrics(page){return page.locator('.service-studio-action .btn-click,.seo-hero-cta .btn-click,.seo-plan-cta .btn-click').evaluateAll(es=>es.map(e=>{const text=e.querySelector('.btn-text-inner'),s=getComputedStyle(e),t=getComputedStyle(text);return {label:e.textContent.trim(),href:e.getAttribute('href'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:t.fontSize,padding:getComputedStyle(e.querySelector('.btn-text')).padding,bg:s.backgroundColor,color:s.color,radius:s.borderRadius};}));}
async function service(browser,origin,slug,lang,width,baseline){
 const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width<=1100});await isolate(ctx,origin);const page=await ctx.newPage();
 try{await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/'+slug+'/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
  const key=slug+'/'+lang+'/'+width,actual=await metrics(page);
  if(capture){baseline[key]=actual;return;}
  if(width<=1100&&slug!=='manage-google-adwords-campaigns'){
   assert.equal(actual.length,baseline[key].length);
   actual.forEach((item,i)=>{const {width:w,height:h,...styles}=item,{width:bw,height:bh,...old}=baseline[key][i];assert.deepEqual(styles,old,'Compact CTA styles unchanged: '+key);assert.ok(Math.abs(w-bw)<1&&Math.abs(h-bh)<1,'Compact sizes unchanged (allow subpixel reveal transforms): '+key);});
  }
  if(width>1100){assert.ok(actual.length>0);assert.ok(actual.every(e=>e.height>=62&&parseFloat(e.font)>=16),'Large desktop CTAs: '+key);}
  if(slug==='manage-google-adwords-campaigns'){
   assert.equal(await page.locator('.service-studio-title-accent').textContent(),'Google Ads');
   assert.ok(await page.locator('.service-studio-title-accent').evaluate(e=>getComputedStyle(e).backgroundImage.includes('linear-gradient')&&getComputedStyle(e).backgroundClip==='text'));
   const benefits=page.locator('.service-studio-benefits');assert.equal(await benefits.locator('.service-studio-card').count(),3);
   assert.ok(await benefits.evaluate(e=>Math.abs(e.querySelector('.service-studio-rail').offsetWidth-e.querySelector('.service-studio-inner').offsetWidth)<2),'Benefits use full section width');
   assert.ok(await page.locator('#section-4').evaluate(e=>Math.abs(e.querySelector('.service-studio-grid').offsetWidth-e.querySelector('.service-studio-inner').offsetWidth)<2),'Complementary cards use full width');
   const complement=await page.locator('#section-4 .service-studio-card').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth})));
   assert.equal(complement.length,5);
   if(width>1100){assert.equal(complement[0].y,complement[2].y);assert.equal(complement[3].y,complement[4].y);assert.ok(complement[3].y>complement[0].y);assert.ok(Math.abs(complement[0].w-complement[4].w)<2);}
   await jump(page,'.service-studio-deliverables');const track=page.locator('[data-google-deliverables] [data-home-scroll-track]');
   const rail=await track.evaluate(e=>({overflow:e.scrollWidth>e.clientWidth+3,rows:new Set([...e.children].map(n=>n.offsetTop)).size,count:e.children.length}));
   assert.ok(rail.overflow);assert.equal(rail.rows,1);assert.equal(rail.count,lang==='ar'?10:9);
   await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(600);assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40));
   for(const type of ['audience','packages']){const selector='.service-studio-'+type;await jump(page,selector);const button=page.locator(selector+' .service-studio-action .btn-click'),b=await button.boundingBox();assert.ok(b.width>=Math.min(width-36,284)&&b.width<=401&&b.height>=62);assert.ok((await button.getAttribute('href')).startsWith('https://wa.me/'));}
   assert.equal(await page.locator('.service-studio-packages').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
   await jump(page,'.service-studio-process');const steps=await page.locator('.service-studio-step').evaluateAll(es=>es.map(e=>({x:e.offsetLeft,y:e.offsetTop})));
   if(width>1100)assert.ok(Math.abs(steps[0].x-steps[1].x)>100&&steps[0].x===steps[2].x);else assert.ok(steps.every(e=>e.x===steps[0].x));
   assert.equal(await page.locator('#section-10').count(),0);assert.equal(await page.locator('.service-studio-clients .logo-marquee-toggle').count(),0);
   if(lang==='ar'&&[440,1440].includes(width)){for(const [name,sel] of [['hero','.service-studio-hero'],['benefits','.service-studio-benefits'],['deliverables','.service-studio-deliverables'],['complementary','#section-4'],['audience','.service-studio-audience'],['packages','.service-studio-packages'],['process','.service-studio-process']]){await jump(page,sel);await page.locator(sel+' img').evaluateAll(es=>Promise.all(es.map(e=>{e.loading='eager';return e.decode();})));await page.screenshot({path:path.join(report,name+'-'+width+'.png')});}}
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,key+' no horizontal document overflow');
  console.log('PASS',key);
 }finally{await ctx.close();}
}
async function fallbackAndTouch(browser,origin){
 for(const lang of ['ar','en'])for(const scripts of [false,true]){
  const ctx=await browser.newContext({viewport:{width:320,height:956},hasTouch:true,javaScriptEnabled:scripts,reducedMotion:scripts?'reduce':'no-preference'});await isolate(ctx,origin);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/manage-google-adwords-campaigns/',{waitUntil:'networkidle'});if(scripts)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#section-10').count(),0);const track=page.locator('[data-google-deliverables] [data-home-scroll-track]');await jump(page,'[data-google-deliverables]');await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(300);
   const b=await track.boundingBox(),rtl=lang==='ar',y=b.y+130,from=b.x+(rtl?35:b.width-35),to=b.x+(rtl?b.width-35:35),cdp=await ctx.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/12,y}]});await page.waitForTimeout(18);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);
   assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>40),'Native swipe works including no JS');
   assert.ok(await track.evaluate(e=>{const b=e.getBoundingClientRect();return [...e.children].filter(n=>{const r=n.getBoundingClientRect();return r.right>b.left+4&&r.left<b.right-4;}).every(n=>{const r=n.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;});}),'One complete card after real swipe');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS native touch at 320',lang,scripts?'reduced motion':'no JS');
  }finally{await ctx.close();}
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:956}});await isolate(ctx,origin);const page=await ctx.newPage();
 try{await page.goto(origin+'/ar/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await page.evaluate(()=>window.__googleAdsJourney=1);
  for(const url of ['/ar/services/manage-google-adwords-campaigns/','/ar/services/seo-riyadh/','/services/manage-google-adwords-campaigns/','/ar/services/digital-advertising/']){
   await page.evaluate(url=>barba.go(url),url);await settled(page,url);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__googleAdsJourney),1);
   const sizes=await metrics(page);assert.ok(sizes.every(e=>e.height>=62&&parseFloat(e.font)>=16));
   if(url.includes('manage-google')){assert.equal(await page.locator('#section-10').count(),0);assert.equal(await page.locator('.service-studio-title-accent').textContent(),'Google Ads');await jump(page,'[data-google-deliverables]');const next=page.locator('[data-google-deliverables] [data-home-scroll-next]');await next.click();await page.waitForTimeout(650);assert.ok(await page.locator('[data-google-deliverables] [data-home-scroll-track]').evaluate(e=>Math.abs(e.scrollLeft)>40));}
  }console.log('PASS warm home → Arabic Google Ads → SEO → English Google Ads → social ads');
 }finally{await ctx.close();}
}
(async()=>{fs.mkdirSync(report,{recursive:true});const file=path.join(report,'compact-cta-before.json');if(capture)assert.ok(!fs.existsSync(file),'Do not overwrite original measurements');const baseline=capture?{}:JSON.parse(fs.readFileSync(file));const {srv,origin}=await serve(),browser=await chromium.launch();try{const tasks=slugs.flatMap(slug=>['ar','en'].flatMap(lang=>(capture?[440,1100]:[440,1100,1440]).map(width=>()=>service(browser,origin,slug,lang,width,baseline))));let index=0;await Promise.all([0,1].map(async()=>{while(index<tasks.length)await tasks[index++]();}));if(capture)fs.writeFileSync(file,JSON.stringify(baseline,null,2));else await fallbackAndTouch(browser,origin);}finally{await browser.close();srv.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
