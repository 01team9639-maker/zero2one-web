// Local-only SEO follow-up QA. All external traffic, including measurement,
// is intercepted by test_support; this suite never submits a form or a chat.
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path');
const cp=require('child_process'),crypto=require('crypto');
const sharp=require('sharp');
const BASELINE={
 capturedAt:'2026-10-12T20:29:08.512Z',unrelatedCount:79,unrelatedHash:'3d4d3c9796bcf99cec198e02a69a62a0815fa4e019e07f0d8520c3d102f035ed',
 pages:{
  ar:{
   lang:{sha256:'8208994143fbc4fbdeab96c0ed932f9df3846568df6187e6833fb647366b1935'},
   dir:{sha256:'d2722123d238632389c9cadeac51de1c352d4f55ee69a90a526ad34cf7e179c6'},
   title:{sha256:'dc35a59dcd881bba2680c0aa33e938262ea9f97408b1e8318948ca94bcca8ff1'},
   meta:{sha256:'0ee75a9bdb8ab248b40352b1d3f79d6418b866a474ffe624cd544255daff6804'},
   links:{sha256:'21a531cd61d7fb827a560d70ed7253e26f3aceff4ecf210d63cd99a95fa960b9'},
   structured:{sha256:'92c154780b049556adf095950c202b3e1d799ba5d5fa469df017459067a0ddaa'},
   mainText:{sha256:'6c091937daab7a86968e602ab2f0798c41ab8e9ab371421fcf32fcb52780e113'},
   headerText:{sha256:'71a48ece18ecc19a247c13fe3e634b209f5285a405d3830a384015dcf8f38bb0'},
   footerText:{sha256:'d15de09e6975f914f4425d579dfb341422074abd2549cbba0455a20ae5e3b79c'},
   headings:{sha256:'16124975dfa652a20283efe0d92600aa4f80cf639f80f6ef93822981ee9e0318'},
   anchors:{sha256:'8b1b6e2ad48df3a9174aceb011aec0eaf9f05f2c713264b05145e99c365e93f3'},
   chromeAnchors:{sha256:'5d1b9e92c3401de475872a8f85d6b2f0fbfe4a3a34ddb46ca8b21cce8006281f'},
   images:{sha256:'4e7269d7164668888408b17da93538cbd14537e508d92fce20b367ae7115a5a7'},
   h1:{sha256:'78c7b7fd0aacbb2ab7d8730502933b8f7a627f7ba6a950bcc2b713e1ca9f7dd9'},
   faq:{sha256:'0c7570a021dce9b67a3bb5e40f9cf9269932add63278ec9614a0edf4aad9614e'}
  },
  en:{
   lang:{sha256:'50eac10e7966a04e139902940a2a8e129a4597574c709cb8d01939ace56ff9c3'},
   dir:{sha256:'12ae32cb1ec02d01eda3581b127c1fee3b0dc53572ed6baf239721a03d82e126'},
   title:{sha256:'e93606750c8c428fcc2bfd6ff0ce758f82134120118903be4f0f7949039ca102'},
   meta:{sha256:'a277c62514c2ffc44470f685644f9d404f4d90fe102c1f242854502ea0186712'},
   links:{sha256:'5ce3e7b8c52ac0c4c8fcaf68437b239f09d71c16e7ca66581663d99d9292edf6'},
   structured:{sha256:'f5a12856b94cfc503fbd3c3dbd8ea0a0787f2da04ad5d070fff97516f588a9a0'},
   mainText:{sha256:'b2bd9f4989e9e2b94eae2234eb0f10d086fa4ecb6a1f0b76a8bba2bbee9cad90'},
   headerText:{sha256:'dd864fcc7b46eeec0723f8bece01b02754e77a9b7e7ecc7853974888a6364bde'},
   footerText:{sha256:'8c10767a1b4d655446fafef30bfea9ae81cde37952410f5f15224bc0b5863be7'},
   headings:{sha256:'a669b365c53d410b477eebcc906f9f7940f406f3bc73263d8123aee83cb106cf'},
   anchors:{sha256:'a1c16ae87c0d99eb63f48108f94c1864023ceb3f44bc879ef3a328c988678256'},
   chromeAnchors:{sha256:'4d6e803a8f52be57ed1825dcee892b3ca1f8f71170fbdec967f1e585e61d0486'},
   images:{sha256:'11fc77270a90f5fa2afc3f9233e40b30ea5df83c9113bc76e089754e743ca05c'},
   h1:{sha256:'39f516fe97218f0fcda415ae56492bb510a4ef72e184779f47e1ed860cda9e0a'},
   faq:{sha256:'e1a0741c6c92cb731c97a30af2f967c38da50f6a160a712e7583fb2aa255f71f'}
  }
 }
};
const reports=path.join(ROOT,'tools/reports/site-refresh');
const reviewRoot=path.resolve(process.env.SEO_STUDIO_REVIEW_ROOT||ROOT);
const screens=[[320,780],[375,812],[440,956],[768,1024],[834,1194],[1024,1366],[1024,768],[1440,900]];
const groups=[['#seo-why-zero2one',6],['#seo-expected',6]];
const sections=['seo-why','seo-know','whats-included','seo-why-zero2one','seo-audience','seo-packages','seo-process','seo-expected','faq','seo-team'];
const route=lang=>(lang==='ar'?'/ar':'')+'/services/seo-riyadh/';
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesSha=value=>crypto.createHash('sha256').update(value).digest('hex');
const norm=s=>s.replace(/\s+/g,' ').trim();
const unstamped=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
const phoneKeys=['google-search','google-maps','chatgpt-search'];
const phoneRoot=lang=>'/assets/images/seo/'+(lang==='ar'?'phone-mockups-ar-2026-10-14':'phone-mockups-2026-10-12')+'/';
const phoneHeight=(lang,index)=>lang==='ar'&&index===0?1736:1700;
const captions=lang=>lang==='ar'?['رقم ١ في بحث جوجل','رقم ١ في بحث خرائط جوجل','رقم ١ في بحث ChatGPT']:['#1 in Google Search','#1 in Google Maps Search','#1 in ChatGPT Search'];

// Keep the original studio regression suite intact. Reuse its established
// browser interaction helpers without evaluating its auto-running entrypoint.
const studioSource=fs.readFileSync(path.join(__dirname,'test_seo_studio.js'),'utf8');
const entrypoint=studioSource.lastIndexOf('\n(async()=>{');
assert.ok(entrypoint>0,'Historical helper boundary is present');
const helperModule={exports:{}};
new Function('require','module','process','console',studioSource.slice(0,entrypoint)+'\nmodule.exports={go,jump,move,readable,entrances,motionScope,accordions,sliders,buttons,navDesktop};')(
 p=>require(p.startsWith('.')?path.resolve(__dirname,p):p),helperModule,process,console
);
const {go,jump,move,readable,entrances,motionScope,accordions,sliders,buttons,navDesktop}=helperModule.exports;

