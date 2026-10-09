// Owner-supplied photography: format/size optimization only, no visual edits.
// Source JPEGs are read-only; names also establish the service mapping.
const sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const source='/Users/mohammad/Downloads/service-images';
const dest=path.resolve(__dirname,'../assets/images/owner-services-2026-10');
const images={
 'ecommerce-development':'01-custom-ecommerce-systems.jpg',
 'social-media-management':'02-social-media-content.jpg',
 'brand-identity':'03-brand-identity.jpg',
 'manage-google-adwords-campaigns':'04-google-ads.jpg',
 'mobile-application':'05-mobile-app-development.jpg',
 'marketing-consulting':'06-marketing-consulting-plan.jpg'
};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(dest,{recursive:true});const provenance=[];
 for(const [slug,file] of Object.entries(images)){
  const input=path.join(source,file),original=fs.readFileSync(input),metadata=await sharp(original).metadata(),outputs=[];
  for(const width of [480,800,1440]){
   const filename=`${slug}-${width}.webp`,output=path.join(dest,filename);
   await sharp(original).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(output);
   const b=fs.readFileSync(output),m=await sharp(b).metadata();
   outputs.push({file:filename,width:m.width,height:m.height,bytes:b.length,sha256:sha(b)});
  }
  if(sha(fs.readFileSync(input))!==sha(original))throw new Error('Original changed: '+input);
  provenance.push({service:slug,original:input,sha256:sha(original),width:metadata.width,height:metadata.height,outputs});
  console.log(slug,outputs.map(x=>`${x.width}px ${Math.round(x.bytes/1024)}KB`).join(' / '));
 }
 fs.writeFileSync(path.join(dest,'remaining-provenance.json'),JSON.stringify(provenance,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
