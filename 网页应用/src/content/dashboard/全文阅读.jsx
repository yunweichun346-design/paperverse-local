import React,{useEffect,useRef,useState} from 'react';
import {jumpTo} from './动效/滚动/引用定位.js';
import {ReaderPanel} from './阅读导航.jsx';
import {pdfEngine,useFulltext,destination,outlineRows} from './全文数据.js';
import PdfPage from './全文页面.jsx';
import Annotations from './原文批注.jsx';
import {preparePdfPrint} from './全文打印.js';
import './全文阅读.css';

export default function FulltextReader({paper,focus,outline,notesOpen,drawer,setDrawer,setOutline,setNotesOpen,onFocus,onDirty,noteEditor}){
 const store=useFulltext(paper),[pdf,setPdf]=useState(null),[toc,setToc]=useState([]),[error,setError]=useState(''),[page,setPage]=useState(1),[zoom,setZoom]=useState(1);
 const [draft,setDraft]=useState(null),[selected,setSelected]=useState(''),[reference,setReference]=useState(null),[query,setQuery]=useState(''),[matches,setMatches]=useState([]),[searchBusy,setSearchBusy]=useState(false);
 const referenceRequest=useRef(0),searchRequest=useRef(0),lastLink=useRef(null);
 useEffect(()=>{searchRequest.current++;setMatches([]);setSearchBusy(false);},[query]);
 const printJob=useRef(null),[printing,setPrinting]=useState('');
 useEffect(()=>()=>{printJob.current?.abort();printJob.current?.dispose?.();},[]);
 const printFull=async()=>{const job=new AbortController();printJob.current=job;setPrinting('准备打印…');try{const ready=await preparePdfPrint(pdf,(n,total)=>setPrinting('准备打印 '+n+' / '+total),job.signal);job.dispose=ready.dispose;ready.frame.contentWindow.addEventListener('afterprint',ready.dispose,{once:true});ready.frame.contentWindow.focus();ready.frame.contentWindow.print();}catch(e){if(!job.signal.aborted)setError(e.message);}finally{setPrinting('');}};
 useEffect(()=>{const key=e=>{if(pdf&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='p'){e.preventDefault();if(!printing)printFull();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[pdf,printing]);
 useEffect(()=>{onDirty(Boolean(draft));return()=>onDirty(false);},[draft]);
 useEffect(()=>{const unload=e=>{if(draft){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[draft]);
 useEffect(()=>{if(!store.file)return;let live=true,task;setPdf(null);setError('');setReference(null);setMatches([]);
  (async()=>{try{const engine=await pdfEngine();if(!live)return;task=engine.getDocument({url:store.file.url,cMapUrl:'/阅读引擎/cmaps/',cMapPacked:true,standardFontDataUrl:'/阅读引擎/standard_fonts/',wasmUrl:'/阅读引擎/wasm/',isEvalSupported:false});const document=await task.promise;if(!live)return;setPdf(document);setToc(await outlineRows(document));}catch(e){if(live)setError('全文无法显示：'+e.message);}})();
  return()=>{live=false;task?.destroy();};
 },[store.file]);
 const go=(number,relativeY=0)=>{setDrawer(null);setPage(number);requestAnimationFrame(()=>{const target=document.getElementById('pdf-page-'+number);jumpTo(target,relativeY);});};
 const openNotes=()=>{if(focus)onFocus();if(innerWidth<1280)setDrawer('notes');else setNotesOpen(true);};
 const edit=value=>{if(!store.ready){setError('批注尚未载入，请稍后再试。');return;}if(draft&&draft.id!==value.id){setError('请先保存或取消当前批注草稿。');return;}setDraft({text:'',color:'yellow',created_at:new Date().toISOString(),...value});setError('');openNotes();};
 const select=value=>edit({id:crypto.randomUUID(),...value});
 const locateAnnotation=id=>{setSelected(id);openNotes();requestAnimationFrame(()=>document.getElementById('annotation-'+id)?.focus({preventScroll:false}));};
 const save=async()=>{const {id,...note}=draft;if(await store.save({...store.annotations.notes,[id]:note})){setSelected(id);setDraft(null);}};
 const showReference=async(link,pdfDocument,from,jump)=>{const request=++referenceRequest.current;lastLink.current=document.activeElement;try{
  const resolved=await destination(pdfDocument,link.dest);if(!resolved)return;
  const targetPage=await pdfDocument.getPage(resolved.page),content=await targetPage.getTextContent({disableNormalization:true}),height=targetPage.getViewport({scale:1}).height;
  const y=resolved.target[1]?.name==='XYZ'?resolved.target[3]:null;
  const items=content.items.filter(x=>x.str),index=y==null?0:items.reduce((best,item,i)=>Math.abs(item.transform[5]-y)<Math.abs(items[best].transform[5]-y)?i:best,0);
  if(request!==referenceRequest.current)return;
  const relativeY=y==null?0:Math.max(0,1-y/height);
  setReference({page:resolved.page,from,text:items.slice(index,index+12).map(x=>x.str).join(' '),relativeY,returnY:scrollY});
  if(jump)go(resolved.page,relativeY);
 }catch{setError('该引用无法定位，可按参考文献页码查找。');}};
 const closeReference=()=>{setReference(null);lastLink.current?.focus?.({preventScroll:true});};
 useEffect(()=>{const key=e=>{if(e.key==='Escape'&&reference){e.preventDefault();closeReference();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[reference]);
 const search=async e=>{e.preventDefault();const request=++searchRequest.current;setSearchBusy(true);const found=[];try{if(query.trim())for(let i=1;i<=pdf.numPages;i++){const content=await(await pdf.getPage(i)).getTextContent({disableNormalization:true});if(request!==searchRequest.current)return;if(content.items.map(x=>x.str||'').join(' ').toLowerCase().includes(query.trim().toLowerCase()))found.push(i);}setMatches(found);if(found.length)go(found[0]);}catch(e){setError(e.message);}finally{if(request===searchRequest.current)setSearchBusy(false);}};
 const annotateMatch=()=>{const span=document.querySelector('#pdf-page-'+page+' .pdf-match');if(!span?.firstChild){setError('当前页尚无可选择的匹配文字，请先定位一个匹配页。');return;}const at=span.textContent.toLowerCase().indexOf(query.trim().toLowerCase()),range=document.createRange();range.setStart(span.firstChild,at);range.setEnd(span.firstChild,at+query.trim().length);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);span.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));};
 return <div className="rt-reader-layout pdf-reader-layout">
  <ReaderPanel kind="outline" title="全文目录" open={outline&&!focus} drawer={drawer==='outline'} onClose={resizing=>{setDrawer(null);if(!resizing)setOutline(false);}}>
   <nav aria-label="全文目录">{toc.length?toc.map((item,i)=><button key={i} aria-current={page>=item.page&&page<(toc[i+1]?.page||Infinity)?'location':undefined} onClick={()=>go(item.page)}>{item.title}</button>):pdf&&<p>此PDF未提供目录，可按页码定位。</p>}</nav>
  </ReaderPanel>
  <article className="pdf-main" aria-label="论文PDF全文"><h1>{paper.title_zh||paper.title}</h1>
   <label className="pdf-import">{store.file?'关联另一份 PDF':'选择论文 PDF'}<input type="file" accept="application/pdf,.pdf" disabled={!store.base||store.busy||Boolean(draft)} onChange={e=>{const input=e.target.files[0];if(input)store.importPdf(input);e.target.value='';}}/></label>
   <p className="pdf-file-caption">{store.file?.name||'选择已下载的原论文，全文与批注保存在本机。'}{store.busy?' · 正在保存…':''}</p>
   {(error||store.error)&&<p role="alert">{error||store.error}</p>}
   {store.error&&!draft&&<button onClick={store.reload}>重新载入全文与批注</button>}
   {pdf&&<>
    <div className="pdf-toolbar" role="toolbar" aria-label="PDF阅读操作"><label>页码<input type="number" min="1" max={pdf.numPages} value={page} onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=pdf.numPages)go(n);}}/></label><span>/ {pdf.numPages}</span><button aria-label="缩小全文" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-.25))}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label="放大全文" disabled={zoom>=3} onClick={()=>setZoom(v=>Math.min(3,v+.25))}>＋</button><button onClick={()=>setZoom(1)}>适应宽度</button><button disabled={Boolean(printing)} onClick={printFull}>{printing||'打印全文'}</button>{printing&&<button onClick={()=>printJob.current?.abort()}>取消准备</button>}<a href={store.file.url} target="_blank" rel="noreferrer">打开原文 / 打印 ↗</a></div>
    <form className="pdf-search" onSubmit={search}><input aria-label="查找PDF原文" value={query} onChange={e=>setQuery(e.target.value)} placeholder="查找原文"/><button disabled={searchBusy}>{searchBusy?'查找中…':'查找'}</button><span role="status">{matches.length?'匹配页：'+matches.length+' 页':''}</span>{matches.length>0&&<><select aria-label="匹配页码" value={matches.includes(page)?page:''} onChange={e=>go(Number(e.target.value))}><option value="" disabled>选择匹配页</option>{matches.map(n=><option key={n} value={n}>第 {n} 页</option>)}</select><button type="button" onClick={annotateMatch}>批注当前匹配</button></>}</form>
    <p className="pdf-file-caption">PDF保留原版式；放大后可横向移动查看。扫描件如无文本层，无法选词批注。</p>
    <div className="pdf-scroll"><div className="pdf-pages" style={{width:zoom*100+'%'}}>{Array.from({length:pdf.numPages},(_,i)=><PdfPage key={i} pdf={pdf} number={i+1} zoom={zoom} annotations={Object.entries(store.annotations.notes).filter(([,n])=>n.page===i+1)} onSelect={select} onAnnotation={locateAnnotation} onReference={showReference} onVisible={setPage} search={query.trim()}/>)}</div></div>
   </>}
  </article>
  <ReaderPanel kind="notes" title="批注与阅读记录" open={notesOpen&&!focus} drawer={drawer==='notes'} onClose={resizing=>{setDrawer(null);if(!resizing)setNotesOpen(false);}}>
   <Annotations records={store.annotations.notes} draft={draft} setDraft={setDraft} selected={selected} onLocate={(id,n)=>{setSelected(id);go(n.page,n.rects[0][1]);}} onEdit={edit} onSave={save} busy={store.busy} error={store.error}/>{noteEditor}
  </ReaderPanel>
  {reference&&<aside className="pdf-reference-preview" aria-label="引用原文预览"><strong>第 {reference.page} 页原文</strong><p>{reference.text}</p><button onClick={()=>go(reference.page,reference.relativeY)}>跳转引用</button> <button onClick={()=>{const y=reference.returnY;closeReference();scrollTo({top:y,behavior:'instant'});}}>返回原位置</button> <button onClick={closeReference}>关闭引用预览</button></aside>}
 </div>;
}
