// Encode intact owner PNGs for service pages. No crop, trim or recolor.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..'),REPORT=path.join(ROOT,'tools/reports/site-refresh/owner-service-images-2026-10-18');
const DEST=path.join(ROOT,'assets/images/service-studio/owner-illustrations-2026-10');
const PLAN=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/refresh/owner-service-illustration-plan.json')));
const MANIFEST=path.join(ROOT,'tools/refresh/owner-service-illustrations.json');
const PREVIOUS=new Map(JSON.parse(fs.readFileSync(MANIFEST)).entries.map(e=>[e.id,e]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
sharp.concurrency(1);
async function contactSheets(){
 fs.mkdirSync(REPORT,{recursive:true});
 for(const service of [...new Set(PLAN.entries.map(e=>e.service))]){
  const entries=PLAN.entries.filter(e=>e.service===service),tiles=[];
  for(const entry of entries){
   const thumb=await sharp(entry.source).resize(185,185,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
   const label=Buffer.from(`<svg width="220" height="40"><text x="12" y="20" font-family="Arial" font-size="13">${entry.kind} / ${entry.number}</text></svg>`);
   tiles.push(await sharp({create:{width:220,height:225,channels:4,background:'#fffbed'}}).composite([{input:thumb,left:17,top:0},{input:label,left:0,top:185}]).png().toBuffer());
  }
  await sharp({create:{width:1320,height:225*Math.ceil(entries.length/6),channels:4,background:'#efefef'}}).composite(tiles.map((input,i)=>({input,left:(i%6)*220,top:Math.floor(i/6)*225}))).png().toFile(path.join(REPORT,service+'-sources.png'));
 }
 console.log('Source contact sheets ready.');
}
async function encode(entry){
 const input=fs.readFileSync(entry.source),meta=await sharp(input).metadata(),outputs=[];
 if(sha(input)!==entry.sourceSha256)throw Error('Source differs from approved mapping: '+entry.id);
 if(meta.width!==1254||meta.height!==1254||!meta.hasAlpha)throw Error('Unexpected source format: '+entry.id);
 const prior=PREVIOUS.get(entry.id);
 if(prior&&prior.sourceSha256===entry.sourceSha256&&prior.outputs.length===3&&prior.outputs.every((o,i)=>o.width===[320,640,960][i]&&fs.existsSync(path.join(ROOT,o.url))&&sha(fs.readFileSync(path.join(ROOT,o.url)))===o.sha256))return prior;
 for(const width of [320,640,960]){
  const filename=entry.id.replace(/\//g,'-')+'-'+width+'.webp',output=path.join(DEST,filename);
  await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:87,alphaQuality:100,effort:4}).toFile(output);
  const bytes=fs.readFileSync(output),m=await sharp(bytes).metadata();
  const expected=await sharp(input).resize({width}).extractChannel('alpha').raw().toBuffer();
  const actual=await sharp(bytes).extractChannel('alpha').raw().toBuffer();
  if(!expected.equals(actual))throw Error('Alpha changed: '+entry.id);
  outputs.push({url:'/assets/images/service-studio/owner-illustrations-2026-10/'+filename,width:m.width,height:m.height,bytes:bytes.length,sha256:sha(bytes)});
 }
 if(sha(fs.readFileSync(entry.source))!==entry.sourceSha256)throw Error('Original changed: '+entry.source);
 console.log('Prepared',entry.id);
 return {...entry,width:meta.width,height:meta.height,sourceBytes:input.length,outputs};
}
async function main(){
 await contactSheets();
 if(process.argv.includes('--contact-only'))return;
 fs.mkdirSync(DEST,{recursive:true});const entries=new Array(PLAN.entries.length);let cursor=0;
 await Promise.all([0,1,2,3].map(async()=>{while(cursor<PLAN.entries.length){const i=cursor++;entries[i]=await encode(PLAN.entries[i]);}}));
 fs.writeFileSync(MANIFEST,JSON.stringify({note:`${entries.length} owner-supplied transparent illustrations, full-frame responsive WebP with lossless alpha; original PNGs unchanged. Bilingual bindings preserve independent existing copy.`,entries,bindings:PLAN.bindings},null,2)+'\n');
 console.log(`Ready: ${entries.length} images, ${entries.length*3} responsive derivatives, ${PLAN.bindings.length} bilingual placements.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
