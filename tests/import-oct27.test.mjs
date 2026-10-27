import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectQueue,isPriority} from '../src/queues.mjs';
import {syncImports} from '../src/importPolicy.mjs';
import {emptyKnowledge,emptyWord} from '../src/knowledge.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
const report=JSON.parse(readFileSync('public/data/imports/2026-10-27.json','utf8'));
const today=selectQueue(cards,'latest','2026-10-27');
test('October 27 excludes 392 historical lines and maps all 244 fresh inputs to 229 cards',()=>{
 assert.equal(report.excludedPreviousLines,392);assert.equal(report.inputCount,244);assert.equal(report.mapping.length,244);assert.equal(report.uniqueInputs,235);
 assert.equal(today.length,229);assert.equal(report.newCards,221);assert.equal(cards.length,1542);assert.equal(report.totalCount,cards.length);
 for(const {original,front} of report.mapping){const c=today.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original),original);assert.equal(c.batches.filter(b=>b.date==='2026-10-27').length,1);}
 assert.equal(selectQueue(cards,'latest','2026-10-22').length,240);assert.equal(selectQueue(cards,'latest','2026-10-23').length,143);
 const repeated=['deliver','represent','state','precision','implication','drift','constitute','diversity'];
 assert.deepEqual(report.repeatedOldWords,repeated);assert.deepEqual(today.filter(c=>isPriority(c,'2026-10-27')).map(c=>c.front).sort(),repeated.sort());
 for(const f of ['cautiously','preceding','complete','chronology'])assert(!today.some(c=>c.front===f));
});
test('October 27 applies verb-first forms and preserves independently meaningful words and grammar caveats',()=>{
 for(const [front,forms] of Object.entries({thrive:['thriving','thrive'],shatter:['shatters','shatter'],rescue:['rescued','rescue'],condemn:['condemned','condemn'],episode:['episodes','episode']})){
  const c=today.find(c=>c.front===front);assert(c);for(const f of forms)assert(c.originals.includes(f));assert.equal(today.filter(c=>c.front===front).length,1);assert(!isPriority(c,'2026-10-27'));
 }
 for(const f of ['revise','curate','elucidate','entangle','evolve','sacrifice'])assert.equal(today.find(c=>c.front===f).back.senses[0].pos,'v.');
 assert(today.some(c=>c.front==='summons'));assert(today.some(c=>c.front==='underfunding'));assert(today.some(c=>c.front==='revision'));assert(today.find(c=>c.front.startsWith('demand /')).back.core.includes('暗示'));
});
test('only actual October 27 reimports reactivate mastered records; historical leftovers stay mastered',()=>{
 const previous=cards.filter(c=>c.batches.some(b=>b.date!=='2026-10-27')).map(c=>({...c,batches:c.batches.filter(b=>b.date!=='2026-10-27')}));
 let d=syncImports(emptyKnowledge(),previous,new Date(2026,9,27));
 for(const front of [...report.repeatedOldWords,'preceding','complete'])d.words[front]={...emptyWord(),known:2,mastered:true,permanent:true};
 d=syncImports(d,cards,new Date(2026,9,27));
 for(const front of report.repeatedOldWords){assert(d.words[front].difficult);assert(!d.words[front].mastered);assert(d.words[front].permanent);assert.equal(d.words[front].known,0);}
 for(const front of ['preceding','complete'])assert(d.words[front].mastered);
 assert.deepEqual(syncImports(d,cards,new Date(2026,9,27)),d);
});
