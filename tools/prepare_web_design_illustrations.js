// Owner-supplied artwork: responsive encoding only. Never crop or recolor.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const ROOT=path.resolve(__dirname,'..');
const SOURCE='/Users/mohammad/Downloads/website_design_34_illustrations';
const DEST=path.join(ROOT,'assets/images/service-studio/web-design-2026-10');
const REPORT=path.join(ROOT,'tools/reports/site-refresh/web-design-images-2026-10-17');
const MANIFEST=path.join(ROOT,'tools/refresh/web-design-illustrations.json');
const groups=[['01','benefits',3],['02','know',7],['03','deliverables',9],['04','types',4],['05','why',6],['06','audience',5]];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 fs.mkdirSync(DEST,{recursive:true});fs.mkdirSync(REPORT,{recursive:true});
 const entries=[],tiles=[];
 for(const [prefix,kind,count] of groups){
  const dirs=fs.readdirSync(SOURCE).filter(d=>d.startsWith(prefix+'_')&&fs.statSync(path.join(SOURCE,d)).isDirectory());
  if(dirs.length!==1)throw Error('Expected one source folder: '+prefix);
  const dir=path.join(SOURCE,dirs[0]);
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
  if(files.length!==count)throw Error('Unexpected artwork count: '+kind);
  for(const file of files){
   const source=path.join(dir,file),input=fs.readFileSync(source),meta=await sharp(input).metadata();
   if(meta.width!==1254||meta.height!==1254||!meta.hasAlpha)throw Error('Unexpected source format: '+file);
   const stem=kind+'-'+file.replace(/\.png$/,''),outputs=[];
   for(const width of [320,640,960]){
    const filename=stem+'-'+width+'.webp',output=path.join(DEST,filename);
    await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:87,alphaQuality:100,effort:6}).toFile(output);
    const encoded=fs.readFileSync(output),m=await sharp(encoded).metadata();
    const expectedAlpha=await sharp(input).resize({width}).extractChannel('alpha').raw().toBuffer();
    const actualAlpha=await sharp(encoded).extractChannel('alpha').raw().toBuffer();
    if(!expectedAlpha.equals(actualAlpha))throw Error('Transparency changed: '+filename);
    outputs.push({url:'/assets/images/service-studio/web-design-2026-10/'+filename,width:m.width,height:m.height,bytes:encoded.length,sha256:sha(encoded)});
   }
   if(sha(fs.readFileSync(source))!==sha(input))throw Error('Original changed: '+source);
   entries.push({kind,number:Number(file.slice(0,2)),source,sourceSha256:sha(input),width:meta.width,height:meta.height,sourceBytes:input.length,outputs});
   const thumb=await sharp(input).resize(210,210,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
   const label=Buffer.from('<svg width="260" height="42"><text x="12" y="17" font-family="Arial" font-size="12">'+kind+' / '+file.slice(0,2)+'</text><text x="12" y="34" font-family="Arial" font-size="9">'+file.replace(/^[0-9]+_|\.png$/g,'').replace(/_/g,' ')+'</text></svg>');
   tiles.push(await sharp({create:{width:260,height:260,channels:4,background:'#fffbed'}}).composite([{input:thumb,left:25,top:0},{input:label,left:0,top:215}]).png().toBuffer());
   console.log(kind,file,outputs.map(o=>o.width+'px '+Math.round(o.bytes/1024)+'KB').join(' / '));
  }
 }
 fs.writeFileSync(MANIFEST,JSON.stringify({note:'Owner-supplied website service illustrations. Full-frame responsive WebP; original colors and lossless alpha retained. Originals remain read-only in Downloads.',entries},null,2)+'\n');
 await sharp({create:{width:260*6,height:260*Math.ceil(tiles.length/6),channels:4,background:'#efefef'}}).composite(tiles.map((input,i)=>({input,left:(i%6)*260,top:Math.floor(i/6)*260}))).png().toFile(path.join(REPORT,'source-contact-sheet.png'));
 console.log('Prepared',entries.length,'illustrations; PNG originals unchanged.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
