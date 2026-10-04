/* Optional localhost-only preview server. No npm dependencies. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.md':'text/plain; charset=utf-8'};
const server=http.createServer((request,response)=>{
  if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405,{Allow:'GET, HEAD'});response.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname);}catch{response.writeHead(400);response.end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/preview.html':pathname));
  const relative=path.relative(root,file);
  if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.'))){response.writeHead(403);response.end();return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){response.writeHead(404);response.end();return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(request.method==='HEAD'){response.end();return;}
    const stream=fs.createReadStream(file);stream.on('error',()=>response.destroy());stream.pipe(response);
  });
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(8080,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8080/preview.html'));
