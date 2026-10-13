// Bind the SEO-only transition stylesheet loader to the freshly compiled CSS.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.dirname(__dirname),file=path.join(root,'assets/js/index-new.js');
const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/css/seo-studio-review.min.css'))).digest('hex').slice(0,8);
const source=fs.readFileSync(file,'utf8'),pattern=/(?<=\/\/ BEGIN SEO STUDIO STYLESHEET\n)[\s\S]*?(?=\n\/\/ END SEO STUDIO STYLESHEET)/;
if(!pattern.test(source))throw Error('Missing SEO-only stylesheet loader boundary');
fs.writeFileSync(file,source.replace(pattern,"var seoStudioStylesheet='/assets/css/seo-studio-review.min.css?v="+hash+"';"));
