/** Shuffle only the pending unseen pool; scores and due reviews are separate. */
function shuffle(values,random=Math.random){
 const order=[...values];
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
/** Every card is either current, unseen, scheduled, or completed. */
export function newRound(length, random = Math.random) {
  const order=shuffle(Array.from({length},(_,i)=>i),random);
  return {version:2,mixingVersion:1,order:order.slice(1),current:order[0]??null,step:0,last:null,
    states:Array.from({length},()=>({seen:false,score:0,done:false,due:null}))};
}
export function rateCard(round,rating,random=Math.random) {
  if(!['known','vague','forgot'].includes(rating))throw Error('Unknown rating');
  if(round.current===null)return round;
  const next={...round,order:[...round.order],states:round.states.map(s=>({...s})),step:round.step+1,last:round.current};
  const state=next.states[round.current];
  const first=!state.seen;
  if(rating==='known')state.score=first?3:Math.min(3,state.score+1);
  else if(rating==='vague'&&first)state.score=1;
  else if(rating==='forgot')state.score=Math.max(0,state.score-1);
  state.seen=true;state.done=state.score===3;
  // Count future presentations, not minutes. Third upcoming card = step + 3.
  state.due=state.done?null:round.step+(rating==='forgot'?3+Math.floor(random()*3):10+Math.floor(random()*6));
  const pending=next.states.map((s,i)=>({s,i})).filter(({s})=>!s.done&&s.due!==null).sort((a,b)=>a.s.due-b.s.due||a.i-b.i);
  const due=pending.find(({s})=>s.due<=next.step);
  if(due)next.current=due.i;
  else if(next.order.length)next.current=next.order.shift();
  else next.current=(pending.find(({i})=>i!==next.last)||pending[0])?.i??null;
  if(next.current!==null)next.states[next.current].due=null;
  return next;
}
export function validRound(r,n) {
  if(!r||r.version!==2||!Array.isArray(r.states)||r.states.length!==n||!Array.isArray(r.order)||!Number.isInteger(r.step)||r.step<0)return false;
  const index=i=>Number.isInteger(i)&&i>=0&&i<n;
  if((r.current!==null&&!index(r.current))||(r.last!==null&&!index(r.last)))return false;
  if(r.order.some(i=>!index(i))||new Set(r.order).size!==r.order.length||r.order.includes(r.current))return false;
  return r.states.every((s,i)=>{
    if(!s||typeof s.seen!=='boolean'||typeof s.done!=='boolean'||!Number.isInteger(s.score)||s.score<0||s.score>3)return false;
    if(s.due!==null&&(!Number.isInteger(s.due)||s.due<0))return false;
    if(s.done)return s.seen&&s.score===3&&s.due===null&&r.current!==i&&!r.order.includes(i);
    if(s.score===3)return false;
    if(i===r.current)return s.due===null&&(s.seen||s.score===0);
    if(r.order.includes(i))return !s.seen&&s.score===0&&s.due===null;
    return s.seen&&s.due!==null&&r.current!==null;
  })&&(r.current!==null||r.states.every(s=>s.done));
}
export function deckKey(cards){return JSON.stringify(cards.map(c=>c.front));}
// Content revision includes batches: an import of only repeated words is still an update.
export function vocabularyRevision(cards){
 const text=JSON.stringify(cards);let a=2166136261,b=5381;
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;}
 return `vocab-reset-1:${text.length}:${a>>>0}:${b>>>0}`;
}
export function restoreRound(raw,cards,random=Math.random){
 try{const saved=JSON.parse(raw);if(saved.key===deckKey(cards)&&validRound(saved.round,cards.length))return saved.round;}catch{}
 return newRound(cards.length,random);
}
export function restoreVocabularyRound(raw,cards,revision,random=Math.random){
 try{if(JSON.parse(raw).revision===revision)return restoreRound(raw,cards,random);}catch{}
 return newRound(cards.length,random);
}
