import {useLayoutEffect,useRef} from 'react';
import {gsap,Flip,own,keep,release,ScrollTrigger} from './引擎.js';
import {EASE,DURATION,STAGGER,conditions} from './配置.js';
export function useListMotion(ref,signature){
 const before=useRef(null),first=useRef(true);
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;let dispose;
  // 公共数据容器可能在首次提交后才展开；观察可见尺寸后再记录初始布局。
  const start=()=>{if(dispose||!node.getClientRects().length)return;
  const rows=[...node.querySelectorAll('[data-flip-id]')],mm=gsap.matchMedia(),app=node.closest('.wb-app');
  // React提交后再取旧位置已经太晚；在控件事件的捕获阶段记录布局。
  const capture=()=>{if(node.getClientRects().length)before.current=Flip.getState(rows,{simple:true,kill:false});};
  mm.add(conditions,c=>{let tl;
   if(before.current&&!c.conditions.reduce)tl=Flip.from(before.current,{targets:rows,duration:DURATION.enter,ease:EASE.transition,scale:true,nested:true,prune:true,absolute:false,onComplete:capture});
   else if(first.current)tl=gsap.timeline({defaults:{duration:DURATION.reader,ease:EASE.enter},onComplete:capture}).fromTo(rows.slice(0,12),{opacity:0},{opacity:1,stagger:c.conditions.reduce?0:STAGGER.rows,clearProps:'opacity'});
   if(tl)keep('文献列表',tl);first.current=false;
   return()=>{if(tl)release('文献列表',tl);};
  },node);
  app.addEventListener('change',capture,true);app.addEventListener('click',capture,true);
  const frame=requestAnimationFrame(()=>ScrollTrigger.refresh());
  dispose=()=>{cancelAnimationFrame(frame);app.removeEventListener('change',capture,true);app.removeEventListener('click',capture,true);mm.revert();};
  };
  const observer=new ResizeObserver(start);observer.observe(node);start();
  return own(()=>{observer.disconnect();dispose?.();});
 },[signature]);
}
