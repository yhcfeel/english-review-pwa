/** Editorial links only: no suffix guessing, chains or deletion of archived content. */
const own=(o,k)=>Object.hasOwn(o,k)?o[k]:undefined;
const put=(o,k,v)=>Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});
function mergeWord(a,b){
 if(!a)return {...b};
 const newest=(a.knownDay||'')>(b.knownDay||'')?a:b;
 const sameDay=a.knownDay===b.knownDay;
 const round=Math.max(a.ratedRound,b.ratedRound);
 const mastered=a.mastered&&b.mastered;
 const word={...newest,known:sameDay?Math.min(a.known,b.known):newest.known,
  mastered,difficult:!mastered&&(a.difficult||b.difficult||a.mastered!==b.mastered),
  permanent:a.permanent||b.permanent,forgot:Math.max(a.forgot,b.forgot),
  candidate:Math.max(a.candidate||0,b.candidate||0)||null,ratedRound:round,
  firstForgot:(a.ratedRound===round&&a.firstForgot)||(b.ratedRound===round&&b.firstForgot)};
 return word;
}
/** Consume alias learning entries once; union import history before detecting new imports. */
export function migrateFamilies(data,cards){
 const words={...data.words},imports=data.imports===undefined?undefined:{...data.imports};
 for(const card of cards){
  if(!card.mergedInto)continue;
  const old=own(words,card.front);
  if(old){put(words,card.mergedInto,mergeWord(own(words,card.mergedInto),old));delete words[card.front];}
  if(imports){
   const oldKeys=own(imports,card.front);
   if(oldKeys)put(imports,card.mergedInto,[...new Set([...(own(imports,card.mergedInto)||[]),...oldKeys])].sort());
  }
 }
 return imports===undefined?{...data,words}:{...data,words,imports};
}
export function pendingRelearnVersion(data,cards,now=new Date()){
 const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return cards.filter(c=>!c.mergedInto&&c.relearnOn&&c.relearnOn<=today&&c.relearnOn>(data.relearnVersion||'')).map(c=>c.relearnOn).sort().at(-1)||'';
}
/** Explicit one-time restart, separate from normal vocabulary/content updates. */
export function applyRelearning(data,cards,now=new Date()){
 const version=pendingRelearnVersion(data,cards,now);if(!version)return data;
 const words={...data.words};
 for(const card of cards){
  if(card.mergedInto||!card.relearnOn||card.relearnOn>(version)||card.relearnOn<=(data.relearnVersion||''))continue;
  const old=own(words,card.front);if(!old)continue;
  const word={...old,known:0,mastered:false,forgot:0,candidate:null,ratedRound:0,firstForgot:false};delete word.knownDay;
  put(words,card.front,word);
 }
 return {...data,words,relearnVersion:version};
}
