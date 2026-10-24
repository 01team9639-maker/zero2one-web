// Owner replacements only. Keep previous WebP files recoverable and Downloads intact.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require('/Users/mohammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.dirname(__dirname),source=process.argv[2];
if(!source)throw Error('Supply the owner portrait folder');
const mapping={'mohammed':'team-mohammed.png','moayad':'team-member-02.png'};
(async()=>{
 const versions={};
 for(const [id,input] of Object.entries(mapping))for(const width of [480,720]){
  const relative='assets/images/team/team-'+id+(width===480?'-480':'')+'.webp';
  const output=path.join(root,relative),archive=path.join(root,'tools/refresh/image-archives/team-2026-10-24',path.basename(output));
  if(!fs.existsSync(archive)){fs.mkdirSync(path.dirname(archive),{recursive:true});fs.copyFileSync(output,archive);}
  const bytes=await sharp(path.join(source,input)).rotate().resize({width,withoutEnlargement:true}).webp({quality:88}).toBuffer();
  fs.writeFileSync(output,bytes);versions['/'+relative]=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,8);
  console.log(relative,bytes.length);
 }
 fs.writeFileSync(path.join(root,'tools/refresh/team-photo-versions-2026-10-24.json'),JSON.stringify(versions,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
