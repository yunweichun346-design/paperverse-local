import React from 'react';
import ReadingSettings from './阅读设置.jsx';
import DisplayCount from './动效/展示计数.jsx';
import {Icon} from '../../本机组件.jsx';

export const PAGES={
  library:['文献库','检索论文，核对方法与原文证据。'],
  journals:['文献来源','按期刊、会议与预印本来源整理文献。'],
  compare:['论文对比','在相同维度下比较目标变量、样本与验证方式。'],
  reading:['我的阅读','个人笔记与阅读状态，独立于 AI 核读记录。'],
  resources:['数据与周末研究','核对数据可得性，追踪研究记录与证据更新。'],
};

export function ResearchHeader({tab,count,total,scope,onScope,scopeOptions,dirty}) {
  const [title,description]=PAGES[tab]||PAGES.library;
  const filterable=['library','journals'].includes(tab);
  return <header className="rs-header">
    <div className="rs-page-title"><h1 tabIndex={-1}>{title}</h1><span>{description}</span></div>
    <div className="rs-scope"><ReadingSettings/>
      {filterable?<label>研究区范围<select aria-label="研究区范围" value={scope} disabled={dirty} onChange={e=>onScope(e.target.value)}>
        <option value="all">全部研究区</option>{scopeOptions.map(v=><option key={v}>{v}</option>)}
      </select></label>:<span>{tab==='compare'?'范围：已选论文':tab==='reading'?'范围：个人阅读记录':'范围：数据与研究记录'}</span>}
      <small>{filterable?<>当前范围 {count} / <DisplayCount value={total}/> 篇</>:tab==='compare'?`已选 ${count} / 4 篇`:''}{dirty&&' · 笔记草稿未保存'}</small>
    </div>
  </header>;
}

export function RailButton({icon,label,onClick,disabled=false,primary=false,pressed}) {
  return <span className="rs-rail-action">
    <button className={primary?'is-primary':''} type="button" aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={20}/>
    </button><span className="rs-action-tip" aria-hidden="true">{label}</span>
  </span>;
}
