import {useEffect,useState} from 'react';

export function useFulltextSearch(query,notes,readerOpen){
  const normalized=query.trim(),[state,setState]=useState({query:'',hits:{},status:'idle',total:0});
  useEffect(()=>{
    if(!normalized){setState({query:'',hits:{},status:'idle',total:0});return;}
    const controller=new AbortController();
    setState({query:normalized,hits:{},status:'loading',total:0});
    const timer=setTimeout(async()=>{
      try{
        const response=await fetch(`/api/search?q=${encodeURIComponent(normalized)}&limit=1000`,{signal:controller.signal});
        if(!response.ok)throw new Error('search unavailable');
        const result=await response.json();
        if(!Array.isArray(result.results))throw new Error('invalid search response');
        if(!controller.signal.aborted)setState({query:normalized,hits:Object.fromEntries(result.results.filter(r=>r.kind==='paper').map(r=>[r.stable_id,r])),status:'ready',total:result.total,unlinked:result.results.filter(r=>r.kind==='note').length});
      }catch(error){if(!controller.signal.aborted&&error.name!=='AbortError')setState({query:normalized,hits:{},status:'error',total:0});}
    },180);
    return()=>{clearTimeout(timer);controller.abort();};
  },[normalized,notes,readerOpen]);
  return state.query===normalized?state:{query:normalized,hits:{},status:'loading',total:0};
}