function unrelated(){
 const files=cp.execFileSync('rg',['--files','-g','*.html','-g','!node_modules/**','-g','!tools/reports/**'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').sort();
 const owned=new Set(['services/seo-riyadh/index.html','ar/services/seo-riyadh/index.html']);
 const hashes=Object.fromEntries(files.filter(f=>!owned.has(f)).map(f=>[f,bytesSha(unstamped(fs.readFileSync(path.join(ROOT,f),'utf8')))]));
 return {unrelatedCount:Object.keys(hashes).length,unrelatedHash:bytesSha(JSON.stringify(hashes))};
}

async function snapshot(page,markup){
 return page.evaluate(markup=>{
  const d=new DOMParser().parseFromString(markup,'text/html');
  const norm=s=>s.replace(/\s+/g,' ').trim();
  const clean=el=>{
   const e=el.cloneNode(true);
   // Title wrapping is presentation-only; its exact complete text is checked
   // separately, including the existing punctuation between the two lines.
   const h1=e.querySelector('h1');if(h1)h1.textContent=norm(h1.textContent);
   // Oct 14 explicitly adds the approved Kerolos profile. Independently test
   // it against the existing team page rather than changing the old baseline.
   e.querySelectorAll('[aria-hidden="true"],script,style,#timeSpan,.seo-card-placeholder,.seo-studio-shot-rank,.seo-studio-shot-note,[data-seo-flow],#seo-team').forEach(n=>n.remove());
   e.querySelectorAll('h1,h2,h3,h4,p,li,summary,article,figure,details,div,section,span').forEach(n=>n.appendChild(d.createTextNode(' ')));
   return norm(e.textContent);
  };
  const main=d.querySelector('main'),faq=d.querySelector('#faq').cloneNode(true);
  faq.querySelectorAll('[data-seo-flow]').forEach(e=>e.remove());
  faq.querySelectorAll('[data-seo-flow-scope],[data-seo-flow-context]').forEach(e=>{e.removeAttribute('data-seo-flow-scope');e.removeAttribute('data-seo-flow-context');});
  faq.removeAttribute('data-seo-flow-scope');faq.removeAttribute('data-seo-flow-context');
  return {
   lang:d.documentElement.lang,dir:d.documentElement.dir,title:d.title,
   meta:[...d.querySelectorAll('head meta')].map(e=>e.outerHTML),
   links:[...d.querySelectorAll('head link[rel="canonical"],head link[hreflang]')].map(e=>e.outerHTML),
   structured:[...d.querySelectorAll('script[type="application/ld+json"]')].map(e=>JSON.parse(e.textContent)),
   mainText:clean(main),headerText:clean(d.querySelector('header')),footerText:clean(d.querySelector('.footer')),
   headings:[...main.querySelectorAll('h1,h2,h3,h4')].filter(e=>!e.closest('#seo-team')).map(e=>[e.tagName,norm(e.textContent)]),
   anchors:[...main.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),label:norm(e.textContent),target:e.getAttribute('target'),rel:e.getAttribute('rel')})),
   chromeAnchors:[...d.querySelectorAll('header a,.footer a')].map(e=>({href:e.getAttribute('href'),label:norm(e.textContent),target:e.getAttribute('target'),rel:e.getAttribute('rel')})),
   images:[...main.querySelectorAll('img')].filter(e=>!e.closest('.seo-shot,.seo-card-placeholder,.seo-owner-illustration,#seo-team')).map(e=>({src:e.getAttribute('src'),srcset:e.getAttribute('srcset'),sizes:e.getAttribute('sizes'),alt:e.getAttribute('alt'),width:e.getAttribute('width'),height:e.getAttribute('height')})),
   h1:norm(main.querySelector('h1').textContent),faq:faq.outerHTML
  };
 },markup);
}

async function capture(browser,directory){
 const context=await browser.newContext({javaScriptEnabled:false}),page=await context.newPage();
 const result={capturedAt:new Date().toISOString(),...unrelated(),pages:{}};
 try{
  for(const lang of ['ar','en']){
   const current=await snapshot(page,fs.readFileSync(path.join(directory,lang+'.html'),'utf8'));
   result.pages[lang]=Object.fromEntries(Object.entries(current).map(([key,value])=>[key,{sha256:sha(value),count:value.length}]));
  }
 }finally{await context.close();}
 return result;
}

