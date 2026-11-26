'use strict';
(function(root){
 const VIDEO_EXT=/\.(?:mp4|m4v|webm|mov|flv|mkv|m3u8|m3u|mpd)(?:$|[?#])/i;
 const SEGMENT_EXT=/\.(?:ts|m4s|cmfv|cmfa|aac|vtt|key)(?:$|[?#])/i;
 function extension(url){try{return new URL(url).pathname.split('.').pop().toLowerCase();}catch{return '';}}
 function classify(url,mime='',resourceType=''){
   const u=(url||'').toLowerCase(),m=(mime||'').toLowerCase(),ext=extension(url);
   if(SEGMENT_EXT.test(u))return 'segment';
   if(/mpegurl/.test(m)||ext==='m3u8'||ext==='m3u')return 'hls';
   if(/dash\+xml/.test(m)||ext==='mpd')return 'dash';
   if(/^video\//.test(m)||/^(mp4|m4v|webm|mov|flv|mkv)$/.test(ext)||resourceType==='media')return 'file';
   if(/application\/(?:octet-stream|mp4)/.test(m)&&VIDEO_EXT.test(u))return 'file';
   return '';
 }
 function canonicalize(value){try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol))return '';u.hash='';return u.href;}catch{return '';}}
 function qualityFromUrl(value){try{const u=new URL(value);const found=[...u.pathname.matchAll(/(?:^|[._/-])(\d{3,4})p(?:[._/-]|$)/ig)].map(m=>Number(m[1]));for(const key of ['quality','height','resolution']){const n=Number((u.searchParams.get(key)||'').match(/\d{3,4}/)?.[0]);if(n)found.push(n);}return found.length?Math.max(...found):null;}catch{return null;}}
 
 function parseAttributes(text){const out={};const re=/([A-Z0-9-]+)=((?:"[^"]*")|(?:[^,]*))/gi;for(const m of text.matchAll(re))out[m[1].toUpperCase()]=m[2].replace(/^"|"$/g,'');return out;}
 function parseHlsVariants(text,baseUrl){const protectedStream=/#EXT-X-KEY:[^\r\n]*METHOD=SAMPLE-AES/i.test(text)||/#EXT-X-KEY:[^\r\n]*KEYFORMAT=(?!"?identity"?)/i.test(text);if(protectedStream)return {protected:true,variants:[]};const lines=text.split(/\r?\n/).map(x=>x.trim());const variants=[];for(let i=0;i<lines.length;i++){if(!lines[i].startsWith('#EXT-X-STREAM-INF:'))continue;const attrs=parseAttributes(lines[i].slice(lines[i].indexOf(':')+1));let uri='';for(let j=i+1;j<lines.length;j++){if(lines[j]&&!lines[j].startsWith('#')){uri=lines[j];break;}}if(!uri)continue;const resolution=(attrs.RESOLUTION||'').match(/(\d+)x(\d+)/i);let url='';try{url=new URL(uri,baseUrl).href;}catch{}if(!url)continue;variants.push({url,quality:resolution?Number(resolution[2]):null,width:resolution?Number(resolution[1]):null,bitrate:Number(attrs['AVERAGE-BANDWIDTH']||attrs.BANDWIDTH)||null,codecs:attrs.CODECS||''});}return {protected:false,variants:variants.sort((a,b)=>(b.quality||0)-(a.quality||0)||(b.bitrate||0)-(a.bitrate||0))};}
 function parseDashVariants(text,baseUrl){if(/<ContentProtection\b/i.test(text))return {protected:true,variants:[]};const variants=[];const sets=[...text.matchAll(/<AdaptationSet\b([^>]*)>([\s\S]*?)<\/AdaptationSet>/gi)].map(m=>({attrs:m[1],body:m[2]}));const scopes=sets.length?sets:[{attrs:'',body:text}];for(const set of scopes){if(/contentType\s*=\s*["']audio["']/i.test(set.attrs)||/mimeType\s*=\s*["']audio\//i.test(set.attrs))continue;const setBase=(set.body.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/i)||[])[1]||'';for(const rep of set.body.matchAll(/<Representation\b([^>]*)(?:\/>|>([\s\S]*?)<\/Representation>)/gi)){const a=rep[1],body=rep[2]||'';const id=(a.match(/\bid\s*=\s*["']([^"']+)/i)||[])[1]||'';const height=Number((a.match(/\bheight\s*=\s*["'](\d+)/i)||[])[1])||null;const width=Number((a.match(/\bwidth\s*=\s*["'](\d+)/i)||[])[1])||null;const bandwidth=Number((a.match(/\bbandwidth\s*=\s*["'](\d+)/i)||[])[1])||null;const repBase=(body.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/i)||[])[1]||setBase;let url=baseUrl;try{if(repBase)url=new URL(repBase,new URL(setBase||baseUrl,baseUrl)).href;}catch{}variants.push({url,representationId:id,quality:height,width,bitrate:bandwidth,codecs:(a.match(/\bcodecs\s*=\s*["']([^"']+)/i)||[])[1]||''});}}return {protected:false,variants:variants.sort((a,b)=>(b.quality||0)-(a.quality||0)||(b.bitrate||0)-(a.bitrate||0))};}
 function dedupe(items){const map=new Map();for(const item of items||[]){const url=canonicalize(item.url);if(!url||classify(url,item.mime||item.contentType||'',item.resourceType||'')==='segment')continue;const prev=map.get(url)||{};map.set(url,{...prev,...item,url});}return [...map.values()];}
 const api={classify,canonicalize,qualityFromUrl,dedupe,parseHlsVariants,parseDashVariants};root.MotrixSnifferCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
