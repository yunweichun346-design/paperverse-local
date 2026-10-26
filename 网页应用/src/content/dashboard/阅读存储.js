import {useEffect,useRef,useState} from 'react';
import {copyNotes,mergeNotes} from './文献工具.js';
export function useReadingNotes(){
  const [notes,setNotes]=useState({}),[loaded,setLoaded]=useState(false),[message,setMessage]=useState('正在读取本机阅读记录…'),[conflict,setConflict]=useState(null),[saving,setSaving]=useState(false),[syncToken,setSyncToken]=useState(0);
  const revision=useRef(0),latest=useRef({}),inFlight=useRef(false),ready=useRef(false),pendingConflict=useRef(null);
  const setPending=value=>{pendingConflict.current=value;setConflict(value);};
  const validSnapshot=value=>value&&Number.isInteger(value.revision)&&value.revision>=0&&value.notes&&typeof value.notes==='object'&&!Array.isArray(value.notes);
  useEffect(()=>{
    let active=true;
    fetch('/api/notes').then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error||'读取失败');if(!validSnapshot(b))throw new Error('阅读记录格式异常');if(!active)return;revision.current=b.revision;latest.current=copyNotes(b.notes);ready.current=true;setNotes(b.notes);setLoaded(true);setMessage('阅读记录已连接本机文件');}).catch(e=>{if(active)setMessage('读取失败：'+e.message+'。为保护记录，暂时不能保存。');});
    return()=>{active=false;};
  },[]);
  async function persist(next,{base=latest.current,expected=revision.current,merging=false}={}){
    if(!ready.current||inFlight.current||(pendingConflict.current&&!merging))throw new Error('请等待保存完成或先处理冲突。');
    const baseline=copyNotes(base),draft=copyNotes(next);
    inFlight.current=true;setSaving(true);setMessage('正在保存…');
    try{
      const r=await fetch('/api/notes',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:expected,notes:draft})});
      const b=await r.json();if(r.status===409){if(!validSnapshot(b.current))throw new Error('冲突记录格式异常，草稿仍保留。');setPending({remote:copyNotes(b.current),local:draft,base:baseline});throw new Error('其他窗口有更新。当前草稿已保留，请合并两个窗口的记录。');}
      if(!r.ok)throw new Error(b.error||'保存失败');if(!validSnapshot(b))throw new Error('保存结果格式异常，请刷新确认记录。');revision.current=b.revision;latest.current=copyNotes(b.notes);setNotes(b.notes);setPending(null);setMessage((merging?'冲突已合并并保存到本机':'已保存到本机')+' · '+new Date().toLocaleTimeString('zh-CN'));return b.notes;
    }catch(e){setMessage(e.message);throw e;}finally{inFlight.current=false;setSaving(false);}
  }
  async function save(next){return persist(next);}
  async function update(key,value,baseNote){
    const edited=baseNote===undefined?{...latest.current[key],...value}:mergeNotes({[key]:baseNote},{[key]:{...baseNote,...value}},{[key]:latest.current[key]||{}})[key];
    return persist({...latest.current,[key]:{...edited,updated_at:new Date().toISOString()}});
  }
  async function mergeConflict(){
    const c=pendingConflict.current;if(!c)return;
    const merged=mergeNotes(c.base,c.local,c.remote.notes);
    try{const saved=await persist(merged,{base:c.remote.notes,expected:c.remote.revision,merging:true});setSyncToken(value=>value+1);return saved;}
    catch{return null;}
  }
  return {notes,loaded,message,conflict,saving,syncToken,update,save,mergeConflict,getNotes:()=>copyNotes(latest.current)};
}