function scopeCheck(){
 assert.deepEqual(unrelated(),{unrelatedCount:BASELINE.unrelatedCount,unrelatedHash:BASELINE.unrelatedHash},'Only SEO page markup changes; unrelated HTML permits asset stamps only');
 const js=fs.readFileSync(path.join(ROOT,'assets/js/index-new.js'),'utf8');
 const start=js.indexOf('function initSEOFlow');assert.ok(start>=0,'Flow has a distinct initializer');
 const end=js.indexOf('\nfunction ',start+10),flow=js.slice(start,end<0?undefined:end);
 assert.ok(flow.includes('requestAnimationFrame'),'Flow schedules bounded animation work');
 assert.ok(flow.includes('cancelAnimationFrame'),'Flow can stop scheduled work');
 assert.ok(flow.includes('disconnect')&&flow.includes('removeEventListener'),'Flow cleans up observers and event listeners');
 assert.ok(!/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b/.test(flow),'Decorative flow has no data fetch or user storage');
 const css=fs.readFileSync(path.join(ROOT,'assets/css/styleguide.css'),'utf8');
 assert.ok(/--[\w-]*(?:orange|primary)[\w-]*\s*:\s*#f9460e/i.test(css),'Reusable primary orange token');
 assert.ok(/--[\w-]*(?:orange|accent)[\w-]*\s*:\s*#ff8000/i.test(css),'Reusable secondary orange token');
 assert.ok(/--[\w-]*ivory[\w-]*\s*:\s*#fffef8/i.test(css),'Reusable ivory token');
 assert.ok(/--[\w-]*gradient[\w-]*\s*:/i.test(css),'Reusable gradient token');
 console.log('PASS SEO-only markup scope and reusable palette');
}

async function copyCheck(page,lang){
 const markup=fs.readFileSync(path.join(ROOT,route(lang),'index.html'),'utf8');
 const current=await snapshot(page,markup);
 for(const [key,record] of Object.entries(BASELINE.pages[lang]))assert.equal(sha(current[key]),record.sha256,'Exact pre-follow-up '+lang+' '+key+' fingerprint');
 assert.equal(await page.locator('h1').count(),1,'One semantic H1');
 const requests=page.locator('.seo-plan-cta .btn-click');assert.equal(await requests.count(),4);
 for(let i=0;i<4;i++){
  assert.equal(await requests.nth(i).getAttribute('href'),'https://wa.me/966530307054');
  assert.equal(await requests.nth(i).getAttribute('target'),'_blank');
  assert.equal(await requests.nth(i).getAttribute('rel'),'noopener noreferrer');
 }
 console.log('PASS original copy/meta/nav/schema/FAQ/package links/non-phone images',lang);
}

async function structure(page,lang){
 assert.equal(await page.locator('main.rf-seo-studio').count(),1);
 assert.equal(await page.locator('.seo-hero-title-primary').count(),1);
 assert.equal(await page.locator('.seo-hero-title-secondary').count(),1);
 assert.equal(await page.locator('.seo-hero-title-primary,.seo-hero-title-secondary').evaluateAll(es=>es.every(e=>e.parentElement.tagName==='H1')),true,'Both title lines stay within the same H1');
 assert.equal(await page.locator('.seo-owner-illustration').count(),19,'Seven know, six why, six audience supplied illustrations');
 assert.equal(await page.locator('#seo-know .seo-owner-illustration').count(),7);
 for(const id of ['seo-why-zero2one','seo-audience']){
  const summaries=page.locator('#'+id+(id==='seo-audience'?' article.seo-audience-card > .seo-audience-heading':' details.seo-owner-accordion > summary'));assert.equal(await summaries.count(),6);
  assert.equal(await summaries.evaluateAll(es=>es.every(e=>e.parentElement.firstElementChild===e&&e.querySelector('.seo-owner-illustration')&&e.querySelector('.seo-studio-summary-copy'))),true,'Supplied artwork is part of the first native summary '+id);
 }
 assert.equal(await page.locator('.seo-card-placeholder,[data-image-placeholder]').count(),0,'Supplied artwork replaces all temporary slots');
 const captionNodes=page.locator('.seo-studio-shot-rank');
 assert.equal(await captionNodes.count(),3);assert.deepEqual((await captionNodes.allTextContents()).map(norm),captions(lang));
 assert.equal(await captionNodes.evaluateAll((es,lang)=>es.every(e=>e.lang===lang&&e.dir===(lang==='ar'?'rtl':'ltr')),lang),true,'Rank captions follow the current page language and direction');
 assert.equal(await page.locator('.seo-studio-shot-note').count(),0,'The removed illustration note does not return in either language');
 assert.equal(await page.locator('[data-seo-flow]').count(),11,'Flow spans the hero and ten following content chapters');
 for(const selector of ['.seo-hero-shell',...sections.map(id=>'#'+id)]){
  const flow=page.locator(selector+' > [data-seo-flow]');assert.equal(await flow.count(),1,'Flow art belongs to each body section '+selector);
  assert.equal(await flow.evaluate(e=>e.parentElement.firstElementChild===e),true,'Decorative flow is the first section child');
  assert.equal(await flow.getAttribute('aria-hidden'),'true');
  assert.equal(await flow.evaluate(e=>getComputedStyle(e).pointerEvents),'none','Flow cannot intercept controls');
  assert.ok(['orange','light'].includes(await flow.getAttribute('data-seo-flow-tone')),'Light trail has a section palette '+selector);
 }
 assert.equal(await page.locator('header [data-seo-flow]').count(),0,'Flow begins after the page header');
 const provenance=JSON.parse(fs.readFileSync(path.join(reviewRoot,'assets/icons/iconly/provenance.json'),'utf8'));
 const icons=await page.locator('.seo-studio-icon,.seo-owner-icon').evaluateAll(es=>es.map(e=>({key:e.dataset.iconly,inner:e.innerHTML,viewBox:e.getAttribute('viewBox'),hidden:e.getAttribute('aria-hidden'),focus:e.getAttribute('focusable'),colors:[...e.querySelectorAll('[stroke],[fill]')].flatMap(n=>['stroke','fill'].filter(a=>n.hasAttribute(a)).map(a=>n.getAttribute(a)))})));
 assert.equal(icons.length,48,'Existing meaningful Iconly illustrations remain');
 for(const e of icons){
  const asset=fs.readFileSync(path.join(ROOT,'assets/icons/iconly',e.key+'.svg'),'utf8');
  const canonical=await page.evaluate(svg=>new DOMParser().parseFromString(svg,'text/html').querySelector('svg').innerHTML,asset);
  assert.equal(norm(e.inner),norm(canonical),'Canonical local Iconly geometry '+e.key);
  assert.equal(provenance.icons[e.key].is_free,true);assert.equal(e.viewBox,'0 0 24 24');assert.equal(e.hidden,'true');assert.equal(e.focus,'false');
  assert.ok(e.colors.every(c=>['none','currentColor'].includes(c)),'Icons inherit card colors');
 }
}

async function phoneAssets(){
 for(const lang of ['ar','en']){
 const directory=path.join(ROOT,phoneRoot(lang)),archive=path.join(reviewRoot,phoneRoot(lang)),provenance=JSON.parse(fs.readFileSync(path.join(archive,'provenance.json'),'utf8'));
 assert.equal(provenance.images.length,3);
 for(const [i,key] of phoneKeys.entries()){
  const record=provenance.images[i];assert.equal(record.name,key);
  const original=fs.readFileSync(path.join(archive,record.originalCopy));assert.equal(bytesSha(original),record.originalSha256,'Original supplied phone archived byte-identically');
  const sourceMeta=await sharp(original).metadata();assert.equal(sourceMeta.width,1000);assert.equal(sourceMeta.height,phoneHeight(lang,i));assert.equal(sourceMeta.hasAlpha,true);
  for(const width of [400,700,1000]){
   const filename=key+'-'+width+'.webp',bytes=fs.readFileSync(path.join(directory,filename)),metadata=await sharp(bytes).metadata();
   assert.equal(metadata.width,width);assert.equal(metadata.height,Math.round(width*phoneHeight(lang,i)/1000));assert.equal(metadata.hasAlpha,true);
   const alpha=await sharp(bytes).extractChannel('alpha').raw().toBuffer(),reference=await sharp(original).resize({width}).extractChannel('alpha').raw().toBuffer();
   assert.equal(bytesSha(alpha),bytesSha(reference),'WebP preserves full resized alpha '+filename);
   assert.ok(alpha.includes(0)&&alpha.includes(255),'Transparent and opaque pixels remain '+filename);
  }
 }
 }
 console.log('PASS both supplied phone languages, dimensions, archived originals and all eighteen alpha channels');
}

async function phones(page){
 const lang=await page.locator('html').getAttribute('lang');
 const images=page.locator('.seo-shot img');assert.equal(await images.count(),3);
 for(const [i,key] of phoneKeys.entries()){
  const image=images.nth(i);assert.equal(await image.getAttribute('src'),phoneRoot(lang)+key+'-700.webp');
  assert.equal(await image.getAttribute('srcset'),[400,700,1000].map(w=>phoneRoot(lang)+key+'-'+w+'.webp '+w+'w').join(', '));
  assert.equal(await image.getAttribute('width'),'1000');assert.equal(await image.getAttribute('height'),String(phoneHeight(lang,i)));
  await jump(page,image,-120);await image.evaluate(e=>e.decode());
  const state=await image.evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),caption=e.closest('figure').querySelector('.seo-studio-shot-rank').getBoundingClientRect();return {fit:s.objectFit,loaded:e.complete&&e.naturalWidth>0,ratio:r.width/r.height,captionBottom:caption.bottom,imageTop:r.top};});
  assert.equal(state.fit,'contain','Phone artwork shows its full frame');assert.equal(state.loaded,true);
  assert.ok(Math.abs(state.ratio-1000/phoneHeight(lang,i))<.003,'Rendered full phone keeps supplied aspect ratio');
  assert.ok(state.captionBottom<=state.imageTop+2,'Caption is above the phone artwork');
 }
}

