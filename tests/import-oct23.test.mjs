import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectQueue,isPriority} from '../src/queues.mjs';
import {syncImports,isProtected} from '../src/importPolicy.mjs';
import {emptyKnowledge,emptyWord} from '../src/knowledge.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
const report=JSON.parse(readFileSync('public/data/imports/2026-10-23.json','utf8'));
const today=selectQueue(cards,'latest','2026-10-23');
test('October 23 excludes the 245 stale lines and preserves all 147 new inputs',()=>{
 assert.equal(report.excludedYesterdayLines,245);assert.equal(report.mapping.length,147);assert.equal(report.uniqueInputs,144);assert.equal(today.length,143);assert.equal(report.newCards,142);assert.equal(report.totalCount,1321);
 for(const {original,front} of report.mapping){const c=today.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original),original);assert.equal(c.batches.filter(b=>b.date==='2026-10-23').length,1);}
 assert.deepEqual(today.filter(c=>isPriority(c,'2026-10-23')).map(c=>c.front),['preceding']);
 for(const f of ['boil down to','cautiously','criterion','decimate','sturdy','status quo'])assert(!today.some(c=>c.front===f));
 assert.equal(selectQueue(cards,'latest','2026-10-22').length,240);
});
test('participle imports prioritize verbs while preserving meaningful adjective exceptions and the old preceding identity',()=>{
 for(const f of ['complete','integrate','anchor','endanger','localise','coordinate','materialise','affix','overburden']){
  const c=today.find(c=>c.front===f);assert(c,f);assert.equal(c.back.senses[0].pos,'v.',f);
 }
 for(const f of ['disused','unheralded'])assert.equal(today.find(c=>c.front===f).back.senses[0].pos,'adj.');
 const c=today.find(c=>c.front==='preceding');assert.equal(c.back.senses[0].term,'precede');assert.equal(c.back.senses[0].pos,'v.');assert(c.back.senses.some(s=>s.example==='See the preceding section for details.'));assert(!cards.some(c=>c.front==='precede'));
 assert(today.find(c=>c.front==='agency').back.senses[0].meaning.includes('能动性'));
 assert(today.find(c=>c.front==='share').back.senses[0].meaning.includes('共有'));
});
test('today reactivates only the actual repeated old word, not yesterday leftovers',()=>{
 const previous=cards.filter(c=>!c.batches.every(b=>b.date==='2026-10-23')).map(c=>({...c,batches:c.batches.filter(b=>b.date!=='2026-10-23')}));
 let d=syncImports(emptyKnowledge(),previous,new Date(2026,9,23));d={...d,allRound:2,words:{preceding:{...emptyWord(),mastered:true,known:2,permanent:true,ratedRound:2},sturdy:{...emptyWord(),mastered:true,known:2,ratedRound:2}}};
 const next=syncImports(d,cards,new Date(2026,9,23));assert(next.words.preceding.difficult);assert(!next.words.preceding.mastered);assert(next.words.preceding.permanent);assert(next.words.sturdy.mastered);assert.equal(next.imports.preceding.length,2);
 assert(isProtected(today.find(c=>c.front==='preceding'),new Date(2026,9,25)));assert(!isProtected(today.find(c=>c.front==='preceding'),new Date(2026,9,26)));
});
