// The approved shared footer, tested without changing any content or sending
// forms, social visits, chat messages or analytics to an external service.
const {chromium}=require('playwright');
const {isolate,ROOT}=require('./test_support');
const {createPreviewServer}=require('./preview_site');
const fs=require('fs'),path=require('path'),cp=require('child_process'),assert=require('assert').strict;
const reports=path.join(ROOT,'tools/reports/site-refresh');
const files=cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**','-g','!_archive/**','-g','!pages/**'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(file=>fs.readFileSync(path.join(ROOT,file),'utf8').includes('bottom-footer')).sort();
const route=file=>'/'+file.replace(/index\.html$/,'');
async function inspect(page,markup,width){
 const actual=await page.evaluate(markup=>{
  const original=new DOMParser().parseFromString(markup,'text/html').querySelector('.footer .bottom-footer'),footer=document.querySelector('.footer .bottom-footer');
  const record=e=>({links:[...e.querySelectorAll('a')].map(a=>[a.getAttribute('href'),a.textContent.replace(/\s+/g,' ').trim(),a.getAttribute('target'),a.getAttribute('rel')]),labels:[...e.querySelectorAll('.ui-label')].map(e=>e.textContent.trim()),images:[...e.querySelectorAll('img')].map(e=>[e.getAttribute('src').replace(/^https:\/\/zero2one\.sa(?=\/assets\/)/,''),e.getAttribute('alt'),e.getAttribute('width'),e.getAttribute('height')])});
  const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  return {actual:record(footer),original:record(original),grid:getComputedStyle(footer).display,frame:box(footer),quick:box(footer.querySelector('.quick-links')),social:box(footer.querySelector('.socials')),credits:box(footer.querySelector('.credits')),time:box(footer.querySelector('.time')),targets:[...footer.querySelectorAll('.quick-links a,.socials a')].map(box),overflow:footer.scrollWidth>footer.clientWidth+1,timeDirection:getComputedStyle(footer.querySelector('#timeSpan')).direction};
 },markup);
 assert.deepEqual(actual.actual,actual.original,'Footer copy, URLs, certificate and labels stay unchanged');
 assert.equal(actual.grid,'grid');assert.equal(actual.overflow,false,'No footer overflow');
 assert.ok(actual.targets.every(r=>r.height>=44&&r.left>=actual.frame.left-1&&r.right<=actual.frame.right+1),'All links fit and have 44px touch targets');
 if(width<=760)assert.ok(actual.social.top>=actual.quick.bottom+15,'Mobile groups stack cleanly');
 else assert.ok(Math.abs(actual.quick.top-actual.social.top)<2,'Link groups align in a shared row');
 assert.ok(Math.abs(actual.credits.top-actual.time.top)<2,'Version and time align');
 assert.ok(actual.credits.top>=Math.max(actual.quick.bottom,actual.social.bottom)+15,'Metadata follows link groups');
 assert.equal(actual.timeDirection,'ltr');
}
async function visual(browser,origin,file,width,height){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<=760});await isolate(context,origin);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const markup=fs.readFileSync(path.join(ROOT,file),'utf8');
  await page.goto(origin+route(file),{waitUntil:'networkidle'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
  await page.evaluate(()=>document.fonts.ready);await inspect(page,markup,width);
  await page.evaluate(()=>{if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo('bottom',{duration:0,disableLerp:true});else window.scrollTo(0,document.body.scrollHeight);});
  await page.waitForTimeout(850);
  await page.locator('.bottom-footer .maroof img').evaluate(e=>e.decode());
  assert.equal(await page.locator('.bottom-footer .maroof').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.wa-float')?.getBoundingClientRect();return !b||a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;}),true,'WhatsApp cannot cover the certificate');
  await page.locator('.bottom-footer .quick-links a').first().focus();
  assert.equal(await page.locator('.bottom-footer .quick-links a').first().evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),true,'Keyboard focus remains visible');
  await page.locator('.bottom-footer .quick-links a').first().evaluate(e=>e.blur());
  await page.screenshot({path:path.join(reports,'footer-shared-'+file.replaceAll('/','-').replace('.html','')+'-'+width+'.png')});
  assert.deepEqual(errors,[],'No page errors');
  console.log('PASS interactive footer',route(file),width);
 }finally{await context.close();}
}
(async()=>{
 const server=createPreviewServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
 try{
  const source=fs.readFileSync(path.join(ROOT,'assets/css/footer-layout.css'),'utf8');
  assert.ok(!source.includes('rf-seo-studio')&&!source.includes('--studio-'),'Footer has no dependency on SEO-only styles');
  for(const file of ['blog/index.html','blog/ar/index.html']){
   const response=await fetch(origin+route(file)),text=await response.text();
   assert.ok(!text.includes('https://zero2one.sa/assets/'),'Local blog preview resolves shared assets inside this checkout');
   assert.ok(fs.readFileSync(path.join(ROOT,file),'utf8').includes('https://zero2one.sa/assets/'),'Generated blog output is untouched');
  }
  const tasks=[320,1440].flatMap(width=>files.map(file=>async()=>{
   const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});await isolate(context,origin);const page=await context.newPage();
   try{await page.goto(origin+route(file),{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await inspect(page,fs.readFileSync(path.join(ROOT,file),'utf8'),width);}
   catch(e){e.message=route(file)+' '+width+': '+e.message;throw e;}
   finally{await context.close();}
  }));
  let next=0;await Promise.all([0,1,2].map(async()=>{while(next<tasks.length)await tasks[next++]();}));
  console.log('PASS all '+files.length+' footer pages in both languages at 320px and 1440px, including generated blog pages');
  fs.mkdirSync(reports,{recursive:true});
  const samples=['ar/index.html','index.html','ar/contact/index.html','services/brand-identity/index.html','ar/services/seo-riyadh/index.html','work/alostaz-seo/index.html','blog/ar/index.html','blog/index.html'];
  const visualTasks=samples.flatMap(file=>[[320,780],[834,1194],[1440,900]].map(([w,h])=>()=>visual(browser,origin,file,w,h)));
  next=0;await Promise.all([0,1].map(async()=>{while(next<visualTasks.length)await visualTasks[next++]();}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
