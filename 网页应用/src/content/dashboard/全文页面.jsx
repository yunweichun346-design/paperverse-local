import {useHighlightMotion} from './动效/批注动效.js';
import React,{useEffect,useRef,useState} from 'react';
import {pdfEngine} from './全文数据.js';
export default function PdfPage({pdf,number,zoom,annotations,onSelect,onAnnotation,onReference,onVisible,search}){
 const host=useRef(null),canvas=useRef(null),text=useRef(null),searchRef=useRef(search),[near,setNear]=useState(false),[ratio,setRatio]=useState(1.414),[links,setLinks]=useState([]),[error,setError]=useState(''),[rendered,setRendered]=useState(false);
 useHighlightMotion(host,annotations.map(([id])=>id).join('|'));
 searchRef.current=search;
 useEffect(()=>{text.current.querySelectorAll('span').forEach(span=>span.classList.toggle('pdf-match',Boolean(search&&span.textContent.toLowerCase().includes(search.toLowerCase()))));},[search,rendered]);
 // 快速跳页时同一批通知可能包含进入与离开，必须采用最后的可见状态。
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{setNear(entries.at(-1).isIntersecting);},{rootMargin:'900px'});observer.observe(host.current);const active=new IntersectionObserver(entries=>{if(entries.at(-1).isIntersecting)onVisible(number);},{rootMargin:'-80px 0px -60% 0px'});active.observe(host.current);return()=>{observer.disconnect();active.disconnect();};},[pdf,number]);
 useEffect(()=>{let live=true;pdf.getPage(number).then(page=>{if(live){const v=page.getViewport({scale:1});setRatio(v.height/v.width);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[pdf,number]);
 useEffect(()=>{
  if(!near){setRendered(false);canvas.current.width=1;canvas.current.height=1;text.current.replaceChildren();return;}
  let cancelled=false,renderTask,textTask,timer,generation=0;
  const draw=async()=>{try{
   const current=++generation;
   renderTask?.cancel();textTask?.cancel();
   await renderTask?.promise.catch(()=>{});
   const engine=await pdfEngine(),page=await pdf.getPage(number);if(cancelled||current!==generation)return;
   const original=page.getViewport({scale:1}),viewport=page.getViewport({scale:host.current.clientWidth/original.width});
   const dpr=Math.min(devicePixelRatio,2);canvas.current.width=Math.floor(viewport.width*dpr);canvas.current.height=Math.floor(viewport.height*dpr);
   renderTask=page.render({canvasContext:canvas.current.getContext('2d'),viewport,transform:[dpr,0,0,dpr,0,0]});await renderTask.promise;if(cancelled)return;
   text.current.replaceChildren();text.current.style.setProperty('--scale-factor',viewport.scale);
   const content=await page.getTextContent({disableNormalization:true});if(cancelled)return;
   textTask=new engine.TextLayer({textContentSource:content,container:text.current,viewport});await textTask.render();if(cancelled)return;
   text.current.querySelectorAll('span').forEach(span=>span.classList.toggle('pdf-match',Boolean(searchRef.current&&span.textContent.toLowerCase().includes(searchRef.current.toLowerCase()))));
   const raw=await page.getAnnotations();if(cancelled)return;
   setLinks(raw.filter(a=>a.subtype==='Link'&&(a.dest||/^https?:\/\//i.test(a.url||''))).map(a=>{const r=viewport.convertToViewportRectangle(a.rect);return {...a,box:[Math.min(r[0],r[2])/viewport.width,Math.min(r[1],r[3])/viewport.height,Math.abs(r[2]-r[0])/viewport.width,Math.abs(r[3]-r[1])/viewport.height]};}));
   setRendered(true);setError('');
  }catch(e){if(!cancelled&&!['RenderingCancelledException','AbortException'].includes(e.name))setError('页面显示失败：'+e.message);}};
  const resize=new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(draw,100);});resize.observe(host.current);draw();
  return()=>{cancelled=true;clearTimeout(timer);resize.disconnect();renderTask?.cancel();textTask?.cancel();};
 },[pdf,number,near,zoom]);
 const select=event=>{if(event.target.closest('button,a'))return;const selection=getSelection();if(!selection?.rangeCount||selection.isCollapsed||!text.current.contains(selection.anchorNode)||!text.current.contains(selection.focusNode))return;
  const quote=selection.toString().trim();if(!quote)return;const box=host.current.getBoundingClientRect();
  const rects=[...selection.getRangeAt(0).getClientRects()].filter(r=>r.width>1&&r.height>1).map(r=>[Math.max(0,(r.left-box.left)/box.width),Math.max(0,(r.top-box.top)/box.height),Math.min(r.width/box.width,1),Math.min(r.height/box.height,1)]).filter(r=>r[0]+r[2]<=1.001&&r[1]+r[3]<=1.001);
  if(rects.length&&rects.length<=300){onSelect({page:number,quote,rects});selection.removeAllRanges();}
 };
 const rectStyle=r=>({left:r[0]*100+'%',top:r[1]*100+'%',width:r[2]*100+'%',height:r[3]*100+'%'});
 return <section id={'pdf-page-'+number} ref={host} className="pdf-page" aria-label={'原文第'+number+'页'} tabIndex={-1} style={{aspectRatio:1/ratio}} onPointerUp={select} onKeyUp={select}>
  <canvas ref={canvas} aria-label={'PDF第'+number+'页原始版面'}/><div ref={text} className="textLayer"/>
  {!rendered&&<p className="pdf-page-status">{error||'第 '+number+' 页'}</p>}
  <div className="pdf-highlights">{annotations.flatMap(([id,n])=>n.rects.map((r,i)=><button key={id+'-'+i} className={'pdf-highlight pdf-'+n.color} style={rectStyle(r)} aria-label={'批注：'+(n.text||n.quote)} onClick={()=>onAnnotation(id)} />))}</div>
  {links.map(a=>a.dest?<button key={a.id} className="pdf-reference-link" style={rectStyle(a.box)} aria-label={'查看第'+number+'页内部引用'} onMouseEnter={()=>onReference(a,pdf,number,false)} onFocus={()=>onReference(a,pdf,number,false)} onClick={()=>onReference(a,pdf,number,true)}/>:<a key={a.id} className="pdf-reference-link" style={rectStyle(a.box)} href={a.url} target="_blank" rel="noreferrer" aria-label={'打开论文链接：'+a.url}/>)}
 </section>;
}
