import {gsap,keep,release} from '../引擎.js';
import {DURATION,EASE} from '../配置.js';
export function underlineMotion(root,reduce){
 const path=root.querySelector('[data-underline]'),button=path?.closest('button');if(!button)return()=>{};
 const tl=keep('入口下划线',gsap.timeline({paused:true,defaults:{duration:DURATION.path,ease:EASE.enter}}));
 if(reduce)tl.fromTo(path,{opacity:0},{opacity:1});else tl.fromTo(path,{drawSVG:'0%'},{drawSVG:'100%'});
 const show=()=>tl.play(),hide=()=>{if(!button.matches(':hover,:focus-visible'))tl.reverse();};
 button.addEventListener('pointerenter',show);button.addEventListener('pointerleave',hide);button.addEventListener('focus',show);button.addEventListener('blur',hide);
 return()=>{button.removeEventListener('pointerenter',show);button.removeEventListener('pointerleave',hide);button.removeEventListener('focus',show);button.removeEventListener('blur',hide);tl.revert();release('入口下划线',tl);};
}
