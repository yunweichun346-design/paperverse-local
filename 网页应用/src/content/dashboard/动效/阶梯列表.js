import {useLayoutEffect} from 'react';
import {own} from './引擎.js';

export function useWheelEmphasis(ref,signature){
 useLayoutEffect(()=>{
  const list=ref.current;if(!list)return;
  const rows=[...list.querySelectorAll('[data-flip-id]')];
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  let pointer=null,active=null,frame=0;
  const rowOf=element=>{const row=element?.closest?.('[data-flip-id]');return rows.includes(row)?row:null;};
  const show=row=>{
   if(active===row)return;active=row;
   const index=rows.indexOf(row);
   rows.forEach((item,i)=>{
    if(index<0)delete item.dataset.wheelDistance;
    else item.dataset.wheelDistance=String(Math.min(3,Math.abs(i-index)));
   });
  };
  const update=()=>{
   frame=0;
   show((pointer&&fine.matches?rowOf(document.elementFromPoint(pointer.x,pointer.y)):null)||rowOf(document.activeElement));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const move=event=>{if(event.pointerType==='touch')return;pointer={x:event.clientX,y:event.clientY};schedule();};
  const leave=()=>{pointer=null;schedule();};
  // 在文献经过静止鼠标时重新命中；不拦截原生滚动，也不改变行的布局尺寸。
  const scroll=()=>{if(pointer)schedule();};
  list.addEventListener('pointermove',move);
  list.addEventListener('pointerleave',leave);
  list.addEventListener('focusin',schedule);
  list.addEventListener('focusout',schedule);
  window.addEventListener('scroll',scroll,true);
  window.addEventListener('blur',leave);
  fine.addEventListener('change',schedule);
  schedule();
  return own(()=>{
   cancelAnimationFrame(frame);
   list.removeEventListener('pointermove',move);
   list.removeEventListener('pointerleave',leave);
   list.removeEventListener('focusin',schedule);
   list.removeEventListener('focusout',schedule);
   window.removeEventListener('scroll',scroll,true);
   window.removeEventListener('blur',leave);
   fine.removeEventListener('change',schedule);
   rows.forEach(row=>delete row.dataset.wheelDistance);
  });
 },[ref,signature]);
}
