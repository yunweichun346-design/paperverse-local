import React,{useState,useRef} from 'react';
import {useDataApp} from '../../本机组件.jsx';
import {useHeroMotion} from './动效/首页动效.js';
import ReadingFlow from './动效/路径/阅读流程.jsx';
import SatelliteImage from './卫星影像.jsx';

export default function ResearchImage({onSearch}){
 const {snapshot}=useDataApp(),key=snapshot.id+':research-image';
 const [visible,setVisible]=useState(()=>{try{return sessionStorage.getItem(key)!=='hidden';}catch{return true;}});
 const root=useRef(null);useHeroMotion(root,visible);
 const toggle=()=>{setVisible(!visible);try{sessionStorage.setItem(key,visible?'hidden':'visible');}catch{}};
 return <section ref={root} className="rt-research-image" aria-label="青藏高原遥感影像">
  {visible&&<div className="rt-scene-layout">
   <div className="rt-scene-copy"><span>区域影像 · Landsat</span><h2><span className="motion-line-mask"><span data-hero-line>青藏高原，</span></span><span className="motion-line-mask"><span data-hero-line>森林与遥感。</span></span></h2><p><span data-word>围绕树木密度，</span><span data-word>检索文献、</span><span data-word>比较方法、</span><span data-word>记录研究问题。</span></p><button onClick={onSearch}>查找文献 <span aria-hidden="true">↓</span><svg className="motion-underline" viewBox="0 0 80 8" aria-hidden="true"><path data-underline d="M2 5 Q39 2 78 5"/></svg></button></div>
   <SatelliteImage/>
  </div>}
  {visible&&<ReadingFlow/>}
  <button className="rt-scene-toggle" aria-expanded={visible} onClick={toggle}>{visible?'收起遥感影像':'展开遥感影像'}</button>
 </section>;
}
