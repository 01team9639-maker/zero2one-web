/** Owner review only. Loopback-only static server; never deploys or runs PHP.
 * CSP blocks outbound tracking; forms and external contact links are disabled.
 * No production HTML, Google settings or original input files are modified.
 * Run: node tools/preview_refresh.js [port]
 */
const http=require('http'),fs=require('fs'),path=require('path');
const {execFileSync}=require('child_process');
const ROOT=path.resolve(__dirname,'..');
const rows=[
 ['/', 'الرئيسية'],['/about/','من نحن'],['/services/','فهرس الخدمات'],
 ['/services/seo-riyadh/','تحسين محركات البحث'],
 ['/services/web-design-riyadh/','تصميم المواقع'],['/services/brand-identity/','الهوية البصرية'],
 ['/services/digital-advertising/','إعلانات السوشيال ميديا'],
 ['/services/manage-google-adwords-campaigns/','إعلانات جوجل — جديدة'],
 ['/services/social-media-management/','إدارة السوشيال ميديا'],
 ['/services/ecommerce-development/','المتاجر الإلكترونية'],
 ['/services/mobile-application/','تطبيقات الجوال — جديدة'],
 ['/services/marketing-consulting/','الاستشارات التسويقية — جديدة'],
 ['/team/','الفريق — جديدة'],['/faqs/','الأسئلة الشائعة — جديدة'],['/work/','أعمالنا'],
 ...['habba','alostaz-seo','cosmetic-surgery-egypt-seo','orthopedic-clinic-egypt-seo','alhokail-seo','google-ads-conversion-value','alrahwanji-paints','kuwait-tutoring-instagram-ads'].map(s=>['/work/'+s+'/',s])
];
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.ttf':'font/ttf','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain'};
const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'self'";
const guard=`<script data-local-preview>document.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();alert('معاينة محلية فقط — إرسال النماذج معطّل.');},true);document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(a&&!a.href.startsWith(location.origin)&&!/^(#|javascript:)/.test(a.getAttribute('href'))){e.preventDefault();e.stopImmediatePropagation();alert('رابط خارجي — معطّل في المعاينة المحلية لحماية بيانات الاختبار.');}},true);</script>`;
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function review(){
 const cards=rows.map(([route,label])=>{
   const file=route==='/'?'index.html':route.slice(1)+'index.html';
   let commit='لم يُحفظ بعد';
   try {commit=execFileSync('git',['log','-1','--format=%h %s','--',file],{cwd:ROOT,encoding:'utf8'}).trim();}catch{}
   return `<article><h2>${escape(label)}</h2><p><a href="/ar${route}" target="_blank" rel="noopener">العربية ↗</a> <a href="${route}" target="_blank" rel="noopener">English ↗</a></p><code dir="ltr">${escape(commit)}</code></article>`;
 }).join('');
 return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Zero2One — مراجعة محلية</title><style>body{font:18px/1.8 system-ui;background:#faf7ef;color:#222;margin:auto;max-width:1200px;padding:30px}h1{font-size:34px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}article{padding:24px;background:white;border:1px solid #dfd9cf;border-radius:16px}h2{font-size:22px}a{color:#a52f05;margin-left:20px}code{font-size:12px;display:block;overflow-wrap:anywhere}aside{background:#fff0cd;padding:20px;border-radius:14px;margin:24px 0}</style><h1>مراجعة الصفحات — محلي فقط</h1><p>كل بطاقة تجمع النسختين العربية والإنجليزية. افتح الصفحة، جرّب الكمبيوتر والجوال، ثم أرسل اسم الصفحة التي توافق عليها. لا يوجد نشر تلقائي.</p><aside>النصوص محفوظة من ملفاتك. الأسعار وتفاصيل الباقات والمشاريع غير المحددة تنتظر اعتماداً. البريد الإلكتروني وCRO خارج النطاق. التتبع وإرسال النماذج والروابط الخارجية معطّلة هنا فقط؛ لا تغييرات على حسابات Google. الصفحات الجديدة تتطلب مراجعة روابط القائمة قبل نشر أي صفحة منفردة.</aside><main>${cards}</main></html>`;
}
const srv=http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',CSP);res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Local preview: submissions disabled');}
 let url;
 try{url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400);return res.end('Bad path');}
 if(url==='/__review/'||url==='/__review'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(review());}
 if(url.endsWith('/'))url+='index.html';
 const file=path.resolve(ROOT,'.'+url),ext=path.extname(file);
 if(!file.startsWith(ROOT+path.sep)||url.split('/').some(s=>s.startsWith('.'))||/^\/(tools|node_modules|webp)\//.test(url)||!MIME[ext]||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',MIME[ext]);
 if(req.method==='HEAD')return res.end();
 if(ext==='.html'){
  const content=fs.readFileSync(file,'utf8').replaceAll('https://zero2one.sa/assets/','/assets/').replace('</head>',guard+'</head>');
  return res.end(content);
 }
 fs.createReadStream(file).pipe(res);
});
srv.listen(Number(process.argv[2]||8766),'127.0.0.1',()=>console.log('Local review: http://127.0.0.1:'+srv.address().port+'/__review/'));
srv.on('error',e=>{console.error(e.message);process.exitCode=1;});
