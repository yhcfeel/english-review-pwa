/** Literal text ranges only: no HTML from the vocabulary is interpreted. */
export function highlightParts(text, phrases = [], wholeWords = false) {
  const spans = [];
  const lower = text.toLocaleLowerCase('en');
  for (const phrase of phrases) {
    if (typeof phrase !== 'string' || !phrase.trim()) continue;
    const needle = phrase.toLocaleLowerCase('en');
    let from = 0;
    while (from < text.length) {
      const start = lower.indexOf(needle, from);
      if (start < 0) break;
      const end = start + needle.length;
      if (!wholeWords || (!/[a-z]/i.test(text[start - 1] || '') && !/[a-z]/i.test(text[end] || ''))) spans.push([start, end]);
      from = end;
    }
  }
  spans.sort((a,b) => a[0]-b[0] || b[1]-a[1]);
  const merged = [];
  for (const span of spans) {
    const previous = merged[merged.length-1];
    if (previous && span[0] <= previous[1]) previous[1] = Math.max(previous[1], span[1]);
    else merged.push([...span]);
  }
  const parts = [];
  let cursor = 0;
  for (const [start,end] of merged) {
    if (start > cursor) parts.push({text:text.slice(cursor,start),highlight:false});
    parts.push({text:text.slice(start,end),highlight:true});
    cursor = end;
  }
  if (cursor < text.length) parts.push({text:text.slice(cursor),highlight:false});
  return parts;
}
