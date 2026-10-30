import {migrateFamilies} from './families.mjs';
import {getSenses} from './cards.mjs';
import {selectQueue} from './queues.mjs';
import {deckKey,newRound,validRound} from './review.mjs';

/** @typedef {{known:number,difficult:boolean,mastered:boolean,forgot:number,permanent:boolean,candidate:number|null,ratedRound:number,firstForgot:boolean,knownDay?:string}} Word */
/** @typedef {{version:number,allRound:number,words:Record<string,Word>,queues:Record<string,string>,imports?:Record<string,string[]>,relearnVersion?:string}} Knowledge */
/** @returns {Knowledge} */
export function emptyKnowledge(){return {version:1,allRound:0,words:{},queues:{}};}
/** @returns {Word} */
export function emptyWord(){return {known:0,difficult:false,mastered:false,forgot:0,permanent:false,candidate:null,ratedRound:0,firstForgot:false};}
export const knowledgeKey=base=>`${base}:knowledge`;
export const scopeKey=(mode,batch)=>mode==='all'?'all':`latest:${batch}`;
const own=(object,key)=>Object.hasOwn(object,key)?object[key]:undefined;
export const wordState=(data,front)=>own(data.words,front)||emptyWord();
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const calendarDay=now=>`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const dayNumber=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day?Date.parse(day)/86400000:NaN;
export function validKnowledge(data){
 return !!data&&data.version===1&&integer(data.allRound)&&data.words&&typeof data.words==='object'&&!Array.isArray(data.words)&&data.queues&&typeof data.queues==='object'&&!Array.isArray(data.queues)
 &&Object.values(data.words).every(w=>w&&integer(w.known)&&w.known<=4&&integer(w.forgot)&&w.forgot<=3&&['difficult','mastered','permanent','firstForgot'].every(k=>typeof w[k]==='boolean')&&integer(w.ratedRound)&&w.ratedRound<=data.allRound&&(w.candidate===null||(integer(w.candidate)&&w.candidate>0&&w.candidate<=data.allRound))&&(!w.mastered||!w.difficult)&&(w.knownDay===undefined||Number.isFinite(dayNumber(w.knownDay))))
 &&(data.relearnVersion===undefined||Number.isFinite(dayNumber(data.relearnVersion)))
 &&Object.entries(data.queues).every(([key,value])=>(key==='all'||key.startsWith('latest:'))&&typeof value==='string')
 &&(data.imports===undefined||(data.imports&&typeof data.imports==='object'&&!Array.isArray(data.imports)&&Object.values(data.imports).every(keys=>Array.isArray(keys)&&new Set(keys).size===keys.length&&keys.every(k=>typeof k==='string'&&/^\d{4}-\d{2}-\d{2}(?:-\d{2})?$/.test(k)))));
}
export function readKnowledge(storage,base){
 const raw=storage.getItem(knowledgeKey(base));
 const data=raw===null?emptyKnowledge():JSON.parse(raw);
 if(!validKnowledge(data))throw Error('Invalid knowledge record');
 const queues={};
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(key===`${base}:all`||key?.startsWith(`${base}:latest:`))queues[key.slice(base.length+1)]=storage.getItem(key);
 }
 return {...data,queues:{...queues,...data.queues}};
}
export function activeQueue(cards,mode,batch,data){return selectQueue(cards,mode,batch).filter(card=>!card.mergedInto&&!wordState(data,card.front).mastered);}
export function saveQueue(data,cards,round,mode,batch,revision){return {...data,queues:{...data.queues,[scopeKey(mode,batch)]:JSON.stringify({revision,key:deckKey(cards),round})}};}

/** Prune only known mastered words, never migrate progress across vocabulary revisions. */
export function restoreActiveRound(raw,cards,revision,data){
 try{
  const saved=JSON.parse(raw),previous=JSON.parse(saved.key);
  if(saved.revision!==revision||!Array.isArray(previous)||previous.some(f=>typeof f!=='string')||new Set(previous).size!==previous.length||!validRound(saved.round,previous.length))return null;
  if(saved.key===deckKey(cards))return saved.round;
  const indices=new Map(cards.map((card,i)=>[card.front,i]));
  if(previous.some(front=>!indices.has(front)&&!wordState(data,front).mastered)||cards.some(card=>!previous.includes(card.front)))return null;
  const old=saved.round,remap=i=>i===null?null:indices.get(previous[i])??null;
  const next={...newRound(cards.length),step:old.step,last:remap(old.last),current:remap(old.current),order:old.order.map(remap).filter(i=>i!==null)};
  previous.forEach((front,i)=>{if(indices.has(front))next.states[indices.get(front)]={...old.states[i]};});
  if(next.current===null){
   const pending=next.states.map((s,i)=>({s,i})).filter(({s})=>!s.done&&s.due!==null).sort((a,b)=>a.s.due-b.s.due||a.i-b.i);
   next.current=pending.find(({s})=>s.due<=next.step)?.i??next.order.shift()??pending[0]?.i??null;
   if(next.current!==null)next.states[next.current].due=null;
  }
  return validRound(next,cards.length)?next:null;
 }catch{return null;}
}
export function openQueue(data,cards,mode,batch,revision,restart=false){
 const active=activeQueue(cards,mode,batch,data);
 const restored=restart?null:restoreActiveRound(data.queues[scopeKey(mode,batch)],active,revision,data);
 const round=restored||newRound(active.length);
 const next=mode==='all'&&(!restored||data.allRound===0)?{...data,allRound:data.allRound+1}:data;
 return {data:saveQueue(next,active,round,mode,batch,revision),cards:active,round};
}
export function recordKnowledge(data,front,rating,mode,first,protectedWord=false,now=new Date(),legacyReview=false){
 if(!['known','vague','forgot'].includes(rating))throw Error('Invalid rating');
 if(mode!=='all')return data;
 const id=data.allRound;if(id<1)throw Error('No all-review round');
 const old=wordState(data,front);if(old.mastered)return data;
 const word={...old};
 if(first&&old.ratedRound!==id){
  const consecutive=old.ratedRound===id-1;
  const bad=rating!=='known';
  if(old.candidate===id-1&&bad)word.difficult=true;
  word.candidate=null;
  word.forgot=rating==='forgot'?Math.min(3,(consecutive?old.forgot:0)+1):0;
  word.permanent=old.permanent||word.forgot===3;
  word.ratedRound=id;word.firstForgot=rating==='forgot';
 }else if(!first){
  // Existing v2 rounds did not record their first rating: never infer it retrospectively.
  if(old.ratedRound!==id){word.ratedRound=id;word.firstForgot=false;}
  else if(word.firstForgot&&rating!=='known')word.candidate=id;
 }
 // Mastery uses the first all-review rating per local calendar day, even when a
 // round continues across midnight. Round-based difficulty/permanent rules stay separate.
 const today=calendarDay(now),day=dayNumber(today);
 if(!Number.isFinite(day))throw Error('Invalid review date');
 if(old.knownDay===undefined||day>dayNumber(old.knownDay)){
  word.known=rating==='known'&&!protectedWord?(day-dayNumber(old.knownDay)===1?old.known:0)+1:0;
  word.knownDay=today;
  if(word.known>=(legacyReview?2:word.difficult?4:3)){word.mastered=true;word.difficult=false;}
 }
 return {...data,words:{...data.words,[front]:word}};
}
export const TABLES={mastered:'已掌握',difficult:'难记词',permanent:'三轮首次忘记（永久）'};
export function tableRows(cards,data,table){
 if(!Object.hasOwn(TABLES,table))throw Error('Invalid table');
 // Include archived fronts even if a future vocabulary removes a word.
 data=migrateFamilies(data,cards);
 const byFront=new Map(cards.map(card=>[card.front,card]));
 return Object.entries(data.words).filter(([,word])=>word[table]).map(([front])=>{
  const card=byFront.get(front);return {front,meaning:card?getSenses(card).map(s=>`${s.pos?`${s.pos} `:''}${s.meaning}`).join('；'):'词卡暂不在当前词库中'};
 });
}
const cell=value=>{const text=String(value);return `"${(/^[\s]*[=+@-]/.test(text)?"'":'')+text.replaceAll('"','""')}"`;};
export function tableCSV(rows,table){return '\uFEFF'+[['单词','释义','词表'],...rows.map(row=>[row.front,row.meaning,TABLES[table]])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
export function tablesJSON(cards,data){return {format:'english-review-word-tables',version:1,mastered:tableRows(cards,data,'mastered'),difficult:tableRows(cards,data,'difficult'),permanent:tableRows(cards,data,'permanent')};}
