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
export function restoreRound(raw,cards,random=Math.random){
  try{
    const saved=JSON.parse(raw);
    if(saved.key===deckKey(cards)){
      if(validRound(saved.round,cards.length)){
        // One-time repair for queues previously saved with new words appended.
        return saved.round.mixingVersion===1?saved.round:{...saved.round,mixingVersion:1,order:shuffle(saved.round.order,random)};
      }
      // The previous app had no ratings: keep its place but don't assume mastery.
      const old=saved.round;
      if(old&&old.version===undefined&&Array.isArray(old.order)&&old.order.length===cards.length&&new Set(old.order).size===cards.length&&old.order.every(i=>Number.isInteger(i)&&i>=0&&i<cards.length)&&Number.isInteger(old.position)&&old.position>=0&&old.position<cards.length){
        const order=[...old.order.slice(old.position),...old.order.slice(0,old.position)];
        return {...newRound(cards.length),current:order[0],order:order.slice(1)};
      }
    }
    // New imports append cards. Remap by stable front rather than discarding
    // completed cards and scores when the deck grows or is reordered.
    const previous=JSON.parse(saved.key);
    if(Array.isArray(previous)&&previous.every(x=>typeof x==='string')&&new Set(previous).size===previous.length&&validRound(saved.round,previous.length)){
      const indices=new Map(cards.map((c,i)=>[c.front,i]));
      if(previous.every(front=>indices.has(front))){
        const old=saved.round;
        const remap=i=>i===null?null:indices.get(previous[i]);
        const grew=cards.length>previous.length;
        // A finished round is not lifetime mastery. New vocabulary opens a full round.
        if(grew&&old.current===null)return newRound(cards.length,random);
        const next=newRound(cards.length,random);
        const added=next.order.concat(next.current===null?[]:[next.current]).filter(i=>!previous.includes(cards[i].front));
        previous.forEach((front,i)=>{next.states[indices.get(front)]={...old.states[i]};});
        next.step=old.step;next.last=remap(old.last);next.current=remap(old.current);
        next.order=grew?shuffle(old.order.map(remap).concat(added),random):old.order.map(remap);
        if(next.current===null)next.current=next.order.shift()??null;
        if(validRound(next,cards.length))return next;
      }
    }
  }catch{}
  return newRound(cards.length,random);
}