async function layout(page,width){
 const title=await page.locator('h1').evaluate(e=>({primary:parseFloat(getComputedStyle(e.querySelector('.seo-hero-title-primary')).fontSize),secondary:parseFloat(getComputedStyle(e.querySelector('.seo-hero-title-secondary')).fontSize)}));
 assert.ok(title.primary>title.secondary,'H1 has a clear primary/secondary scale');
 if(width<=440){
  const actions=await page.locator('.seo-hero-actions .btn-click').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,right:r.right,height:r.height};}));
  assert.equal(actions.length,2);assert.ok(Math.abs(actions[0].y-actions[1].y)<3,'Two phone hero CTAs stay on the same row');
  assert.ok(actions.every(e=>e.x>=0&&e.right<=width+1&&e.height>=42),'Both phone actions fit with touch target height');
 }
 const know=page.locator('#seo-know .seo-section-cta');
 assert.equal(await know.count(),1);
 const pill=await know.evaluate(e=>{const a=e.querySelector('.btn-click'),r=a.getBoundingClientRect(),p=e.getBoundingClientRect(),s=getComputedStyle(a);return {width:r.width,parent:p.width,radius:s.borderRadius};});
 assert.ok(pill.width<pill.parent-1,'Know CTA uses intrinsic pill width');
 assert.ok(parseFloat(pill.radius)>=20,'Know CTA follows the standard pill');
 const gradient=await page.locator('#seo-know').evaluate(e=>getComputedStyle(e).backgroundImage);
 assert.ok(gradient.includes('gradient')&&gradient.includes('249, 70, 14')&&gradient.includes('255, 128, 0'),'Know chapter uses the global two-orange gradient');
 assert.equal(await page.locator('#seo-process').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(249, 70, 14)','Process preserves the flat brand orange alongside the gradient');
 if(width<=760){
  const hero=await page.locator('.seo-hero-figure img').evaluate(e=>{const r=e.getBoundingClientRect(),f=e.parentElement.getBoundingClientRect();return {ratio:r.width/r.height,frameRatio:f.width/f.height,fit:getComputedStyle(e).objectFit,sourceRatio:e.naturalWidth/e.naturalHeight};});
  assert.ok(Math.abs(hero.ratio-2/3)<.002&&Math.abs(hero.frameRatio-2/3)<.002,'Mobile orange hero frame follows the full artwork ratio without side gaps');
  assert.equal(hero.fit,'contain','Hero keeps the entire composition');
 }
 const iconSides=await page.locator('#seo-process .seo-timeline-item').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),i=e.querySelector(':scope > .seo-studio-icon').getBoundingClientRect();return {left:i.left-r.left,right:r.right-i.right};}));
 const lang=await page.locator('html').getAttribute('lang');
 assert.ok(iconSides.every(s=>lang==='ar'?s.left+30<s.right:s.right+30<s.left),'Process icons move to the opposite side '+lang);
}

async function team(page,lang){
 const existing=fs.readFileSync(path.join(ROOT,lang==='ar'?'ar/team/index.html':'team/index.html'),'utf8');
 const expected=await page.evaluate(markup=>{const d=new DOMParser().parseFromString(markup,'text/html'),card=[...d.querySelectorAll('.team-card')].find(e=>e.querySelector('img')?.getAttribute('src')==='/assets/images/team/team-kerolos.webp');const n=s=>s.replace(/\s+/g,' ').trim();return {name:n(card.querySelector('.testi-name').textContent),role:n(card.querySelector('.testi-role').textContent),experience:n(card.querySelector('.team-exp').textContent),bio:n(card.querySelector('.testi-quote').textContent),photo:card.querySelector('img').getAttribute('src')};},existing);
 const section=page.locator('#seo-team'),card=section.locator('.seo-team-card');
 assert.equal(await card.count(),1,'Only confirmed Kerolos belongs to the SEO team');
 for(const [key,cls] of Object.entries({name:'name',role:'role',experience:'experience',bio:'bio'}))assert.equal(norm(await card.locator('.seo-team-'+cls).textContent()),expected[key],'Exact existing '+lang+' team '+key);
 assert.equal(await card.locator('img').getAttribute('src'),expected.photo);
 assert.equal(await section.evaluate(e=>!!(document.querySelector('#faq').compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)),true,'Team follows FAQ');
 await jump(page,section,-80);await page.waitForTimeout(1200);await card.locator('img').evaluate(e=>e.decode());
 const shape=await card.evaluate(e=>{const photo=e.querySelector('.seo-team-photo').getBoundingClientRect(),identity=e.querySelector('.seo-team-identity').getBoundingClientRect(),r=e.getBoundingClientRect();return {width:r.width,height:r.height,photoTop:photo.top,photoBottom:photo.bottom,identityTop:identity.top,identityBottom:identity.bottom};});
 assert.ok(shape.identityTop<shape.photoBottom&&shape.identityBottom>shape.photoTop,'Photo and identity sit side by side, never portrait stacked');
 assert.ok(shape.width>shape.height,'Team card is landscape even on the smallest viewport '+JSON.stringify(shape));
 await page.screenshot({path:path.join(reports,'seo-oct14-team-'+lang+'-'+page.viewportSize().width+'.png')});
}

