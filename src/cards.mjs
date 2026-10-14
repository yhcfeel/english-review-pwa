/** Validate the only data source before rendering or caching it. */
export function isCardList(value) {
  return Array.isArray(value) && value.length > 0 && value.every(card =>
    card && typeof card.front === 'string' && card.front.trim() &&
    card.back && ['meaning', 'explanation', 'example'].every(key =>
      typeof card.back[key] === 'string' && card.back[key].trim()) &&
    ['translation', 'note'].every(key => card.back[key] === undefined || typeof card.back[key] === 'string'));
}

/** Uniform draw from all cards except the one currently visible. */
export function randomIndex(length, current = -1, random = Math.random) {
  if (length < 1) return -1;
  if (length === 1) return 0;
  if (current < 0 || current >= length) return Math.floor(random() * length);
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}
