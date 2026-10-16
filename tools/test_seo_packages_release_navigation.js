// Local or read-only live navigation QA; never sends measurement/forms/chats.
const {chromium}=require('playwright'),{serve,isolate,settled,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path'),crypto=require('crypto');
const reports=path.join(ROOT,'tools/reports/site-refresh');
const cssHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'assets/css/seo-studio-review.min.css'))).digest('hex').slice(0,8);
async function ready(p){await p.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1));await p.waitForTimeout(700);}
async function jump(p,selector){await p.locator(selector).first().evaluate(e=>{let y=0;for(let n=e;n;n=n.offsetParent)y+=n.offsetTop;if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(y-100,{duration:0,disableLerp:true});else e.scrollIntoView({behavior:'instant',block:'start'});});await p.waitForTimeout(900);}
(async()=>{
 const browser=await chromium.launch();let srv,origin=process.env.SEO_PACKAGE_ORIGIN;
 if(origin)assert.equal(origin,'https://zero2one.sa','Only the owned production site is allowed for live checks');
 else{const local=await serve();srv=local.srv;origin=local.origin;}
 fs.mkdirSync(reports,{recursive:true});
 try{
  for(const [lang,width] of [['ar',440],['en',1440]]){
   const ctx=await browser.newContext({viewport:{width,height:956},hasTouch:width===440});await isolate(ctx,origin);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   const home=lang==='ar'?'/ar/':'/',seo=home+'services/seo-riyadh/';
   try{
    await p.goto(origin+home,{waitUntil:'networkidle'});await ready(p);
    await p.evaluate(()=>window.__packageJourney=1);
    await p.evaluate(url=>barba.go(url),seo);await settled(p,seo);await ready(p);
    assert.equal(await p.evaluate(()=>window.__packageJourney),1,'Warm navigation does not reload');
    await p.waitForFunction(hash=>[...document.querySelectorAll('link[data-seo-studio-review]')].some(e=>e.sheet&&e.href.endsWith('?v='+hash)),cssHash);
    assert.equal(await p.locator('.seo-package-disclosure').count(),3);assert.equal(await p.locator('#seo-team,.seo-team-card').count(),0);assert.equal(await p.locator('[data-seo-flow]').count(),10);
    await jump(p,'#seo-packages .seo-plans-grid');
    const first=p.locator('.seo-package-disclosure').first();await first.locator('summary').focus();await p.keyboard.press('Space');await p.waitForTimeout(450);assert.equal(await first.evaluate(e=>e.open),true,'Space opens the native package after warm navigation');
    assert.equal(await first.locator('[data-package-feature]').count(),25);
    await p.keyboard.press('Enter');await p.waitForTimeout(450);assert.equal(await first.evaluate(e=>e.open),false,'Enter closes the package');
    assert.ok(await p.locator('.seo-plan').nth(1).evaluate(e=>e.getBoundingClientRect().height<350),'Neighbours stay compact');
    await jump(p,'.footer');assert.ok(await p.locator('.quick-links').count()>0,'The footer stays reachable after toggling');
    await p.evaluate(url=>barba.go(url),home);await settled(p,home);await ready(p);
    assert.equal(await p.locator('.seo-package-disclosure,[data-seo-flow]').count(),0,'SEO behavior leaves the home page untouched');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
    await p.screenshot({path:path.join(reports,'seo-package-release-journey-'+lang+'-'+width+(process.env.SEO_PACKAGE_ORIGIN?'-live':'')+'.png')});
    console.log('PASS warm home → SEO → home, fresh stylesheet, disclosures, reachable footer',lang,width,process.env.SEO_PACKAGE_ORIGIN?'live':'local');
   }finally{await ctx.close();}
  }
 }finally{await browser.close();if(srv)srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
