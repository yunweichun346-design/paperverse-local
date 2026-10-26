import React,{useEffect,useRef,useState} from 'react';
import {Dialog,useDataApp} from '../../本机组件.jsx';
const defaults={size:17,line:1.8,width:72,font:'sans',theme:'system'};
export default function ReadingSettings(){
 const {snapshot,appearance,onAppearanceChange}=useDataApp(),[open,setOpen]=useState(false),values=useRef({...defaults});
 const previousAppearance=useRef(appearance);
 const storageKey=(snapshot.id||'tree-density')+':reading-preferences';
 const apply=()=>{
  const root=document.querySelector('.wb-app'),p=values.current;if(!root)return;
  root.dataset.readingTheme=p.theme;
  for(const [key,value] of Object.entries({size:p.size+'px',line:p.line,width:p.width+'ch',font:'var(--rt-font-'+p.font+')'}))root.style.setProperty('--rt-reader-'+key,value);
 };
 const read=()=>{try{const p=JSON.parse(localStorage.getItem(storageKey)||'null');if(!p||typeof p!=='object')return;
  values.current={size:Math.max(14,Math.min(22,Number(p.size)||17)),line:Math.max(1.5,Math.min(2.2,Number(p.line)||1.8)),width:Math.max(60,Math.min(80,Number(p.width)||72)),font:p.font==='serif'?'serif':'sans',theme:['system','light','eye','dark'].includes(p.theme)?p.theme:'system'};
 }catch{/* 保留当前会话的有效设置。 */}};
 useEffect(()=>{read();apply();onAppearanceChange(values.current.theme==='eye'?'light':values.current.theme);},[storageKey]);
 // 文献库和阅读页同时挂载；先读最新偏好，避免另一入口用旧字号覆盖。
 useEffect(()=>{if(previousAppearance.current===appearance)return;previousAppearance.current=appearance;read();values.current.theme=values.current.theme==='eye'&&appearance==='light'?'eye':appearance;apply();try{localStorage.setItem(storageKey,JSON.stringify(values.current));}catch{}},[appearance]);
 const change=(key,value)=>{read();values.current[key]=value;apply();if(key==='theme')onAppearanceChange(value==='eye'?'light':value);try{localStorage.setItem(storageKey,JSON.stringify(values.current));}catch{/* 存储不可用时，设置仍在当前页面生效。 */}};
 return <><button onClick={()=>{read();setOpen(true);}}>阅读设置</button><Dialog open={open} onClose={()=>setOpen(false)} title="阅读设置" className="rt-settings-modal" initialFocusSelector="select" showClose={false} headerActions={<button aria-label="关闭阅读设置" onClick={()=>setOpen(false)}>关闭</button>}>
  {open&&<div className="rt-settings">
   <label>主题<select aria-label="阅读主题" defaultValue={values.current.theme} onChange={e=>change('theme',e.target.value)}><option value="system">跟随系统</option><option value="light">浅色</option><option value="eye">护眼</option><option value="dark">深色</option></select></label>
   <label>正文字体<select aria-label="正文字体" defaultValue={values.current.font} onChange={e=>change('font',e.target.value)}><option value="sans">无衬线</option><option value="serif">衬线</option></select></label>
   {[['size','正文字号',14,22,1,'px'],['line','正文行距',1.5,2.2,.1,''],['width','正文行宽',60,80,1,'ch']].map(([key,label,min,max,step,unit])=><label key={key}>{label}<input aria-label={label} type="range" min={min} max={max} step={step} defaultValue={values.current[key]} onChange={e=>{change(key,Number(e.target.value));e.target.nextElementSibling.textContent=e.target.value+unit;}}/><output>{values.current[key]+unit}</output></label>)}
  </div>}
 </Dialog></>;
}
