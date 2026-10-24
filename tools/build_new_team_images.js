// Resize/compress the supplied portraits only; do not alter their appearance.
const sharp=require('/Users/mohammad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs'),path=require('path');
const root=path.dirname(__dirname),source=process.argv[2];
if(!source)throw new Error('Supply the folder containing the two owner portraits');
const members=JSON.parse(fs.readFileSync(path.join(root,'tools/refresh/team-update-2026-10-21.json'))).members.filter(member=>member.image_source);
(async()=>{for(const member of members)for(const width of [480,720]){
 const file=path.join(root,'assets/images/team/team-'+member.id+(width===480?'-480':'')+'.webp');
 await sharp(path.join(source,member.image_source)).rotate().resize({width,withoutEnlargement:true}).webp({quality:88}).toFile(file);
 console.log(path.relative(root,file));
}})().catch(e=>{console.error(e);process.exitCode=1;});
