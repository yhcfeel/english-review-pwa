import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {highlightParts} from '../src/highlight.mjs';
test('literal highlighting preserves text and matches whole English words',()=>{
 const text='The retailer retails products at retail prices.';
 const parts=highlightParts(text,['retail'],true);
 assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.highlight).map(p=>p.text),['retail']);
 assert.deepEqual(highlightParts('We DESIRE change.',['desire'],true).filter(p=>p.highlight).map(p=>p.text),['DESIRE']);
});
test('overlapping phrases are merged without duplication and text is never treated as HTML',()=>{
 const text='像水一点点冲走泥土：<b>test</b>';
 const parts=highlightParts(text,['水一点点冲走泥土','一点点冲走']);
 assert.equal(parts.map(p=>p.text).join(''),text);assert.equal(parts.filter(p=>p.highlight).length,1);
});
test('every example and metaphor has a matching explicit highlight',()=>{
 const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
 for(const c of cards)for(const s of c.back.senses){
  assert(highlightParts(s.example,s.exampleHighlights,true).some(p=>p.highlight),c.front);
  if(s.core)assert(highlightParts(s.core,s.coreHighlights).some(p=>p.highlight),c.front);
 }
});
