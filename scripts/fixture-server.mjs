import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','testdata');
const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.m3u8':'application/vnd.apple.mpegurl','.mpd':'application/dash+xml','.ts':'video/mp2t','.m4s':'video/iso.segment','.m4a':'audio/mp4','.aac':'audio/aac'};
createServer((req,res)=>{const raw=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const rel=raw==='/'?'/index.html':raw;const target=path.resolve(root,'.'+rel);if(!target.startsWith(root+path.sep)||!existsSync(target)||!statSync(target).isFile()){res.writeHead(404).end('Not found');return;}res.setHeader('Content-Type',types[path.extname(target)]||'application/octet-stream');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');if(req.method==='HEAD'){res.writeHead(200,{'Content-Length':statSync(target).size}).end();return;}createReadStream(target).pipe(res);}).listen(4177,'127.0.0.1',()=>console.log('Fixture server listening on http://127.0.0.1:4177'));