async function footer(page,lang,width){
 const bottom=page.locator('.footer .bottom-footer');
 assert.equal(await bottom.evaluate(e=>getComputedStyle(e).display),'grid','SEO footer uses an explicit responsive grid');
 const links=bottom.locator('.quick-links a,.socials a');assert.equal(await links.count(),12,'Keep all six quick links and six social accounts');
 const layout=await bottom.evaluate(e=>{
  const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  return {frame:box(e),quick:box(e.querySelector('.quick-links')),social:box(e.querySelector('.socials')),credits:box(e.querySelector('.credits')),time:box(e.querySelector('.time')),certificate:box(e.querySelector('.maroof')),targets:[...e.querySelectorAll('.quick-links a,.socials a')].map(box),labels:[...e.querySelectorAll('.ui-label')].map(box),overflow:e.scrollWidth>e.clientWidth+1};
 });
 assert.equal(layout.overflow,false,'Footer content stays inside its container');
 assert.ok(layout.targets.every(r=>r.height>=44&&r.left>=layout.frame.left-1&&r.right<=layout.frame.right+1),'Footer links fit and retain touch-target height');
 assert.ok(layout.labels.every(r=>r.height>=12&&r.left>=layout.frame.left-1&&r.right<=layout.frame.right+1),'Every footer group has an aligned label');
 if(width<=760)assert.ok(layout.social.top>=layout.quick.bottom+15,'Small screens stack the two link groups with a clear gap');
 else assert.ok(Math.abs(layout.quick.top-layout.social.top)<2,'Desktop/tablet links share one organized row');
 assert.ok(Math.abs(layout.credits.top-layout.time.top)<2,'Version and local time align on the same row');
 assert.ok(layout.credits.top>=Math.max(layout.quick.bottom,layout.social.bottom)+15,'Utility information follows both link groups');
 assert.ok(layout.certificate.width>150&&layout.certificate.width<260,'Certificate keeps a legible compact size');
 if(width>1100)assert.ok(Math.abs((layout.certificate.top+layout.certificate.height/2)-(layout.credits.top+layout.credits.height/2))<40,'Desktop certificate shares the utility row');
 assert.equal(await bottom.locator('#timeSpan').evaluate(e=>getComputedStyle(e).direction),'ltr','Live time remains readable in both languages');
 await page.evaluate(()=>{if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo('bottom',{duration:0,disableLerp:true});else window.scrollTo(0,document.body.scrollHeight);});
 await page.waitForTimeout(900);await bottom.locator('.maroof img').evaluate(e=>e.decode());
 const clear=await bottom.locator('.maroof').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.wa-float').getBoundingClientRect();return a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;});
 assert.equal(clear,true,'Certificate never sits underneath the persistent WhatsApp button');
 await page.screenshot({path:path.join(reports,'seo-oct15-footer-'+lang+'-'+width+'.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Footer cannot create page-wide horizontal scrolling');
 console.log('PASS localized captions and organized SEO footer',lang,width);
}

async function flowMotion(page){
 await move(page,'#seo-know',-80);await page.waitForTimeout(1200);
 const size=page.viewportSize(),flow=page.locator('#seo-know > [data-seo-flow]'),ribbon=flow.locator('.seo-flow-ribbon');
 const state=()=>ribbon.evaluate(e=>({d:e.getAttribute('d'),offset:e.style.strokeDashoffset}));
 const before=await state();
 for(let i=0;i<12;i++){await page.mouse.wheel(0,24);await page.waitForTimeout(25);}
 await page.waitForTimeout(500);const after=await state();
 assert.notDeepEqual(after,before,'Scroll advances the ribbon drawing and bends');
 assert.ok(Number(after.offset)<Number(before.offset),'Downward scroll draws farther along the path');
 await page.mouse.wheel(0,-200);await page.waitForTimeout(1200);
 assert.ok(Number((await state()).offset)>Number(after.offset),'Upward scroll retraces the same path');
 const pointerBefore=await state();
 for(let i=0;i<24;i++){await page.mouse.move(70+i*(size.width-140)/24,180+Math.sin(i*.22)*70);await page.waitForTimeout(12);}
 assert.deepEqual(await state(),pointerBefore,'Pointer movement cannot move or redraw the scroll ribbon');
 assert.equal(await page.locator('[data-seo-flow] canvas').count(),0,'Pointer-trail canvases are fully removed');
 const stroke=await ribbon.evaluate(e=>parseFloat(getComputedStyle(e).strokeWidth));assert.ok(stroke>=15,'Broad reference-style ribbon, not thin repeated strokes');
 await page.screenshot({path:path.join(reports,'seo-scroll-ribbon-'+(await page.locator('html').getAttribute('lang'))+'-'+size.width+'.png')});
 assert.equal(await page.evaluate(()=>typeof initSEOFlow),'function','Flow has its own initialization');
 const count=await page.locator('[data-seo-flow]').count();await page.evaluate(()=>{initSEOFlow();initSeoStudioMotion();});
 assert.equal(await page.locator('[data-seo-flow]').count(),count,'Repeated setup does not duplicate artwork');
 assert.equal(await page.locator('[data-seo-flow] svg').count(),11,'Repeated setup retains one SVG per section');
}

async function polish(page,lang,width,height){
 const compact=width<=760||(width<=1100&&height>=width);
 await copyCheck(page,lang);await structure(page,lang);await layout(page,width);await phones(page);await team(page,lang);
 assert.equal(await page.locator('main.rf-seo-studio').getAttribute('data-seo-flow-opacity'),'0.56','Ribbon is a further 20% softer than the previous 70% strength');
 const softened=await page.locator('.seo-hero-shell .seo-flow-start').evaluate(e=>getComputedStyle(e).stopColor);
 assert.equal(softened,'rgb(252, 151, 117)','Orange is visually precomposed at 56% over the ivory background');
 assert.equal(sha(norm(await page.locator('h1').textContent())),BASELINE.pages[lang].h1.sha256,'Word effects preserve the complete accessible H1');
 assert.equal(await page.locator('.seo-title-word .seo-title-word').count(),0,'Heading words never nest after initialization');
 const heading=page.locator('#seo-know .seo-sec-title');await jump(page,heading,-100);await page.waitForTimeout(1250);
 assert.ok(await heading.locator('.seo-title-word').count()>3,'Arabic/English headings use whole-word text effects');
 const words=await heading.locator('.seo-title-word').evaluateAll(es=>es.map(e=>[e.textContent,getComputedStyle(e).opacity]));
 assert.ok(words.every(([,opacity])=>opacity==='1'),'Every heading word stays visible after its entrance');
 const effects=await page.evaluate(()=>window.__seoWordEffects.filter(e=>e.heading==='seo-know').length);
 assert.ok(effects>3,'Heading words animate on entrance');
 await move(page,'#faq');await jump(page,heading,-100);await page.waitForTimeout(1250);
 assert.equal(await page.evaluate(()=>window.__seoWordEffects.filter(e=>e.heading==='seo-know').length),effects,'Scrollback does not replay heading words');
 for(const id of ['seo-know','seo-why-zero2one','seo-audience']){
  await move(page,'#'+id,-90);await page.waitForTimeout(1250);
  const stacked=await page.locator('#'+id+' .seo-owner-illustration').evaluateAll(es=>es.every(e=>{
   const text=e.parentElement.querySelector('.seo-studio-copy,.seo-studio-summary-copy'),art=e.getBoundingClientRect();
   return !!text&&text.getBoundingClientRect().top>=art.bottom-2;
  }));assert.equal(stacked,true,'Text follows the illustration vertically '+id);
  await page.screenshot({path:path.join(reports,'seo-polish-'+id+'-'+lang+'-'+width+'.png')});
 }
 const audience=page.locator('#seo-audience [data-home-scroll-track]'),audienceControls=page.locator('#seo-audience .rf-home-scroll-controls');
 assert.equal(await audience.locator(':scope > .seo-tile').count(),6,'Six audience cards keep all supplied illustrations');
 assert.equal(await audience.locator('details,summary,.seo-owner-chevron').count(),0,'Audience cards are permanently open with no collapsing controls');
 const audienceExpanded=()=>audience.locator('.seo-owner-answer').evaluateAll(es=>es.every(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>15));
 assert.equal(await audienceExpanded(),true,'Every audience description is rendered before swiping');
 await jump(page,audience,-100);await page.waitForTimeout(500);
 if(compact){
  assert.equal(await audience.evaluate(e=>getComputedStyle(e).display),'flex','Compact audience cards use a horizontal rail');
  assert.ok(await audience.evaluate(e=>e.scrollWidth>e.clientWidth+50));
  assert.equal(await audienceControls.isVisible(),true);
  await audienceControls.locator('[data-home-scroll-next]').click();await page.waitForTimeout(750);
  assert.ok(await audience.evaluate(e=>Math.abs(e.scrollLeft)>40),'Audience Next follows the language direction');
  assert.equal(await audienceExpanded(),true,'Swiping cannot collapse audience copy');
  assert.ok(await audience.evaluate(e=>e.clientHeight>=e.children[1].offsetHeight),'Expanded audience copy is not clipped');
  await audienceControls.locator('[data-home-scroll-prev]').click();await page.waitForTimeout(750);
  assert.ok(await audience.evaluate(e=>Math.abs(e.scrollLeft)<4));
  await audience.locator(':scope > .seo-tile').first().locator(':scope > .seo-audience-heading').click();await page.waitForTimeout(100);
  assert.equal(await audienceExpanded(),true,'Tapping audience headings cannot hide their copy');
  await audience.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(750);
  assert.ok(await audience.evaluate(e=>Math.abs(e.scrollLeft)>40),'Audience rail supports keyboard arrows');
  await audience.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(400);
  if(width===440){
   await jump(page,audience,-100);
   const session=await page.context().newCDPSession(page),r=await audience.boundingBox();
   const x=lang==='ar'?r.x+60:r.x+r.width-60,y=r.y+70;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(lang==='ar'?1:-1)*i*18,y}]});await page.waitForTimeout(16);}
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);await session.detach();
   const gesture=await audience.evaluate((e,{x,y})=>({position:e.scrollLeft,hit:document.elementFromPoint(x,y)?.closest('[data-home-scroll-track]')===e}),{x,y});
   assert.ok(Math.abs(gesture.position)>80,'Native touch swipe advances the audience rail '+JSON.stringify(gesture));
   await audience.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(400);
  }
 }else{
  assert.equal(await audience.evaluate(e=>getComputedStyle(e).display),'grid','Desktop audience layout remains a grid');
  assert.equal(await audienceControls.isVisible(),false);
 }
 await page.screenshot({path:path.join(reports,'seo-polish-audience-rail-'+lang+'-'+width+'.png')});
 const rail=page.locator('#seo-packages [data-home-scroll-track]'),controls=page.locator('#seo-packages .rf-home-scroll-controls');
 await jump(page,rail,-100);await page.waitForTimeout(1200);
 assert.equal(await rail.evaluate(e=>getComputedStyle(e).display),'flex','Packages are a horizontal rail');
 assert.ok(await rail.evaluate(e=>e.scrollWidth>e.clientWidth+50),'All viewport sizes can scroll between packages');
 assert.equal(await controls.isVisible(),true);
 await controls.locator('[data-home-scroll-next]').click();await page.waitForTimeout(750);
 assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>40),'Package Next advances in the correct language direction');
 await controls.locator('[data-home-scroll-prev]').click();await page.waitForTimeout(750);
 assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)<4),'Package Previous returns to the first card');
 await rail.focus();await page.keyboard.press(lang==='ar'?'ArrowLeft':'ArrowRight');await page.waitForTimeout(750);
 assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>40),'Package rail supports keyboard arrows');
 assert.equal(await rail.locator('.seo-plan-content').count(),4,'Every package has permanently expanded content');
 assert.equal(await rail.locator('details,summary,.seo-owner-chevron').count(),0,'Packages have no collapsing controls');
 assert.equal(await rail.evaluate(e=>e.style.height),'','Permanent package content uses natural height, not a clipping window');
 assert.ok(await rail.locator(':scope > .seo-plan').evaluateAll(es=>Math.max(...es.map(e=>e.offsetHeight))-Math.min(...es.map(e=>e.offsetHeight))<=1),'All package cards share a full, unclipped height');
 assert.equal(await rail.locator('.seo-plan-list').evaluateAll(es=>es.every(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>30)),true,'All four included-service lists are always rendered');
 await rail.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));await page.waitForTimeout(500);
 await rail.locator('.seo-plan-heading').first().click();await page.waitForTimeout(100);
 assert.equal(await rail.locator('.seo-plan-list').first().isVisible(),true,'Package titles cannot hide their content');
 if(compact){
  const height=await rail.evaluate(e=>({rail:e.clientHeight,card:e.children[0].offsetHeight}));
  assert.ok(height.rail>=height.card&&height.rail-height.card<40,'Rail height follows the visible expanded package');
 }
 await page.screenshot({path:path.join(reports,'seo-polish-packages-'+lang+'-'+width+'.png')});
 if(width===440){
  await jump(page,rail,-100);const session=await page.context().newCDPSession(page),r=await rail.boundingBox();
  const x=lang==='ar'?r.x+60:r.x+r.width-60,y=r.y+70;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(lang==='ar'?1:-1)*i*18,y}]});await page.waitForTimeout(16);}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(700);await session.detach();
  assert.ok(await rail.evaluate(e=>Math.abs(e.scrollLeft)>80),'Native touch swipe advances the package rail');
 }
 for(const id of ['seo-why','seo-packages','faq']){
  await move(page,'#'+id,-300);await page.waitForTimeout(1250);
  const shared=await page.locator('[data-seo-flow]').evaluateAll(es=>({
   paths:new Set(es.map(e=>e.querySelector('.seo-flow-ribbon').getAttribute('d'))).size,
   opaque:es.every(e=>getComputedStyle(e.querySelector('.seo-flow-ribbon')).opacity==='1'),
   contiguous:es.slice(0,-1).every((e,i)=>Math.abs(Number(e.dataset.seoFlowEnd)-Number(es[i+1].dataset.seoFlowStart))<.01),
   ranges:es.map(e=>[e.dataset.seoFlow,e.dataset.seoFlowStart,e.dataset.seoFlowEnd]),
   colors:es.slice(0,-1).every((e,i)=>e.querySelector('linearGradient stop:last-child').style.stopColor===es[i+1].querySelector('linearGradient stop:first-child').style.stopColor),
   visible:es.slice(0,-1).every((e,i)=>{const a=e.getBoundingClientRect(),b=es[i+1].getBoundingClientRect();return !(a.top<innerHeight&&a.bottom>0&&b.top<innerHeight&&b.bottom>0)||Math.abs(a.bottom-b.top)<2;})
  }));assert.equal(shared.paths,1,'Every section sees the exact same document path');assert.equal(shared.opaque,true,'Overlapping color windows cannot double-tint the ribbon');assert.equal(shared.contiguous,true,'Section windows have no geometry gap '+JSON.stringify(shared.ranges));assert.equal(shared.visible,true,'Visible section boundaries meet without a clipped gap');assert.equal(shared.colors,true,'Palette bridges stay continuous across section boundaries');
  await page.screenshot({path:path.join(reports,'seo-polish-seam-'+id+'-'+lang+'-'+width+'.png')});
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'Horizontal scrolling stays inside package cards');
 console.log('PASS connected ribbon, image/text stacking, package rail and title effects',lang,width,height);
}

