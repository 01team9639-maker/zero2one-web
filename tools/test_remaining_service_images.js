const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path'),crypto=require('crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const records=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/image-archives/owner-services-2026-10/remaining-provenance.json')));
 for(const r of records){assert.equal(sha(fs.readFileSync(r.original)),r.sha256,'original preserved');for(const out of r.outputs)assert.equal(sha(fs.readFileSync(path.join(ROOT,'assets/images/owner-services-2026-10',out.file))),out.sha256);}
 const {srv,origin}=await serve(),browser=await chromium.launch();
 try{for(const lang of ['ar','en'])for(const [width,height] of [[1440,1000],[834,1194],[390,844]]){
  const c=await browser.newContext({viewport:{width,height},hasTouch:width<1100,reducedMotion:'reduce'});await isolate(c,origin);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+(lang==='ar'?'/ar/':'/'));await p.waitForTimeout(8500);
  assert.equal(await p.locator('#services .service-card').count(),9);assert.equal(await p.locator('[data-image-pending]').count(),0);
  for(const r of records){
   const selector=`#services .service-card:has(a[href="${lang==='ar'?'/ar':''}/services/${r.service}/"])`;
   await p.evaluate(s=>{const card=document.querySelector(s),track=card.parentElement;scroll.scrollTo(innerWidth<1100?track:card,{duration:0,disableLerp:true,offset:-100});if(innerWidth<1100)card.scrollIntoView({inline:'center',block:'nearest'});},selector);
   const image=p.locator(selector+' .service-card-media img');await image.evaluate(e=>e.decode());
   const data=await image.evaluate(e=>({src:e.currentSrc,loaded:e.complete&&e.naturalWidth>0,width:e.width,height:e.height,lazy:e.loading}));
   assert.ok(data.src.includes('/'+r.service+'-'));assert.ok(data.loaded);assert.ok(data.width>0&&data.height>0);assert.equal(data.lazy,'lazy');
   await p.locator(selector+' .service-card-media').screenshot({path:path.join(ROOT,'tools/reports/site-refresh',`owner-photo-${r.service}-${lang}-${width}.png`)});
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(errors.length,0,errors.join('\n'));console.log('PASS six service photos',lang,width);await c.close();
 }}finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
