/* Local brand-identity review only. No production requests are forwarded. */
const {chromium}=require('playwright');
const {serve,isolate,ROOT}=require('./test_support');
const assert=require('assert').strict,fs=require('fs'),path=require('path'),cp=require('child_process'),sharp=require('sharp');

const BASE='2e183cfb087f8b466885b212e5dd2ebe400f4217';
const source=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/content-sources.json'),'utf8')).documents;
const screens=[[375,812],[440,956],[768,1024],[834,1194],[1024,1366],[1440,900]];
const reports=path.join(ROOT,'tools/reports/site-refresh');
const ORANGE='rgb(249, 70, 14)',CREAM='rgb(255, 253, 237)',INK='rgb(28, 29, 32)';
const WA='https://wa.me/966530307054';
const benefits=['01-brand-always-present','02-memorable-brand','03-consistent-presence','04-stand-out','05-build-trust','06-marketing-foundation'];
const route=lang=>(lang==='ar'?'/ar':'')+'/services/brand-identity/';
const norm=s=>s.replace(/\s+/g,' ').trim();
const clean=s=>s.trim().replace(/^\uFEFF/,'').replace(/^[•*]\s+/,'').replace(/^\[[^\]]+\]\s*/,'');
const unstamped=s=>s.replace(/\?v=[a-f0-9]+/g,'?v=ASSET_HASH');
const section=(s,id)=>s.match(new RegExp('<section\\b[^>]*id="'+id+'"[\\s\\S]*?</section>'))?.[0];

function restoreSEOOrders(page,before){
 const pattern=/(<div class="btn btn-normal seo-plan-cta">\s*)<a\b[^>]*>/g;
 const old=[...before.matchAll(pattern)].map(m=>m[0].slice(m[1].length));
 let count=0;
 const restored=page.replace(pattern,(match,prefix)=>{
  assert.ok(match.includes('href="'+WA+'"'),'SEO package orders use approved WhatsApp');
  assert.ok(match.includes('target="_blank"')&&match.includes('rel="noopener noreferrer"'),'SEO WhatsApp order has safe external target');
  // Replacing only the opening anchor preserves its original label, arrow,
  // fill and all surrounding package content in the strict page comparison.
  assert.equal(match.replace(/href="[^"]*"/,'href="DESTINATION"').replace(/\s+(?:target|rel)="[^"]*"/g,''),
   (prefix+old[count]).replace(/href="[^"]*"/,'href="DESTINATION"').replace(/\s+(?:target|rel)="[^"]*"/g,''),'SEO order control attributes stay unchanged');
  return prefix+old[count++];
 });
 assert.equal(count,4,'Exactly four SEO package order controls');assert.equal(old.length,4);
 return restored;
}
function restoreSEOIcons(page,before){
 const pattern=/<svg\b[^>]*class="seo-owner-icon"[^>]*>[\s\S]*?<\/svg>/g;
 const old=[...before.matchAll(pattern)].map(m=>m[0]),keys=['paper-plus','work','buy','category','setting','location'];
 let count=0;
 const restored=page.replace(pattern,svg=>{
  const key=keys[count],asset=fs.readFileSync(path.join(ROOT,'assets/icons/iconly',key+'.svg'),'utf8');
  const drawing=asset.match(/^<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/)?.[1];assert.ok(drawing,'Standalone local Iconly asset '+key);
  const expected='<svg xmlns="http://www.w3.org/2000/svg" class="seo-owner-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-iconly="'+key+'" fill="none">'+drawing+'</svg>';
  assert.equal(svg,expected,'SEO audience uses its canonical local Iconly drawing '+key);
  return old[count++];
 });
 assert.equal(count,6,'Exactly six SEO audience Iconly replacements');assert.equal(old.length,6);
 return restored;
}
function restoreBrandFollowup(block,id){
 assert.ok(block,'Requested brand section exists '+id);
 block=block.replace(' brand-owner-'+({'section-7':'process','section-8':'outcomes','section-9':'investment'}[id]),'');
 if(id==='section-7'){
  let waves=0;
  block=block.replace(/<div class="brand-owner-wave brand-owner-wave--(?:top|bottom)" aria-hidden="true">[\s\S]*?<\/svg><\/div>/g,()=>{waves++;return '';});
  assert.equal(waves,2,'Process receives its two native wave boundaries');
  assert.equal((block.match(/data-about-step data-reveal-scope="brand"/g)||[]).length,7);
  return block.replace(/<li>/g,'<li data-rf-reveal>').replace(/ data-about-step data-reveal-scope="brand"/g,'');
 }
 if(id==='section-8'){
  let pictures=0;
  block=block.replace(/<picture class="brand-owner-outcome-media">[\s\S]*?<\/picture>/g,()=>{pictures++;return '';});
  assert.equal(pictures,6,'Exactly six illustrated outcomes');
  return block.replace(/class="rf-card brand-owner-outcome-card"/g,'class="rf-card"');
 }
 let buttons=0;
 block=block.replace(/<div class="btn btn-normal brand-owner-cta brand-owner-cta--primary">(<a\b[\s\S]*?<\/a>)<\/div>/g,(_,anchor)=>{
  buttons++;
  return anchor.replace('class="btn-click magnetic"','class="rf-button magnetic"').replace('<div class="btn-fill"></div>','').replace(/<svg class="service-card-arrow"[\s\S]*?<\/svg>/,'');
 });
 assert.equal(buttons,1,'Investment adopts one native CTA');
 return block;
}

