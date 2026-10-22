import {wordState} from './knowledge.mjs';
const dayNumber=date=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
 const value=Date.parse(`${date}T00:00:00Z`);
 return Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===date?value/86400000:NaN;
};
export function isProtected(card,now=new Date()){
 const dates=(card?.batches||[]).map(b=>b.date).filter(d=>Number.isFinite(dayNumber(d))).sort();
 if(!dates.length)return false;
 const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000;
 return today-dayNumber(dates.at(-1))<3;
}
/** Baseline old imports once; only newly observed batches reactivate old words. */
export function syncImports(data,cards,now=new Date()){
 const baseline=data.imports===undefined,imports={...data.imports},words={...data.words};
 for(const card of cards){
  const keys=[...new Set((card.batches||[]).map(b=>b.id||b.date))].sort();
  const previous=Object.hasOwn(imports,card.front)?imports[card.front]:[];
  const added=keys.some(key=>!previous.includes(key));
  const merged=[...new Set([...previous,...keys])].sort();
  Object.defineProperty(imports,card.front,{value:merged,enumerable:true,writable:true,configurable:true});
  const old=wordState(data,card.front);
  if(!baseline&&added&&merged.length>=2){
   Object.defineProperty(words,card.front,{value:{...old,known:0,mastered:false,difficult:true},enumerable:true,writable:true,configurable:true});
  }else if(baseline&&!old.mastered&&old.known>0&&isProtected(card,now)){
   Object.defineProperty(words,card.front,{value:{...old,known:0},enumerable:true,writable:true,configurable:true});
  }
 }
 return {...data,imports,words};
}
/** Only the presentation immediately after completing a milestone gets a color. */
export function milestone(round,mode){
 if(mode!=='latest'||!round||round.current===null||round.last===null||!round.states[round.last]?.done)return '';
 const total=round.states.length,completed=round.states.filter(s=>s.done).length;
 if(total>100&&total-completed===100)return 'last-hundred';
 if(total>1&&completed===Math.ceil(total/2))return 'halfway';
 return '';
}
