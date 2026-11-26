'use strict';const api=typeof browser!=='undefined'?browser:chrome;const $=s=>document.querySelector(s);
const call=(fn,args=[])=>typeof browser!=='undefined'?Promise.resolve(fn(...args)):new Promise((ok,no)=>fn(...args,v=>chrome.runtime.lastError?no(new Error(chrome.runtime.lastError.message)):ok(v)));
async function load(){const r=await call(api.storage.local.get,['settings']),s=r.settings||{};$('#serverHost').value=s.serverHost||'';$('#serverPort').value=s.serverPort||'';$('#secret').value=s.secret||'';$('#autoSniff').checked=s.autoSniff!==false;$('#theme').value=s.theme||'system';applyTheme(s.theme||'system');}
function applyTheme(t){document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;}
function settings(){return {serverHost:$('#serverHost').value.trim().replace(/\/$/,''),serverPort:$('#serverPort').value.trim(),secret:$('#secret').value,autoSniff:$('#autoSniff').checked,theme:$('#theme').value};}
$('#theme').onchange=()=>applyTheme($('#theme').value);
$('#save').onclick=async()=>{const s=settings();if(s.serverHost){try{new URL(s.serverHost); }catch{$('#feedback').textContent='服务器地址需包含 http:// 或 https://';return;}}if(s.serverPort&&(+s.serverPort<1||+s.serverPort>65535)){$('#feedback').textContent='端口范围应为 1–65535。';return;}try{await call(api.storage.local.set,[{settings:s}]);$('#feedback').textContent='设置已保存。连接参数将在服务端接口发布后验证。';}catch(e){$('#feedback').textContent='保存失败：'+e.message;}};
$('#test').onclick=()=>{$('#feedback').textContent='Motrix-SPK/docs/API.md 尚未发布，接口规范明确后即可接入连接测试。';};load();
