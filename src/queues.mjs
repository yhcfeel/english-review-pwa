export function latestBatch(cards){
 return cards.flatMap(c=>(c.batches||[]).map(b=>b.date)).sort().at(-1)||'';
}
export function selectQueue(cards,mode,date=latestBatch(cards)){
 return mode==='latest'&&date?cards.filter(c=>c.batches?.some(b=>b.date===date)):cards;
}
export function isPriority(card,date){
 return !!card?.batches?.some(b=>b.date===date&&b.repeat);
}
export function queueStorage(base,mode,date){return `${base}:${mode==='latest'?`latest:${date}`:'all'}`;}
