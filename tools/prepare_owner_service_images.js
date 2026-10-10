// Preserve the owner's originals; create optimized copies only.
const sharp=require('sharp'),fs=require('fs'),path=require('path');
const source='/Users/mohammad/Downloads/111';
const dest=path.resolve(__dirname,'../assets/images/owner-services-2026-10');
const images={'web':'ويب.jpg','seo':'سيو.jpg','ads':'ads.jpg','seo-ai':'seo with ai.jpg','seo-ecommerce':'تحسين محركات البحث للمتاجر الالكترونية.jpg','seo-local':'تحسين محركات البحث المحلي.jpg','content-writing':'كتابة المحتوى.jpg'};
(async()=>{fs.mkdirSync(dest,{recursive:true});for(const [name,file] of Object.entries(images)){await sharp(path.join(source,file)).rotate().resize({width:1440,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(dest,name+'.webp'));console.log(name,file);} })().catch(e=>{console.error(e);process.exitCode=1;});
