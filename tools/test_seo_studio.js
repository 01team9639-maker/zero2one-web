// Local-only SEO studio QA. No production measurement requests or form submissions.
// Fingerprints were captured from the existing working tree before this change,
// independently for each language. Unrelated HTML permits asset stamps only.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const cp=require('child_process'),crypto=require('crypto');
const BASELINE={
 "capturedAt": "2026-10-12T12:55:22.842Z",
 "unrelatedCount": 79,
 "unrelatedHash": "e1f3b3ff5d95103c491003af7b5265021e3509a3a4ccf4ac112503d3fffdc720",
 "pages": {
  "ar": {
   "lang": {
    "sha256": "8208994143fbc4fbdeab96c0ed932f9df3846568df6187e6833fb647366b1935",
    "count": 2
   },
   "dir": {
    "sha256": "d2722123d238632389c9cadeac51de1c352d4f55ee69a90a526ad34cf7e179c6",
    "count": 3
   },
   "title": {
    "sha256": "dc35a59dcd881bba2680c0aa33e938262ea9f97408b1e8318948ca94bcca8ff1",
    "count": 53
   },
   "meta": {
    "sha256": "0ee75a9bdb8ab248b40352b1d3f79d6418b866a474ffe624cd544255daff6804",
    "count": 21
   },
   "links": {
    "sha256": "21a531cd61d7fb827a560d70ed7253e26f3aceff4ecf210d63cd99a95fa960b9",
    "count": 4
   },
   "structured": {
    "sha256": "92c154780b049556adf095950c202b3e1d799ba5d5fa469df017459067a0ddaa",
    "count": 2
   },
   "mainText": {
    "sha256": "6c091937daab7a86968e602ab2f0798c41ab8e9ab371421fcf32fcb52780e113",
    "count": 10542
   },
   "headerText": {
    "sha256": "71a48ece18ecc19a247c13fe3e634b209f5285a405d3830a384015dcf8f38bb0",
    "count": 320
   },
   "footerText": {
    "sha256": "d15de09e6975f914f4425d579dfb341422074abd2549cbba0455a20ae5e3b79c",
    "count": 340
   },
   "headings": {
    "sha256": "16124975dfa652a20283efe0d92600aa4f80cf639f80f6ef93822981ee9e0318",
    "count": 57
   },
   "copy": {
    "sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "count": 0
   },
   "anchors": {
    "sha256": "8b1b6e2ad48df3a9174aceb011aec0eaf9f05f2c713264b05145e99c365e93f3",
    "count": 66
   },
   "images": {
    "sha256": "56868983f25bcc724b9cfad5e020367b1bfb62ea8bea37b831a1f951b15a6246",
    "count": 15
   },
   "faq": {
    "sha256": "6fde4ec7e3efa2692d5ecea67f54b5b4c6142fe2f7a2ccecec9706862a2b1a19",
    "count": 4876
   }
  },
  "en": {
   "lang": {
    "sha256": "50eac10e7966a04e139902940a2a8e129a4597574c709cb8d01939ace56ff9c3",
    "count": 2
   },
   "dir": {
    "sha256": "12ae32cb1ec02d01eda3581b127c1fee3b0dc53572ed6baf239721a03d82e126",
    "count": 0
   },
   "title": {
    "sha256": "e93606750c8c428fcc2bfd6ff0ce758f82134120118903be4f0f7949039ca102",
    "count": 52
   },
   "meta": {
    "sha256": "a277c62514c2ffc44470f685644f9d404f4d90fe102c1f242854502ea0186712",
    "count": 21
   },
   "links": {
    "sha256": "5ce3e7b8c52ac0c4c8fcaf68437b239f09d71c16e7ca66581663d99d9292edf6",
    "count": 4
   },
   "structured": {
    "sha256": "f5a12856b94cfc503fbd3c3dbd8ea0a0787f2da04ad5d070fff97516f588a9a0",
    "count": 2
   },
   "mainText": {
    "sha256": "b2bd9f4989e9e2b94eae2234eb0f10d086fa4ecb6a1f0b76a8bba2bbee9cad90",
    "count": 12347
   },
   "headerText": {
    "sha256": "dd864fcc7b46eeec0723f8bece01b02754e77a9b7e7ecc7853974888a6364bde",
    "count": 377
   },
   "footerText": {
    "sha256": "8c10767a1b4d655446fafef30bfea9ae81cde37952410f5f15224bc0b5863be7",
    "count": 315
   },
   "headings": {
    "sha256": "a669b365c53d410b477eebcc906f9f7940f406f3bc73263d8123aee83cb106cf",
    "count": 57
   },
   "copy": {
    "sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "count": 0
   },
   "anchors": {
    "sha256": "a1c16ae87c0d99eb63f48108f94c1864023ceb3f44bc879ef3a328c988678256",
    "count": 66
   },
   "images": {
    "sha256": "04b8aa60c986ebcc5f1e0a20b0e5a9b8214b175e4fd4203c42020c1769752e0b",
    "count": 15
   },
   "faq": {
    "sha256": "f98b42b3f4e0d520139eaf00c1ebfc48d7cc1cff00643b776393f91a3c8b8f11",
    "count": 5348
   }
  }
 }
};
const screens=[[320,780],[375,812],[440,956],[768,1024],[834,1194],[1024,1366],[1024,768],[1440,900]];
const groups=[['#seo-why-zero2one',6],['#seo-audience',6],['#seo-packages',4],['#seo-expected',6]];
const sections=['seo-why','seo-know','whats-included','seo-why-zero2one','seo-audience','seo-packages','seo-process','seo-expected','faq'];
const reports=path.join(ROOT,'tools/reports/site-refresh');
const route=lang=>(lang==='ar'?'/ar':'')+'/services/seo-riyadh/';
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unstamped=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
const norm=s=>s.replace(/\s+/g,' ').trim();
const WA='https://wa.me/966530307054';

