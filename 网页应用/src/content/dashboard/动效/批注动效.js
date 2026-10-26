import {useLayoutEffect,useRef} from 'react';
import {gsap,own} from './引擎.js';
import {DURATION,EASE} from './配置.js';
export function useHighlightMotion(ref,signature){const seen=useRef(new WeakSet());useLayoutEffect(()=>{
 if(!ref.current||!signature)return;const root=ref.current,ctx=gsap.context(()=>{const nodes=[...root.querySelectorAll('.pdf-highlight')].filter(node=>!seen.current.has(node));nodes.forEach(node=>seen.current.add(node));if(nodes.length)gsap.from(nodes,{opacity:0,duration:DURATION.reader,ease:EASE.enter,clearProps:'opacity'});},root);
 return own(()=>ctx.revert());
},[signature]);}