async function flowLifecycle(browser,origin,lang){
 const context=await browser.newContext({viewport:{width:1440,height:900}});await isolate(context,origin);const page=await context.newPage();
 try{
  await go(page,origin,lang);
  await page.evaluate(()=>{
   const nativeRAF=window.requestAnimationFrame,nativeCancel=window.cancelAnimationFrame;
   const probe=window.__seoFlowFrameProbe={requested:0,executed:0,pending:new Set()};
   window.requestAnimationFrame=function(callback){
    if(!callback.toString().includes('seoFlowProgress'))return nativeRAF.call(window,callback);
    probe.requested++;let id=nativeRAF.call(window,time=>{probe.pending.delete(id);probe.executed++;callback(time);});probe.pending.add(id);return id;
   };
   window.cancelAnimationFrame=function(id){probe.pending.delete(id);return nativeCancel.call(window,id);};
   initSEOFlow();initSEOFlow();initSEOFlow();
  });
  await page.waitForTimeout(700);
  const pointerBurst=await page.evaluate(()=>{const p=window.__seoFlowFrameProbe;p.requested=0;const root=document.querySelector('.rf-seo-studio');for(let i=0;i<20;i++)root.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:200+i*15,clientY:250+i*2}));return p.requested;});
  assert.equal(pointerBurst,0,'Pointer motion schedules no flow work');
  const burst=await page.evaluate(()=>{const p=window.__seoFlowFrameProbe;p.requested=0;for(let i=0;i<20;i++)window.dispatchEvent(new Event('scroll'));return p.requested;});
  assert.equal(burst,1,'Repeated initialization retains one coalesced flow controller');
  await page.waitForTimeout(1800);
  const idle=await page.evaluate(()=>({requested:window.__seoFlowFrameProbe.requested,executed:window.__seoFlowFrameProbe.executed,pending:window.__seoFlowFrameProbe.pending.size}));
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(()=>({requested:window.__seoFlowFrameProbe.requested,executed:window.__seoFlowFrameProbe.executed,pending:window.__seoFlowFrameProbe.pending.size})),idle,'Stationary flow schedules no idle render loop');
  assert.equal(idle.pending,0,'Stationary flow has no pending animation frame');
  const hidden=await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));
   const p=window.__seoFlowFrameProbe;p.requested=0;for(let i=0;i<20;i++)window.dispatchEvent(new Event('scroll'));return {requested:p.requested,pending:p.pending.size};
  });
  assert.deepEqual(hidden,{requested:0,pending:0},'Hidden document schedules no decorative work');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(400);
  const cleanup=await page.evaluate(()=>{seoFlowCleanup();const p=window.__seoFlowFrameProbe;p.requested=0;for(let i=0;i<20;i++)window.dispatchEvent(new Event('scroll'));return {requested:p.requested,pending:p.pending.size};});
  assert.deepEqual(cleanup,{requested:0,pending:0},'Cleanup removes listeners and pending frame work');
  await page.evaluate(()=>initSEOFlow());await page.waitForTimeout(400);
  assert.equal(await page.locator('[data-seo-flow][data-seo-flow-ready="true"]').count(),11,'Flow restores cleanly after disposal');
  console.log('PASS flow controller coalescing, idle CPU, document visibility and disposal',lang);
 }finally{await context.close();}
}

