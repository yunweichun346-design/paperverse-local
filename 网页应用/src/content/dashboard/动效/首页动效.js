import {useLayoutEffect} from 'react';
import {gsap,keep,release,own,refreshAfterLayout} from './引擎.js';
import {conditions} from './配置.js';
import {heroTimeline} from './时间编排/首屏.js';
import {homeScroll} from './滚动/首页.js';
import {underlineMotion} from './路径/下划线.js';
export function useHeroMotion(ref,visible){useLayoutEffect(()=>{
 if(!visible||!ref.current)return;const root=ref.current,mm=gsap.matchMedia();
 mm.add(conditions,c=>{const tl=keep('首页入场',heroTimeline(root,c.conditions.reduce));const line=underlineMotion(root,c.conditions.reduce),stop=c.conditions.desktop&&!c.conditions.reduce?homeScroll(root):()=>{};return()=>{line();stop();release('首页入场',tl);};},root);
 const refresh=refreshAfterLayout(root);return own(()=>{refresh();mm.revert();});
},[visible]);}
