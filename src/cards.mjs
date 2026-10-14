/** Support compact senses and the original simple JSON format. */
export function getSenses(card) {
  if (Array.isArray(card.back.senses)) return card.back.senses;
  return [{term:card.front,pos:card.back.pos || '',meaning:card.back.meaning,core:card.back.explanation || '',example:card.back.example,translation:card.back.translation || ''}];
}
export function isCardList(value) {
  const text = value => typeof value === 'string' && value.trim().length > 0;
  return Array.isArray(value) && value.length > 0 && new Set(value.map(c=>c?.front)).size === value.length && value.every(card => {
    if (!card || !text(card.front) || !card.back) return false;
    const senses=getSenses(card);
    return senses.length >= 1 && senses.length <= 2 && senses.every(s=>s && ['term','meaning','example'].every(k=>text(s[k])) && ['pos','core','translation'].every(k=>s[k]===undefined || typeof s[k]==='string'));
  });
}
/** Fisher–Yates shuffle: each card is visited once per round. */
export function newRound(length, random = Math.random) {
  const order = Array.from({length}, (_,i)=>i);
  for(let i=length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return {order,position:0};
}
export function deckKey(cards) { return JSON.stringify(cards.map(c=>c.front)); }
export function validRound(round,length) {
  return round && Array.isArray(round.order) && round.order.length===length && new Set(round.order).size===length && round.order.every(i=>Number.isInteger(i)&&i>=0&&i<length) && Number.isInteger(round.position) && round.position>=0 && round.position<=length;
}
export function restoreRound(raw,cards) {
  try {const saved=JSON.parse(raw);if(saved.key===deckKey(cards)&&validRound(saved.round,cards.length))return saved.round;} catch {}
  return newRound(cards.length);
}
