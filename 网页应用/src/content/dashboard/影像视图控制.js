import {useEffect,useRef,useState} from 'react';

// 图像始终保持像素比例；拖动与弹簧共享当前显示值，可随时中断。
export function useImageViewport(stage,image){
  const model=useRef({x:0,y:0,s:1,fit:1,w:1,h:1,max:1,frame:0,drag:null});
  const [status,setStatus]=useState({zoom:1,max:1,ready:false});
  const paint=()=>{const m=model.current;if(image.current)image.current.style.transform=`translate3d(${m.x}px,${m.y}px,0) scale(${m.s})`;};
  const stop=()=>{cancelAnimationFrame(model.current.frame);model.current.frame=0;};
  const clamp=(x,y,s)=>{
    const m=model.current,r=stage.current?.getBoundingClientRect();
    const bx=Math.max(0,(m.w*m.fit*s-(r?.width||1))/2),by=Math.max(0,(m.h*m.fit*s-(r?.height||1))/2);
    return {x:Math.max(-bx,Math.min(bx,x)),y:Math.max(-by,Math.min(by,y)),s};
  };
  const move=(next,animated=false)=>{
    stop();const m=model.current,target=clamp(next.x,next.y,next.s);
    setStatus({zoom:target.s,max:m.max,ready:true});
    if(!animated||matchMedia('(prefers-reduced-motion: reduce)').matches){Object.assign(m,target);paint();return;}
    let last=performance.now();const velocity={x:0,y:0,s:0};
    const tick=now=>{
      const dt=Math.min((now-last)/1000,.032);last=now;let moving=false;
      for(const key of ['x','y','s']){
        const steps=Math.ceil(dt/.008)||1;
        for(let i=0;i<steps;i++){velocity[key]+=(324*(target[key]-m[key])-36*velocity[key])*dt/steps;m[key]+=velocity[key]*dt/steps;}
        if(Math.abs(m[key]-target[key])>.001||Math.abs(velocity[key])>.01)moving=true;
      }
      paint();if(moving)m.frame=requestAnimationFrame(tick);else{Object.assign(m,target);paint();m.frame=0;}
    };
    m.frame=requestAnimationFrame(tick);
  };
  const measure=()=>{
    const el=image.current,r=stage.current?.getBoundingClientRect();if(!el?.naturalWidth||!r?.width)return;
    stop();const m=model.current;m.w=el.naturalWidth;m.h=el.naturalHeight;
    m.fit=Math.min(r.width/m.w,r.height/m.h,1);
    m.max=Math.max(1,1/(m.fit*(window.devicePixelRatio||1)));
    el.style.width=m.w*m.fit+'px';el.style.height=m.h*m.fit+'px';
    move({x:0,y:0,s:1});
  };
  useEffect(()=>{
    if(!stage.current)return;
    const observer=new ResizeObserver(measure);observer.observe(stage.current);
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const reduce=()=>{if(media.matches){stop();paint();setStatus(s=>({...s,zoom:model.current.s}));}};
    media.addEventListener('change',reduce);
    return()=>{stop();observer.disconnect();media.removeEventListener('change',reduce);};
  },[]);
  const zoom=factor=>{const m=model.current,s=Math.max(1,Math.min(m.max,m.s*factor));move({s,x:m.x*s/m.s,y:m.y*s/m.s},true);};
  const reset=()=>move({x:0,y:0,s:1},true);
  return {status,measure,zoom,reset,events:{
    onPointerDown:e=>{if(e.button!==0||model.current.s<=1.001)return;stop();e.currentTarget.setPointerCapture(e.pointerId);model.current.drag={id:e.pointerId,x:e.clientX,y:e.clientY};},
    onPointerMove:e=>{const m=model.current,d=m.drag;if(!d||d.id!==e.pointerId)return;Object.assign(m,clamp(m.x+e.clientX-d.x,m.y+e.clientY-d.y,m.s));d.x=e.clientX;d.y=e.clientY;paint();},
    onPointerUp:()=>{model.current.drag=null;},onPointerCancel:()=>{model.current.drag=null;},onLostPointerCapture:()=>{model.current.drag=null;},
    onKeyDown:e=>{
      if(!['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const m=model.current;
      if(e.key==='+'||e.key==='=')zoom(1.5);else if(e.key==='-')zoom(1/1.5);else if(e.key==='Home')reset();
      else move({s:m.s,x:m.x+({ArrowLeft:60,ArrowRight:-60}[e.key]||0),y:m.y+({ArrowUp:60,ArrowDown:-60}[e.key]||0)});
    },
  }};
}
