import {gsap,keep,release,reduced} from '../引擎.js';
import {EASE,DURATION} from '../配置.js';
let leaving,clearPreference;
export function transitionPage(commit){
 const root=document.querySelector('.wb-app'),target=root?.querySelector('.aw-content');
 if(!target||reduced()){cancelPageTransition();commit();return;}
 cancelPageTransition();
 const reader=root.dataset.motionReader==='true';
 const tl=keep('页面离场',gsap.timeline({defaults:{duration:DURATION.leave,ease:EASE.transition}}));leaving=tl;
 const preference=matchMedia('(prefers-reduced-motion:reduce)');
 const finish=()=>{clearPreference?.();clearPreference=null;gsap.set(target,{clearProps:'opacity,transform'});release('页面离场',tl);leaving=null;if(root.isConnected)commit();};
 const change=()=>{if(preference.matches){tl.revert();finish();}};
 preference.addEventListener('change',change);clearPreference=()=>preference.removeEventListener('change',change);
 tl.to(target,{opacity:0,y:reader?0:-12}).call(finish);
 return tl;
}
export function cancelPageTransition(){clearPreference?.();clearPreference=null;leaving?.revert();if(leaving)release('页面离场',leaving);leaving=null;}
export function pageEntrance(target,reduce){return gsap.timeline({defaults:{duration:DURATION.enter,ease:EASE.enter}}).fromTo(target,{opacity:0,y:reduce?0:12},{opacity:1,y:0,clearProps:'opacity,transform'});}
