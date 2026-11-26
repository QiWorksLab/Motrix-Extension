/* Copyright (c) 2026 QiWorksLab. Licensed under MIT. */
'use strict';
importScripts('src/core.js');
const api=typeof browser!=='undefined'?browser:chrome;
const action=api.action||api.browserAction;
const STORE=api.storage.session||api.storage.local, PREFIX='tab:', MAX_ITEMS=120;
const HEADER_ALLOW=new Set(['cookie','referer','origin','user-agent']);
const call=(fn,args=[])=>{if(typeof browser!=='undefined')return Promise.resolve(fn(...args));return new Promise((resolve,reject)=>fn(...args,value=>{const e=chrome.runtime.lastError;e?reject(new Error(e.message)):resolve(value);}));};
const readTab=async id=>(await call(STORE.get,[PREFIX+id]))[PREFIX+id]||{items:{},pageTitle:'',updatedAt:0};
async function writeTab(id,s){s.updatedAt=Date.now();await call(STORE.set,[{[PREFIX+id]:s}]);await updateBadge(id,s);}
const headersFrom=arr=>Object.fromEntries((arr||[]).filter(h=>HEADER_ALLOW.has((h.name||'').toLowerCase())&&h.value).map(h=>[(h.name||'').toLowerCase(),h.value]));
async function setting(key){const x=await call(api.storage.local.get,['settings']);return x.settings?.[key];}
async function updateBadge(id,s){const n=Object.values(s.items||{}).filter(x=>x.kind!=='segment'&&!x.protected).length;try{await call(action.setBadgeText,[{tabId:id,text:n?String(Math.min(n,99)):''}]);await call(action.setBadgeBackgroundColor,[{tabId:id,color:'#18a66a'}]);}catch{}}
async function record(d,mime='',size=null,responseHeaders=[]){if(d.tabId<0||!d.url)return;try{if(!['http:','https:'].includes(new URL(d.url).protocol))return;}catch{return;}const current=await readTab(d.tabId);if(await setting('autoSniff')===false && (!current.manualUntil||current.manualUntil<Date.now()))return;
 const kind=MotrixSnifferCore.classify(d.url,mime,d.type);if(!kind)return;const s=await readTab(d.tabId);if(!s.pageTitle)s.pageTitle=d.documentUrl||d.initiator||'';
 if(kind==='segment'){s.segmentCount=(s.segmentCount||0)+1;s.lastSegmentAt=Date.now();return;}
 const url=MotrixSnifferCore.canonicalize(d.url);if(!url)return;const previous=s.items[url]||{};const response=headersFrom(responseHeaders);
 const disposition=(response['content-disposition']||'').match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i)?.[1];let name='';try{name=decodeURIComponent(disposition||'');}catch{}
 const pathname=new URL(url).pathname.split('/').pop();
 s.items[url]={...previous,url,kind,mime:mime||previous.mime||'',title:previous.title||name||s.pageTitle||pathname||'未知视频',pageUrl:d.documentUrl||d.initiator||'',tabId:d.tabId,quality:previous.quality||MotrixSnifferCore.qualityFromUrl(url),size:Number(size||response['content-length']||previous.size)||null,headers:{...(previous.headers||{}),...headersFrom(d.requestHeaders)},thumbnail:previous.thumbnail||'',duration:previous.duration||null,firstSeen:previous.firstSeen||Date.now(),lastSeen:Date.now(),taskState:previous.taskState||'idle'};
 s.items=Object.fromEntries(Object.values(s.items).sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,MAX_ITEMS).map(x=>[x.url,x]));await writeTab(d.tabId,s);
}
api.webRequest.onBeforeSendHeaders.addListener(d=>{void record(d);},{urls:['<all_urls>'],types:['media','xmlhttprequest','other']},['requestHeaders','extraHeaders']);
api.webRequest.onHeadersReceived.addListener(d=>{const h=Object.fromEntries((d.responseHeaders||[]).map(x=>[(x.name||'').toLowerCase(),x.value||'']));void record(d,h['content-type'],h['content-length'],d.responseHeaders);},{urls:['<all_urls>'],types:['media','xmlhttprequest','other']},['responseHeaders','extraHeaders']);
api.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
 if(msg?.type==='MX_DOM_MEDIA'&&sender.tab?.id>=0){void (async()=>{if(await setting('autoSniff')===false&&!msg.manual)return;const s=await readTab(sender.tab.id);s.pageTitle=msg.title||s.pageTitle;if((msg.items||[]).some(i=>i.url?.startsWith('blob:'))){s.blobSeen=true;for(const x of Object.values(s.items||{}))x.blobNearby=true;}for(const item of msg.items||[]){if(item.url?.startsWith('blob:')){s.blobSeen=true;continue;}const url=MotrixSnifferCore.canonicalize(item.url);if(!url)continue;const kind=MotrixSnifferCore.classify(url,item.mime,'media');if(!kind||kind==='segment')continue;const old=s.items[url]||{};s.items[url]={...old,...item,url,kind,tabId:sender.tab.id,pageUrl:sender.tab.url||old.pageUrl,title:item.title||old.title||s.pageTitle||'未知视频',quality:item.quality||old.quality||null,thumbnail:item.thumbnail||old.thumbnail||'',headers:old.headers||{},firstSeen:old.firstSeen||Date.now(),lastSeen:Date.now(),taskState:old.taskState||'idle'};}await writeTab(sender.tab.id,s);sendResponse({ok:true});})().catch(e=>sendResponse({ok:false,error:e.message}));return true;}
 if(msg?.type==='MX_GET_TAB'&&Number.isInteger(msg.tabId)){void readTab(msg.tabId).then(s=>sendResponse({items:Object.values(s.items||{}).filter(x=>x.kind!=='segment'),blobSeen:!!s.blobSeen,pageTitle:s.pageTitle||''}));return true;}
 if(msg?.type==='MX_SCAN_NOW'&&Number.isInteger(msg.tabId)){void readTab(msg.tabId).then(s=>{s.manualUntil=Date.now()+60000;return writeTab(msg.tabId,s);}).then(()=>call(api.tabs.sendMessage,[msg.tabId,{type:'MX_SCAN_NOW'}]).then(r=>sendResponse(r||{ok:false})).catch(()=>sendResponse({ok:false,error:'当前页面不允许注入扩展脚本'})));return true;}
 if(msg?.type==='MX_INSPECT_VARIANTS'&&msg.item?.url){void (async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{const res=await fetch(msg.item.url,{credentials:'include',cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error(`HTTP ${res.status}`);const text=await res.text();if(text.length>4*1024*1024)throw new Error('清单文件过大');const parsed=msg.item.kind==='hls'?MotrixSnifferCore.parseHlsVariants(text,msg.item.url):MotrixSnifferCore.parseDashVariants(text,msg.item.url);sendResponse({ok:true,...parsed});}catch(e){sendResponse({ok:false,variants:[],error:e.name==='AbortError'?'读取清晰度超时':'无法读取实际清晰度'});}finally{clearTimeout(timer);}})();return true;}
 if(msg?.type==='MX_SETTINGS'){void call(api.storage.local.get,['settings']).then(r=>sendResponse(r.settings||{}));return true;}
 if(msg?.type==='MX_MARK_PREVIEW'&&Number.isInteger(msg.tabId)){void call(api.tabs.sendMessage,[msg.tabId,{type:'MX_HIGHLIGHT',url:msg.url}]).then(r=>sendResponse(r||{ok:false})).catch(()=>sendResponse({ok:false}));return true;}
 return false;
});
api.tabs.onRemoved.addListener(id=>{void call(STORE.remove,[PREFIX+id]);});
api.tabs.onUpdated.addListener((id,change)=>{if(change.status==='loading'&&change.url){void call(STORE.remove,[PREFIX+id]);void updateBadge(id,{items:{}});}});
api.runtime.onStartup.addListener(()=>{void call(STORE.get,[null]).then(all=>call(STORE.remove,[Object.keys(all).filter(k=>k.startsWith(PREFIX))]));});
