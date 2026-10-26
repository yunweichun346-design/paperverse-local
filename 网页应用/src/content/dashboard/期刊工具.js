export function groupJournals(papers,metadata={}){
  const groups=new Map();
  for(const paper of papers){
    const name=(paper.journal||'来源未注明').trim();
    if(!groups.has(name))groups.set(name,{name,type:metadata[name]?.type||'来源待核',meta:metadata[name]||{},papers:[]});
    groups.get(name).papers.push(paper);
  }
  return [...groups.values()].map(g=>({...g,papers:g.papers.slice().sort((a,b)=>b.year-a.year)}))
    .sort((a,b)=>b.papers.length-a.papers.length||a.name.localeCompare(b.name));
}
export function filterJournals(groups,query,type){
  const text=query.trim().toLowerCase();
  return groups.filter(g=>(type==='全部'||g.type===type)&&g.name.toLowerCase().includes(text));
}
