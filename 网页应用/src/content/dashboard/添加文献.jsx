import React,{useState} from 'react';
import {Dialog} from '../../本机组件.jsx';
import './添加文献.css';

async function request(url,options){
 const response=await fetch(url,options),body=await response.json();
 if(!response.ok)throw Error(body.error||'本机服务暂不可用');return body;
}
export default function AddPaper({onClose,onCreated}){
 const [fields,setFields]=useState({title:'',authors:'',journal:'',year:'',doi:''});
 const [pdf,setPdf]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const close=()=>{if(!busy&&(!Object.values(fields).some(Boolean)&&!pdf||confirm('关闭将放弃未提交的填写内容，已入库内容仍保留。继续关闭？')))onClose();};
 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('');let added;
  try{
   if(pdf&&(pdf.size>50*1024*1024||!pdf.name.toLowerCase().endsWith('.pdf')))throw Error('请选择不超过50MB的PDF文件');
   added=await request('/api/papers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)});
   if(pdf){
    const url='/api/fulltext/'+added.route,current=await request(url);
    if(current.fingerprint){
     const digest=await crypto.subtle.digest('SHA-256',await pdf.arrayBuffer());
     const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
     if(hash!==current.fingerprint)throw Error('该文献已有另一份PDF；不会覆盖。请取消文件选择后打开已有文献，在阅读页核对后替换。');
    }else await request(url,{method:'POST',headers:{'Content-Type':'application/pdf','X-File-Name':encodeURIComponent(pdf.name)},body:pdf});
   }
   await onCreated(added.paper,added.created);onClose();
  }catch(e){setError((added?'文献元数据已在库中；':'')+e.message);}
  finally{setBusy(false);}
 };
 return <Dialog title="添加文献" onClose={close} className="paper-import" initialFocusSelector="#import-title">
  <form onSubmit={submit}>
   <p>请核对元数据。仅在本机保存，不联网补全；未知信息留空。</p>
   {Object.entries({title:'论文题目',authors:'作者（分号分隔）',journal:'期刊或会议',year:'年份',doi:'DOI'}).map(([key,label])=><label key={key} htmlFor={'import-'+key}>{label}{key==='title'?'（必填）':''}<input id={'import-'+key} value={fields[key]} disabled={busy} required={key==='title'} maxLength={key==='year'?4:key==='title'||key==='authors'?2000:500} inputMode={key==='year'?'numeric':undefined} pattern={key==='year'?'[0-9]{4}':undefined} onChange={e=>setFields({...fields,[key]:e.target.value})}/></label>)}
   <label htmlFor="import-pdf">PDF（可稍后添加，最大50MB）<input id="import-pdf" type="file" accept=".pdf,application/pdf" disabled={busy} onChange={e=>setPdf(e.target.files[0]||null)}/></label>
   {pdf&&<button type="button" disabled={busy} onClick={()=>{setPdf(null);document.getElementById('import-pdf').value='';}}>取消文件选择</button>}
   <p>相同 DOI 不重复创建；无 DOI 时按题目、作者、年份判重。重复项保留已有内容。</p>
   {error&&<p role="alert">{error}</p>}
   <footer><button type="button" disabled={busy} onClick={close}>取消</button><button type="submit" disabled={busy}>{busy?'正在保存…':'保存并阅读'}</button></footer>
  </form>
 </Dialog>;
}
