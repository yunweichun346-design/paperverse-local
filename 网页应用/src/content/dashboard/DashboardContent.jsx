import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useDataApp,useDashboardTabs} from '../../本机组件.jsx';
import {usePageMotion} from './动效/页面动效.js';
import {transitionPage} from './动效/时间编排/页面.js';
import LoadingShimmer from './动效/加载反馈.jsx';
import './动效/动效.css';
import PaperList from './文献列表.jsx';
import PaperDetail from './文献详情.jsx';
import ReadingPanel from './阅读备份.jsx';
import {ComparisonPanel,ResourcesPanel} from './研究面板.jsx';
import {useReadingNotes} from './阅读存储.js';
import {keyOf,noteOf,exportCsv,searchValues} from './文献工具.js';
import SatelliteImage from './卫星影像.jsx';
import ResearchImage from './研究影像.jsx';
import AddPaper from './添加文献.jsx';
import JournalCollections from './期刊合集.jsx';
import {useFulltextSearch} from './全文检索.js';
import './阅读工具.css';

import {ResearchHeader,RailButton} from './科研工具栏.jsx';

const DEFAULT={search:'',journal:'all',region_scope:'all',relevance_tier:'all',ai_status:'all',year:'all',read:'全部',sort:'高原优先'};
export function DashboardContent(){
  const {queries,snapshot,exploreDashboard,reloadLibrary}=useDataApp();
  const [adding,setAdding]=useState(false);
  const {activeTabId}=useDashboardTabs([{id:'library',label:'文献库',filterIds:[]},{id:'journals',label:'文献来源',filterIds:[]},{id:'compare',label:'论文对比',filterIds:[]},{id:'reading',label:'我的阅读',filterIds:[]},{id:'resources',label:'数据与周末研究',filterIds:[]}]);
  const papers=queries.papers?.rows||[],store=useReadingNotes();
  const libraryAnchor=useRef(null);
  const lastNoteScroll=useRef(0);
  const [readerOpen,setReaderOpen]=useState(false);

  const [filters,setFilters]=useState(DEFAULT),[chosen,setChosen]=useState(''),[compare,setCompare]=useState([]),[files,setFiles]=useState([]),[message,setMessage]=useState(''),[dirty,setDirty]=useState(false),[localTab,setLocalTab]=useState(null);
  const [focus,setFocus]=useState(false),[origin,setOrigin]=useState(null);
  const [scope,setScope]=useState('all'),[notesRequest,setNotesRequest]=useState(0),[railSlots,setRailSlots]=useState(null),[hasRead,setHasRead]=useState(false);
  useEffect(()=>{
    const media=matchMedia('(max-width:767px)');
    const sync=()=>setRailSlots({create:document.getElementById('research-rail-create'),actions:document.getElementById('research-inline-actions')});
    const frame=requestAnimationFrame(sync);media.addEventListener('change',sync);
    return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',sync);};
  },[activeTabId]);
  const scoped=useMemo(()=>papers.filter(p=>scope==='all'||p.region_scope===scope),[papers,scope]);
  const fulltext=useFulltextSearch(filters.search,store.notes,readerOpen);
  useEffect(()=>{fetch('/api/files').then(r=>r.json()).then(b=>setFiles(b.files||[])).catch(()=>setMessage('研究文件入口暂时不可用；文献内容仍可阅读。'));},[]);
  useEffect(()=>{setLocalTab(null);},[activeTabId]);
  useEffect(()=>{if(!dirty)setMessage(m=>m==='当前笔记有未保存草稿，请先保存后切换论文。'?'':m);},[dirty]);
  const visible=useMemo(()=>scoped.filter(p=>{
    for(const f of ['journal','region_scope','relevance_tier','ai_status','year'])if(filters[f]&&filters[f]!=='all'&&String(p[f]||'待核')!==filters[f])return false;
    const n=noteOf(store.notes,p),read=n.read_status||'待读';
    if(filters.read==='已收藏'?!n.star:filters.read!=='全部'&&read!==filters.read)return false;
    const text=searchValues(p,n).join(' ').toLowerCase();
    return filters.search.toLowerCase().trim().split(/\s+/).every(v=>text.includes(v))||Boolean(fulltext.hits[keyOf(p)]);
  }).sort((a,b)=>{
    if(filters.sort==='题目')return (a.title_zh||a.title).localeCompare(b.title_zh||b.title,'zh-CN');
    if(filters.sort==='最早年份')return a.year-b.year;
    if(filters.sort==='高原优先'){const rank={'青藏高原':0,'全国含高原':1,'待核':3,'其他地区':2};const diff=(rank[a.region_scope]??3)-(rank[b.region_scope]??3);if(diff)return diff;}
    return b.year-a.year;
  }),[scoped,filters,store.notes,fulltext.hits]);
  const paper=(dirty?papers:visible).find(p=>keyOf(p)===chosen)||visible[0];
  useEffect(()=>{if(!dirty&&!visible.some(p=>keyOf(p)===chosen))setChosen(visible[0]?keyOf(visible[0]):'');},[chosen,visible,dirty]);
  const choose=p=>{if(!p)return false;if(dirty&&keyOf(p)!==chosen){setMessage('当前笔记有未保存草稿，请先保存后切换论文。');return false;}setChosen(keyOf(p));setMessage('');return true;};
  const toggle=p=>{const key=keyOf(p);setCompare(prev=>{if(prev.includes(key))return prev.filter(k=>k!==key);if(prev.length>=4){setMessage('一次最多对比4篇，请先移出一篇。');return prev;}setMessage('');return [...prev,key];});};
  const tab=localTab||activeTabId||'library';
  const motionRoot=useRef(null);usePageMotion(motionRoot,tab,tab==='library'&&readerOpen);

  const goTab=id=>{if(id===tab)return;if(exploreDashboard)exploreDashboard(id,{});else setLocalTab(id);};
  const openReading=(p,journal=null)=>{if(!choose(p))return;transitionPage(()=>{if(scope!=='all'&&p.region_scope!==scope)setScope('all');setFilters({...DEFAULT,journal:journal||'all'});setOrigin(journal);setReaderOpen(true);setFocus(false);setHasRead(true);goTab('library');});};
  const newNote=()=>{if(!paper||!hasRead)return;setReaderOpen(true);setFocus(false);goTab('library');setNotesRequest(n=>n+1);};
  const scopeChange=value=>{if(dirty)return;setScope(value);setFilters({...DEFAULT});setOrigin(null);if(tab!=='library')setHasRead(false);};
  const locateSearch=()=>{if(tab==='library'){setReaderOpen(false);setFocus(false);}requestAnimationFrame(()=>{const field=tab==='library'?document.getElementById('paper-search'):document.querySelector('.jc-page:not([hidden])>div:not([hidden]) .jc-search input');field?.focus();field?.scrollIntoView({block:'center',behavior:'instant'});});};
  const exportRows=tab==='library'?visible:tab==='journals'?scoped:tab==='compare'?papers.filter(p=>compare.includes(keyOf(p))):papers.filter(p=>{const n=noteOf(store.notes,p);return n.star||n.text||n.questions||(n.read_status&&n.read_status!=='待读');});
  const enterLibrary=()=>transitionPage(()=>{setReaderOpen(false);setFocus(false);goTab('library');requestAnimationFrame(()=>{document.getElementById('paper-search')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});});
  const openListPaper=p=>{if(choose(p))transitionPage(()=>{setReaderOpen(true);setHasRead(true);setFocus(false);});};
  useEffect(()=>{const shortcut=e=>{if(e.defaultPrevented||e.isComposing||e.target.closest('input,textarea,select,[contenteditable=true],[role=dialog]'))return;if(e.key==='/'||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();enterLibrary();}};window.addEventListener('keydown',shortcut);return()=>window.removeEventListener('keydown',shortcut);},[tab]);
  const position=visible.findIndex(p=>paper&&keyOf(p)===keyOf(paper));
  const step=delta=>{if(choose(visible[position+delta]))libraryAnchor.current?.scrollIntoView({block:'start'});};
  useEffect(()=>{
    if(tab!=='library')return;
    // 新建笔记由详情组件定位，避免父组件随后把页面拉回论文顶部。
    if(notesRequest!==lastNoteScroll.current){lastNoteScroll.current=notesRequest;return;}
    if(readerOpen)libraryAnchor.current?.scrollIntoView({block:'start'});
  },[readerOpen,tab,chosen,notesRequest]);
  return <div ref={motionRoot} className={'wb-app '+(focus?'is-focus':'')} data-dashboard-layout="full-width">
    {railSlots?.create&&createPortal(<RailButton icon="plus" label={hasRead&&paper?'新建当前论文的阅读笔记':'请先打开一篇论文，再新建笔记'} disabled={!hasRead||!paper||!store.loaded} onClick={newNote}/>,railSlots.create)}
    {railSlots?.actions&&createPortal(<div className="rs-quick-actions" role="group" aria-label="当前页面快捷操作">
      {['library','journals'].includes(tab)&&<RailButton icon="search" label="定位本页检索" onClick={locateSearch}/>}
      {tab==='library'&&<RailButton icon="copy" label={paper&&compare.includes(keyOf(paper))?'当前论文移出对比':'当前论文加入对比'} disabled={!paper} pressed={Boolean(paper&&compare.includes(keyOf(paper)))} onClick={()=>toggle(paper)}/>}
      {tab!=='resources'&&<RailButton icon="download" label={tab==='journals'?'导出研究区范围文献':'导出当前列表文献'} disabled={!exportRows.length} onClick={()=>exportCsv(exportRows,store.notes)}/>}
    </div>,railSlots.actions)}
    <div className="aw-content">
    {!(tab==='library'&&readerOpen)&&<ResearchHeader tab={tab} count={tab==='compare'?compare.length:scoped.length} total={papers.length} scope={scope} onScope={scopeChange} scopeOptions={[...new Set(papers.map(p=>p.region_scope).filter(Boolean))]} dirty={dirty}/>}
    {tab==='library'&&!readerOpen&&<button className="paper-add" disabled={dirty||!store.loaded} onClick={()=>setAdding(true)}>添加文献</button>}
    {adding&&<AddPaper onClose={()=>setAdding(false)} onCreated={async(p,created)=>{await reloadLibrary();setScope('all');setFilters(DEFAULT);setChosen(keyOf(p));setReaderOpen(true);setHasRead(true);setMessage(created?'文献已保存到本机。':'该文献已存在，已打开原记录，未覆盖元数据。');}}/>}
    {tab==='library'&&!readerOpen&&<ResearchImage onSearch={locateSearch}/>}
    <div id="research-inline-actions" className="rs-inline-actions" hidden={tab==='library'&&readerOpen}/>
    {message&&<div className="wb-notice" role="status">{message}<button onClick={()=>setMessage('')}>收起</button></div>}
    {!store.loaded&&<div className="wb-notice" data-loading>{store.message}<LoadingShimmer/></div>}
    {store.conflict&&<div className="wb-notice" role="alert">其他窗口修改了记录，草稿仍保留。<button onClick={store.mergeConflict}>合并两个窗口的记录</button></div>}
    {dirty&&paper&&!visible.includes(paper)&&<div className="wb-notice" role="status">当前论文不在筛选结果中；正在保留你的未保存草稿，保存后再显示筛选论文。</div>}
    {compare.length>0&&<div className="wb-compare-bar" hidden={tab==='library'&&readerOpen}>已选 {compare.length} / 4 篇 · 在“论文对比”查看目标、验证与局限<button onClick={()=>setCompare([])}>清空选择</button></div>}
    <JournalCollections papers={scoped} notes={store.notes} onRead={openReading} active={tab==='journals'}/>
    <section className="aw-library" id="literature-library" ref={libraryAnchor} tabIndex="-1" aria-labelledby="library-heading" hidden={tab!=='library'}>
      <header className="aw-section-heading" hidden={readerOpen}><div><h2 id="library-heading">文献检索与阅读</h2><p>研究目标 · 数据与方法 · 结果与局限 · 原文证据</p></div><div className="aw-library-summary"><span>筛选结果 <b>{visible.length}</b> 篇</span><span>全库 AI 全文核读 {papers.filter(p=>p.ai_status==='全文核读').length} 篇 · 历史整理范围</span><span>全库我的已读 {papers.filter(p=>noteOf(store.notes,p).read_status==='已读').length} 篇 · 仅统计个人标记</span></div></header>
      <div className="wb-workspace"><div hidden={readerOpen}><PaperList fulltext={fulltext} papers={visible} all={scoped} notes={store.notes} chosen={paper&&keyOf(paper)} compare={compare} onChoose={openListPaper} onCompare={toggle} filters={filters} setFilters={setFilters} onExport={()=>exportCsv(visible,store.notes)}/></div><div hidden={!readerOpen}><PaperDetail paper={paper} store={store} selected={paper&&compare.includes(keyOf(paper))} onCompare={toggle} onDirty={setDirty} focus={focus} onFocus={()=>setFocus(s=>!s)} onPrevious={()=>step(-1)} onNext={()=>step(1)} position={position} total={visible.length} origin={origin} onBack={()=>goTab('journals')} notesRequest={notesRequest} active={tab==='library'&&readerOpen} onLibrary={enterLibrary}/></div></div>
    </section>
    {tab==='compare'&&<ComparisonPanel papers={papers.filter(p=>compare.includes(keyOf(p)))} onRemove={key=>setCompare(s=>s.filter(k=>k!==key))}/>}
    {tab==='reading'&&<ReadingPanel papers={papers} store={store} onSelect={openReading} dirty={dirty}/>}
    {tab==='resources'&&<><ResourcesPanel datasets={queries.datasets?.rows||[]} updates={queries.updates?.rows||[]} files={files} meta={snapshot.libraryMeta||{}}/><details className="rt-region-image"><summary>区域参考影像 · 雅鲁藏布江</summary><SatelliteImage/></details></>}
    <footer className="wb-footer">个人记录保存在本机 · 核读范围不等于个人已读 · 对比不按不同验证口径的精度排名</footer>
    </div>
  </div>;
}
