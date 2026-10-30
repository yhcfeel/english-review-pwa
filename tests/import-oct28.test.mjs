import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectQueue,isPriority} from '../src/queues.mjs';
import {syncImports} from '../src/importPolicy.mjs';
import {emptyKnowledge,emptyWord} from '../src/knowledge.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8')).map(c=>({...c,mergedInto:undefined,familyBatches:undefined,relearnOn:undefined})); // Historical import behavior before the October 30 migration.
const report=JSON.parse(readFileSync('public/data/imports/2026-10-28.json','utf8'));
const today=selectQueue(cards,'latest','2026-10-28');
test('October 28 excludes 636 old lines, retains all 135 inputs, and expands the multiword line explicitly',()=>{
 assert.equal(report.excludedPreviousLines,636);assert.equal(report.inputCount,135);assert.equal(report.uniqueInputs,133);assert.equal(report.sourceMapping.length,135);assert.equal(report.mapping.length,136);
 assert.equal(today.length,134);assert.equal(report.newCards,129);assert.equal(report.totalCount,1671);
 assert.deepEqual(report.sourceMapping.map(x=>x.sourceLine),Array.from({length:135},(_,i)=>637+i));
 for(const {original,front} of report.mapping){const c=today.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original));assert.equal(c.batches.filter(b=>b.date==='2026-10-28').length,1);}
 assert.deepEqual(report.sourceMapping.find(x=>x.original.includes('heterogeneity')).fronts,['heterogeneity','homogeneous']);
 assert.equal(selectQueue(cards,'latest','2026-10-27').length,229);
 assert.deepEqual(today.filter(c=>isPriority(c,'2026-10-28')).map(c=>c.front).sort(),['fragile','homogeneous','identical','insight','precise']);
 for(const f of ['peel off','renegotiate','prosperous'])assert.equal(today.filter(c=>c.front===f).length,f==='peel off'?0:1);
});
test('October 28 preserves raw typo, verb bases and grammar notes without extra same-batch repeats',()=>{
 const fixed=today.find(c=>c.front==='think less of A than of B');assert(fixed.originals.includes('hink less of A than of B'));assert(fixed.back.core.includes('首字母'));
 for(const front of ['overturn','carve','organise','sear','amplify','heighten','amass','corroborate','eavesdrop','renegotiate'])assert.equal(today.find(c=>c.front===front).back.senses[0].pos,'v.');
 assert(today.some(c=>c.front==='the X turn'));assert(today.some(c=>c.front==='any given + 单数名词'));
 for(const front of ['prosperous','provision','heterogeneity'])assert(!isPriority(today.find(c=>c.front===front),'2026-10-28'));
});
test('only actual October 28 reimports reactivate old records and retain permanent flags',()=>{
 const previous=cards.filter(c=>c.batches.some(b=>b.date!=='2026-10-28')).map(c=>({...c,batches:c.batches.filter(b=>b.date!=='2026-10-28')}));
 let d=syncImports(emptyKnowledge(),previous,new Date(2026,9,28));
 for(const f of [...report.repeatedOldWords,'deliver','preceding'])d.words[f]={...emptyWord(),known:2,knownDay:'2026-10-27',mastered:true,permanent:true};
 d=syncImports(d,cards,new Date(2026,9,28));
 for(const f of report.repeatedOldWords){assert(d.words[f].difficult);assert(!d.words[f].mastered);assert(d.words[f].permanent);assert.equal(d.words[f].known,0);assert.equal(d.words[f].knownDay,'2026-10-27');}
 assert(d.words.deliver.mastered);assert(d.words.preceding.mastered);assert.deepEqual(syncImports(d,cards,new Date(2026,9,28)),d);
});
