/* Local-only preview. Blog output belongs to the separate Hugo repository:
   resolve its production asset URLs to this checkout in the response, without
   editing generated HTML or contacting the production site. */
const http=require('http');
const fs=require('fs');
const path=require('path');
const ROOT=path.dirname(__dirname);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.ico':'image/x-icon','.mp4':'video/mp4','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
function createPreviewServer(root=ROOT){
 return http.createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(name.endsWith('/'))name+='index.html';
   let file=path.resolve(root,'.'+name);
   if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);return res.end();}
   const stat=await fs.promises.stat(file);
   if(stat.isDirectory()){res.writeHead(302,{Location:name+'/'});return res.end();}
   let body=await fs.promises.readFile(file);
   if(path.extname(file)==='.html')body=Buffer.from(body.toString('utf8').replace(/https:\/\/zero2one\.sa(?=\/assets\/)/g,''));
   res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-store'});
   res.end(req.method==='HEAD'?undefined:body);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:400,{'Content-Type':'text/plain'});res.end('Not found');}
 });
}
module.exports={createPreviewServer};
if(require.main===module){
 const port=Number(process.argv[2]||8766);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Choose a valid local preview port');
 const server=createPreviewServer();
 server.on('error',error=>{console.error(error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+port+'/ (production assets stay local)'));
}
