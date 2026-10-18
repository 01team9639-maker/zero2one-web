// Optimize the supplied transparent illustrations without cropping or recoloring.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),sharp=require('sharp');
const base=path.resolve(__dirname,'../assets/images/seo/illustrations-2026-10-13');
const groups={
 know:['SEO_7_Transparent_Illustrations',['01_new_website_visibility','02_no_traffic_or_leads','03_missing_google_maps','04_competitors_dominating','05_algorithm_rankings_drop','06_ai_search_changes','07_high_ppc_cost']],
 audience:['01_suitable_for_seo',['01_ecommerce','02_company_websites','03_new_websites','04_local_businesses','05_service_websites','06_digital_platforms']],
 why:['02_why_choose_our_seo',['01_all_sectors','02_customer_retention','03_monthly_reports','04_saudi_market_strategy','05_safe_tools','06_research_and_development']]
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(base,{recursive:true});const records=[],tiles=[];
 for(const [group,[folder,stems]] of Object.entries(groups)){
  const dest=path.join(base,group);fs.mkdirSync(path.join(dest,'originals'),{recursive:true});
  for(const stem of stems){
   const source=path.join('/Users/mohammad/Downloads',folder,stem+'.png'),archive=path.join(dest,'originals',stem+'.png');
   const bytes=fs.readFileSync(fs.existsSync(source)?source:archive),m=await sharp(bytes).metadata();
   if(!m.hasAlpha)throw new Error('Expected transparent source '+source);
   fs.writeFileSync(archive,bytes);
   const outputs=[];
   for(const width of [320,m.width]){
    const filename=stem+(width===m.width?'':'-320')+'.webp';
    const webp=await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
    const alpha=await sharp(webp).extractChannel('alpha').raw().toBuffer();
    const originalAlpha=await sharp(bytes).resize({width,withoutEnlargement:true}).extractChannel('alpha').raw().toBuffer();
    if(!alpha.equals(originalAlpha))throw new Error('Alpha changed '+filename);
    fs.writeFileSync(path.join(dest,filename),webp);outputs.push({filename,width,bytes:webp.length,sha256:hash(webp)});
   }
   records.push({group,stem,source,sha256:hash(bytes),width:m.width,height:m.height,outputs});
   tiles.push({group,stem,bytes:await sharp(bytes).resize({width:260,height:205,fit:'contain',background:'#fffef8'}).png().toBuffer()});
  }
 }
 fs.writeFileSync(path.join(base,'provenance.json'),JSON.stringify({source:'User supplied illustrations, 2026-10-13',treatment:'Full frame, original color and alpha preserved',images:records},null,2)+'\n');
 const composite=[];tiles.forEach((tile,i)=>{
  const left=(i%4)*280,top=Math.floor(i/4)*245;composite.push({input:tile.bytes,left:left+10,top:top+5});
  const label='<svg width="280" height="32"><text x="10" y="15" font-family="Arial" font-size="11">'+tile.group+' / '+tile.stem+'</text></svg>';
  composite.push({input:Buffer.from(label),left,top:top+213});
 });
 const report=path.resolve(__dirname,'reports/site-refresh/seo-supplied-illustrations.png');fs.mkdirSync(path.dirname(report),{recursive:true});
 await sharp({create:{width:1120,height:Math.ceil(tiles.length/4)*245,channels:4,background:'#fffef8'}}).composite(composite).png().toFile(report);
 console.log('Prepared '+records.length+' full-frame transparent illustrations.');
})().catch(e=>{console.error(e);process.exitCode=1;});
