import React,{useEffect,useRef,useState} from 'react';
import {DataComponent} from '../../本机组件.jsx';
import {keyOf,noteOf,asText,safeUrl} from './文献工具.js';
import {reconcileReadingDraft} from './合并阅读草稿.js';
import {useReaderMotion} from './动效/阅读动效.js';
import {jumpTo} from './动效/滚动/引用定位.js';
import FulltextReader from './全文阅读.jsx';
import ReaderNavigation,{CHAPTERS,ReaderPanel} from './阅读导航.jsx';
const GROUPS=[['01','研究概览',[['研究问题','objective'],['研究区与对象','region'],['目标变量与单位','target']]],['02','数据与方法',[['遥感数据','sensors'],['空间尺度与分辨率','resolution'],['样本与真值','sample'],['方法与模型','model'],['验证方式','validation']]],['03','结果与研究启发',[['评价指标与结果','results'],['论文主要结论','conclusion'],['作者明确局限','limitations_author'],['整理者分析 / 推断','limitations_inferred'],['可借鉴之处','relevance'],['待验证创新假设','innovation_hypothesis'],['数据与代码可得性','data_code']]]];
export default function PaperDetail({paper,store,selected,onCompare,onDirty,focus,onFocus,onPrevious,onNext,position,total,origin,onBack,notesRequest=0,active=true,onLibrary}){
  const [draft,setDraft]=useState({read_status:'待读',text:'',questions:''}),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  const baseline=useRef({}),conflictBase=useRef(null),[busy,setBusy]=useState(false);
  const [chapter,setChapter]=useState(0),[outline,setOutline]=useState(true),[notesOpen,setNotesOpen]=useState(true),[drawer,setDrawer]=useState(null);
  const [mode,setMode]=useState('record'),[fullDirty,setFullDirty]=useState(false);
  const notesRef=useRef(null),panelRef=useRef(null);
  const openedRequest=useRef(0);
  const key=paper?keyOf(paper):'';
  const n=paper?noteOf(store.notes,paper):{};
  const motionRoot=useRef(null);useReaderMotion(motionRoot,{active,key,mode,outline,notesOpen,drawer,chapter});
  useEffect(()=>{if(dirty)return;baseline.current={...n};conflictBase.current=null;setDraft({read_status:n.read_status||'待读',text:n.text||'',questions:n.questions||''});setDirty(false);setError('');},[key,store.notes,store.loaded]);
  // 冲突请求可能只提交收藏；它不一定包含当前输入框中的草稿。
  useEffect(()=>{if(store.conflict)conflictBase.current={...store.conflict.local[key]};},[store.conflict,key]);
  useEffect(()=>{if(!store.syncToken)return;const next=reconcileReadingDraft(conflictBase.current||baseline.current,dirty?draft:n,n);baseline.current={...n};conflictBase.current=null;setDraft(next.draft);setDirty(next.dirty);setError('');},[store.syncToken]);
  useEffect(()=>{const fn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[dirty]);
  useEffect(()=>{onDirty?.(dirty||fullDirty);},[dirty,fullDirty,onDirty]);
  useEffect(()=>{setChapter(0);setMode('record');},[key]);
  const openNotes=()=>{if(focus)onFocus();if(innerWidth<1280)setDrawer('notes');else setNotesOpen(true);requestAnimationFrame(()=>notesRef.current?.querySelector('textarea')?.focus({preventScroll:true}));};
  useEffect(()=>{
    if(!active||!panelRef.current)return;
    const sections=[panelRef.current.previousElementSibling,...panelRef.current.querySelectorAll('[data-reader-section]')].filter(Boolean);
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])setChapter(Number(visible[0].target.dataset.readerSection||0));},{rootMargin:'-80px 0px -60% 0px',threshold:0});
    sections.forEach(el=>observer.observe(el));return()=>observer.disconnect();
  },[key,active,mode]);
  useEffect(()=>{
    if(!active||notesRequest<=openedRequest.current )return;
    // 等导航的滚动复位完成后定位笔记，保留同一份编辑状态。
    const frame=requestAnimationFrame(()=>{openedRequest.current=notesRequest;openNotes();});
    return()=>cancelAnimationFrame(frame);
  },[notesRequest,active]);
  const changeChapter=index=>{setChapter(index);setDrawer(null);requestAnimationFrame(()=>{const section=document.getElementById('chapter-panel-'+index);jumpTo(section);});};
  if(!paper)return <div className="wb-empty">选择一篇论文，查看方法、结果与证据。</div>;
  const change=(field,value)=>{setDraft(s=>({...s,[field]:value}));setDirty(true);};
  const save=async()=>{setBusy(true);try{const saved=await store.update(key,draft,baseline.current);const value=saved[key]||draft;baseline.current={...value};setDraft({read_status:value.read_status||'待读',text:value.text||'',questions:value.questions||''});setDirty(false);setError('');}catch(e){setError(e.message);}finally{setBusy(false);}};
  const noteEditor=<div className="wb-note-box" ref={notesRef}><section aria-label="我的阅读记录">
      <header><button disabled={!store.loaded||busy||store.saving} aria-label={n.star?'取消收藏':'收藏论文'} onClick={()=>store.update(key,{star:!n.star}).catch(e=>setError(e.message))}>{n.star?'★ 已收藏':'☆ 收藏'}</button></header>
      <label>个人阅读状态<select disabled={!store.loaded||busy||store.saving} value={draft.read_status} onChange={e=>change('read_status',e.target.value)}>{['待读','在读','已读'].map(s=><option key={s}>{s}</option>)}</select></label>
      <label>我的笔记<textarea aria-label="我的笔记" disabled={!store.loaded||busy||store.saving} rows="4" value={draft.text} onChange={e=>change('text',e.target.value)} placeholder="用自己的话记录：这篇论文解决了什么，哪些方法值得借鉴？"/></label>
      <label>留给导师 / 下次阅读的问题<textarea aria-label="留给导师 / 下次阅读的问题" disabled={!store.loaded||busy||store.saving} rows="2" value={draft.questions} onChange={e=>change('questions',e.target.value)} placeholder="例如：研究区是否适合青藏高原？真值是否包含被遮挡的树？"/></label>
      <div className="wb-save"><button className={fullDirty?'':'wb-primary'} onClick={save} disabled={!store.loaded||busy||store.saving}>保存阅读记录</button><span role="status">{dirty?'有未保存草稿；切换论文前请保存。':store.message}</span></div>{error&&<p role="alert">{error}</p>}
    </section></div>;
  return <div ref={motionRoot} className={'wb-detail'+(focus?' is-reader-focus':'')} data-outline={outline&&!focus} data-notes={notesOpen&&!focus}>
    <ReaderNavigation mode={mode} onMode={()=>{if(fullDirty){setError("请先保存或取消原文批注草稿。");return;}setMode(v=>v==='record'?'fulltext':'record');}} title={paper.title_zh||paper.title} outline={outline} notesOpen={notesOpen} drawer={drawer} focus={focus} onFocus={onFocus} onNotes={openNotes} onOutline={()=>{if(focus)onFocus();if(innerWidth<1024)setDrawer('outline');else setOutline(s=>!s);}} onPrevious={onPrevious} onNext={onNext} position={position} total={total} origin={origin} onBack={onBack} onLibrary={onLibrary}/>
    {fullDirty&&error&&<p role="alert">{error}</p>}
    {mode==='fulltext'&&<FulltextReader key={key} paper={paper} focus={focus} outline={outline} notesOpen={notesOpen} drawer={drawer} setDrawer={setDrawer} setOutline={setOutline} setNotesOpen={setNotesOpen} onFocus={onFocus} onDirty={setFullDirty} noteEditor={noteEditor}/>}
    {mode==='record'&&<div className="rt-reader-layout">
    <ReaderPanel kind="outline" title="目录" open={outline&&!focus} drawer={drawer==='outline'} onClose={resizing=>{setDrawer(null);if(!resizing)setOutline(false);}}>
      <nav aria-label="论文目录">{CHAPTERS.map((title,i)=><button key={title} aria-current={chapter===i?'location':undefined} onClick={()=>changeChapter(i)}><span>0{i+1}</span>{title}</button>)}</nav>
    </ReaderPanel>
    <article className="rt-prose" aria-label="文献正文">
    <div className="rn-paper-header" key={key}>
    <div className="wb-detail-top"><span>{paper.id} · {paper.year} · {paper.journal}</span><button onClick={()=>onCompare(paper)}>{selected?'移出对比':'加入对比'}</button></div>
    <h1>{paper.title_zh||paper.title}</h1><p className="wb-original-title" lang="en">{paper.title}</p>
    <p className="wb-muted">{paper.authors}</p>
    <div className="wb-tags"><span>{paper.region_scope||'待核'}</span><span>{paper.relevance_tier||'待核'}</span><span>AI：{paper.ai_status||paper.reading_depth}</span></div>
    <div className="wb-link-row">{safeUrl(paper.source_url)&&<a href={safeUrl(paper.source_url)} target="_blank" rel="noreferrer">论文来源 ↗</a>}{safeUrl(paper.fulltext_url)&&<a href={safeUrl(paper.fulltext_url)} target="_blank" rel="noreferrer">全文入口 ↗</a>}<span>DOI：{paper.doi||'未提供'}</span></div>
    </div>
    <div className="rn-content" ref={panelRef}>
    <DataComponent id="paper-detail-evidence" title="文献内容与证据" queryId="papers" variant="plain" displayRows={[paper]} sourceRows={[paper]}>
      {GROUPS.map(([index,title,fields],i)=><section data-reader-section={i} aria-label={title} id={'chapter-panel-'+i} key={index} className="wb-field-section" tabIndex="0"><h2><span>{index}</span>{title}</h2><dl className="wb-fields" data-reviewed-rows>{fields.map(([label,field])=><div key={field} className={field==='innovation_hypothesis'?'wb-hypothesis':''}><dt>{label}</dt><dd>{asText(paper[field])}</dd></div>)}</dl></section>)}
      <section data-reader-section="3" aria-label="原文证据" id="chapter-panel-3" tabIndex="0" className="rn-evidence-panel"><h2><span>04</span>原文证据</h2><p>原记录范围：{paper.reading_depth}。AI核读范围与个人阅读状态分别保存。</p>{paper.classification_note&&<p>{paper.classification_note}</p>}{(paper.evidence||[]).map((e,i)=><div className="rn-evidence-card" key={i}><strong>{e.section||e.locator||'来源定位未提供'} · {e.kind}</strong><p>{e.claim}</p>{safeUrl(e.url)&&<a href={safeUrl(e.url)} target="_blank" rel="noreferrer">查看证据来源 ↗</a>}</div>)}{!paper.evidence?.length&&<p>本记录尚无独立证据定位条目，请从论文来源核对。</p>}
      {paper.template_fields&&<details className="wb-evidence"><summary>原模板字段</summary><dl className="wb-fields">{Object.entries(paper.template_fields).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{asText(v)}</dd></div>)}</dl></details>}</section>
    </DataComponent>
    <div className="rn-chapter-next"><span>当前章节 {chapter+1} / 4</span>{chapter<3?<button onClick={()=>{changeChapter(chapter+1);}}>继续：{CHAPTERS[chapter+1]} <span aria-hidden="true">→</span></button>:<button onClick={openNotes}>写下我的理解 <span aria-hidden="true">↗</span></button>}</div>
    </div>
    </article>
    <ReaderPanel kind="notes" title="我的阅读记录" open={notesOpen&&!focus} drawer={drawer==='notes'} onClose={resizing=>{setDrawer(null);if(!resizing)setNotesOpen(false);}}>
    {noteEditor}</ReaderPanel></div>}
  </div>;
}
