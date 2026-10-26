import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {DrawSVGPlugin} from 'gsap/DrawSVGPlugin';
import {MotionPathPlugin} from 'gsap/MotionPathPlugin';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin';
import {Flip} from 'gsap/Flip';
gsap.registerPlugin(ScrollTrigger,DrawSVGPlugin,MotionPathPlugin,ScrollToPlugin,Flip);
export {gsap,ScrollTrigger,Flip};
export const timelines=new Map(),scopes=new Set();
export const runtime={lenis:0};
export const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
export function keep(name,timeline){timelines.set(name,timeline);return timeline;}
export function release(name,timeline){if(timelines.get(name)===timeline)timelines.delete(name);}
export function own(cleanup){const dispose=()=>{if(scopes.delete(dispose))cleanup();};scopes.add(dispose);return dispose;}
export function killAll(){[...scopes].forEach(dispose=>dispose());}
export const revert=killAll;
export function inspect(){return {lenis:runtime.lenis,triggers:ScrollTrigger.getAll().filter(t=>String(t.vars.id||'').startsWith('research-')).map(t=>({id:t.vars.id,pin:Boolean(t.pin),progress:t.progress})),timelines:[...timelines.keys()]};}
export function refreshAfterLayout(element){let frame,timer;const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>ScrollTrigger.refresh());},120);};const observer=new ResizeObserver(refresh);observer.observe(element);element.addEventListener('load',refresh,true);refresh();return()=>{observer.disconnect();element.removeEventListener('load',refresh,true);clearTimeout(timer);cancelAnimationFrame(frame);};}
