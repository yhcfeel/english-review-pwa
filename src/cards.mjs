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
