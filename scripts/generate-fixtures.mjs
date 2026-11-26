import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'testdata');
await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'hls'),{recursive:true});await mkdir(path.join(out,'dash'),{recursive:true});
function run(args){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});if(r.status!==0)throw new Error(`ffmpeg failed (${r.status})`);}
const source=['-f','lavfi','-i','testsrc2=size=640x360:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','8','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k'];
run([...source,'-movflags','+faststart',path.join(out,'video.mp4')]);
run([...source,'-f','hls','-hls_time','2','-hls_playlist_type','vod','-hls_segment_filename',path.join(out,'hls','seg-%03d.ts'),path.join(out,'hls','master.m3u8')]);
run([...source,'-f','dash','-seg_duration','2','-use_timeline','1','-use_template','1',path.join(out,'dash','stream.mpd')]);
await writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><title>Motrix extension local media fixture</title><h1>Real HTTP media requests for extension testing</h1><video controls width="640" poster="" src="/video.mp4"></video><p><a href="/hls/master.m3u8">HLS master playlist</a> · <a href="/dash/stream.mpd">DASH manifest</a></p><script>const mode=new URLSearchParams(location.search).get('mode');if(mode==='hls'){const v=document.querySelector('video');v.src='/hls/master.m3u8';}</script></html>`);
console.log(`Generated direct MP4, HLS and DASH fixtures under ${out}`);
