import React,{useEffect,useState} from 'react';
import {Dialog} from '../../本机组件.jsx';
import ReadingSettings from './阅读设置.jsx';
import MotionPanel from './动效/面板.jsx';
export const CHAPTERS=['研究概览','数据与方法','结果与启发','原文证据'];
export function ReaderPanel({kind,title,open,drawer,onClose,children}){
 const [compact,setCompact]=useState(()=>innerWidth<(kind==='outline'?1024:1280));
 useEffect(()=>{const media=matchMedia(kind==='outline'?'(max-width:1023px)':'(max-width:1279px)');const sync=()=>{setCompact(media.matches);onClose(true);};media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[kind]);
 if(compact)return <Dialog open={drawer} title={title} className={'rt-drawer rt-drawer-'+kind} onClose={()=>onClose()} showClose={false} headerActions={<button aria-label={'关闭'+title} onClick={()=>onClose()}>关闭</button>} initialFocusSelector={kind==='notes'?'textarea':'button'}>{drawer&&<MotionPanel kind={kind}>{children}</MotionPanel>}</Dialog>;
 return <aside id={'reader-'+kind} className={'rt-panel rt-panel-'+kind} hidden={!open}><header><strong>{title}</strong><button onClick={()=>onClose()} aria-label={'收起'+title}>收起</button></header>{children}</aside>;
}
export default function ReaderNavigation({title,mode,onMode,outline,notesOpen,drawer,focus,onFocus,onNotes,onOutline,onPrevious,onNext,position,total,origin,onBack,onLibrary}){
 const [width,setWidth]=useState(()=>innerWidth);
 useEffect(()=>{const queries=[matchMedia('(min-width:1024px)'),matchMedia('(min-width:1280px)')],sync=()=>setWidth(innerWidth);queries.forEach(q=>q.addEventListener('change',sync));return()=>queries.forEach(q=>q.removeEventListener('change',sync));},[]);
 return <div className="rn-toolbar" role="toolbar" aria-label="文献阅读工具">
  <span className="motion-reader-progress" data-reading-progress aria-hidden="true"/>
  <button onClick={onLibrary}>返回文献库</button>
  <button aria-pressed={mode==='fulltext'} onClick={onMode}>{mode==='fulltext'?'整理记录':'论文全文'}</button>
  <button onClick={onOutline} aria-expanded={width<1024?drawer==='outline':outline&&!focus} aria-controls="reader-outline">目录</button>
  <div className="rn-paging"><button aria-label="上一篇论文" onClick={onPrevious} disabled={position<=0}>‹</button><span>{position>=0?position+1:0} / {total}</span><button aria-label="下一篇论文" onClick={onNext} disabled={position<0||position>=total-1}>›</button></div>
  <span className="rt-toolbar-title" title={title}>{title}</span>
  <div className="rn-tools">{origin&&<button onClick={onBack}>返回期刊合集</button>}<ReadingSettings/><button onClick={onNotes} aria-label="打开阅读笔记" aria-expanded={width<1280?drawer==='notes':notesOpen&&!focus} aria-controls="reader-notes">笔记</button><button aria-pressed={focus} onClick={onFocus}>{focus?'退出专注':'专注阅读'}</button></div>
 </div>;
}