function scopeCheck(){
 const changed=cp.execFileSync('git',['diff','--name-only',BASE],{cwd:ROOT,encoding:'utf8'}).trim().split('\n');
 const owned=new Set(['ar/services/brand-identity/index.html','services/brand-identity/index.html']);
 for(const file of changed.filter(s=>s.endsWith('.html')&&!owned.has(s))){
  const old=cp.execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8'});
  let after=fs.readFileSync(path.join(ROOT,file),'utf8');
  if(/(?:^|\/)services\/seo-riyadh\/index\.html$/.test(file))after=restoreSEOIcons(restoreSEOOrders(after,old),old);
  assert.equal(unstamped(after),unstamped(old),'No unrelated page mutation: '+file);
 }
 for(const lang of ['ar','en']){
  const file=route(lang).slice(1)+'index.html';
  const before=cp.execFileSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8'});
  const after=fs.readFileSync(path.join(ROOT,file),'utf8');
  for(const id of ['section-7','section-8','section-9'])assert.equal(restoreBrandFollowup(section(after,id),id),section(before,id),'Only requested section markup changes '+lang+' '+id);
  assert.equal(section(after,'faq'),section(before,'faq'),'Brand FAQ stays unchanged '+lang);
 }
 console.log('PASS requested brand/SEO scope and protected section content');
}

