import React,{useLayoutEffect,useRef} from 'react';
import {gsap,own,keep,release} from './引擎.js';
import {conditions,DURATION,EASE} from './配置.js';
export default function MotionPanel({kind,children}){
 const ref=useRef(null);
 useLayoutEffect(()=>{const mm=gsap.matchMedia();mm.add(conditions,c=>{
  const mobile=c.conditions.mobile,move=c.conditions.reduce?0:24,name=kind==='notes'?'批注面板':'目录面板';
  const tl=keep(name,gsap.timeline({defaults:{duration:DURATION.panel,ease:EASE.enter}}).fromTo(ref.current,{opacity:0,x:mobile?0:move,y:mobile?move:0},{opacity:1,x:0,y:0,clearProps:'opacity,transform'}));
  return()=>release(name,tl);
 },ref.current);return own(()=>mm.revert());},[kind]);
 return <div id={'reader-'+kind} ref={ref}>{children}</div>;
}
