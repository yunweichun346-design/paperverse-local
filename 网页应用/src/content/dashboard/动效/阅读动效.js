import {useLayoutEffect} from 'react';
import {gsap,keep,release,own,refreshAfterLayout} from './引擎.js';
import {EASE,DURATION,conditions,markers} from './配置.js';
import {stopJump} from './滚动/引用定位.js';
export function useReaderMotion(ref,{active,key,mode,outline,notesOpen,drawer,chapter}){
 useLayoutEffect(()=>{if(!active||!ref.current)return;const root=ref.current,mm=gsap.matchMedia();
  mm.add(conditions,c=>{
   const {reduce}=c.conditions,body=root.querySelector('.rt-prose,.pdf-main'),toc=root.querySelector('.rt-panel-outline'),toolbar=root.querySelector('.rn-toolbar');
   const tl=keep('阅读入场',gsap.timeline({defaults:{duration:DURATION.reader,ease:EASE.enter}}));
   if(body)tl.fromTo(body,{opacity:0},{opacity:1,clearProps:'opacity'},0);
   if(toc&&!toc.hidden)tl.fromTo(toc,{opacity:0,x:reduce?0:-16},{opacity:1,x:0,clearProps:'opacity,transform'},.1);
   tl.fromTo(toolbar,{opacity:0},{opacity:1,clearProps:'opacity'},.25);
   const bar=toolbar.querySelector('[data-reading-progress]');
   // 只有进度线与滚动联动；正文、目录和PDF不做滚动位移或缩放。
   const progress=reduce?gsap.set(bar,{scaleX:1}):gsap.fromTo(bar,{scaleX:0},{scaleX:1,ease:'none',scrollTrigger:{id:'research-reader-progress',trigger:root,start:'top top',end:'bottom bottom',scrub:true,markers}});
   return()=>{release('阅读入场',tl);progress.scrollTrigger?.kill();};
  },root);
  const refresh=refreshAfterLayout(root);return own(()=>{refresh();mm.revert();stopJump();});
 },[active,key,mode]);
 useLayoutEffect(()=>{if(!active||!ref.current||drawer)return;const root=ref.current,mm=gsap.matchMedia();
  mm.add(conditions,c=>{const panel=root.querySelector('.rt-panel-notes:not([hidden])');if(!panel)return;
   const tl=keep('批注面板',gsap.timeline({defaults:{duration:DURATION.panel,ease:EASE.enter}}).fromTo(panel,{opacity:0,x:c.conditions.reduce?0:24},{opacity:1,x:0,clearProps:'opacity,transform'}));return()=>release('批注面板',tl);
  },root);return own(()=>mm.revert());
 },[active,notesOpen,drawer,mode]);
 useLayoutEffect(()=>{if(!active||!ref.current)return;const mm=gsap.matchMedia();mm.add(conditions,()=>{const item=ref.current.querySelector('[aria-current=location],[aria-current=true]');if(item)gsap.fromTo(item,{opacity:.65},{opacity:1,duration:DURATION.focus,clearProps:'opacity'});},ref.current);return own(()=>mm.revert());},[active,chapter,outline]);
}
