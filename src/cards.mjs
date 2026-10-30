/** Support compact senses and the original simple JSON format. */
export function getSenses(card) {
  if (Array.isArray(card.back.senses)) return card.back.senses;
  return [{term:card.front,pos:card.back.pos || '',meaning:card.back.meaning,core:card.back.explanation || '',example:card.back.example,translation:card.back.translation || ''}];
}
export function isCardList(value) {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  return Array.isArray(value) && value.length > 0 && new Set(value.map(c=>c?.front)).size === value.length && value.every(card => {
    if (!card || !text(card.front) || !card.back) return false;
    if(card.mergedInto!==undefined&&(!text(card.mergedInto)||card.mergedInto===card.front||!value.some(c=>c.front===card.mergedInto&&c.mergedInto===undefined)))return false;
    if(card.reviewBatches!==undefined&&(!Array.isArray(card.reviewBatches)||new Set(card.reviewBatches).size!==card.reviewBatches.length||card.reviewBatches.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))))return false;
    if(card.back.core!==undefined&&!text(card.back.core))return false;
    const senses=getSenses(card);
    if(card.mergedOn!==undefined&&(!card.mergedInto||!text(card.mergedOn)||!/^\d{4}-\d{2}-\d{2}$/.test(card.mergedOn)))return false;
    if(card.relearnOn!==undefined&&(!text(card.relearnOn)||!/^\d{4}-\d{2}-\d{2}$/.test(card.relearnOn)))return false;
    if((card.batches!==undefined&&!Array.isArray(card.batches))||(card.familyBatches!==undefined&&!Array.isArray(card.familyBatches)))return false;
    const batches=card.batches===undefined&&card.familyBatches===undefined?undefined:[...(card.batches||[]),...(card.familyBatches||[])];
    if(batches!==undefined&&(!Array.isArray(batches)||batches.some(b=>!b||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||typeof b.repeat!=='boolean'||(b.id!==undefined&&(typeof b.id!=='string'||!/^\d{4}-\d{2}-\d{2}-\d{2}$/.test(b.id)||!b.id.startsWith(b.date+'-'))))||new Set(batches.map(b=>b.id||b.date)).size!==batches.length))return false;
    return senses.length >= 1 && senses.length <= 12 && senses.every(s=>s && ['term','meaning','example'].every(k=>text(s[k])) && ['pos','core','translation'].every(k=>s[k]===undefined || typeof s[k]==='string') && ['exampleHighlights','coreHighlights'].every(k=>s[k]===undefined || (Array.isArray(s[k])&&s[k].every(text))));
  });
}
