import React,{useEffect,useRef,useState} from 'react';
import {Dialog,Icon} from '../../本机组件.jsx';
import {useImageViewport} from './影像视图控制.js';
import './卫星影像.css';

const SOURCE='https://science.nasa.gov/earth/earth-observatory/braided-river-in-tibet-redraws-its-channels-154747/';
const FULL='/影像/雅鲁藏布江_20250208_原图.jpg';
const PREVIEW='/影像/雅鲁藏布江_20250208_展示.webp';
export function ImageSource(){
  return <details className="geo-source"><summary>影像来源</summary><div>
    <p>雅鲁藏布江扎囊段与周边山地 · 2025-02-08</p>
    <p>Landsat 假彩色合成：短波红外、近红外与蓝光。用于青藏高原区域背景展示，不是森林密度成果或个人样地。</p>
    <p>NASA Earth Observatory image by Michala Garrison, using Landsat data from the U.S. Geological Survey.</p>
    <a href={SOURCE} target="_blank" rel="noreferrer">查看 NASA 原始说明 <Icon name="arrowUpRight" size={14}/></a>
  </div></details>;
}
function ImageCanvas(){
  const stage=useRef(null),image=useRef(null),[loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const view=useImageViewport(stage,image);
  return <div className="geo-viewer-body">
    <div className="geo-viewer-controls" role="group" aria-label="影像查看操作">
      <button disabled={!loaded||view.status.zoom>=view.status.max-.001} onClick={()=>view.zoom(1.5)}>放大</button>
      <button disabled={!loaded||view.status.zoom<=1.001} onClick={()=>view.zoom(1/1.5)}>缩小</button>
      <button disabled={!loaded} onClick={view.reset}>复位</button>
      <span role="status">{loaded?Math.round(view.status.zoom*100)+'% · 适应窗口为 100%':'加载完整影像'}</span>
    </div>
    <div ref={stage} className="geo-image-stage" tabIndex={0} role="region" aria-label="卫星影像；加减键缩放，方向键平移，Home 复位" {...view.events}>
      {!loaded&&!failed&&<div className="geo-image-loading" role="status">正在加载完整尺寸影像…</div>}
      {failed?<div className="geo-image-error" role="alert"><p>影像暂时无法加载。</p><button onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>重试完整影像</button><a href={SOURCE} target="_blank" rel="noreferrer">查看原始来源</a></div>:
        <img ref={image} key={attempt} src={FULL+(attempt?'?retry='+attempt:'')} alt="2025年2月8日雅鲁藏布江扎囊段 Landsat 假彩色影像，完整范围" draggable="false"
          style={{visibility:loaded?'visible':'hidden'}} onLoad={()=>{setLoaded(true);view.measure();}} onError={()=>{setLoaded(false);setFailed(true);}}/>}
    </div>
    <p className="geo-viewer-hint">放大后拖动查看；按 + / - 缩放、方向键平移、Home 复位。最大倍率受原图像素限制。</p>
    <ImageSource/>
  </div>;
}
export default function SatelliteImage(){
  const [open,setOpen]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const scrollPosition=useRef(null),restoreFrame=useRef(0);
  useEffect(()=>()=>cancelAnimationFrame(restoreFrame.current),[]);
  const show=()=>{cancelAnimationFrame(restoreFrame.current);scrollPosition.current={left:scrollX,top:scrollY};setOpen(true);};
  const close=()=>{setOpen(false);restoreFrame.current=requestAnimationFrame(()=>{if(scrollPosition.current)window.scrollTo({...scrollPosition.current,behavior:'instant'});});};
  return <figure className="geo-media">
    {failed?<div className="geo-preview-error" role="alert"><p>区域影像暂时无法加载，文献仍可阅读。</p><button onClick={()=>{setFailed(false);setAttempt(n=>n+1);}}>重试影像</button><a href={SOURCE} target="_blank" rel="noreferrer">查看原始来源</a></div>:
      <button className="geo-image-open" aria-label="查看卫星影像大图" onClick={show}>
        <img key={attempt} src={PREVIEW+(attempt?'?retry='+attempt:'')} alt="青藏高原雅鲁藏布江扎囊段及周边山地的真实卫星影像" fetchPriority="high" width="1566" height="1600" onError={()=>setFailed(true)}/>
        <span className="geo-image-open-icon"><Icon name="arrowUpRight" size={22}/></span>
      </button>}
    <figcaption><strong>青藏高原区域背景</strong><span>雅鲁藏布江扎囊段 · 2025-02-08</span><span>Landsat 假彩色影像</span></figcaption>
    <ImageSource/>
    <Dialog open={open} onClose={close} title="雅鲁藏布江卫星影像" className="geo-image-dialog" expanded showClose={false}
      initialFocusSelector=".geo-image-close" headerActions={<button className="geo-image-close" aria-label="关闭影像" onClick={close}><Icon name="cross" size={20}/></button>}>
      {open&&<ImageCanvas/>}
    </Dialog>
  </figure>;
}
