import {gsap} from '../引擎.js';
import {EASE,DURATION,STAGGER} from '../配置.js';
export function heroTimeline(root,reduce){
 const tl=gsap.timeline({defaults:{ease:EASE.hero,duration:DURATION.hero}}),copy=root.querySelector('.rt-scene-copy');
 const text=gsap.timeline({defaults:{ease:EASE.enter,duration:DURATION.text}});
 text.fromTo(copy.querySelectorAll('[data-hero-line]'),{opacity:0,y:reduce?0:32},{opacity:1,y:0,stagger:STAGGER.path,clearProps:'opacity,transform'},0)
  .fromTo(copy.querySelector('p'),{opacity:0},{opacity:1,clearProps:'opacity'},.2)
  .fromTo(copy.querySelector('button'),{opacity:0,y:reduce?0:12},{opacity:1,y:0,clearProps:'opacity,transform'},.3);
 tl.fromTo(root.querySelector('.rt-scene-copy>span'),{opacity:0},{opacity:1,duration:DURATION.control,clearProps:'opacity'},0).addLabel('主题',.1).add(text,'主题')
  .fromTo(root.querySelector('.geo-media'),{opacity:0,scale:reduce?1:.97},{opacity:1,scale:1,clearProps:'opacity,transform'},'主题+=.15');
 return tl;
}
