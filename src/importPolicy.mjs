import {migrateFamilies,applyRelearning} from './families.mjs';
import {wordState} from './knowledge.mjs';
const dayNumber=date=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
 const value=Date.parse(`${date}T00:00:00Z`);
 return Number.isFinite(value)&&new Date(value).toISOString().slice(0,10)===date?value/86400000:NaN;
};
const actualBatches=card=>[...(card?.batches||[]),...(card?.familyBatches||[])];
export function isLegacyReview(card){
 return !!card?.relearnOn&&!actualBatches(card).some(b=>b.date>card.relearnOn);
}
export function isProtected(card,now=new Date()){
 if(isLegacyReview(card))return false;
 const dates=[...actualBatches(card).map(b=>b.date),...(card?.reviewBatches||[])].filter(d=>Number.isFinite(dayNumber(d))).sort();
 if(!dates.length)return false;
 const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000;
 return today-dayNumber(dates.at(-1))<4;
}
/** Baseline old imports once; only newly observed batches reactivate old words. */
export function syncImports(data,cards,now=new Date()){
 // An older open tab can fetch the new dictionary before its app worker upgrades.
 // It records the new base batch but cannot combine its prior derived-word history.
 // Recover those real reimports once, before the release's persistent reset marker.
 const recover=new Set();
 for(const alias of cards){
  if(!alias.mergedInto||!alias.mergedOn||alias.mergedOn<=(data.relearnVersion||''))continue;
  const prior=data.imports&&Object.hasOwn(data.imports,alias.front)?data.imports[alias.front]:null;
  const target=cards.find(c=>c.front===alias.mergedInto);
  const seen=data.imports&&Object.hasOwn(data.imports,alias.mergedInto)?data.imports[alias.mergedInto]:[];
  if(prior?.length&&target?.batches?.some(b=>b.date>=alias.mergedOn&&seen.includes(b.id||b.date)&&!prior.includes(b.id||b.date)))recover.add(alias.mergedInto);
 }
 data=migrateFamilies(data,cards);
 for(const front of recover)data={...data,words:{...data.words,[front]:{...wordState(data,front),known:0,mastered:false,difficult:true}}};
 const baseline=data.imports===undefined,imports={...data.imports},words={...data.words};
 for(const card of cards){
  if(card.mergedInto)continue;
  const keys=[...new Set(actualBatches(card).map(b=>b.id||b.date))].sort();
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
 return applyRelearning({...data,imports,words},cards,now);
}
/** Only the presentation immediately after completing a milestone gets a color. */
export function milestone(round,mode){
 if(mode!=='all'||!round||round.current===null||round.last===null||!round.states[round.last]?.done)return '';
 const total=round.states.length,completed=round.states.filter(s=>s.done).length;
 if(total>100&&total-completed===100)return 'last-hundred';
 if(total>1&&completed===Math.ceil(total/2))return 'halfway';
 return '';
}