async function go(page,origin,lang){
 await page.goto(origin+route(lang),{waitUntil:'networkidle'});
 await page.waitForFunction(()=>[...document.querySelectorAll('.loading-screen')].every(e=>e.getBoundingClientRect().bottom<=1),null,{timeout:25000});
 await page.waitForTimeout(500);await page.evaluate(()=>document.fonts.ready);
}
async function move(page,selector,offset=-140){
 await jump(page,page.locator(selector).first(),offset);
}
async function jump(page,locator,offset=-140){
 await locator.evaluate((e,offset)=>{
  // Offscreen Locomotive sections reset their CSS transform. An element jump
  // then depends on that transient transform; use its stable layout position
  // while still exercising the site's actual smooth-scroll API.
  let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;
  // The site's `scroll` is a lexical binding, not window.scroll (which stays
  // the browser's native function). Do not accidentally invoke native scroll.
  if(typeof scroll!=='undefined'&&scroll.scrollTo)scroll.scrollTo(top+offset,{duration:0,disableLerp:true});
  else e.scrollIntoView({behavior:'instant',block:'center'});
 },offset);
 await page.waitForTimeout(500);
}
async function clickVisibleSummary(page,summary){
 // Wait for the card's entrance animation, then press its visible on-screen
 // point as a visitor would. Locator.click may first scroll a transformed
 // ancestor, which invalidates a pre-click viewport-position measurement.
 await summary.evaluate(e=>Promise.all(e.closest('details').getAnimations().map(a=>a.finished.catch(()=>{}))));
 const before=await summary.boundingBox(),viewport=page.viewportSize();
 const x=before.x+before.width/2,y=before.y+before.height/2;
 assert.ok(x>=0&&x<viewport.width&&y>=0&&y<viewport.height,'Summary click point is visible');
 await page.mouse.click(x,y);
 return before;
}
async function copyCheck(page,lang){
 const row=lang==='ar'?9:8;
 const expected=source[row].paragraphs.map((p,i)=>({id:row+':'+i,text:clean(p.text),i})).filter(p=>p.i>=3&&!new Set([63,85,92,93,94]).has(p.i)&&p.text);
 const state=await page.evaluate(({expected,row})=>{
  const norm=s=>s.replace(/\s+/g,' ').trim(),main=document.querySelector('.rf-brand-owner');
  const records=[...main.querySelectorAll('[data-copy]')].map(e=>({id:e.dataset.copy,text:norm(e.textContent)}));
  const body=norm(main.textContent);
  return {
   badRecords:records.filter(e=>{const wanted=expected.find(p=>p.id===e.id);return wanted&&norm(wanted.text)!==e.text;}),
   missing:expected.filter(e=>!body.includes(norm(e.text))),
   duplicateIds:records.filter((e,i)=>records.findIndex(a=>a.id===e.id)!==i),
   removed:records.filter(e=>[63,92,93].map(i=>row+':'+i).includes(e.id))
  };
 },{expected,row});
 assert.deepEqual(state.badRecords,[],'Exact independent approved text per data-copy');
 assert.deepEqual(state.missing,[],'No missing independent source paragraph');
 assert.deepEqual(state.duplicateIds,[],'Copy provenance is unique');
 assert.deepEqual(state.removed,[],'Owner-removed headings are absent');
}
async function structure(page){
 assert.equal(await page.locator('.rf-brand-owner').count(),1);
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.locator('.rf-brand-owner #section-6,.rf-brand-owner #section-10,.rf-brand-owner #clients').count(),0,'Only requested removals');
 assert.equal(await page.locator('.brand-owner-pillars .brand-owner-wave').count(),2);
 assert.deepEqual((await page.locator('.brand-owner-pillar h3').allTextContents()).map(norm),['Brand Strategy','Visual Identity','Brand Guidelines']);
 assert.equal(await page.locator('.brand-owner-know-card').count(),7);
 assert.deepEqual(await page.locator('.brand-owner-know-card>.brand-owner-number').allTextContents(),['1','2','3','4','5','6','7']);
 assert.equal(await page.locator('.brand-owner-know').evaluate(e=>getComputedStyle(e).backgroundColor),ORANGE);
 assert.equal(await page.locator('.brand-owner-know-card').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgb(255, 253, 237)')),true);
 assert.equal(await page.locator('.brand-owner-know .brand-owner-cta--light .btn-fill').count(),1);
 assert.equal(await page.locator('.brand-owner-pillar,.brand-owner-know-card,.brand-owner-disclosure').evaluateAll(es=>es.every(e=>getComputedStyle(e).boxShadow!=='none')),true,'Depth is present even on touch screens');
 assert.equal(await page.locator('.brand-owner-disclosure').count(),9);
 assert.equal(await page.locator('.brand-owner-disclosure .brand-owner-summary>h3').count(),9);
 assert.equal(await page.locator('.brand-owner-disclosure .brand-owner-summary>.brand-owner-chevron').count(),9);
 assert.equal(await page.locator('.brand-owner-disclosure .brand-owner-answer>p[data-copy]').count(),9,'Every original deliverable body remains in DOM');
 assert.equal(await page.locator('.brand-owner-disclosure[open]').count(),1,'One initial open deliverable');
 assert.equal(await page.locator('.brand-owner-disclosure').first().evaluate(e=>e.open),true);
 assert.equal(await page.locator('.brand-owner-why .brand-owner-wave').count(),2);
 assert.equal(await page.locator('.brand-owner-why').evaluate(e=>getComputedStyle(e).backgroundColor),INK);
 assert.equal(await page.locator('.brand-owner-why .brand-owner-compact-card').count(),6);
 assert.equal(await page.locator('.brand-owner-why .brand-owner-compact-card').evaluateAll(es=>es.every(e=>getComputedStyle(e).backgroundColor==='rgb(255, 253, 237)')),true,'Why cards are cream against ink');
 assert.equal(await page.locator('.brand-owner-why h3').evaluateAll(es=>es.every(e=>Number(getComputedStyle(e).fontWeight)>=600)),true,'Why card headings are bold');
 assert.equal(await page.locator('.brand-owner-why p').evaluateAll(es=>es.every(e=>getComputedStyle(e).fontWeight==='400')),true,'Why card body is regular');
 assert.equal(await page.locator('.brand-owner-audience .brand-owner-compact-card').count(),6);
 assert.equal(await page.locator('.brand-owner-audience').evaluate(e=>getComputedStyle(e).backgroundColor),CREAM);
 assert.equal(await page.locator('.brand-owner-process').evaluate(e=>getComputedStyle(e).backgroundColor),ORANGE);
 assert.equal(await page.locator('.brand-owner-process .brand-owner-wave').count(),2);
 assert.equal(await page.locator('.brand-owner-process [data-about-step][data-reveal-scope="brand"]').count(),7);
 assert.equal(await page.locator('.brand-owner-process .rf-timeline [data-rf-reveal]').count(),0,'Process cards have one native reveal controller');
 assert.equal(await page.locator('.brand-owner-outcomes .brand-owner-outcome-card').count(),6);
 assert.equal(await page.locator('.brand-owner-investment .brand-owner-cta').count(),1);
 assert.equal(await page.locator('.brand-owner-investment .btn-click').getAttribute('href'),(await page.locator('.rf-preserved-hero-lead .btn-click').nth(1).getAttribute('href')),'Investment keeps approved portfolio destination');
 for(const [selector,count] of [['.brand-owner-pillars',3],['.brand-owner-deliverables',9],['.brand-owner-audience',6]]){
  assert.equal(await page.locator(selector+' .brand-owner-symbol').count(),count);
  assert.equal(await page.locator(selector+' .brand-owner-symbol[data-iconly]').count(),count,'Functional brand symbols use local Iconly '+selector);
 }
 assert.equal(await page.locator('.brand-owner-symbol').evaluateAll(es=>es.every(e=>e.getAttribute('viewBox')==='0 0 24 24'&&e.getAttribute('aria-hidden')==='true'&&e.getAttribute('focusable')==='false'&&e.querySelector('path,circle,rect,ellipse,line,polyline,polygon'))),true,'Brand Iconly symbols use accessible canonical SVGs');
 assert.equal(await page.locator('.service-card-arrow[data-iconly],.brand-owner-chevron[data-iconly]').count(),0,'Adopted arrows and chevrons remain unchanged');
}
async function colors(locator){
 return locator.evaluate(e=>{
  const s=e.querySelector('.service-card-arrow'),st=getComputedStyle(s),r=s.getBoundingClientRect(),fill=e.querySelector('.btn-fill');
  return {text:getComputedStyle(e.querySelector('.btn-text-inner')).color,stroke:st.stroke,svgFill:st.fill,arrowTransform:st.transform,arrowWidth:r.width,arrowHeight:r.height,path:s.querySelector('path').getAttribute('d'),fillTransform:getComputedStyle(fill).transform,fillColor:getComputedStyle(fill).backgroundColor,base:getComputedStyle(e).backgroundColor,hasDuplicateArrow:getComputedStyle(e.querySelector('.btn-text'),'::after').content};
 });
}
async function buttons(page,lang,width){
 const buttons=page.locator('.brand-owner-cta .btn-click');
 assert.equal(await buttons.count(),5,'Two hero CTAs, pain-point, audience and investment CTAs');
 for(let i=0;i<5;i++){
  const b=buttons.nth(i);await jump(page,b,-180);await page.mouse.move(0,0);await page.waitForTimeout(250);
  assert.equal(await b.getAttribute('data-strength'),'20');assert.equal(await b.getAttribute('data-strength-text'),'10');assert.equal(await b.locator('.btn-fill').count(),1);
  const base=await colors(b);
  assert.equal(base.text,base.stroke,'Resting text and arrow colors');assert.equal(base.svgFill,'none');assert.equal(base.path,'M7 17 17 7M9 7h8v8');
  assert.ok(base.arrowWidth>=20&&base.arrowWidth<=26&&base.arrowHeight<=26,'Approved arrow has sensible dimensions');
  assert.equal(base.arrowTransform,lang==='ar'?'matrix(-1, 0, 0, 1, 0, 0)':'none','Direction matches language');
  assert.ok(['none','normal'].includes(base.hasDuplicateArrow),'No duplicate automatic pseudo-arrow');
  assert.equal(base.text,i===4?INK:(i===0||i===3?CREAM:ORANGE),'Coherent resting contrast');
  if(width===1440){
   await b.hover();await page.waitForTimeout(700);const hovered=await colors(b);
   assert.equal(hovered.text,hovered.stroke,'Hover arrow follows text');assert.equal(hovered.text,i===4?INK:CREAM);
   assert.equal(hovered.fillTransform,'matrix(1, 0, 0, 1, 0, 0)','Native hover fill reaches end state');
   assert.equal(hovered.fillColor,i===4?CREAM:(i===1?ORANGE:INK),'Approved fill background');
   await page.mouse.move(0,0);await page.waitForTimeout(500);
  }
  await page.keyboard.press('Tab');await b.focus();await page.waitForTimeout(450);const focused=await colors(b);
  assert.equal(focused.text,focused.stroke,'Keyboard-focus arrow follows text');assert.equal(focused.text,i===4?INK:CREAM);
  assert.equal(focused.fillTransform,'matrix(1, 0, 0, 1, 0, 0)','Keyboard focus has a contrasting native fill');
  await b.evaluate(e=>e.blur());
 }
}
async function processReveals(page){
 const cards=page.locator('.brand-owner-process [data-about-step]');
 for(let i=0;i<7;i++)await jump(page,cards.nth(i),-180);
 await page.waitForTimeout(1000);
 const reveals=await page.evaluate(()=>window.__brandReveals);
 assert.deepEqual(reveals.map(r=>r.index),[1,2,3,4,5,6,7],'Process reveals follow the seven approved steps');
 for(let i=1;i<reveals.length;i++)assert.ok(reveals[i].start>=reveals[i-1].start+190,'Process entrances start sequentially');
 assert.equal(await cards.evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1'&&e.dataset.aboutRevealed==='true'&&e.dataset.aboutRevealCount==='1')),true,'Every revealed step remains readable');
 await move(page,'.rf-preserved-hero-lead');await move(page,'.brand-owner-process');
 await page.evaluate(()=>{ScrollTrigger.refresh();initEditorialRefresh();});await page.waitForTimeout(900);
 assert.deepEqual(await page.evaluate(()=>window.__brandReveals),reveals,'Return and reinitialization do not replay process entrances');
}
async function illustratedOutcomes(page,width){
 const pictures=page.locator('.brand-owner-outcome-media');
 assert.equal(await pictures.count(),6);
 for(let i=0;i<benefits.length;i++){
  const picture=pictures.nth(i),base='/assets/images/brand-benefits/'+benefits[i];
  assert.equal(await picture.locator('source').count(),2,'AVIF and WebP sources');
  for(const [index,fmt] of ['avif','webp'].entries()){
   const source=picture.locator('source').nth(index);
   assert.equal(await source.getAttribute('type'),'image/'+fmt);
   assert.equal(await source.getAttribute('srcset'),[480,800,1440].map(w=>base+'-'+w+'.'+fmt+' '+w+'w').join(', '));
   assert.ok((await source.getAttribute('sizes')).includes('vw'),'Responsive source sizing');
   for(const w of [480,800,1440])assert.ok(fs.existsSync(path.join(ROOT,base+'-'+w+'.'+fmt)),'Local responsive benefit asset '+base+' '+w+' '+fmt);
  }
  const img=picture.locator('img');
  assert.equal(await img.getAttribute('src'),base+'.jpg');
  assert.equal(await img.getAttribute('width'),'1440');assert.equal(await img.getAttribute('height'),'1024');
  assert.equal(await img.getAttribute('loading'),'lazy');assert.equal(await img.getAttribute('decoding'),'async');
  await jump(page,picture,-180);await img.evaluate(e=>e.decode());
  const state=await img.evaluate(e=>{
   const rect=e.getBoundingClientRect(),style=getComputedStyle(e);
   return {complete:e.complete,width:e.naturalWidth,height:e.naturalHeight,currentSrc:e.currentSrc,fit:style.objectFit,position:style.objectPosition,frame:rect.width/rect.height};
  });
  assert.ok(state.complete&&state.width>0&&state.height>0,'Benefit image decodes successfully');
  assert.ok(state.currentSrc.includes(base+'-'),'Browser selects a responsive local benefit source');
  assert.equal(state.fit,'contain','The complete supplied image frame is visible');assert.equal(state.position,'50% 50%');
  assert.ok(Math.abs(state.width/state.height-1440/1024)<.006,'Responsive asset retains the supplied full-frame ratio');
  assert.ok(Math.abs(state.frame-1440/1024)<.006,'Rendered benefit frame retains its ratio');
 }
 const cols=await page.locator('.brand-owner-outcomes .rf-card-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
 assert.equal(cols,width<=760?1:width<=1100?2:3,'Benefit cards adapt to viewport width');
}
async function pillarCorners(page,width){
 if(width!==1440)return;
 const pillar=page.locator('.brand-owner-pillar').first();await jump(page,pillar,-180);await page.mouse.move(0,0);await page.waitForTimeout(500);
 const ring=()=>pillar.evaluate(e=>{const s=getComputedStyle(e,'::before');return {base:s.backgroundColor,border:s.borderColor,shadow:s.boxShadow};});
 const before=await ring();await pillar.hover();await page.waitForTimeout(600);const hovered=await ring();
 assert.notEqual(hovered.base,before.base);assert.equal(hovered.base,ORANGE);assert.equal(hovered.border,ORANGE);
 assert.ok(hovered.shadow.includes('249, 70, 14')&&hovered.shadow.includes('24px')&&hovered.shadow.includes('49px'),'Orange hover keeps both graduated corner rings');
 await page.mouse.move(0,0);await page.waitForTimeout(500);
}
async function compactDisclosures(page,width,height){
 const compact=width<=760||(width<=1100&&height>=width);
 for(const section of ['.brand-owner-why','.brand-owner-audience']){
  const group=page.locator(section+' [data-brand-compact]'),cards=group.locator('details.brand-owner-compact-card');
  assert.equal(await cards.count(),6);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),compact?1:6,'Correct responsive disclosure mode '+section);
  assert.equal(await cards.first().locator('summary .brand-owner-chevron').isVisible(),compact);
  if(!compact)continue;
  const last=cards.last();await jump(page,last,-170);const before=await clickVisibleSummary(page,last.locator('summary'));await page.waitForTimeout(450);const after=await last.locator('summary').boundingBox();
  assert.ok(Math.abs(after.y-before.y)<=4,'Compact accordion keeps clicked summary anchored '+section);
  assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1);assert.equal(await last.evaluate(e=>e.open),true);assert.equal(await cards.first().evaluate(e=>e.open),false);
  await jump(page,cards.first(),-170);await cards.first().locator('summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(350);
  assert.equal(await cards.first().evaluate(e=>e.open),true);assert.equal(await last.evaluate(e=>e.open),false);
 }
 if(width===834){
  await page.setViewportSize({width:1194,height:834});await page.waitForTimeout(500);
  for(const section of ['.brand-owner-why','.brand-owner-audience'])assert.equal(await page.locator(section+' .brand-owner-compact-card[open]').count(),6,'Landscape opens all cards');
  assert.equal(await page.locator('.brand-owner-disclosure[open]').count(),1,'Included disclosures remain single-open at all sizes');
  await page.setViewportSize({width,height});await page.waitForTimeout(500);
  for(const section of ['.brand-owner-why','.brand-owner-audience'])assert.equal(await page.locator(section+' .brand-owner-compact-card[open]').count(),1,'Portrait restores single-open mode');
 }
}
async function disclosures(page){
 const cards=page.locator('[data-brand-disclosures]>.brand-owner-disclosure'),last=cards.nth(8),first=cards.first();
 await move(page,'.brand-owner-disclosure:nth-child(9)');
 let before;
 try{before=await clickVisibleSummary(page,last.locator('summary'));}
 catch(e){
  console.error('Brand disclosure click geometry',await last.locator('summary').evaluate(e=>{const r=e.getBoundingClientRect();return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollY,pageYOffset,loco:scroll.scroll.instance.scroll,delta:scroll.scroll.instance.delta,section:e.closest('[data-scroll-section]').style.cssText};}),'before',before);
  await page.screenshot({path:path.join(reports,'brand-owner-failed-click.png')});throw e;
 }
 await page.waitForTimeout(450);
 const after=await last.locator('summary').boundingBox();
 if(Math.abs(after.y-before.y)>4){
  console.error('Brand anchor failure',await last.evaluate(e=>({viewport:[innerWidth,innerHeight],native:!document.documentElement.classList.contains('has-scroll-smooth'),scrollY,pageYOffset,loco:scroll.scroll.instance.scroll,delta:scroll.scroll.instance.delta,open:e.open,cardTop:e.getBoundingClientRect().top,scrollTo:scroll.scroll.scrollTo.toString()})),{before,after});
  await page.screenshot({path:path.join(reports,'brand-owner-failed-anchor.png')});
 }
 assert.ok(Math.abs(after.y-before.y)<=4,'Opening a later card preserves its summary position: '+before.y+' → '+after.y);
 assert.equal(await cards.locator('.brand-owner-answer').count(),9);
 assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),1);
 assert.equal(await last.evaluate(e=>e.open),true);assert.equal(await first.evaluate(e=>e.open),false);
 assert.equal(await last.locator('.brand-owner-answer').isVisible(),true);assert.equal(await first.locator('.brand-owner-answer').isVisible(),false);
 await move(page,'.brand-owner-disclosure:first-child');await first.locator('summary').focus();await page.keyboard.press('Enter');await page.waitForTimeout(400);
 assert.equal(await first.evaluate(e=>e.open),true);assert.equal(await last.evaluate(e=>e.open),false,'Keyboard opens only chosen card');
 const beforeSpace=await first.locator('summary').boundingBox();
 await page.keyboard.press('Space');await page.waitForTimeout(450);assert.equal(await cards.evaluateAll(es=>es.filter(e=>e.open).length),0,'An expanded card can be closed');
 const afterSpace=await first.locator('summary').boundingBox();
 assert.ok(Math.abs(afterSpace.y-beforeSpace.y)<=4,'Space activates the disclosure without scrolling the whole page');
 await page.keyboard.press('Enter');await page.waitForTimeout(350);assert.equal(await first.evaluate(e=>e.open),true);
 assert.equal(await first.locator('summary').evaluate(e=>getComputedStyle(e).outlineStyle),'solid','Visible keyboard focus');
 await page.evaluate(()=>initEditorialRefresh());await page.waitForTimeout(300);
 await first.locator('summary').click();await page.waitForTimeout(300);assert.equal(await first.evaluate(e=>e.open),false,'Reinitialization does not accumulate click handlers');
 await first.locator('summary').click();await page.waitForTimeout(350);assert.equal(await first.evaluate(e=>e.open),true);
}
async function waves(page,lang,width){
 const joints=[['.brand-owner-pillars','top',[255,253,243]],['.brand-owner-pillars','bottom',[249,70,14]],['.brand-owner-know','bottom',[255,253,237]],['.brand-owner-why','top',[255,253,237]],['.brand-owner-why','bottom',[255,253,237]],['.brand-owner-process','top',[255,253,237]],['.brand-owner-process','bottom',[255,253,237]]];
 for(const [selector,edge,rgb] of joints){
  const wave=selector+' .brand-owner-wave--'+edge;
  await page.evaluate(({selector,edge})=>{
   const e=document.querySelector(selector),offset=edge==='top'?-230:-(innerHeight-160)+e.offsetHeight;
   let top=0;for(let n=e;n;n=n.offsetParent)top+=n.offsetTop;
   scroll.scrollTo(top+offset,{duration:0,disableLerp:true});
  },{selector,edge});await page.waitForTimeout(500);
  const geometry=await page.locator(wave).evaluate(e=>{
   const s=getComputedStyle(e.parentNode),r=e.parentNode.getBoundingClientRect(),svg=e.querySelector('svg');
   return {seam:e.classList.contains('brand-owner-wave--top')?r.top:r.bottom,overflow:getComputedStyle(svg).overflow,borders:parseFloat(s.borderTopWidth)+parseFloat(s.borderBottomWidth),width:e.getBoundingClientRect().width,viewport:innerWidth};
  });
  assert.equal(geometry.borders,0,'No straight divider border');assert.equal(geometry.overflow,'hidden','Clipped SVG avoids edge overflow');assert.ok(geometry.width>=geometry.viewport,'Wave covers viewport');
  const png=await page.screenshot({path:path.join(reports,`brand-owner-wave-${selector.slice(1)}-${edge}-${lang}-${width}.png`)});
  const {data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.ok(geometry.seam>=4&&geometry.seam<info.height-4,'Wave seam test is in viewport');
  for(const x of [5,Math.floor(info.width/2),info.width-5])for(let y=Math.floor(geometry.seam)-1;y<=Math.floor(geometry.seam)+1;y++){
   const i=(y*info.width+x)*info.channels;
   assert.deepEqual([...data.subarray(i,i+3)],rgb,`No wave hairline at ${selector} ${edge}: ${x},${y}`);
  }
 }
}
async function overviews(page,lang,width){
 for(const [selector,label] of [['.rf-preserved-hero-lead','hero-cta'],['.brand-owner-pillars','pillars'],['.brand-owner-know','know'],['.brand-owner-deliverables','deliverables'],['.brand-owner-why','why'],['.brand-owner-audience','audience'],['.brand-owner-process','process'],['.brand-owner-outcomes','outcomes'],['.brand-owner-investment','investment']]){
  await move(page,selector,-70);await page.waitForTimeout(450);
  await page.screenshot({path:path.join(reports,`brand-owner-overview-${label}-${lang}-${width}.png`)});
 }
}
async function runViewport(browser,origin,lang,width,height){
 const ctx=await browser.newContext({viewport:{width,height},hasTouch:width<1100});await isolate(ctx,origin);
 const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  window.__brandReveals=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('[data-reveal-scope="brand"]'))window.__brandReveals.push({index:[...document.querySelectorAll('[data-reveal-scope="brand"]')].indexOf(this)+1,start:performance.now()+(options.delay||0)});
   return animate.call(this,frames,options);
  };
 });
 try{
  await go(p,origin,lang);await copyCheck(p,lang);await structure(p);await processReveals(p);await buttons(p,lang,width);await pillarCorners(p,width);await illustratedOutcomes(p,width);await disclosures(p);await compactDisclosures(p,width,height);
  if(width===375||width===834||width===1440){await waves(p,lang,width);await overviews(p,lang,width);}
  await move(p,'.brand-owner-deliverables');await p.screenshot({path:path.join(reports,`brand-owner-deliverables-${lang}-${width}.png`)});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'No page horizontal overflow');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS brand identity owner',lang,width,height);
 }finally{await ctx.close();}
}
async function fallbacks(browser,origin,lang){
 const reduced=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});await isolate(reduced,origin);const p=await reduced.newPage();
 await p.addInitScript(()=>{
  window.__brandReveals=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){if(this.matches('[data-reveal-scope="brand"]'))window.__brandReveals.push(true);return animate.call(this,frames,options);};
 });
 await go(p,origin,lang);await move(p,'.brand-owner-deliverables');await p.locator('.brand-owner-disclosure:nth-child(2)>summary').click();await p.waitForTimeout(100);
 assert.equal(await p.locator('.brand-owner-disclosure:nth-child(2) .brand-owner-answer').evaluate(e=>e.getAnimations().filter(a=>a.playState==='running').length),0,'Reduced motion does not animate answers');
 assert.equal(await p.locator('[data-reveal-scope="brand"]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true,'Reduced motion keeps all process copy visible');assert.deepEqual(await p.evaluate(()=>window.__brandReveals),[],'Reduced motion skips process entrance animation');await reduced.close();
 const noJS=await browser.newContext({viewport:{width:375,height:812},javaScriptEnabled:false});await isolate(noJS,origin);const fallback=await noJS.newPage();await fallback.goto(origin+route(lang));
 await copyCheck(fallback,lang);assert.equal(await fallback.locator('.brand-owner-disclosure[open]').count(),1);
 assert.equal(await fallback.locator('[data-reveal-scope="brand"]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true,'No-JS process steps remain visible');
 for(const section of ['.brand-owner-why','.brand-owner-audience'])assert.equal(await fallback.locator(section+' .brand-owner-compact-card[open]').count(),6,'No-JS fallback exposes all responsive card copy');
 const last=fallback.locator('.brand-owner-disclosure').last();await last.locator('summary').evaluate(e=>e.scrollIntoView({behavior:'instant',block:'center'}));await last.locator('summary').click();
 assert.equal(await last.evaluate(e=>e.open),true);assert.equal(await fallback.locator('.brand-owner-disclosure[open]').count(),1,'Native name group also works without JS');assert.equal(await last.locator('.brand-owner-answer').isVisible(),true);await noJS.close();
 console.log('PASS reduced motion and native no-JS disclosure',lang);
}

(async()=>{
 scopeCheck();fs.mkdirSync(reports,{recursive:true});const {srv,origin}=await serve(),browser=await chromium.launch();
 try{
  // Independent contexts overlap only read-only local requests.
  const langs=process.env.BRAND_QA_LANG?[process.env.BRAND_QA_LANG]:['ar','en'];
  const selected=process.env.BRAND_QA_WIDTH?screens.filter(([w])=>w===Number(process.env.BRAND_QA_WIDTH)):screens;
  const tasks=langs.flatMap(lang=>selected.map(([w,h])=>()=>runViewport(browser,origin,lang,w,h)));
  let next=0;await Promise.all([0,1].map(async()=>{while(next<tasks.length)await tasks[next++]();}));
  if(!process.env.BRAND_QA_WIDTH)for(const lang of langs)await fallbacks(browser,origin,lang);
 }finally{await browser.close();srv.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
