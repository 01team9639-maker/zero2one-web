// Read-only packaging gate: original sources and optimized outputs stay immutable.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert').strict;
const root=path.dirname(__dirname),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const archives=path.join(root,'tools/refresh/image-archives');
const service=JSON.parse(fs.readFileSync(path.join(archives,'owner-services-2026-10/remaining-provenance.json'),'utf8'));
const seoRoot=path.join(archives,'seo-owner-review-2026-10');
const seo=JSON.parse(fs.readFileSync(path.join(seoRoot,'provenance.json'),'utf8'));
let originals=0,outputs=0;
for(const record of service){
 assert.equal(sha(record.original),record.sha256,'owner service source unchanged');originals++;
 for(const image of record.outputs){assert.equal(sha(path.join(root,'assets/images/owner-services-2026-10',image.file)),image.sha256,'service output unchanged');outputs++;}
}
for(const record of seo){
 assert.equal(sha(path.join(seoRoot,record.original_copy)),record.sha256,'archived SEO original unchanged');originals++;
 if(fs.existsSync(record.original))assert.equal(sha(record.original),record.sha256,'owner SEO source unchanged');
 for(const image of record.outputs){assert.equal(sha(path.join(root,'assets/images/seo/owner-review-2026-10',image.file)),image.sha256,'SEO output unchanged');outputs++;}
}
for(const former of ['assets/images/owner-services-2026-10/remaining-provenance.json','assets/images/seo/owner-review-2026-10/provenance.json','assets/images/seo/owner-review-2026-10/originals'])assert.equal(fs.existsSync(path.join(root,former)),false,'private archive is not publicly packaged');
assert.match(fs.readFileSync(path.join(root,'.htaccess'),'utf8'),/RewriteRule\s+\^\(\\\.git\|\\\.github\|tools\|node_modules\)\(\/\|\$\)\s+-\s+\[R=404,L\]/,'existing tools deny protects the archive');
console.log(`PASS protected image archive: ${originals} original sources, ${outputs} optimized outputs; former public archives absent.`);
