import React,{useEffect,useMemo,useRef,useState} from 'react';
import {DataComponent} from '../../本机组件.jsx';
import {keyOf,noteOf} from './文献工具.js';
import {groupJournals,filterJournals} from './期刊工具.js';

import metadata from './期刊来源.json';
import {COVER_IMAGES} from './期刊封面.js';


export function JournalCover({name,large=false}){
  const meta=metadata[name],image=COVER_IMAGES[name];
  const [failed,setFailed]=useState(false);
  const identity=Boolean(image)&&!failed&&meta?.cover_kind?.includes('标识');
  return <div className={'jc-book '+(large?'is-large ':'')+(identity?'is-identity ':'')+(!image||failed?'is-letterpress':'')}>
    {image&&!failed?<img src={image} alt={name+' · '+meta.cover_kind} loading="lazy" onError={()=>setFailed(true)}/>:<div className="jc-letterpress"><small>{meta?.type||'文献来源'}</small><strong>{name}</strong><span>{failed?'封面加载失败':meta?.type==='预印本'?'预印本平台':'封面待补'}</span></div>}
    {identity&&!failed&&<span className="jc-identity-caption">{meta?.type==='会议'?'官方会议标识':'官方刊名标识'}</span>}
  </div>;
}
function JournalCard({group,onOpen}){
  return <button className="jc-card" onClick={()=>onOpen(group.name)} aria-label={`打开 ${group.name} 合集，${group.papers.length} 篇`}>
    <div className="jc-cover-stage"><div className="jc-moving-book"><JournalCover name={group.name}/></div></div>
    <div className="jc-card-copy"><h3>{group.name}</h3><span>{group.type} · {group.papers.length} 篇</span><p>{group.papers.filter(p=>p.relevance_tier==='直接相关').length} 篇直接相关</p></div>
  </button>;
}
export default function JournalCollections({papers,notes,onRead,active}){
  const groups=useMemo(()=>groupJournals(papers,metadata),[papers]);
  const [query,setQuery]=useState(''),[type,setType]=useState('全部'),[selected,setSelected]=useState(null);
  const [paperQuery,setPaperQuery]=useState('');
  const heading=useRef(null),cards=useRef(null),lastSelected=useRef(null),scroll=useRef(0);
  const group=groups.find(g=>g.name===selected);
  const shown=filterJournals(groups,query,type);
  const filtered=group?.papers.filter(p=>[p.title,p.title_zh,p.authors,p.model].join(' ').toLowerCase().includes(paperQuery.trim().toLowerCase()))||[];
  const open=name=>{scroll.current=window.scrollY;lastSelected.current=name;setSelected(name);setPaperQuery('');};
  useEffect(()=>{if(selected&&active){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});}},[selected,active]);
  const back=()=>{setSelected(null);requestAnimationFrame(()=>{const button=[...(cards.current?.querySelectorAll('button')||[])].find(b=>b.getAttribute('aria-label')?.startsWith('打开 '+lastSelected.current+' 合集'));button?.focus({preventScroll:true});window.scrollTo({top:scroll.current,behavior:'instant'});});};
  return <section className="jc-page" hidden={!active} aria-label="文献来源合集">
    <div hidden={!!group}>
      <div className="jc-overview"><strong>{groups.length} 个来源</strong><span>{papers.length} 篇文献 · 保留期刊、会议与预印本类型</span></div>
      <div className="jc-catalog-layout"><div className="jc-catalog">
      <div className="jc-controls"><label className="jc-search"><span>搜索期刊或来源</span><input aria-label="搜索期刊或来源" placeholder="输入期刊名称" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="jc-chips" role="group" aria-label="来源类型">{['全部','期刊','会议','预印本'].map(t=><button key={t} aria-pressed={type===t} onClick={()=>setType(t)}>{t}<span>{t==='全部'?groups.length:groups.filter(g=>g.type===t).length}</span></button>)}</div></div>
      <p className="jc-results" role="status">{shown.length} 个来源 · 按收录篇数排列</p>
      <DataComponent id="journal-collections" title="按文献来源浏览" queryId="papers" variant="plain" displayRows={shown.flatMap(g=>g.papers)} sourceRows={shown.flatMap(g=>g.papers)}>
        <div className="jc-grid" ref={cards} data-reviewed-rows>{shown.map(g=><JournalCard key={g.name} group={g} onOpen={open}/>)}</div>
        {!shown.length&&<p className="wb-empty">没有找到这个来源。<button onClick={()=>{setQuery('');setType('全部');}}>查看全部合集</button></p>}
      </DataComponent>
      <p className="jc-cover-note">封面用于识别期刊，可能来自其他期次。打开合集可查看封面出处；官方标识与待补封面单独标注。</p>
      </div></div>
    </div>
    {group&&<div className="jc-collection">
      <button className="jc-back" onClick={back}>‹ 所有来源</button>
      <header className="jc-collection-hero" ref={heading} tabIndex="-1">
        <div className="jc-collection-cover"><JournalCover name={group.name} large/></div>
        <div><p className="aw-kicker">{group.type}合集 · {group.papers.length} 篇</p><h2>{group.name}</h2><p className="jc-collection-desc">{group.papers.filter(p=>p.relevance_tier==='直接相关').length} 篇与树木密度直接相关。选择一篇，查看方法、结论与阅读笔记。</p><div className="jc-collection-actions"><button className="wb-primary" onClick={()=>onRead(group.papers[0],group.name)}>开始阅读 <span aria-hidden="true">↗</span></button><a href={group.meta.image_source||group.meta.source} target="_blank" rel="noreferrer">{group.meta.image_source?'封面 / 标识出处':'官方来源'} ↗</a></div><small>{group.meta.cover_kind}</small></div>
      </header>
      <div className="jc-papers-heading"><h2>收录文献 <span>{filtered.length} / {group.papers.length}</span></h2><label className="jc-search"><span>检索当前合集论文</span><input aria-label="检索当前合集论文" placeholder="输入标题、作者或方法" value={paperQuery} onChange={e=>setPaperQuery(e.target.value)}/></label></div>
      <DataComponent id="journal-selected-papers" title="当前来源的论文" queryId="papers" variant="plain" displayRows={filtered} sourceRows={filtered}>
        <div className="jc-paper-rows" data-reviewed-rows>{filtered.map((p,i)=><button key={keyOf(p)} onClick={()=>onRead(p,group.name)} className="jc-paper-row"><span className="jc-row-index">{String(i+1).padStart(2,'0')}</span><div><div className="jc-row-meta">{p.year} · {p.relevance_tier} · {noteOf(notes,p).read_status||'待读'}</div><h3>{p.title_zh||p.title}</h3><p lang="en">{p.title}</p><span className="jc-row-method">{p.region_scope} · {p.ai_status}</span></div><span className="jc-row-arrow" aria-hidden="true">↗</span></button>)}</div>
        {!filtered.length&&<p className="wb-empty">当前合集没有匹配论文。<button onClick={()=>setPaperQuery('')}>清除检索</button></p>}
      </DataComponent>
    </div>}
  </section>;
}