async function sliderHitTargets(page,height){
 for(const id of ['seo-why','whats-included']){
  const controls=page.locator('#'+id+' .rf-home-scroll-controls'),track=page.locator('#'+id+' [data-home-scroll-track]');
  // Put the controls in the lower visible lane, where the persistent contact
  // shortcut sits. Native slider actions must still own their hit targets.
  await jump(page,controls,-(height-75));await page.waitForTimeout(350);
  const next=controls.locator('[data-home-scroll-next]'),prev=controls.locator('[data-home-scroll-prev]');
  const ownHit=locator=>locator.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!hit&&e.contains(hit);});
  assert.equal(await ownHit(next),true,'Next control remains reachable beside the fixed contact shortcut '+id);
  await next.tap();await page.waitForTimeout(600);
  assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)>80),'Touching Next activates the native track '+id);
  assert.equal(await ownHit(prev),true,'Previous control remains reachable beside the fixed contact shortcut '+id);
  await prev.tap();await page.waitForTimeout(600);
  assert.ok(await track.evaluate(e=>Math.abs(e.scrollLeft)<4),'Touching Previous restores the native track '+id);
 }
}

async function screenshots(page,lang,width){
 if(![375,440,834,1440].includes(width))return;
 for(const selector of ['.seo-hero-shell','#seo-why','#seo-know','#seo-why-zero2one','#seo-audience','#whats-included','#seo-process']){
  await move(page,selector,-95);await page.waitForTimeout(700);
  await page.screenshot({path:path.join(reports,'seo-premium-'+selector.replace(/[.#]/g,'')+'-'+lang+'-'+width+'.png')});
 }
 await phoneScreenshots(page,lang,width);
}

async function phoneScreenshots(page,lang,width){
 if(![375,440,834,1440].includes(width))return;
 const track=page.locator('#seo-why .seo-shots');await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));
 await jump(page,track,-100);await page.waitForTimeout(500);
 await page.screenshot({path:path.join(reports,'seo-premium-phones-'+lang+'-'+width+'.png')});
 if(await track.evaluate(e=>getComputedStyle(e).display==='flex')){
  for(const [i,key] of phoneKeys.entries()){
   await track.evaluate((e,i)=>{const r=e.getBoundingClientRect(),card=e.children[i].getBoundingClientRect();e.scrollTo({left:e.scrollLeft+(getComputedStyle(e).direction==='rtl'?card.right-r.right:card.left-r.left),behavior:'instant'});},i);
   await page.waitForTimeout(350);
   await page.locator('#seo-why .seo-shot').nth(i).evaluate(e=>Promise.all(e.getAnimations().filter(a=>a.effect.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
   await page.screenshot({path:path.join(reports,'seo-premium-phone-'+key+'-'+lang+'-'+width+'.png')});
  }
  await track.evaluate(e=>e.scrollTo({left:0,behavior:'instant'}));
 }
}

async function runViewport(browser,origin,lang,width,height){
 const compact=width<=760||(width<=1100&&height>=width);
 const context=await browser.newContext({viewport:{width,height},hasTouch:compact});
 const isolation=await isolate(context,origin),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__seoStudioAnimations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('[data-seo-studio-reveal]'))window.__seoStudioAnimations.push({studio:[...document.querySelectorAll('[data-seo-studio-reveal]')].indexOf(this)+1,kind:this.dataset.seoStudioReveal,start:performance.now()});if(this.matches('[data-about-step][data-reveal-scope="seo"]'))window.__seoStudioAnimations.push({about:[...document.querySelectorAll('[data-about-step][data-reveal-scope="seo"]')].indexOf(this)+1,start:performance.now()});return animate.call(this,frames,options);};});
 try{
  await go(page,origin,lang);await structure(page,lang);await layout(page,width);
  if(!process.env.SEO_PREMIUM_QA_CAPTURE_ONLY){
   await entrances(page);await motionScope(page);await flowMotion(page);await accordions(page,compact,['#seo-packages','#seo-audience']);await sliders(page,lang,compact);if(compact)await sliderHitTargets(page,height);await phones(page);await buttons(page,lang,width);await team(page,lang);
  }
  await screenshots(page,lang,width);await navDesktop(page,lang,width);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No horizontal page overflow');
  assert.deepEqual(errors,[],'No uncaught page errors');
  assert.equal(isolation.tagLibraries.length,0,'Production tag libraries remain blocked');
  console.log('PASS SEO premium',lang,width,height);
 }finally{await context.close();}
}

async function fallbacks(browser,origin,lang){
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});await isolate(noJS,origin);const fallback=await noJS.newPage();
 await fallback.goto(origin+route(lang),{waitUntil:'networkidle'});await copyCheck(fallback,lang);await structure(fallback,lang);
 assert.equal(await fallback.locator('[data-seo-studio-reveal],[data-about-step]').evaluateAll(es=>es.every(e=>{for(let n=e;n&&n!==document.body;n=n.parentElement){const s=getComputedStyle(n);if(s.visibility==='hidden'||parseFloat(s.opacity)<.98)return false;}return true;})),true,'Without JS, every prose and card target remains visible');
 for(const [selector,count] of groups)assert.equal(await fallback.locator(selector+' .seo-owner-accordion[open]').count(),count,'No-JS exposes all section prose');
 assert.equal(await fallback.locator('#seo-packages .seo-plan-content').count(),4,'No-JS keeps every package expanded');
 assert.equal(await fallback.locator('#seo-packages details').count(),0,'Package content cannot be collapsed without JavaScript either');
 assert.equal(await fallback.locator('#seo-packages .seo-plan-list').evaluateAll(es=>es.every(e=>getComputedStyle(e).display!=='none')),true);
 assert.equal(await fallback.locator('#seo-audience article.seo-audience-card .seo-owner-answer').count(),6,'No-JS exposes every static audience card');
 assert.equal(await fallback.locator('#seo-audience details').count(),0,'Audience copy needs no disclosure or JavaScript');
 assert.equal(await fallback.locator('[data-seo-flow] canvas').count(),0,'No-JS has no canvas decoration');
 assert.equal(await fallback.locator('[data-seo-flow] svg').count(),11,'No-JS retains static SVG artwork');
 await noJS.close();
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:375,height:812}});await isolate(reduced,origin);const page=await reduced.newPage();
 await page.addInitScript(()=>{window.__seoMotionCount=0;const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('[data-seo-studio-reveal],[data-about-step][data-reveal-scope="seo"]'))window.__seoMotionCount++;return animate.call(this,frames,options);};});
 await go(page,origin,lang);await move(page,'#seo-process');await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__seoMotionCount),0,'Reduced motion omits entrances');
 assert.equal(await page.locator('.seo-studio-motion-active').count(),0,'Reduced motion skips card ambience');
 const flow=page.locator('#seo-process > [data-seo-flow]'),before=await flow.evaluate(e=>e.innerHTML);await page.waitForTimeout(250);
 assert.equal(await flow.evaluate(e=>e.innerHTML),before,'Reduced motion flow stays static');
 assert.equal(await readable(page.locator('#seo-process .seo-sec-title')),true,'Reduced-motion heading is readable');
 await reduced.close();console.log('PASS no-JS/reduced-motion SEO premium',lang);
}

