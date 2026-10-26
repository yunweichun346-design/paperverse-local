import {useEffect,useState} from 'react';
import {keyOf} from './文献工具.js';
export async function pdfEngine(){
 const url='/阅读引擎/PDF引擎.mjs';
 const engine=await import(/* @vite-ignore */ url);
 engine.GlobalWorkerOptions.workerSrc='/阅读引擎/解析线程.mjs';
 return engine;
}
async function json(url,options){const response=await fetch(url,options),data=await response.json();if(!response.ok){const error=new Error(data.error||'全文请求失败');error.current=data.current;throw error;}return data;}
export function useFulltext(paper){
 const [base,setBase]=useState(''),[file,setFile]=useState(null),[annotations,setAnnotations]=useState({revision:0,notes:{}}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;const controller=new AbortController();(async()=>{try{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(keyOf(paper))),key=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const endpoint='/api/fulltext/'+key,data=await json(endpoint,{signal:controller.signal});
  if(live){setBase(endpoint);setFile(data.fingerprint?data:null);}
 }catch(e){if(live)setError(e.message);}})();return()=>{live=false;controller.abort();};},[paper,attempt]);
 useEffect(()=>{if(!file)return;let live=true;setReady(false);setAnnotations({revision:0,notes:{}});json(file.url.replace(/\/pdf$/,'/annotations')).then(data=>{if(live){setAnnotations(data);setReady(true);setError('');}}).catch(e=>live&&setError(e.message));return()=>{live=false;};},[file]);
 const importPdf=async input=>{setBusy(true);setError('');try{
  if(!input||input.size>50*1024*1024)throw new Error('请选择不超过50MB的PDF');
  const engine=await pdfEngine(),task=engine.getDocument({data:new Uint8Array(await input.arrayBuffer()),isEvalSupported:false});
  try{await task.promise;}finally{await task.destroy();}
  setFile(await json(base,{method:'POST',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(input.name)},body:input}));
 }catch(e){setError(e.name==='PasswordException'?'这份PDF需要密码，请先提供可正常打开的版本。':e.message);}finally{setBusy(false);}};
 const save=async notes=>{if(!ready){setError('批注尚未载入，暂时不能保存。');return false;}setBusy(true);setError('');try{const data=await json(file.url.replace(/\/pdf$/,'/annotations'),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:annotations.revision,notes})});setAnnotations(data);return true;}catch(e){if(e.current)setAnnotations(e.current);setError(e.message);return false;}finally{setBusy(false);}};
 return {base,file,annotations,error,busy,ready,importPdf,save,reload:()=>setAttempt(v=>v+1)};
}
export async function destination(pdf,dest){const target=typeof dest==='string'?await pdf.getDestination(dest):dest;if(!target)return null;const page=typeof target[0]==='number'?target[0]:await pdf.getPageIndex(target[0]);return {page:page+1,target};}
export async function outlineRows(pdf){const walk=async items=>{const result=[];for(const item of items||[]){try{const d=await destination(pdf,item.dest);if(d)result.push({title:item.title,page:d.page});}catch{}result.push(...await walk(item.items));}return result;};return walk(await pdf.getOutline());}
