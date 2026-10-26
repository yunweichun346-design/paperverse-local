import React,{useLayoutEffect,useRef} from 'react';
import {gsap,keep,release,own,refreshAfterLayout} from '../引擎.js';
import {EASE,SCROLL,conditions,markers} from '../配置.js';
const steps=[['检索','定位研究问题与相关文献'],['阅读','核对方法、图表与证据'],['批注','记录原文位置与自己的理解'],['整理','回顾笔记，比较方法与局限']];
export default function ReadingFlow(){
 const ref=useRef(null);
 useLayoutEffect(()=>{const root=ref.current,mm=gsap.matchMedia();
  mm.add(conditions,context=>{
   const {reduce,desktop}=context.conditions,path=root.querySelector('[data-draw]'),dot=root.querySelector('[data-flow-dot]'),nodes=[...root.querySelectorAll('[data-flow-node]')];
   if(reduce||!desktop){gsap.set(path,{drawSVG:'100%'});gsap.set(dot,{opacity:0});return;}
   const svg=path.ownerSVGElement;
   const roundDot=()=>gsap.set(dot,{scaleX:1000/svg.clientWidth,scaleY:110/svg.clientHeight});roundDot();
   const tl=keep('阅读流程',gsap.timeline({defaults:{ease:EASE.scroll,duration:1},scrollTrigger:{id:'research-flow',trigger:root,start:'top 80%',end:'bottom 30%',scrub:SCROLL.path,markers,onRefresh:roundDot}}));
   // 绘制范围覆盖整个流程块，向上滚动沿相同轨迹返回。
   tl.fromTo(path,{drawSVG:'0%'},{drawSVG:'100%'},0).fromTo(dot,{opacity:0},{opacity:1,duration:.03},0)
    .to(dot,{motionPath:{path,align:path,alignOrigin:[.5,.5]},duration:1},0);
   nodes.forEach((node,i)=>tl.fromTo(node,{opacity:.35},{opacity:1,duration:.18},i*.25));
   return()=>release('阅读流程',tl);
  },root);
  const stopRefresh=refreshAfterLayout(root);return own(()=>{stopRefresh();mm.revert();});
 },[]);
 return <section ref={ref} className="motion-flow" aria-label="文献阅读流程" data-anim="flow">
  <svg viewBox="0 0 1000 110" aria-hidden="true" preserveAspectRatio="none"><path data-draw d="M40 55 C160 0 240 110 350 55 S570 0 650 55 S870 110 960 55"/><circle data-flow-dot cx="0" cy="0" r="5"/></svg>
  <ol>{steps.map(([name,description],i)=><li data-flow-node key={name}><span className="motion-step-number">0{i+1}</span><h3>{name}</h3><p>{description}</p></li>)}</ol>
 </section>;
}
