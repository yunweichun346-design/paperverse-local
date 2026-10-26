import React from 'react';
export const COLORS=[['yellow','黄'],['green','绿'],['blue','蓝'],['rose','粉']];
export default function Annotations({records,draft,setDraft,selected,onLocate,onEdit,onSave,busy,error}){
 return <section className="pdf-notes" aria-label="原文批注">
  <h2>原文批注</h2><p>选中一段原文后添加批注。</p>
  {draft&&<form onSubmit={e=>{e.preventDefault();onSave();}}>
   <blockquote>第 {draft.page} 页 · {draft.quote}</blockquote>
   <label htmlFor="pdf-annotation-text">批注内容</label><textarea id="pdf-annotation-text" autoFocus value={draft.text} maxLength={10000} onChange={e=>setDraft({...draft,text:e.target.value})}/>
   <div className="pdf-colors" role="group" aria-label="批注颜色">{COLORS.map(([key,label])=><button key={key} type="button" className={'pdf-'+key} aria-label={label+'色高亮'} aria-pressed={draft.color===key} onClick={()=>setDraft({...draft,color:key})}>{label}</button>)}</div>
   <button className="wb-primary" disabled={busy} type="submit">保存批注</button> <button type="button" disabled={busy} onClick={()=>setDraft(null)}>取消编辑</button>
  </form>}
  {error&&<p role="alert">{error}</p>}
  {Object.entries(records).sort((a,b)=>a[1].page-b[1].page).map(([id,n])=><article key={id} id={'annotation-'+id} className={'pdf-note'+(selected===id?' is-selected':'')} tabIndex={-1}>
   <button onClick={()=>onLocate(id,n)} aria-label={'定位批注：'+(n.text||n.quote)}>第 {n.page} 页 · {n.quote}</button><p>{n.text}</p><button disabled={busy} onClick={()=>onEdit({id,...n})}>编辑批注</button>
  </article>)}
  {!Object.keys(records).length&&!draft&&<p>尚未添加原文批注。</p>}
 </section>;
}
