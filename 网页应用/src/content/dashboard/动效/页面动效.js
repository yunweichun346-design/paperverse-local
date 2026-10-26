import {useLayoutEffect} from 'react';
import {gsap,keep,release,own,inspect,timelines,killAll,refreshAfterLayout} from './引擎.js';
import {pageEntrance,cancelPageTransition} from './时间编排/页面.js';
import {conditions} from './配置.js';
export function usePageMotion(ref,tab,reader){
 useLayoutEffect(()=>{const root=ref.current;root.motion={inspect,timelines,killAll,revert:killAll};const stop=own(cancelPageTransition);return()=>{delete root.motion;stop();};},[]);
 useLayoutEffect(()=>{const root=ref.current,mm=gsap.matchMedia();root.dataset.motionReader=String(reader);
  if(!reader)mm.add(conditions,c=>{const tl=keep('页面入场',pageEntrance(root.querySelector('.aw-content'),c.conditions.reduce));return()=>release('页面入场',tl);},root);
  const refresh=refreshAfterLayout(root);return own(()=>{refresh();mm.revert();});
 },[tab,reader]);
}
