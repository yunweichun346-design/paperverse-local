import {mergeNotes,sameValue} from './文献工具.js';

const editable=note=>({read_status:note?.read_status||'待读',text:note?.text||'',questions:note?.questions||''});

export function reconcileReadingDraft(baseline,current,saved){
  const persisted=editable(saved);
  const merged=mergeNotes({draft:editable(baseline)},{draft:editable(current)},{draft:persisted});
  const draft=editable(merged.draft);
  return {draft,dirty:!sameValue(draft,persisted)};
}
