import { cp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version;
const variant=process.argv[2]||'all';
if(variant==='all')await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of (variant==='all'?['chrome','edge','firefox']:[variant])){
 if(!['chrome','edge','firefox'].includes(name))throw new Error(`Unknown browser: ${name}`);
 const dir=path.join(out,name);await rm(dir,{recursive:true,force:true});await rm(path.join(out,`Motrix-Extension-${version}-${name}.zip`),{force:true});await mkdir(dir,{recursive:true});
 await cp(path.join(root,'src'),path.join(dir,'src'),{recursive:true});
 const manifest=JSON.parse(await readFile(path.join(root,name==='firefox'?'manifest.firefox.json':'manifest.chromium.json'),'utf8'));
 await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 for(const size of [16,32,48,128]){const src=path.join(dir,'src','icons',`${size}.png.base64`);const dst=path.join(dir,'src','icons',`${size}.png`);await writeFile(dst,Buffer.from(await readFile(src,'utf8'),'base64'));await unlink(src);}
 const zip=spawnSync('zip',['-qr',path.join(out,`Motrix-Extension-${version}-${name}.zip`),'.'],{cwd:dir,stdio:'inherit'});
 if(zip.status!==0)throw new Error(`zip failed for ${name}`);
 console.log(`built ${name}: ${dir}`);
}