(async()=>{
 const browser=await chromium.launch();let server;
 try{
  if(process.argv[2]==='--capture-baseline'){console.log(JSON.stringify(await capture(browser,process.argv[3]),null,2));return;}
  if(process.argv[2]==='--verify-baseline'){
   const original=await capture(browser,process.argv[3]);
   for(const lang of ['ar','en'])for(const [key,record] of Object.entries(BASELINE.pages[lang]))assert.equal(record.sha256,original.pages[lang][key].sha256,'Captured fingerprint matches preserved pre-follow-up source '+lang+' '+key);
   console.log('PASS independently preserved pre-follow-up baseline');return;
  }
  if(process.argv[2]==='--assets'){await phoneAssets();return;}
  scopeCheck();await phoneAssets();fs.mkdirSync(reports,{recursive:true});
  const {srv,origin}=await serve();server=srv;
  const langs=process.env.SEO_PREMIUM_QA_LANG?[process.env.SEO_PREMIUM_QA_LANG]:['ar','en'];
  if(process.argv[2]==='--footer'){
   const sizes=[[320,780],[440,956],[834,1194],[1440,900]].filter(([w])=>!process.env.SEO_PREMIUM_QA_WIDTH||w===Number(process.env.SEO_PREMIUM_QA_WIDTH));
   const tasks=langs.flatMap(lang=>sizes.map(([width,height])=>async()=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1101});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{await go(page,origin,lang);await copyCheck(page,lang);await structure(page,lang);await footer(page,lang,width);assert.equal(await page.locator('main.rf-seo-studio').getAttribute('data-seo-flow-opacity'),'0.56');assert.deepEqual(errors,[]);}finally{await context.close();}
   }));let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));return;
  }
  if(process.argv[2]==='--polish'){
   const sizes=[[320,780],[440,956],[834,1194],[1440,900]].filter(([w])=>!process.env.SEO_PREMIUM_QA_WIDTH||w===Number(process.env.SEO_PREMIUM_QA_WIDTH));
   const tasks=langs.flatMap(lang=>sizes.map(([width,height])=>async()=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1101});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.__seoWordEffects=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.seo-title-word'))window.__seoWordEffects.push({heading:this.closest('section')?.id,text:this.textContent});return animate.call(this,frames,options);};});
    try{await go(page,origin,lang);assert.deepEqual(errors,[],'No page errors during setup');await polish(page,lang,width,height);assert.deepEqual(errors,[]);}finally{await context.close();}
   }));let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));return;
  }
  if(process.argv[2]==='--cards'){
   for(const lang of langs)for(const [width,height] of [[375,812],[834,1194],[1440,900]].filter(([w])=>!process.env.SEO_PREMIUM_QA_WIDTH||w===Number(process.env.SEO_PREMIUM_QA_WIDTH))){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1101});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
     await go(page,origin,lang);await copyCheck(page,lang);await structure(page,lang);await accordions(page,width<1101,['#seo-packages','#seo-audience']);
     for(const id of ['seo-know','seo-why-zero2one','seo-audience']){
      await move(page,'#'+id,-55);await page.waitForTimeout(900);
      const first=page.locator('#'+id+' .seo-owner-illustration img').first();await first.waitFor({state:'visible'});await first.evaluate(e=>e.decode());
      assert.ok(await first.evaluate(e=>e.complete&&e.naturalWidth>0),'Supplied illustration decodes '+id);
      assert.equal(await page.locator('#'+id+' .seo-owner-illustration img').evaluateAll(es=>es.every(e=>getComputedStyle(e).objectFit==='contain')),true,'Art uses full-frame containment '+id);
      assert.equal(await page.locator('#'+id+' .seo-owner-illustration img').evaluateAll(es=>es.every(e=>{const image=e.getBoundingClientRect(),frame=e.parentElement.getBoundingClientRect();return image.height<=frame.height+1&&image.width<=frame.width+1;})),true,'Illustrations stay within their reserved card space '+id);
      await page.screenshot({path:path.join(reports,'seo-supplied-'+id+'-'+lang+'-'+width+'.png')});
     }
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS supplied illustration cards',lang,width);
    }finally{await context.close();}
   }return;
  }
  if(process.argv[2]==='--flow'){
   for(const lang of langs){
    await fallbacks(browser,origin,lang);await flowLifecycle(browser,origin,lang);
    for(const [width,height] of [[375,812],[1440,900]]){
     const context=await browser.newContext({viewport:{width,height},hasTouch:width<760});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
     try{await go(page,origin,lang);await flowMotion(page);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);console.log('PASS scroll-only SVG ribbon',lang,width);}finally{await context.close();}
    }
   }return;
  }
  if(process.argv[2]==='--lifecycle'){for(const lang of langs)await flowLifecycle(browser,origin,lang);return;}
  const selected=process.env.SEO_PREMIUM_QA_WIDTH?screens.filter(([w])=>w===Number(process.env.SEO_PREMIUM_QA_WIDTH)):process.env.SEO_PREMIUM_QA_CAPTURE_ONLY?screens.filter(([w])=>[375,440,834,1440].includes(w)):screens;
  if(process.argv[2]==='--phones'){
   const tasks=langs.flatMap(lang=>selected.filter(([w])=>[375,440,834,1440].includes(w)).map(([width,height])=>async()=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<=760||(width<=1100&&height>=width)});await isolate(context,origin);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{await go(page,origin,lang);await phones(page);await phoneScreenshots(page,lang,width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);console.log('PASS stable full-frame phone capture',lang,width,height);}finally{await context.close();}
   }));
   let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));return;
  }
  if(process.argv[2]==='--controls'){
   const tasks=langs.flatMap(lang=>selected.filter(([w,h])=>w<=760||(w<=1100&&h>=w)).map(([width,height])=>async()=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:true});await isolate(context,origin);const page=await context.newPage();
    try{await go(page,origin,lang);await sliderHitTargets(page,height);await screenshots(page,lang,width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);console.log('PASS floating-contact/carousel touch hit targets',lang,width,height);}finally{await context.close();}
   }));
   let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));return;
  }
  if(!process.env.SEO_PREMIUM_QA_CAPTURE_ONLY)for(const lang of langs){await fallbacks(browser,origin,lang);await flowLifecycle(browser,origin,lang);}
  const tasks=langs.flatMap(lang=>selected.map(([w,h])=>()=>runViewport(browser,origin,lang,w,h)));
  let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
