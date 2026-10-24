// Owner PNGs only: full-frame resize/compression; never crop, trim or recolour.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('/Users/mohammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const ROOT=path.dirname(__dirname),SOURCE=process.argv[2];
if(!SOURCE)throw Error('Supply the owner illustration folder');
const EMAIL=process.argv.includes('--email'),SLUG=EMAIL?'email-marketing':'conversion-rate-optimization';
const KEY=EMAIL?'email':'cro',PREFIX=EMAIL?'10_email_marketing/':'09_cro/';
const REPORT=path.join(ROOT,`tools/reports/site-refresh/${KEY}-owner-images-2026-10-24`);
const DEST=path.join(ROOT,`assets/images/service-studio/${KEY}-owner-2026-10`);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const brief=JSON.parse(fs.readFileSync(path.join(SOURCE,'asset-manifest.json')));
const records=brief.records;
if(brief.expected_images!==38||records.length!==38||new Set(records.map(r=>r.id)).size!==38)throw Error('Unexpected source inventory');
async function main(){
 fs.mkdirSync(REPORT,{recursive:true});const prepared=[],tiles=[];
 for(const record of records){
  if(record.slug!==SLUG||!record.file.startsWith(PREFIX)||record.file.includes('..'))throw Error('Unexpected brief path');
  const relative=record.file.slice(PREFIX.length)+'.png',file=path.join(SOURCE,relative),input=fs.readFileSync(file),meta=await sharp(input).metadata();
  const parent=path.dirname(relative),kind=parent.split('_').slice(1).join('_'),number=Number(path.basename(relative).slice(0,2));
  if(meta.format!=='png'||!meta.hasAlpha)throw Error('Expected transparent owner PNG: '+relative);
  const stats=await sharp(input).stats();if(stats.channels[3].min!==0||stats.channels[3].max!==255)throw Error('Expected actual transparent and opaque areas: '+relative);
  const label=Buffer.from(`<svg width="220" height="42"><text x="10" y="20" font-family="Arial" font-size="13">${record.id}: ${kind}/${number}</text><text x="10" y="37" font-family="Arial" font-size="10">${meta.width} x ${meta.height}</text></svg>`);
  const thumb=await sharp(input).resize(200,175,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  tiles.push(await sharp({create:{width:220,height:225,channels:4,background:'#fffbed'}}).composite([{input:thumb,left:10,top:5},{input:label,left:0,top:183}]).png().toBuffer());
  prepared.push({id:SLUG+'/'+kind+'/'+String(number).padStart(2,'0'),briefId:record.id,kind,number,source:file,sourceSha256:sha(input),width:meta.width,height:meta.height,sourceBytes:input.length,arPosition:record.ar_position,enPosition:record.en_position,titles:{ar:record.title,en:record.title_en}});
 }
 await sharp({create:{width:1320,height:225*Math.ceil(tiles.length/6),channels:4,background:'#e9e7e1'}}).composite(tiles.map((input,i)=>({input,left:i%6*220,top:Math.floor(i/6)*225}))).png().toFile(path.join(REPORT,'source-contact-sheet.png'));
 console.log('Verified',prepared.length,'transparent owner PNGs. Source contact sheet ready.');
 if(process.argv.includes('--contact-only'))return;
 fs.mkdirSync(DEST,{recursive:true});const entries=[];
 for(const entry of prepared){
  const input=fs.readFileSync(entry.source),outputs=[];const widths=entry.kind==='hero'?[480,800,1440]:[320,640,960];
  for(const width of widths){
   const output=path.join(DEST,entry.kind+'-'+String(entry.number).padStart(2,'0')+'-'+width+'.webp');
   await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:87,alphaQuality:100,effort:4}).toFile(output);
   const bytes=fs.readFileSync(output),meta=await sharp(bytes).metadata();
   const alphaBefore=await sharp(input).resize({width,withoutEnlargement:true}).extractChannel('alpha').raw().toBuffer();
   const alphaAfter=await sharp(bytes).extractChannel('alpha').raw().toBuffer();
   if(!alphaBefore.equals(alphaAfter))throw Error('Transparency changed: '+entry.id);
   outputs.push({url:`/assets/images/service-studio/${KEY}-owner-2026-10/`+path.basename(output),width:meta.width,height:meta.height,bytes:bytes.length,sha256:sha(bytes)});
  }
  if(sha(fs.readFileSync(entry.source))!==entry.sourceSha256)throw Error('Original changed');
  entries.push({...entry,outputs});
 }
 const bindings=[];
 for(const entry of entries.filter(e=>e.kind!=='hero'))for(const lang of ['ar','en'])bindings.push({lang,kind:entry.kind,position:entry[lang+'Position'],title:entry.titles[lang],image:entry.id});
 const note=EMAIL?'38 supplied Email Marketing illustrations. Full-frame WebP with lossless alpha, no source edits. Exact bilingual semantic bindings. Hero reused in home and catalogue.':'38 supplied CRO illustrations; folders 09_cro and 09_cro 2 were byte-identical. Full-frame WebP with lossless alpha, no source edits. Semantic bilingual bindings preserve the different why-card order. Hero reused in home and catalogue.';
 fs.writeFileSync(path.join(ROOT,`tools/refresh/${KEY}-owner-illustrations-2026-10-24.json`),JSON.stringify({note,entries,bindings},null,2)+'\n');
 console.log('Prepared',entries.length,'owner images,',entries.reduce((n,e)=>n+e.outputs.length,0),'responsive assets and',bindings.length,'card placements.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
