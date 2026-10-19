export function batchKey(batch){return batch.id||batch.date;}
export function batchLabel(key){const match=/^(\d{4}-\d{2}-\d{2})-(\d{2})$/.exec(key);return match?`${match[1]} · 第 ${Number(match[2])} 批`:key;}
export function latestBatch(cards){
 return cards.flatMap(c=>(c.batches||[]).map(batchKey)).sort().at(-1)||'';
}
export function selectQueue(cards,mode,date=latestBatch(cards)){
 return mode==='latest'&&date?cards.filter(c=>c.batches?.some(b=>batchKey(b)===date)):cards;
}
export function isPriority(card,date){
 return !!card?.batches?.some(b=>batchKey(b)===date&&b.repeat);
}
export function queueStorage(base,mode,date){return `${base}:${mode==='latest'?`latest:${date}`:'all'}`;}
