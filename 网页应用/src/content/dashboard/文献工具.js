export const keyOf = p => p.stable_id || p.doi || p.source_url || p.id;
export const noteOf = (notes,p) => notes[keyOf(p)] || {};
export const searchValues = (p,n={}) => [p.id,p.title,p.title_zh,p.authors,p.journal,p.region,p.objective,p.model,p.target,p.sensors,p.doi,n.text,n.questions].flat();
export const asText = v => v == null ? '当前整理记录未提供' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(asText).join('；') : JSON.stringify(v);
export const safeUrl = value => {
  try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
};
export function download(name, body, type='application/json') {
  const url=URL.createObjectURL(new Blob([body],{type}));
  const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportCsv(papers,notes) {
  const fields=[['论文题目','title'],['年份','year'],['DOI','doi'],['研究区','region'],['目标变量','target'],['数据','sensors'],['分辨率','resolution'],['样本','sample'],['模型','model'],['验证','validation'],['结果','results'],['作者局限','limitations_author'],['分析推断','limitations_inferred'],['关联','relevance'],['AI核读范围','reading_depth']];
  const cell=v=>{let t=asText(v);if(/^[=+@-]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"';};
  const rows=[fields.map(x=>x[0]).concat(['我的阅读状态','我的笔记','我的问题'])];
  papers.forEach(p=>{const n=noteOf(notes,p);rows.push(fields.map(x=>p[x[1]]??'当前整理记录未提供').concat([n.read_status||'待读',n.text||'',n.questions||'']));});
  download('筛选文献与我的笔记.csv','\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const statuses=['待读','在读','已读'];
export const copyNotes=notes=>JSON.parse(JSON.stringify(notes));
export function sameValue(left,right){
  if(left===right)return true;
  if(Array.isArray(left)&&Array.isArray(right))return left.length===right.length&&left.every((v,i)=>sameValue(v,right[i]));
  if(!isObject(left)||!isObject(right))return false;
  const keys=Object.keys(left);
  return keys.length===Object.keys(right).length&&keys.every(key=>own(right,key)&&sameValue(left[key],right[key]));
}
function joinText(left,right,label){
  if(!right||left===right||left?.includes(`【${label}】\n${right}`))return left||'';
  return left?`${left}\n\n【${label}】\n${right}`:right;
}
function normalizeAlias(value){
  const text=String(value).trim();
  const doi=text.replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i,'');
  return /^10\.\d{4,9}\//i.test(doi)?`doi:${doi.toLowerCase()}`:text;
}
function assertNote(value){
  if(!isObject(value))throw new Error('备份含无效记录，未导入。');
  if(own(value,'read_status')&&!statuses.includes(value.read_status))throw new Error('备份含无效阅读状态，未导入。');
  for(const field of ['star','read'])if(own(value,field)&&typeof value[field]!=='boolean')throw new Error('备份的收藏或已读状态须为布尔值，未导入。');
  for(const field of ['text','questions','updated_at'])if(own(value,field)&&typeof value[field]!=='string')throw new Error('备份的笔记、问题或时间须为文字，未导入。');
}
export function convertBackup(input,papers,current={}) {
  if(!isObject(input))throw new Error('备份格式不正确，需要笔记对象或含 notes 的备份。');
  const source=own(input,'notes')?input.notes:input;
  if(!isObject(source))throw new Error('备份中的 notes 须为笔记对象，未导入。');
  const aliases=new Map();
  papers.forEach(p=>[keyOf(p),p.id,p.doi,p.source_url,p.fulltext_url,...(Array.isArray(p.aliases)?p.aliases:[])].filter(Boolean).forEach(value=>{
    const alias=normalizeAlias(value),key=keyOf(p);
    if(aliases.has(alias)&&aliases.get(alias)!==key)aliases.set(alias,null);
    else if(!aliases.has(alias))aliases.set(alias,key);
  }));
  const merged=Object.assign(Object.create(null),copyNotes(current));let matched=0,unmatched=0;
  for(const [oldKey,value] of Object.entries(source)) {
    if(!oldKey)throw new Error('备份含空文献标识，未导入。');
    assertNote(value);
    const matchedKey=aliases.get(normalizeAlias(oldKey)),key=matchedKey||oldKey;
    const incoming=copyNotes(value);
    if(!own(incoming,'read_status')&&own(incoming,'read'))incoming.read_status=incoming.read?'已读':'待读';
    if(!own(merged,key))merged[key]=incoming;
    else {
      const existing=merged[key],next={...incoming,...existing};
      if(own(incoming,'star')||own(existing,'star'))next.star=Boolean(existing.star||incoming.star);
      if(own(incoming,'read_status')||own(existing,'read_status'))next.read_status=statuses[Math.max(statuses.indexOf(existing.read_status),statuses.indexOf(incoming.read_status),0)];
      for(const field of ['text','questions'])if(own(incoming,field)||own(existing,field))next[field]=joinText(existing[field],incoming[field],'导入笔记');
      if(!sameValue(next,existing))next.updated_at=new Date().toISOString();
      merged[key]=next;
    }
    matchedKey?matched++:unmatched++;
  }
  return {notes:merged,matched,unmatched};
}

// 按保存前的基线比较每个字段，未改动的本地内容完全采用远端值。
export function mergeNotes(base,local,remote){
  const merged=Object.create(null);
  for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
    if(!own(local,key)){if(own(remote,key))merged[key]=copyNotes(remote[key]);else if(own(base,key))merged[key]=copyNotes(base[key]);continue;}
    if(!own(remote,key)){merged[key]=copyNotes(local[key]);continue;}
    const before=base[key]||{},left=local[key],right=remote[key],note=Object.create(null);
    for(const field of new Set([...Object.keys(before),...Object.keys(left),...Object.keys(right)])){
      const localChanged=own(left,field)!==own(before,field)||!sameValue(left[field],before[field]);
      const remoteChanged=own(right,field)!==own(before,field)||!sameValue(right[field],before[field]);
      if(!localChanged){if(own(right,field))note[field]=right[field];}
      else if(!remoteChanged||sameValue(left[field],right[field])){if(own(left,field))note[field]=left[field];}
      else if(field==='text'||field==='questions')note[field]=joinText(left[field],right[field],'另一窗口记录');
      else if(field==='read_status')note[field]=statuses[Math.max(statuses.indexOf(left[field]),statuses.indexOf(right[field]),0)];
      else if(own(right,field))note[field]=right[field];
      else if(own(left,field))note[field]=left[field];
    }
    if(!sameValue(note,right))note.updated_at=new Date().toISOString();
    merged[key]=note;
  }
  return merged;
}
