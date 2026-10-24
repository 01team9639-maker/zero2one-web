// Preserve supplied clipboard images before their temporary directory expires.
// Full-frame responsive compression only: no cropping, recolouring or AI edits.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('/Users/mohammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.dirname(__dirname),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pairs=[
 ['email-marketing','email','/var/folders/8_/5_y4wspx02q2c931shz3ywkc0000gn/T/codex-clipboard-5c6e5126-4229-4dc7-90e3-82c9d3b57a45.png'],
 ['conversion-rate-optimization','cro','/var/folders/8_/5_y4wspx02q2c931shz3ywkc0000gn/T/codex-clipboard-a3c45cf7-29cd-4bf3-a218-88ed14367adc.png']
];
(async()=>{
 const archive=path.join(ROOT,'tools/refresh/image-archives/deferred-hero-2026-10-24'),dest=path.join(ROOT,'assets/images/owner-services-2026-10');
 fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(dest,{recursive:true});const manifest={};
 for(const [slug,key,original] of pairs){
  const saved=path.join(archive,key+'.png'),input=fs.readFileSync(fs.existsSync(original)?original:saved),meta=await sharp(input).metadata();
  if(meta.width!==1536||meta.height!==1024)throw Error('Unexpected supplied photo dimensions');
  if(fs.existsSync(saved)&&sha(fs.readFileSync(saved))!==sha(input))throw Error('Archive conflict');
  if(!fs.existsSync(saved))fs.copyFileSync(original,saved);
  const outputs=[];
  for(const width of [480,800,1440]){
   const output=path.join(dest,key+'-hero-2026-10-24-'+width+'.webp');
   await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:87,effort:5}).toFile(output);
   const bytes=fs.readFileSync(output),m=await sharp(bytes).metadata();
   outputs.push({url:'/assets/images/owner-services-2026-10/'+path.basename(output),width:m.width,height:m.height,bytes:bytes.length,sha256:sha(bytes)});
  }
  manifest[slug]={source:saved,originalSource:original,sourceSha256:sha(input),width:meta.width,height:meta.height,outputs};
 }
 fs.writeFileSync(path.join(ROOT,'tools/refresh/deferred-hero-photos-2026-10-24.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Archived 2 intact supplied photos and prepared 6 responsive hero/card assets.');
})().catch(e=>{console.error(e);process.exitCode=1;});
