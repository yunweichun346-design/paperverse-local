import React,{useRef,useState} from 'react';
import {keyOf,noteOf,convertBackup,download,exportCsv} from './文献工具.js';
export default function ReadingPanel({papers,store,onSelect,dirty=false}){
  const [preview,setPreview]=useState(null),[message,setMessage]=useState('');
  const fileInput=useRef(null);
  const active=papers.filter(p=>{const n=noteOf(store.notes,p);return n.star||n.text||n.questions||(n.read_status&&n.read_status!=='待读');});
  const known=new Set(papers.map(keyOf)),unknown=Object.keys(store.notes).filter(k=>!known.has(k));
  const read=async e=>{const input=e.target;try{const file=input.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('备份超过5MB，请先检查文件。');const source=JSON.parse(await file.text());setPreview({...convertBackup(source,papers,store.getNotes()),source});setMessage('已读取，点击确认后才会按当前记录重新合并。');}catch(error){setPreview(null);setMessage(error.message);}input.value='';};
  const commit=async()=>{if(!preview)return;if(dirty){setMessage('详情中还有未保存草稿，请先回到文献库保存草稿，再确认导入。');return;}try{const merged=convertBackup(preview.source,papers,store.getNotes());await store.save(merged.notes);setMessage('笔记已合并并保存到本机文件。');setPreview(null);}catch(e){setMessage(e.message);}};
  return <section className="wb-reading">
    <div className="wb-intro"><div><h2>把论文变成自己的理解</h2><p>这里只统计你主动标记的阅读。AI核读内容在文献详情中单独显示。</p></div><strong>{active.length}<small>篇有个人记录</small></strong></div>
    <details className="wb-backup"><summary>备份与迁移</summary><p>阅读记录保存在本机资料目录，可导出 JSON 备份。旧网页中先导出笔记备份，再选择下面的导入。已有笔记会保留；不同内容会合并。</p><div className="wb-actions"><button onClick={()=>fetch('/api/backup').then(r=>{if(!r.ok)throw new Error('备份失败');return r.text();}).then(body=>download('我的阅读记录备份.json',body)).catch(e=>setMessage(e.message))}>导出全部笔记备份</button><button onClick={()=>fileInput.current?.click()}>导入旧笔记 / 恢复备份</button><input ref={fileInput} type="file" hidden accept=".json,application/json" onChange={read}/><button onClick={()=>exportCsv(active,store.notes)}>导出有个人记录的文献</button></div><p role="status">{message||store.message}</p>
      {preview&&<div className="wb-import-preview"><p>匹配文献：{preview.matched}条 · 暂未匹配：{preview.unmatched}条（照常保留）</p><button className="wb-primary" disabled={!store.loaded||store.saving||Boolean(store.conflict)} onClick={commit}>确认合并并保存</button><button onClick={()=>setPreview(null)}>取消导入</button></div>}
      {unknown.length>0&&<p>另有{unknown.length}条未匹配记录，仍保存在备份中，不会删除。</p>}
    </details>
    <div className="wb-reading-list">{active.length?active.map(p=>{const n=noteOf(store.notes,p);return <button className="wb-reading-card" key={keyOf(p)} onClick={()=>onSelect(p)}><span>{n.star?'★ ':''}{n.read_status||'待读'} · {p.year}</span><strong>{p.title_zh||p.title}</strong><p>{n.text||n.questions||'尚未填写笔记'}</p></button>}):<div className="wb-empty">还没有个人阅读记录。打开论文，标记“在读”并写下一个自己的问题。</div>}</div>
  </section>;
}
