import {gsap,reduced,keep,release} from '../引擎.js';
import {DURATION,EASE} from '../配置.js';
let current;
export function stopJump(){current?.();current=null;}
export function jumpTo(target,relativeY=0){
 if(!target)return;stopJump();
 const offset=parseFloat(getComputedStyle(target).scrollMarginTop)||0,top=scrollY+target.getBoundingClientRect().top-offset+target.clientHeight*relativeY;
 if(reduced()){scrollTo({top,behavior:'instant'});target.focus({preventScroll:true});return;}
 const marker=document.createElement('span');marker.className='motion-jump-ring';marker.setAttribute('aria-hidden','true');target.classList.add('motion-jump-target');target.append(marker);
 const tl=keep('引用定位',gsap.timeline({defaults:{ease:EASE.transition,duration:DURATION.jump}}));
 const preference=matchMedia('(prefers-reduced-motion:reduce)'),change=()=>{if(preference.matches){stopJump();scrollTo({top,behavior:'instant'});target.focus({preventScroll:true});}};
 const dispose=()=>{preference.removeEventListener('change',change);tl.kill();marker.remove();target.classList.remove('motion-jump-target');release('引用定位',tl);};current=dispose;preference.addEventListener('change',change);
 tl.to(window,{scrollTo:{y:top,autoKill:true},duration:DURATION.jump}).call(()=>target.focus({preventScroll:true})).fromTo(marker,{opacity:.65},{opacity:0,duration:DURATION.highlight},'>').call(()=>{dispose();current=null;});
 return tl;
}
