import React,{createContext,useContext,useEffect,useState} from 'react';
import {Icon} from './components/Icon.jsx';
export {Icon};
export {Dialog} from './components/ui.jsx';
const Context=createContext(null);
const tabs=[['library','文献库','textDocument'],['journals','文献来源','building'],['compare','论文对比','copy'],['reading','我的阅读','edit'],['resources','数据与周末研究','database']];
export function useDataApp(){return useContext(Context);}
export function useDashboardTabs(){return {activeTabId:useContext(Context).tab};}
export function DataComponent({id,title,children,className=''}){
 return <section id={id} className={'dashboard-component '+className} data-component-id={id}><header className="component-header"><h2>{title}</h2></header>{children}</section>;
}
export function LocalShell({children}){
 const initial=new URLSearchParams(location.search).get('tab');
 const [tab,setTab]=useState(tabs.some(t=>t[0]===initial)?initial:'library');
 const [appearance,onAppearanceChange]=useState('system'),[data,setData]=useState(null),[error,setError]=useState('');
 const reloadLibrary=async()=>{const r=await fetch('/api/library');if(!r.ok)throw Error('资料暂不可用，请先启动本机服务。');const next=await r.json();setData(next);return next;};
 useEffect(()=>{reloadLibrary().catch(e=>setError(e.message));},[]);
 useEffect(()=>{document.documentElement.style.colorScheme=appearance==='system'?'light dark':appearance;document.documentElement.dataset.appearance=appearance;},[appearance]);
 const exploreDashboard=id=>{setTab(id);const url=new URL(location.href);url.searchParams.set('tab',id);history.replaceState(null,'',url);};
 const value={tab,appearance,onAppearanceChange,exploreDashboard,reloadLibrary,snapshot:{id:'paperverse-local-release-v1',title:'PaperVerse',libraryMeta:{}},queries:{papers:{rows:data?.papers||[]},datasets:{rows:[]},updates:{rows:[]}}};
 return <Context.Provider value={value}><header className="local-top"><strong>PaperVerse</strong><span>本机文献阅读工具</span></header><nav className="local-rail" aria-label="主导航"><div id="research-rail-create"/>{tabs.map(([id,label,icon])=><button key={id} role="tab" aria-label={label} aria-selected={tab===id} title={label} onClick={()=>exploreDashboard(id)}><Icon name={icon} size={20}/><span>{label}</span></button>)}</nav><main className="page" data-data-app-content="dashboard">{error?<p role="alert">{error}</p>:!data?<p role="status">正在读取本机资料…</p>:children}</main></Context.Provider>;
}
