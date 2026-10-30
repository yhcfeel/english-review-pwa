import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectQueue,isPriority} from '../src/queues.mjs';
import {syncImports} from '../src/importPolicy.mjs';
import {emptyKnowledge,emptyWord} from '../src/knowledge.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8')).map(c=>({...c,mergedInto:undefined,familyBatches:undefined,relearnOn:undefined})); // Historical import behavior before the October 30 migration.
const report=JSON.parse(readFileSync('public/data/imports/2026-10-29.json','utf8'));
const today=selectQueue(cards,'latest','2026-10-29');
test('October 29 source boundary, totals and aliases',()=>{
 assert.equal(report.totalCount,1770);assert.equal(report.latestCount,107);assert.equal(today.filter(c=>report.mapping.some(m=>m.front===c.front)).length,107);assert.equal(report.newCards,99);assert.equal(report.excludedPreviousLines,135);
 assert.deepEqual(report.sourceMapping.map(x=>x.sourceLine),Array.from({length:107},(_,i)=>136+i));
 for(const {original,front} of report.mapping){const c=today.find(c=>c.front===front);assert(c);assert(c.originals.includes(original));}
 assert.deepEqual(today.filter(c=>isPriority(c,'2026-10-29')).map(c=>c.front).sort(),report.repeatedOldWords.slice().sort());
 assert.equal(selectQueue(cards,'latest','2026-10-28').length,134);
});
test('October 29 verb forms and missing letter preserved',()=>{
 assert(today.find(c=>c.front==='in the blink of an eye').originals.includes('n the blink of an eye'));
 for(const f of ['bully','diverge','entrance','rupture','portray','swing','acquaint','dissemble','skyrocket'])assert(today.find(c=>c.front===f).back.senses[0].pos.startsWith('v.'));
 assert(today.find(c=>c.front==='skeptical').originals.includes('sceptical'));
});
test('October 29 reimports preserve permanent flags and daily history',()=>{
 const previous=cards.filter(c=>c.batches.some(b=>b.date!=='2026-10-29')).map(c=>({...c,batches:c.batches.filter(b=>b.date!=='2026-10-29')}));
 let d=syncImports(emptyKnowledge(),previous,new Date(2026,9,29));
 for(const f of [...report.repeatedOldWords,'sturdy'])d.words[f]={...emptyWord(),known:2,knownDay:'2026-10-28',mastered:true,permanent:true};
 d=syncImports(d,cards,new Date(2026,9,29));
 for(const f of report.repeatedOldWords){assert(d.words[f].difficult);assert(!d.words[f].mastered);assert(d.words[f].permanent);assert.equal(d.words[f].known,0);assert.equal(d.words[f].knownDay,'2026-10-28');}
 assert(d.words.sturdy.mastered);assert.deepEqual(syncImports(d,cards,new Date(2026,9,29)),d);
});
