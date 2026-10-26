import Lenis from 'lenis';
import {gsap,ScrollTrigger,runtime,keep,release} from '../引擎.js';
import {EASE,SCROLL,markers} from '../配置.js';
export function homeScroll(root){
 const lenis=new Lenis({lerp:SCROLL.lerp,eventsTarget:root,autoRaf:false,prevent:node=>Boolean(node.closest?.('[role=dialog],input,textarea,select,[contenteditable=true]'))});
 const tick=time=>lenis.raf(time*1000);runtime.lenis++;lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(tick);
 const scene=root.querySelector('.rt-scene-layout'),image=scene.querySelector('.geo-image-open'),copy=scene.querySelector('.rt-scene-copy'),caption=scene.querySelector('.geo-media figcaption');
 const tl=keep('首页叙事',gsap.timeline({defaults:{ease:EASE.scroll},scrollTrigger:{id:'research-hero-story',trigger:scene,start:'top 12%',end:()=>'+='+Math.min(SCROLL.pinDistance,innerHeight*.25),pin:true,refreshPriority:1,scrub:SCROLL.story,markers,invalidateOnRefresh:true}}));
 // 影像保持完整点击区域；小幅变换仅用于展示区，不落到论文正文。
 const shift=(element,percent)=>()=>-Math.min(percent,60/Math.max(1,element.offsetHeight)*100);
 tl.to(image,{yPercent:shift(image,10),scale:1.025},0).to(copy,{yPercent:shift(copy,20)},0);
 if(caption)tl.to(caption,{yPercent:shift(caption,30)},0);
 const words=copy.querySelectorAll('[data-word]');
 if(words.length)tl.fromTo(words,{opacity:.15},{opacity:1,stagger:.06},0);
 return()=>{lenis.destroy();gsap.ticker.remove(tick);runtime.lenis--;tl.scrollTrigger?.kill();tl.revert();release('首页叙事',tl);};
}