function scopeCheck(){
 const files=cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').sort();
 const owned=new Set(['services/seo-riyadh/index.html','ar/services/seo-riyadh/index.html']);
 const hashes=Object.fromEntries(files.filter(f=>!owned.has(f)).map(f=>[f,crypto.createHash('sha256').update(unstamped(fs.readFileSync(path.join(ROOT,f),'utf8'))).digest('hex')]));
 assert.equal(Object.keys(hashes).length,BASELINE.unrelatedCount,'No unrelated HTML files added or removed');
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),BASELINE.unrelatedHash,'Only the two SEO pages change markup; other HTML permits asset stamps only');
 console.log('PASS SEO-only HTML scope against the working-tree snapshot',BASELINE.capturedAt);
}

async function snapshot(page){
 return page.evaluate(()=>{
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const clean=el=>{
   const e=el.cloneNode(true);
   e.querySelectorAll('[aria-hidden="true"],script,style,#timeSpan').forEach(n=>n.remove());
   e.querySelectorAll('h1,h2,h3,h4,p,li,summary,article,figure,details,div,section,span').forEach(n=>n.appendChild(document.createTextNode(' ')));
   return norm(e.textContent);
  };
  const main=document.querySelector('main'),faq=document.querySelector('#faq').cloneNode(true);
  // Undo only new presentation hooks for the strict FAQ comparison.
  faq.querySelectorAll('.seo-studio-divider').forEach(e=>e.remove());
  faq.querySelectorAll('[data-seo-studio-reveal]').forEach(e=>e.removeAttribute('data-seo-studio-reveal'));
  const title=faq.querySelector('.seo-sec-title');
  if(title&&!title.classList.contains('fade-in'))title.className+=' fade-in animate';
  return {
   lang:document.documentElement.lang,dir:document.documentElement.dir,title:document.title,
   meta:[...document.querySelectorAll('head meta')].map(e=>e.outerHTML),
   links:[...document.querySelectorAll('head link[rel="canonical"],head link[hreflang]')].map(e=>e.outerHTML),
   structured:[...document.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),
   mainText:clean(main),headerText:clean(document.querySelector('header')),footerText:clean(document.querySelector('.footer')),
   headings:[...main.querySelectorAll('h1,h2,h3,h4')].map(e=>[e.tagName,norm(e.textContent)]),
   copy:[...main.querySelectorAll('[data-copy]')].map(e=>[e.dataset.copy,norm(e.textContent)]),
   anchors:[...main.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),label:norm(e.textContent),target:e.getAttribute('target'),rel:e.getAttribute('rel')})),
   images:[...main.querySelectorAll('img')].filter(e=>!e.closest('.seo-studio-side-evidence')).map(e=>({src:e.getAttribute('src'),alt:e.getAttribute('alt'),width:e.getAttribute('width'),height:e.getAttribute('height')})),
   faq:faq.outerHTML
  };
 });
}
async function copyCheck(page,lang){
 const current=await snapshot(page),expected=BASELINE.pages[lang];
 for(const [key,record] of Object.entries(expected))assert.equal(sha(current[key]),record.sha256,'Exact approved '+lang+' '+key+' fingerprint');
 assert.equal(await page.locator('h1').count(),1,'Exactly one semantic H1');
 assert.equal(await page.locator('.rf-seo-team,#clients,.seo-plan-price').count(),0,'Requested removals stay removed');
 const requests=page.locator('.seo-plan-cta .btn-click');
 assert.equal(await requests.count(),4,'Four approved package orders');
 for(let i=0;i<4;i++){
  assert.equal(await requests.nth(i).getAttribute('href'),WA);
  assert.equal(await requests.nth(i).getAttribute('target'),'_blank');
  assert.equal(await requests.nth(i).getAttribute('rel'),'noopener noreferrer');
 }
 console.log('PASS unchanged SEO copy, headings, FAQ, chrome, meta, schema, destinations and original images',lang);
}
async function structure(page){
 assert.equal(await page.locator('main.rf-seo-studio').count(),1);
 assert.equal(await page.locator('link[data-seo-studio-review]').count(),1,'SEO-specific stylesheet');
 assert.equal(await page.locator('.seo-studio-divider[aria-hidden="true"][data-seo-studio-reveal="divider"]').count(),9,'Nine decorative section transitions');
 assert.deepEqual(await page.locator('.seo-studio-divider-index').allTextContents(),['01','02','03','04','05','06','07','08','09']);
 assert.equal(await page.locator('.seo-studio-shot-head[aria-hidden="true"]').count(),3);
 assert.equal(await page.locator('.seo-studio-card-head').count(),7);
 assert.equal(await page.locator('.seo-studio-service-head').count(),9);
 assert.equal(await page.locator('.seo-studio-result-art[aria-hidden="true"]').count(),6);
 assert.equal(await page.locator('.seo-studio-side-evidence[aria-hidden="true"] img').count(),1,'Existing case-study screenshot provides decorative evidence');
 assert.equal(await page.locator('#seo-process [data-about-step][data-reveal-scope="seo"]').count(),7);
 assert.equal(await page.locator('#seo-process [data-about-step][data-seo-studio-reveal]').count(),0,'Process has one entrance controller');
 assert.equal(await page.locator('[data-seo-studio-process] > li').count(),7,'Seven real chronological steps');
 assert.equal(await page.locator('[data-seo-studio-reveal="heading"]').count(),9);
 assert.equal(await page.locator('[data-seo-studio-reveal="hero"]').count(),2);
 assert.equal(await page.locator('.seo-studio-icon').count(),42);
 assert.equal(await page.locator('.seo-owner-icon').count(),6,'Existing audience icons remain');
 const provenance=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/icons/iconly/provenance.json'),'utf8'));
 const icons=await page.locator('.seo-studio-icon,.seo-owner-icon').evaluateAll(es=>es.map(e=>({
  key:e.dataset.iconly,inner:e.innerHTML,viewBox:e.getAttribute('viewBox'),hidden:e.getAttribute('aria-hidden'),focus:e.getAttribute('focusable'),
  colors:[...e.querySelectorAll('[stroke],[fill]')].flatMap(n=>['stroke','fill'].filter(a=>n.hasAttribute(a)).map(a=>n.getAttribute(a)))
 })));
 for(const e of icons){
  const asset=fs.readFileSync(path.join(ROOT,'assets/icons/iconly',e.key+'.svg'),'utf8');
  const canonical=await page.evaluate(svg=>new DOMParser().parseFromString(svg,'text/html').querySelector('svg').innerHTML,asset);
  assert.equal(norm(e.inner),norm(canonical),'Canonical local Iconly geometry '+e.key);
  assert.equal(provenance.icons[e.key].is_free,true,'Free licensed Iconly '+e.key);
  assert.equal(e.viewBox,'0 0 24 24');assert.equal(e.hidden,'true');assert.equal(e.focus,'false');
  assert.ok(e.colors.every(c=>['none','currentColor'].includes(c)),'Icons inherit their card color');
 }
 assert.equal(await page.locator('.service-card-arrow[data-iconly],.seo-owner-chevron[data-iconly]').count(),0,'Adopted arrows and disclosure chevrons stay unchanged');
 const lang=await page.locator('html').getAttribute('lang'),base='/assets/images/seo/owner-review-2026-10/';
 for(const [i,key] of ['google','maps','chatgpt'].entries()){
  const image=page.locator('.seo-shot img').nth(i),name=base+'illustration-'+key+'-'+lang;
  assert.equal(await image.getAttribute('srcset'),name+'-640.webp 640w, '+name+'-1024.webp 1024w','Original bilingual screenshot srcset');
  assert.equal(await image.getAttribute('sizes'),'(max-width: 700px) 92vw, (max-width: 1100px) 60vw, 31vw');
 }
 for(const [i,key] of ['strategy','local','technical','keywords','content','ai','backlinks','ecommerce','reporting'].entries()){
  const image=page.locator('.seo-card-img').nth(i),name=base+key;
  assert.equal(await image.getAttribute('srcset'),name+'-480.webp 480w, '+name+'-1200.webp 1200w','Original service-image srcset');
  assert.equal(await image.getAttribute('sizes'),'(max-width:700px) 92vw, (max-width:1100px) 45vw, 30vw');
  assert.equal(await image.getAttribute('loading'),'lazy');assert.equal(await image.getAttribute('decoding'),'async');
 }
}
async function go(page,origin,lang){
 await page.goto(origin+route(lang),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1),null,{timeout:25000});
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
}
async function jump(page,locator,offset=-150){
 await locator.evaluate((e,offset)=>{
  let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;
  // scroll is the site's lexical binding, not the native window.scroll.
  if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top+offset,{duration:0,disableLerp:true});
  else e.scrollIntoView({behavior:'instant',block:'center'});
 },offset);
 await page.waitForTimeout(420);
}
async function move(page,selector,offset=-150){await jump(page,page.locator(selector).first(),offset);}
async function readable(locator){
 return locator.evaluate(e=>{
  for(let n=e;n&&n!==document.body;n=n.parentElement){
   const s=getComputedStyle(n);
   if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<.98)return false;
  }
  return e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
 });
}
async function entrances(page){
 for(const id of sections.slice(0,6)){
  const heading=page.locator('#'+id+' [data-seo-studio-reveal="heading"]');
  await jump(page,heading);await page.waitForTimeout(950);
  assert.equal(await readable(heading),true,'Heading has no hidden ancestor '+id);
 }
 const steps=page.locator('#seo-process [data-about-step]');
 for(let i=0;i<7;i++)await jump(page,steps.nth(i),-180);
 await page.waitForTimeout(1150);
 const process=await page.evaluate(()=>window.__seoStudioAnimations.filter(e=>e.about).map(e=>e.about));
 assert.deepEqual(process,[1,2,3,4,5,6,7],'Seven process entrances follow approved order');
 assert.equal(await steps.evaluateAll(es=>es.every(e=>e.dataset.aboutRevealed==='true'&&e.dataset.aboutRevealCount==='1'&&getComputedStyle(e).opacity==='1')),true);
 for(const id of sections.slice(7)){
  const heading=page.locator('#'+id+' [data-seo-studio-reveal="heading"]');
  await jump(page,heading);await page.waitForTimeout(950);
  assert.equal(await readable(heading),true,'Later heading remains readable '+id);
 }
 const seen=await page.evaluate(()=>window.__seoStudioAnimations.filter(e=>e.studio));
 assert.ok(seen.length>=18,'Visible-section card/heading/divider entrances are active');
 const counts={};for(const e of seen)counts[e.studio]=(counts[e.studio]||0)+1;
 assert.ok(Object.values(counts).every(n=>n===1),'Studio targets receive one entrance controller');
 assert.equal(await page.locator('[data-seo-studio-revealed="true"]').count()>=18,true,'Reveal memory is reflected in DOM');
 await move(page,'.seo-hero-shell');await move(page,'#seo-process');
 await page.evaluate(()=>{ScrollTrigger.refresh();initEditorialRefresh();initSeoStudioMotion();});
 await page.waitForTimeout(1150);
 assert.deepEqual(await page.evaluate(()=>window.__seoStudioAnimations.filter(e=>e.about).map(e=>e.about)),process,'Scrollback/reinitialization does not replay process');
 const after=await page.evaluate(()=>window.__seoStudioAnimations.filter(e=>e.studio));
 for(const e of seen)assert.equal(after.filter(a=>a.studio===e.studio).length,1,'Scrollback/reinitialization preserves studio reveal memory');
}
async function motionScope(page){
 await move(page,'#seo-know');await page.waitForTimeout(950);
 assert.ok(await page.locator('#seo-know .seo-studio-motion-active').count()>0,'In-view cards receive ambient motion');
 await move(page,'#faq');await page.waitForTimeout(550);
 assert.equal(await page.locator('#seo-know .seo-studio-motion-active').count(),0,'Offscreen card motion pauses');
 await move(page,'#seo-process');await page.waitForTimeout(550);
 const before=await page.locator('[data-seo-studio-process]').evaluate(e=>parseFloat(e.style.getPropertyValue('--seo-process-progress')));
 await jump(page,page.locator('#seo-process [data-about-step]').last(),-180);
 const after=await page.locator('[data-seo-studio-process]').evaluate(e=>({progress:parseFloat(e.style.getPropertyValue('--seo-process-progress')),length:parseFloat(e.style.getPropertyValue('--seo-process-length'))}));
 assert.ok(Number.isFinite(before)&&after.progress>before+.25&&after.length>0,'Timeline progress follows document scroll');
}
async function summaryClick(page,summary){
 await summary.evaluate(e=>Promise.all(e.closest('[data-seo-studio-reveal],details').getAnimations().map(a=>a.finished.catch(()=>{}))));
 const r=await summary.boundingBox(),v=page.viewportSize();
 assert.ok(r&&r.y>=0&&r.y+r.height<=v.height,'Disclosure title fits viewport before activation');
 await summary.focus();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
 await page.waitForTimeout(550);return r;
}
async function accordions(page,compact,excluded=[]){
 for(const [selector,count] of groups.filter(([selector])=>!excluded.includes(selector))){
  const cards=page.locator(selector+' [data-seo-accordion] .seo-owner-accordion');
  assert.equal(await cards.count(),count);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),compact?1:count,'Initial responsive disclosure count '+selector);
  assert.equal(await cards.locator(':scope > summary').evaluateAll(es=>es.every(e=>e.tabIndex===(matchMedia('(max-width:760px), (max-width:1100px) and (orientation:portrait)').matches?0:-1))),true);
  if(!compact)continue;
  const last=cards.last(),summary=last.locator(':scope > summary');
  await jump(page,last,-170);await page.waitForTimeout(800);
  const before=await summaryClick(page,summary),after=await summary.boundingBox();
  assert.ok(Math.abs(before.y-after.y)<22,'Opening later card preserves visible title position '+selector);
  assert.equal(await last.evaluate(e=>e.open),true);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1,'One selection per compact group');
  assert.equal(await last.locator('.seo-owner-answer').isVisible(),true);
  assert.equal(await readable(summary),true,'Open title has no hidden ancestor');
  assert.equal(await summary.evaluate(e=>document.activeElement===e),true,'Mouse activation retains focus');
  await summary.focus();await page.keyboard.press('Enter');await page.waitForTimeout(450);
  assert.equal(await last.evaluate(e=>e.open),false,'Enter closes selected card');
  assert.equal(await summary.evaluate(e=>document.activeElement===e),true,'Closing retains keyboard focus');
  await page.keyboard.press('Space');await page.waitForTimeout(550);
  assert.equal(await last.evaluate(e=>e.open),true,'Space reopens one card');
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1);
  const first=cards.first();await jump(page,first,-170);await first.locator(':scope > summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(550);
  assert.equal(await first.evaluate(e=>e.open),true);assert.equal(await last.evaluate(e=>e.open),false);
 }
 if(compact)for(const [selector] of groups.filter(([selector])=>!excluded.includes(selector)))assert.equal(await page.locator(selector+' [data-seo-accordion] .seo-owner-accordion').first().evaluate(e=>e.open),true,'Disclosure selections stay independent across sections');
 const plans=page.locator('.seo-plan');
 for(let i=0;i<4;i++){
  assert.equal(await plans.nth(i).locator('.seo-plan-cta').evaluate(e=>!!e.closest('.seo-owner-answer')),false,'Order remains outside collapsed prose');
  assert.equal(await plans.nth(i).locator('.seo-plan-cta').evaluate(e=>getComputedStyle(e).display!=='none'),true);
 }
 if(compact)assert.equal(await plans.first().locator('.seo-plan-list').isVisible(),true,'Outer activation exposes every approved included feature');
}
async function sliders(page,lang,compact){
 for(const [selector,count] of [['#seo-why',3],['#whats-included',9]]){
  const slider=page.locator(selector+' [data-home-scroll]'),track=slider.locator('[data-home-scroll-track]');
  assert.equal(await track.evaluate(e=>e.children.length),count);
  await jump(page,track,-150);await page.waitForTimeout(750);
  const layout=await track.evaluate(e=>({display:getComputedStyle(e).display,width:e.clientWidth,total:e.scrollWidth,snap:getComputedStyle(e).scrollSnapType}));
  assert.equal(layout.display,compact?'flex':'grid');
  const controls=slider.locator('.rf-home-scroll-controls');
  assert.equal(await controls.isVisible(),compact&&layout.total>layout.width+4);
  if(!compact)continue;
  assert.equal(layout.snap,'x mandatory');assert.ok(layout.total>layout.width+4,'Overflow stays inside native horizontal tracks');
  const next=controls.locator('[data-home-scroll-next]'),prev=controls.locator('[data-home-scroll-prev]');
  await next.click();await page.waitForTimeout(750);
  assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>80),'Next reaches another card');
  assert.equal(await prev.isDisabled(),false);
  await prev.click();await page.waitForTimeout(750);
  assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)<4),'Previous returns to beginning');
  await track.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(750);
  assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>80),'Directional keyboard navigation respects language');
  if(page.viewportSize().width===375){
   await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(350);
   const session=await page.context().newCDPSession(page),r=await track.boundingBox();
   const x=lang==='ar'?r.x+60:r.x+r.width-60,y=r.y+80;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let n=1;n<=12;n++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(lang==='ar'?1:-1)*n*18,y}]});await page.waitForTimeout(16);}
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(750);await session.detach();
   assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>80),'Native phone touch swipe reaches another card');
  }
  await track.evaluate(e=>e.scrollTo({left:(getComputedStyle(e).direction==='rtl'?-1:1)*(e.scrollWidth-e.clientWidth),behavior:'instant'}));
  await page.waitForTimeout(450);assert.equal(await next.isDisabled(),true,'Final card is reachable');
  const progress=await slider.evaluate(e=>parseFloat(e.style.getPropertyValue('--seo-scroll-progress')));
  assert.ok(progress>.95,'Native slider progress reaches its end state');
  await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(450);
 }
}
async function images(page){
 for(const selector of ['.seo-shot img','.seo-card-img','.seo-studio-side-evidence img']){
  const imgs=page.locator(selector);
  assert.equal(await imgs.count(),selector==='.seo-shot img'?3:selector==='.seo-card-img'?9:1);
  for(let i=0;i<await imgs.count();i++){
   const img=imgs.nth(i);await jump(page,img,-150);await img.evaluate(e=>e.decode());
   const state=await img.evaluate(e=>({loaded:e.complete&&e.naturalWidth>0,fit:getComputedStyle(e).objectFit,source:e.currentSrc}));
   assert.ok(state.loaded&&!state.source.includes('placeholders'),'Optimized image decodes '+selector+' '+i);
   if(selector==='.seo-shot img')assert.equal(state.fit,'contain','Visibility screenshots show their full image frame');
  }
 }
}
async function buttons(page,lang,width){
 const buttons=page.locator('.seo-hero-actions .btn-click,#seo-audience .btn-click,#seo-know .btn-click,.seo-plan-cta .btn-click');
 for(let i=0;i<await buttons.count();i++){
  const button=buttons.nth(i);await jump(page,button,-180);await page.mouse.move(0,0);await button.evaluate(e=>e.blur());await page.waitForTimeout(450);
  const state=()=>button.evaluate(e=>{
   const arrow=e.querySelector('.service-card-arrow'),s=getComputedStyle(arrow),r=arrow.getBoundingClientRect();
   return {label:getComputedStyle(e.querySelector('.btn-text-inner')).color,stroke:s.stroke,fill:s.fill,transform:s.transform,path:arrow.querySelector('path').getAttribute('d'),width:r.width,height:r.height};
  });
  const base=await state();
  assert.equal(base.label,base.stroke,'Native arrow inherits text color');
  assert.equal(base.fill,'none');assert.equal(base.path,'M7 17 17 7M9 7h8v8');
  assert.equal(base.transform,lang==='ar'?'matrix(-1, 0, 0, 1, 0, 0)':'none');
  assert.ok(base.width>=16&&base.width<=28&&base.height<=28,'Adopted request arrow remains readable');
  if(width===1440){await button.hover();await page.waitForTimeout(650);const hovered=await state();assert.equal(hovered.label,hovered.stroke,'Hover arrow matches native fill text');}
  await button.focus();await page.waitForTimeout(450);const focused=await state();assert.equal(focused.label,focused.stroke,'Keyboard focus retains paired arrow/text color');await button.evaluate(e=>e.blur());
 }
}
async function screenshots(page,lang,width){
 if(![375,834,1440].includes(width))return;
 for(const selector of ['.seo-hero-shell','#seo-why','#seo-know','#whats-included','#seo-packages','#seo-process','#seo-expected','#faq']){
  await move(page,selector,-100);await page.waitForTimeout(850);
  await page.screenshot({path:path.join(reports,'seo-studio-'+selector.replace(/[.#]/g,'')+'-'+lang+'-'+width+'.png')});
  if(selector==='#seo-expected'&&process.env.SEO_STUDIO_QA_CAPTURE_ONLY){
   const cards=page.locator('#seo-expected .seo-owner-accordion');
   for(let i=0;i<6;i++){
    const card=cards.nth(i);await jump(page,card,-120);await page.waitForTimeout(650);
    if(!await card.evaluate(e=>e.open)){await summaryClick(page,card.locator(':scope > summary'));await page.waitForTimeout(500);}
    await page.screenshot({path:path.join(reports,'seo-studio-result-'+(i+1)+'-'+lang+'-'+width+'.png')});
   }
  }
 }
}
async function navDesktop(page,lang,width){
 if(width!==1440)return;
 await page.evaluate(()=>scroll.scrollTo(0,{duration:0,disableLerp:true}));await page.waitForTimeout(650);
 const details=page.locator('.nav-bar .rf-nav-services details');await details.locator('summary').click();await page.waitForTimeout(350);
 assert.equal(await details.evaluate(e=>e.open),true,'Services dropdown opens');
 const state=await details.locator('.rf-services-menu').evaluate(menu=>{
  const r=menu.getBoundingClientRect(),hero=document.querySelector('.seo-hero-grid').getBoundingClientRect();
  const x=r.left+r.width/2,y=Math.min(r.bottom-10,Math.max(r.top+20,hero.top+30));
  return {overlaps:y>=hero.top&&y<=hero.bottom&&x>=hero.left&&x<=hero.right,above:!!document.elementFromPoint(x,y)?.closest('.rf-services-menu'),left:r.left,right:r.right,width:innerWidth};
 });
 assert.equal(state.overlaps,true,'Dropdown test point overlaps the hero');assert.equal(state.above,true,'Services dropdown paints above the animated hero');
 assert.ok(state.left>=0&&state.right<=state.width+1,'Services dropdown fits the desktop viewport');
 await page.screenshot({path:path.join(reports,'seo-studio-nav-'+lang+'-'+width+'.png')});
 await details.locator('summary').focus();await page.keyboard.press('Escape');assert.equal(await details.evaluate(e=>e.open),false,'Escape closes services menu');
}
async function runViewport(browser,origin,lang,width,height){
 const compact=width<=760||(width<=1100&&height>=width);
 const context=await browser.newContext({viewport:{width,height},hasTouch:compact});
 await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__seoStudioAnimations=[];
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('[data-seo-studio-reveal]'))window.__seoStudioAnimations.push({studio:[...document.querySelectorAll('[data-seo-studio-reveal]')].indexOf(this)+1,kind:this.dataset.seoStudioReveal,start:performance.now()});
   if(this.matches('[data-about-step][data-reveal-scope="seo"]'))window.__seoStudioAnimations.push({about:[...document.querySelectorAll('[data-about-step][data-reveal-scope="seo"]')].indexOf(this)+1,start:performance.now()});
   return animate.call(this,frames,options);
  };
 });
 try{
  await go(page,origin,lang);
  if(width<=440)assert.ok(await page.locator('h1').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<=32),'Phone H1 remains proportionate');
  if(!process.env.SEO_STUDIO_QA_CAPTURE_ONLY){await entrances(page);await motionScope(page);await accordions(page,compact);await sliders(page,lang,compact);await images(page);await buttons(page,lang,width);}
  await screenshots(page,lang,width);await navDesktop(page,lang,width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No horizontal page overflow');
  assert.deepEqual(errors,[],'No uncaught page errors');console.log(process.env.SEO_STUDIO_QA_CAPTURE_ONLY?'PASS SEO studio visual capture':'PASS SEO studio',lang,width,height);
 }finally{await context.close();}
}
async function fallbacks(browser,origin,lang){
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});
 await isolate(noJS,origin);const fallback=await noJS.newPage();await fallback.goto(origin+route(lang),{waitUntil:'networkidle'});
 await copyCheck(fallback,lang);await structure(fallback);
 assert.equal(await fallback.locator('[data-seo-studio-reveal],[data-about-step]').evaluateAll(es=>es.every(e=>{
  for(let n=e;n&&n!==document.body;n=n.parentElement){const s=getComputedStyle(n);if(s.visibility==='hidden'||parseFloat(s.opacity)<.98)return false;}return true;
 })),true,'Without JS, targets and ancestors remain visible');
 for(const [selector,count] of groups)assert.equal(await fallback.locator(selector+' .seo-owner-accordion[open]').count(),count,'No-JS exposes all section prose');
 const includes=fallback.locator('.seo-plan-more').first();
 await includes.locator('summary').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await includes.locator('summary').click();
 assert.equal(await includes.evaluate(e=>e.open),true,'Native no-JS activation exposes included features');
 assert.equal(await includes.locator('.seo-plan-list').isVisible(),true);
 await includes.locator('summary').click();assert.equal(await includes.evaluate(e=>e.open),false);
 await noJS.close();
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:375,height:812}});
 await isolate(reduced,origin);const page=await reduced.newPage();
 await page.addInitScript(()=>{window.__seoMotionCount=0;const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('[data-seo-studio-reveal],[data-about-step][data-reveal-scope="seo"]'))window.__seoMotionCount++;return animate.call(this,frames,options);};});
 await go(page,origin,lang);await move(page,'#seo-process');await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>window.__seoMotionCount),0,'Reduced motion omits entrances');
 assert.equal(await page.locator('[data-seo-studio-reveal],[data-about-step]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true,'Reduced motion keeps all targets readable');
 assert.equal(await page.locator('.seo-studio-motion-active').count(),0,'Reduced motion skips ambient effects');
 await reduced.close();console.log('PASS no-JS and reduced-motion fallbacks',lang);
}
(async()=>{
 scopeCheck();fs.mkdirSync(reports,{recursive:true});
 const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  const langs=process.env.SEO_STUDIO_QA_LANG?[process.env.SEO_STUDIO_QA_LANG]:['ar','en'];
  const selected=process.env.SEO_STUDIO_QA_WIDTH?screens.filter(([w])=>w===Number(process.env.SEO_STUDIO_QA_WIDTH)):process.env.SEO_STUDIO_QA_CAPTURE_ONLY?screens.filter(([w])=>[375,834,1440].includes(w)):screens;
  if(!process.env.SEO_STUDIO_QA_CAPTURE_ONLY)for(const lang of langs)await fallbacks(browser,origin,lang);
  const tasks=langs.flatMap(lang=>selected.map(([w,h])=>()=>runViewport(browser,origin,lang,w,h)));
  let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
