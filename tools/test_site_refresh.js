/* Local-only browser verification. Production tracking and contact blocked. */
const { chromium } = require('playwright');
const { serve, isolate, ROOT } = require('./test_support');
const fs = require('fs');
const path = require('path');
async function main() {
  const out=path.join(ROOT,'tools/reports/site-refresh'); fs.mkdirSync(out,{recursive:true});
  const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/copy-manifest.json')));
  const {srv,origin}=await serve(); const browser=await chromium.launch({headless:true});
  const slugs=['web-design-riyadh','brand-identity','digital-advertising','manage-google-adwords-campaigns','social-media-management','ecommerce-development','mobile-application','marketing-consulting'];
  const paths=['/','/services/','/team/','/faqs/','/about/','/services/seo-riyadh/',...slugs.map(s=>'/services/'+s+'/')];
  const results=[]; const failures=[];
  try {
    for (const mobile of [false,true]) {
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
      const network=await isolate(context,origin);
      const page=await context.newPage(); let errors=[]; page.on('pageerror',e=>errors.push(e.message));
      for (const lang of ['en','ar']) for (const p of paths) {
        errors=[]; const route=(lang==='ar'?'/ar':'')+p;
        await page.goto(origin+route,{waitUntil:'networkidle'});
        await page.waitForFunction(()=>getComputedStyle(document.documentElement).cursor!=='wait'&&[...document.querySelectorAll('.loading-screen')].every(el=>el.getBoundingClientRect().bottom<=1),null,{timeout:20000});
        await page.waitForTimeout(600); await page.evaluate(()=>document.fonts.ready);
        const state=await page.evaluate(({manifest,route})=>{
          const norm=s=>s.replace(/\s+/g,' ').trim();
          const badCopy=[...document.querySelectorAll('[data-copy]')].filter(el=>norm(el.textContent)!==norm(manifest[el.dataset.copy]||'')).map(el=>({id:el.dataset.copy,got:el.textContent,expected:manifest[el.dataset.copy]}));
          const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
          const brokenRefs=[...document.querySelectorAll('[aria-labelledby]')].flatMap(e=>e.getAttribute('aria-labelledby').split(/\s+/).filter(id=>!document.getElementById(id)));
          const badHrefs=[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href')).filter(h=>h==='#'||h.includes('undefined'));
          return {route,title:document.title,h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,copyCount:document.querySelectorAll('[data-copy]').length,badCopy,brokenRefs,badHrefs,duplicateIds:ids.filter((id,i)=>ids.indexOf(id)!==i),overflow:document.documentElement.scrollWidth>innerWidth+2,canonical:document.querySelector('[rel=canonical]').href,faq:document.querySelectorAll('.rf-faq-item').length,links:[...document.querySelectorAll('a[href^="/"]')].map(e=>e.getAttribute('href')),images:[...document.images].map(e=>e.getAttribute('src'))};
        },{manifest,route});
        const broken=[];
        for(const link of [...state.links,...state.images]) {
          if(!link?.startsWith('/'))continue;
          let pathname=decodeURIComponent(link.split(/[?#]/)[0]); if(pathname.endsWith('/'))pathname+='index.html';
          if(!fs.existsSync(path.join(ROOT,pathname)))broken.push(link);
        }
        if(state.h1!==1||state.badCopy.length||state.brokenRefs.length||state.badHrefs.length||state.duplicateIds.length||state.overflow||broken.length||errors.length||state.canonical!=='https://zero2one.sa'+route) failures.push({mobile,...state,broken,errors:[...errors]});
        delete state.links;delete state.images;
        results.push({mobile,...state,broken,errors:[...errors]});
        if(p==='/'||p==='/services/web-design-riyadh/'||p==='/services/mobile-application/') {
          await page.screenshot({path:path.join(out,(mobile?'mobile':'desktop')+'-'+lang+'-'+(p==='/'?'home':p.split('/')[2])+'.png')});
        }
        console.log((mobile?'mobile':'desktop'),route,state.copyCount,'copy blocks',broken.length,'broken',errors.length,'errors');
      }
      console.log('Network isolated:',network.measurement.length,'measurement requests intercepted');
      await context.close();
    }
  } finally {await browser.close();srv.close();}
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({results,failures},null,2));
  console.log('RESULT',results.length,'pages/viewports;',failures.length,'failures');
  if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
