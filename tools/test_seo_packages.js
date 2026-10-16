// The Oct 16 package-only change has its own independent pre-edit scope
// snapshot; older SEO/service baselines are preserved, never reset.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),assert=require('assert').strict;
const reports=path.join(ROOT,'tools/reports/site-refresh'),baselinePath=path.join(reports,'seo-packages-before-2026-10-16.json');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/page-copy/seo-packages-2026-10.json'),'utf8'));
const owned=['services/seo-riyadh/index.html','ar/services/seo-riyadh/index.html'];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function protectedMarkup(source,allowPackages){
 source=source.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
 if(!allowPackages)return source;
 return source
 .replace(/<!-- SEO TEAM DISABLED:2026-10-16\n([\s\S]*?)\n-->/,'$1')
 .replace(/<section\b[^>]*id="seo-packages"[\s\S]*?<\/section>/,'PACKAGE_SECTION')
 .replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g,(all,start,text,end)=>{
  const schema=JSON.parse(text);if(schema['@type']!=='Service'||!schema.hasOfferCatalog)return all;
  delete schema.hasOfferCatalog.itemListElement;return start+JSON.stringify(schema)+end;
 });
}
function snapshot(){
 const files=cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').sort();
 return Object.fromEntries(files.map(f=>[f,sha(protectedMarkup(fs.readFileSync(path.join(ROOT,f),'utf8'),owned.includes(f)))]));
}
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-90,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(1000);}
async function check(page,lang){
 const cards=page.locator('#seo-packages [data-seo-package]');assert.equal(await cards.count(),3);
 assert.deepEqual(await cards.evaluateAll(es=>es.map(e=>e.dataset.seoPackage)),['standard','professional','enterprise']);
 assert.equal(await cards.locator('details.seo-package-disclosure').count(),3,'Each package has one native disclosure');
 assert.equal(await cards.locator('summary .seo-owner-chevron').count(),3,'Each package has a chevron');
 assert.equal(await cards.locator('summary .seo-owner-chevron').evaluateAll(es=>es.every(e=>getComputedStyle(e).display==='block'&&e.getBoundingClientRect().width>=19)),true,'Chevrons stay visible on desktop as well as mobile');
 assert.equal(await cards.locator('.seo-plan-price').count(),0,'No invented price');
 assert.equal(await page.locator('#seo-team,.seo-team-card').count(),0,'The team is commented out, not rendered');
 const markup=fs.readFileSync(path.join(ROOT,lang==='ar'?'ar':'','services/seo-riyadh/index.html'),'utf8');
 assert.ok(/<!-- SEO TEAM DISABLED:2026-10-16\n[\s\S]*?<section[^>]*id="seo-team"[\s\S]*?\n-->/.test(markup),'Complete team section is retained inside its comment');
 for(let i=0;i<3;i++){
  const card=cards.nth(i),plan=data.plans[i];
  assert.equal(await card.locator('h3').evaluate(e=>e.firstChild.textContent),plan.name[lang]);
  assert.equal((await card.locator('.seo-plan-fit').textContent()).trim(),plan.audience[lang]);
  assert.equal(await card.locator('[data-package-feature]').count(),25);
  for(const feature of data.features){
   const row=card.locator('[data-package-feature="'+feature.id+'"]'),value=feature.values[i];
   assert.equal(await row.locator('dt').textContent(),feature.label[lang]);
   if(typeof value==='boolean')assert.ok((await row.locator('dd').getAttribute('class')).includes(value?'--included':'--excluded'));
   else assert.equal(await row.locator('dd').textContent(),value[lang]);
  }
  const cta=card.locator('.seo-plan-cta a');assert.equal(await cta.getAttribute('href'),'https://wa.me/966530307054');assert.equal(await cta.getAttribute('target'),'_blank');assert.equal(await cta.getAttribute('rel'),'noopener noreferrer');
  assert.equal(await cta.locator('svg path').getAttribute('d'),'M7 17 17 7M9 7h8v8');
 }
 const service=await page.locator('script[type="application/ld+json"]').evaluateAll(es=>es.map(e=>JSON.parse(e.textContent)).find(x=>x['@type']==='Service'));
 assert.equal(service.hasOfferCatalog.itemListElement.length,3);assert.deepEqual(service.hasOfferCatalog.itemListElement.map(x=>x.name),data.plans.map(x=>x.name[lang]));assert.ok(!/price|SAR|2500|4000|7000|10000/.test(JSON.stringify(service.hasOfferCatalog)),'Hidden old prices are retired');
 assert.equal(await page.locator('.seo-plans-note').count(),0,'New offers inherit no old commercial terms absent from the PDF');
}
(async()=>{
 if(process.argv.includes('--capture')){assert.ok(!fs.existsSync(baselinePath),'Never overwrite an independent baseline');fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(baselinePath,JSON.stringify(snapshot(),null,2));console.log('Captured package-only pre-edit scope');return;}
 assert.deepEqual(snapshot(),JSON.parse(fs.readFileSync(baselinePath,'utf8')),'Only package content and offer entries may change; all other HTML remains byte-identical apart from asset stamps');
 if(process.argv.includes('--scope')){console.log('PASS exact package-only scope, including unchanged unrelated HTML');return;}
 assert.equal(data.features.length,25);assert.deepEqual(data.features.find(x=>x.id==='schema').values,[false,false,true]);assert.deepEqual(data.features.find(x=>x.id==='geo').values,[false,true,true]);
 const browser=await chromium.launch(),{srv,origin}=await serve();
 try{
  for(const lang of ['ar','en'])for(const width of [320,440,834,1440]){
   const context=await browser.newContext({viewport:{width,height:956},hasTouch:width<1101});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(origin+(lang==='ar'?'/ar':'')+'/services/seo-riyadh/',{waitUntil:'networkidle'});await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await check(page,lang);
    await jump(page,'#seo-packages');const rail=page.locator('#seo-packages [data-home-scroll-track]');assert.equal(await rail.evaluate(e=>getComputedStyle(e).display),'flex');assert.ok(await rail.evaluate(e=>e.scrollWidth>e.clientWidth+20),'Three packages retain a horizontal rail');
    assert.equal(await rail.locator('details[open]').count(),0,'Packages initially collapse at every size');
    const first=rail.locator('.seo-package-disclosure').first(),summary=first.locator('summary');
    const closed=await rail.evaluate(e=>e.clientHeight);
    await summary.click();await page.waitForTimeout(500);assert.equal(await first.evaluate(e=>e.open),true,'Pointer opens the package');
    assert.ok(await rail.locator('.seo-plan').nth(1).evaluate(e=>e.getBoundingClientRect().height<350),'A closed neighbour never stretches into a tall empty card');
    assert.notEqual(await summary.locator('.seo-owner-chevron').evaluate(e=>getComputedStyle(e).transform),'none','The chevron reflects the open state');
    assert.ok(await first.locator('.seo-package-specs').evaluate(e=>e.getBoundingClientRect().height>700),'All 25 rows become readable');
    assert.ok(await rail.evaluate(e=>e.clientHeight)>closed+700,'The rail expands to fit the full package');
    if(width===440){await jump(page,'#seo-packages .seo-plans-grid');await page.screenshot({path:path.join(reports,'seo-package-open-'+lang+'-'+width+'.png')});}
    await summary.focus();await page.keyboard.press('Space');await page.waitForTimeout(400);assert.equal(await first.evaluate(e=>e.open),false,'Space closes the package');
    await page.keyboard.press('Enter');await page.waitForTimeout(400);assert.equal(await first.evaluate(e=>e.open),true,'Enter opens the package');
    await page.keyboard.press('Enter');await page.waitForTimeout(400);assert.equal(await first.evaluate(e=>e.open),false,'Enter closes the package');
    assert.ok(await rail.evaluate(e=>e.clientHeight)<closed+5,'Closing removes the long empty rail height');
    assert.equal(await rail.locator('.seo-plan-cta a').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.height>40;})),true,'Request buttons stay visible when collapsed');
    await rail.locator('.seo-package-disclosure').nth(1).evaluate(e=>e.open=true);await page.waitForTimeout(350);
    assert.equal(await first.evaluate(e=>e.open),false,'Each card is independently operable');
    await rail.locator('.seo-package-disclosure').nth(1).evaluate(e=>e.open=false);await page.waitForTimeout(350);
    await rail.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(600);assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>40));
    await rail.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(300);
    if(width===440){
     await jump(page,'#seo-packages .seo-plans-grid');
     const client=await context.newCDPSession(page),r=await rail.boundingBox(),x=lang==='ar'?r.x+45:r.x+r.width-45,y=r.y+110;
     await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     for(let i=1;i<=12;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(lang==='ar'?1:-1)*i*18,y}]});await page.waitForTimeout(18);}
     await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);await client.detach();
     assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>80),'A real touch gesture advances the collapsible cards');
     await rail.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(300);
     await page.locator('.seo-plan').first().screenshot({path:path.join(reports,'seo-package-collapsed-'+lang+'-'+width+'.png')});
     await jump(page,'#seo-packages .seo-plans-grid');await page.waitForTimeout(300);await page.screenshot({path:path.join(reports,'seo-packages-card-top-'+lang+'-'+width+'.png')});
    }
    await jump(page,'#seo-packages');await page.screenshot({path:path.join(reports,'seo-packages-new-'+lang+'-'+width+'.png')});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.equal(await page.locator('.seo-flow-ribbon').evaluateAll(es=>new Set(es.map(e=>e.getAttribute('d'))).size),1,'The longer section keeps connected ribbon geometry');assert.deepEqual(errors,[]);console.log('PASS PDF plans, exact values, WhatsApp, native rail and schema',lang,width);
   }finally{await context.close();}
  }
  for(const scripts of [false,true]){
   const context=await browser.newContext({viewport:{width:440,height:956},javaScriptEnabled:scripts,reducedMotion:'reduce'});await isolate(context,origin);const page=await context.newPage();
   try{
    await page.goto(origin+'/ar/services/seo-riyadh/',{waitUntil:'networkidle'});await check(page,'ar');
    if(scripts)await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));
    await jump(page,'#seo-packages .seo-plans-grid');const first=page.locator('.seo-package-disclosure').first();await first.locator('summary').click();await page.waitForTimeout(350);assert.equal(await first.evaluate(e=>e.open),true,'Native package opens without motion/scripts');assert.equal(await first.locator('.seo-package-specs').isVisible(),true);
    await first.locator('summary').click();assert.equal(await first.evaluate(e=>e.open),false);console.log('PASS packages fallback',scripts?'reduced motion':'no scripts');
   }finally{await context.close();}
  }
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
