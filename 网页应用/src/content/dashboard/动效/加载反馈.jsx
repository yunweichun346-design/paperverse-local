import React,{useLayoutEffect,useRef} from 'react';
import {gsap,own,keep,release} from './引擎.js';
import {conditions,DURATION,EASE} from './配置.js';
export default function LoadingShimmer(){
 const ref=useRef(null);
 useLayoutEffect(()=>{const mm=gsap.matchMedia();mm.add(conditions,c=>{
  if(c.conditions.reduce)return;
  const tl=keep('加载反馈',gsap.timeline({repeat:-1,defaults:{duration:DURATION.highlight,ease:EASE.transition}}).fromTo(ref.current,{xPercent:-100,opacity:0},{xPercent:100,opacity:.25}).to(ref.current,{opacity:0,duration:DURATION.focus}));
  return()=>release('加载反馈',tl);
 },ref.current);return own(()=>mm.revert());},[]);
 return <span className="motion-loading" aria-hidden="true"><span ref={ref}/></span>;
}
