import React,{useLayoutEffect,useRef} from 'react';
import {gsap,own,keep,release} from './引擎.js';
import {DURATION,EASE,conditions,markers} from './配置.js';
export default function DisplayCount({value}){
 const ref=useRef(null);
 useLayoutEffect(()=>{const root=ref.current,mm=gsap.matchMedia();
  mm.add(conditions,c=>{
   if(c.conditions.reduce){root.textContent=String(value);return;}
   const number={value:0},name='文献数量-'+value;
   const tl=keep(name,gsap.timeline({defaults:{duration:DURATION.hero,ease:EASE.enter},scrollTrigger:{id:'research-count',trigger:root,start:'top 90%',end:'bottom top',once:true,markers}}));
   tl.to(number,{value,snap:{value:1},onUpdate:()=>{root.textContent=String(number.value);}});
   return()=>{root.textContent=String(value);release(name,tl);};
  },root);return own(()=>mm.revert());
 },[value]);
 return <span aria-label={String(value)}><span aria-hidden="true" ref={ref}>{value}</span></span>;
}
