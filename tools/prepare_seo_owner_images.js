// Read-only owner originals; optimized copies and generated provenance only.
const sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const dest=path.resolve(__dirname,'../assets/images/seo/owner-review-2026-10');
const folder='/Users/mohammad/Downloads/2 4';
const temp='/var/folders/8_/5_y4wspx02q2c931shz3ywkc0000gn/T';
const images={
 strategy:path.join(folder,'عمل محتوى seo.jpg'),
 local:path.join(folder,'local seo.jpg'),
 technical:path.join(folder,'التدقيق التقني.jpg'),
 keywords:path.join(folder,'بحث كلمات مفتاحية.jpg'),
 content:path.join(folder,'كتابة المحتوى.jpg'),
 ai:path.join(folder,'seo with ai.jpg'),
 backlinks:path.join(folder,'بناء الورابط الخارجية.jpg'),
 ecommerce:path.join(folder,'تحسين محركات البحث للمتاجر الالكترونية.jpg'),
 reporting:path.join(folder,'التقرير والمتابعة.jpg'),
 'illustration-google-ar':path.join(temp,'codex-clipboard-2a3d2d17-d5a6-449a-8c22-5cae2074de3a.jpg'),
 'illustration-maps-ar':path.join(temp,'codex-clipboard-b99d67c9-91dc-4889-8122-43321fb856b4.jpg'),
 'illustration-chatgpt-ar':path.join(temp,'codex-clipboard-572c9dc3-0f91-45ea-b297-1b1bc26b2c7d.jpg')
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(path.join(dest,'originals'),{recursive:true});const provenance=[];
 for(const [name,input] of Object.entries(images)){
  const original=fs.readFileSync(input),metadata=await sharp(original).metadata(),outputs=[];
  const sizes=name.startsWith('illustration')?[640,1024]:[480,1200];
  for(const width of sizes){
   const file=`${name}-${width}.webp`,output=path.join(dest,file);
   await sharp(original).rotate().resize({width,withoutEnlargement:true}).webp({quality:86}).toFile(output);
   const bytes=fs.readFileSync(output),m=await sharp(bytes).metadata();
   outputs.push({file,width:m.width,height:m.height,bytes:bytes.length,sha256:sha(bytes)});
  }
  if(sha(fs.readFileSync(input))!==sha(original))throw Error('Original changed: '+input);
  const archived=path.join('originals',name+'.jpg');
  fs.copyFileSync(input,path.join(dest,archived));
  provenance.push({name,original:input,original_copy:archived,sha256:sha(original),width:metadata.width,height:metadata.height,outputs});
  console.log(name,outputs.map(x=>`${x.width}px ${Math.round(x.bytes/1024)}KB`).join(' / '));
 }
 fs.writeFileSync(path.join(dest,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
