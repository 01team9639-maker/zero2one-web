// Local service-design review: exact bilingual copy and safe browser isolation.
const {chromium}=require('playwright'),{serve,isolate,ROOT}=require('./test_support');
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert').strict;
const slugs=['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting'];
const files=['services/index.html',...slugs.map(s=>'services/'+s+'/index.html')].flatMap(f=>[f,'ar/'+f]);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const unstamped=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
const baselineFile=process.env.SERVICE_STUDIO_BASELINE||path.join(ROOT,'tools/reports/site-refresh/service-studio-baseline.json');
async function snapshot(page,markup){return page.evaluate(markup=>{
 const d=new DOMParser().parseFromString(markup,'text/html'),norm=s=>s.replace(/\s+/g,' ').trim();
 const clean=e=>{if(!e)return '';const n=e.cloneNode(true);n.querySelectorAll('[aria-hidden="true"],script,style,#timeSpan').forEach(e=>e.remove());return norm(n.textContent);};
 const main=d.querySelector('main');
 return {title:d.title,meta:[...d.querySelectorAll('head meta,head link[rel="canonical"],head link[hreflang]')].map(e=>e.outerHTML),schema:[...d.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),h1:clean(main.querySelector('h1')),copy:[...main.querySelectorAll('[data-copy]')].map(e=>[e.dataset.copy,clean(e)]).sort((a,b)=>a[0].localeCompare(b[0])),links:[...main.querySelectorAll('a')].map(e=>[e.getAttribute('href'),clean(e),e.getAttribute('target'),e.getAttribute('rel')]),team:[...main.querySelectorAll('.team-card')].map(e=>[clean(e.querySelector('.testi-name')),clean(e.querySelector('.testi-role')),clean(e.querySelector('.team-exp')),clean(e.querySelector('.testi-quote')),e.querySelector('img')?.getAttribute('src')]),footer:clean(d.querySelector('.footer')),nav:clean(d.querySelector('.nav-bar')),logos:[...main.querySelectorAll('.logo-marquee img')].map(e=>[e.getAttribute('src'),e.getAttribute('alt')])};
},markup);}
function unrelated(){return Object.fromEntries(cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(f=>!files.includes(f)).sort().map(f=>[f,digest(unstamped(fs.readFileSync(path.join(ROOT,f),'utf8')))]));}
async function jump(page,selector){await page.locator(selector).first().evaluate(e=>{let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top-100,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await page.waitForTimeout(450);}
(async()=>{
 const browser=await chromium.launch();let server;
 try{
  const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage();
  if(process.argv.includes('--capture')){
   const baseline={created:new Date().toISOString(),pages:{},unrelated:unrelated()};
   for(const file of files)baseline.pages[file]=await snapshot(page,fs.readFileSync(path.join(ROOT,file),'utf8'));
   fs.mkdirSync(path.dirname(baselineFile),{recursive:true});fs.writeFileSync(baselineFile,JSON.stringify(baseline,null,2));console.log('Captured independent pre-redesign baseline for '+files.length+' pages.');return;
  }
  const baseline=JSON.parse(fs.readFileSync(baselineFile,'utf8'));
  assert.deepEqual(unrelated(),baseline.unrelated,'Only the eight service pairs and service catalogue may change markup');
  for(const file of files)assert.deepEqual(await snapshot(page,fs.readFileSync(path.join(ROOT,file),'utf8')),baseline.pages[file],'Exact original content, destinations and metadata: '+file);
  await context.close();console.log('PASS exact bilingual copy, teams, logos, footer, metadata and all unchanged pages');
  if(process.argv.includes('--copy'))return;
  const {srv,origin}=await serve();server=srv;
  const selected=files.filter(f=>!process.env.SERVICE_STUDIO_SLUG||f.includes('/'+process.env.SERVICE_STUDIO_SLUG+'/')).filter(f=>!process.env.SERVICE_STUDIO_LANG||(f.startsWith('ar/')?'ar':'en')===process.env.SERVICE_STUDIO_LANG);
  const widths=process.env.SERVICE_STUDIO_WIDTH?[Number(process.env.SERVICE_STUDIO_WIDTH)]:[320,440,834,1440];
  const tasks=selected.flatMap(file=>widths.map(width=>async()=>{
   const ctx=await browser.newContext({viewport:{width,height:width===834?1194:956},hasTouch:width<1101});await isolate(ctx,origin);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   try{
    await p.goto(origin+'/'+file.replace('index.html',''),{waitUntil:'networkidle'});await p.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await p.evaluate(()=>document.fonts.ready);
    assert.equal(await p.locator('main.rf-service-studio').count(),1);assert.equal(await p.locator('h1').count(),1);
    assert.equal(await p.locator('.service-studio-actions .btn-click').count()>0,true);
    if(!file.endsWith('services/index.html')){
     assert.equal(await p.locator('[data-seo-flow]').count()>8,true);assert.equal(await p.locator('.service-studio-hero img').count(),1);
     const stage=p.locator('.service-studio-hero');await jump(p,'.service-studio-hero');await p.waitForTimeout(1000);assert.ok(await stage.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0));
     for(const section of ['.service-studio-know','.service-studio-deliverables','.service-studio-audience','.service-studio-process']){
      assert.ok(await p.locator(section).count()>0,'Every service keeps '+section);await jump(p,section);await p.waitForTimeout(950);
      const rail=p.locator(section+' [data-home-scroll-track]');
      if(await rail.count()&&(width<=760||width===834)){
       assert.equal(await rail.evaluate(e=>getComputedStyle(e).display),'flex');await rail.focus();await p.keyboard.press(file.startsWith('ar/')?'ArrowLeft':'ArrowRight');await p.waitForTimeout(550);assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>40),'Native horizontal rail responds to keyboard');
      }
      if(section==='.service-studio-audience')assert.equal(await p.locator(section+' details').count(),0,'Swiping audience cards are permanently open');
     }
    }
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No page-level horizontal overflow');assert.deepEqual(errors,[]);
    await jump(p,'.service-studio-hero,.service-studio-catalogue');await p.waitForTimeout(900);
    fs.mkdirSync(path.join(ROOT,'tools/reports/site-refresh'),{recursive:true});await p.screenshot({path:path.join(ROOT,'tools/reports/site-refresh','service-studio-'+file.replaceAll('/','-')+'-'+width+'.png')});
    console.log('PASS service studio',file,width);
   }finally{await ctx.close();}
  }));let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
