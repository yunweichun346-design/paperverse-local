import React,{useRef,useState} from 'react';
import {useListMotion} from './动效/列表动效.js';
import {useWheelEmphasis} from './动效/阶梯列表.js';
import {DataComponent} from '../../本机组件.jsx';
import {keyOf,noteOf,searchValues} from './文献工具.js';
function Highlight({text,query}){
 const words=query.trim().split(/\s+/).filter(Boolean),source=String(text||''),lower=source.toLowerCase(),parts=[];let cursor=0;
 while(cursor<source.length){let at=-1,word='';for(const w of words){const i=lower.indexOf(w.toLowerCase(),cursor);if(i>=0&&(at<0||i<at)){at=i;word=w;}}if(at<0){parts.push(source.slice(cursor));break;}parts.push(source.slice(cursor,at),<mark key={at}>{source.slice(at,at+word.length)}</mark>);cursor=at+word.length;}
 return <>{parts}</>;
}
function Snippet({paper,note,query}){
 if(!query.trim())return null;const words=query.toLowerCase().trim().split(/\s+/),source=searchValues(paper,note).find(v=>words.some(w=>String(v||'').toLowerCase().includes(w)));if(!source)return null;const text=String(source),at=Math.max(0,text.toLowerCase().indexOf(words.find(w=>text.toLowerCase().includes(w)))-35),clip=text.slice(at,at+180);return <p className='rt-search-snippet'>{at>0?'…':''}<Highlight text={clip} query={query}/>{at+180<text.length?'…':''}</p>;
}
export default function PaperList({papers,all,notes,chosen,compare,onChoose,onCompare,filters,setFilters,onExport,fulltext}){
  const [density,setDensity]=useState('compact');
  const [paging,setPaging]=useState({filters,all,index:0}),list=useRef(null);
  const paginated=papers.length>200,pageSize=50,pageCount=paginated?Math.ceil(papers.length/pageSize):1;
  const page=Math.min(paging.filters===filters&&paging.all===all?paging.index:0,pageCount-1);
  const rows=paginated?papers.slice(page*pageSize,(page+1)*pageSize):papers;
  useListMotion(list,rows.map(keyOf).join('|')+density);
  useWheelEmphasis(list,rows.map(keyOf).join('|')+density);
  const turnPage=index=>{setPaging({filters,all,index});requestAnimationFrame(()=>{const first=list.current?.querySelector('button');first?.focus({preventScroll:true});first?.scrollIntoView({block:'start',behavior:'instant'});});};
  const opts=(field)=>[...new Set(all.map(p=>p[field]||'待核'))].sort();
  const filter=(field,label)=><label key={field}>{label}<select aria-label={label} value={filters[field]} onChange={e=>setFilters(s=>({...s,[field]:e.target.value}))}><option value="all">全部</option>{opts(field).map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
  const advanced=filters.ai_status!=='all'||filters.year!=='all'||filters.read!=='全部'||filters.sort!=='高原优先';
  return <div className="wb-list-panel" data-density={density}>
    <div className="wb-filter-surface"><div className="wb-search"><label htmlFor="paper-search">找到你的下一篇</label><div className="wb-search-control"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="paper-search" aria-label="检索文献与我的笔记" placeholder="文献、PDF文字层、我的笔记…" maxLength={200} value={filters.search} onChange={e=>setFilters(s=>({...s,search:e.target.value}))}/></div></div>
    {filters.search.trim()&&<p role="status">{fulltext?.status==='loading'?'正在检索PDF文字层和已保存笔记…':fulltext?.status==='error'?'全文检索暂不可用；当前仅匹配文献记录与已加载笔记。':'已检索文献记录、已提取的PDF文字层和已保存笔记。'}{fulltext?.total>1000?' 全文命中超过1000条，请缩小关键词范围。':''}{fulltext?.unlinked>0?` 另有 ${fulltext.unlinked} 条未关联笔记命中，未计入文献列表。`:''}</p>}
    <div className="wb-filter-grid">{filter('region_scope','研究地区')}{filter('relevance_tier','课题关联')}</div>
    {filters.journal&&filters.journal!=='all'&&<div className="rn-source-filter"><span>来自 {filters.journal}</span><button aria-label="清除期刊筛选" onClick={()=>setFilters(s=>({...s,journal:'all'}))}>×</button></div>}
    <details className="wb-more-filters" open={advanced||undefined}><summary>更多筛选 <span>{advanced?'已应用':'范围 · 年份 · 我的阅读'}</span></summary><div className="wb-filter-grid">{filter('ai_status','AI核读范围')}{filter('year','年份')}<label>我的阅读<select aria-label="我的阅读筛选" value={filters.read} onChange={e=>setFilters(s=>({...s,read:e.target.value}))}>{['全部','待读','在读','已读','已收藏'].map(v=><option key={v}>{v}</option>)}</select></label><label>排序<select aria-label="文献排序" value={filters.sort} onChange={e=>setFilters(s=>({...s,sort:e.target.value}))}>{['高原优先','最新年份','最早年份','题目'].map(v=><option key={v}>{v}</option>)}</select></label></div></details></div>
    <div className="wb-list-tools"><div role="group" aria-label="列表密度"><button aria-pressed={density==='compact'} onClick={()=>setDensity('compact')}>紧凑</button><button aria-pressed={density==='comfortable'} onClick={()=>setDensity('comfortable')}>舒适</button></div><span>显示 {papers.length} / {all.length} 篇</span><button onClick={()=>setFilters({search:'',journal:'all',region_scope:'all',relevance_tier:'all',ai_status:'all',year:'all',read:'全部',sort:'高原优先'})}>重置</button><button onClick={onExport}>导出筛选结果</button></div>
    <DataComponent id="literature-list" title="当前筛选文献" queryId="papers" variant="plain" displayRows={rows} sourceRows={papers}>
      <div className="wb-paper-list" ref={list} data-reviewed-rows>{rows.length?rows.map(p=>{const key=keyOf(p),n=noteOf(notes,p);return <article data-flip-id={key} key={key} className={'wb-paper-card '+(chosen===key?'is-selected':'')}><div className="wb-paper-surface">
        <button className="wb-paper-main" aria-current={chosen===key?'true':undefined} onClick={()=>onChoose(p)}><div className="wb-card-meta"><span>{p.year} · {p.journal}</span><span>{n.star?'★ ':''}{n.read_status||'待读'}</span></div><h3><Highlight text={p.title_zh||p.title} query={filters.search}/></h3><p className="rt-list-authors" title={p.authors}>{p.authors}</p>{fulltext?.hits[key]?<p className="rt-search-snippet"><span>{fulltext.hits[key].source} · </span><Highlight text={fulltext.hits[key].snippet} query={filters.search}/></p>:<Snippet paper={p} note={n} query={filters.search}/>}<p>{p.region}</p><div className="wb-tags"><span className={p.region_scope==='青藏高原'?'wb-tag-accent':''}>{p.region_scope||'待核'}</span><span>{p.relevance_tier||'待核'}</span><span>{p.ai_status||p.reading_depth}</span></div></button>
        <label className="wb-compare-check"><input type="checkbox" checked={compare.includes(key)} onChange={()=>onCompare(p)}/> 加入对比<span aria-hidden="true">→</span></label>
      </div></article>}):<p className="wb-empty">没有符合条件的文献。可清除关键词或重置筛选。</p>}</div>
    </DataComponent>
    {paginated&&<nav className="rt-pagination" aria-label="文献分页"><button disabled={page===0} onClick={()=>turnPage(page-1)}>上一页</button><span role="status">第 {page+1} / {pageCount} 页 · {page*pageSize+1}–{Math.min((page+1)*pageSize,papers.length)} / {papers.length} 篇</span><button disabled={page===pageCount-1} onClick={()=>turnPage(page+1)}>下一页</button></nav>}
  </div>;
}
