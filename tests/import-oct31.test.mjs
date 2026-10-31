import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyKnowledge,emptyWord,activeQueue,validKnowledge,tableRows} from '../src/knowledge.mjs';
import {syncImports,isLegacyReview,isProtected} from '../src/importPolicy.mjs';
import {isCardList} from '../src/cards.mjs';
import {isPriority} from '../src/queues.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
const report=JSON.parse(readFileSync('public/data/imports/2026-10-31.json','utf8'));
const by=new Map(cards.map(c=>[c.front,c]));
const old=cards.filter(c=>[...(c.batches||[]),...(c.familyBatches||[])].some(b=>b.date<'2026-10-31')).map(c=>({...c,batches:c.batches.filter(b=>b.date<'2026-10-31')}));
test('October31 source coverage, canonical supplements and bear distinctions',()=>{
 assert(isCardList(cards));assert.equal(cards.length,2295);assert.equal(report.sourceMapping.length,245);assert.equal(report.excludedPreviousLines,221);
 assert.equal(activeQueue(cards,'all','',emptyKnowledge()).length,2003);
 const latest=activeQueue(cards,'latest','2026-10-31',emptyKnowledge());assert.equal(latest.length,240);
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-31')).map(c=>c.front).sort(),[...report.repeatedOldWords].sort());
 for(const m of report.sourceMapping){const c=by.get(m.fronts[0]);assert(c.originals.includes(m.original));assert.equal(c.batches.filter(b=>b.date==='2026-10-31').length,1);assert(!c.mergedInto);}
 for(const [f,form] of [['flirt','flirtatious'],['inhibit','inhibitor'],['comply','compliance'],['irritate','irritation'],['famous','famously'],['justify','justification']])assert(by.get(f).back.senses.some(s=>s.term===form));
 const bear=by.get('bear');assert.equal(bear.back.senses.length,12);for(const text of ['路线一','路线二','路线三','出生','熊','使厌烦'])assert(bear.back.senses.some(s=>s.meaning.includes(text)));
 assert(by.get('be borne out').back.core.includes('证实'));assert(!by.get('bore').mergedInto);assert(by.get('bore').back.senses.some(s=>s.term==='boredom'));
 assert(by.get('light-hearted').originals.includes('ight-hearted'));
});
test('October31 only genuine reimports reset mastery; other records and permanent history survive idempotently',()=>{
 const now=new Date(2026,9,31,12);let data=syncImports(emptyKnowledge(),old,now);
 for(const c of activeQueue(old,'all','',emptyKnowledge()))data.words[c.front]={...emptyWord(),known:2,knownDay:'2026-10-30',mastered:true,difficult:false,permanent:true,forgot:3};
 const previous=structuredClone(data);data=syncImports(data,cards,now);assert(validKnowledge(data));assert.equal(data.relearnVersion,'2026-10-30');
 for(const [front,state] of Object.entries(previous.words)){
  if(report.repeatedOldWords.includes(front))assert.deepEqual(data.words[front],{...state,known:0,mastered:false,difficult:true});else assert.deepEqual(data.words[front],state,front);
 }
 assert.equal(tableRows(cards,data,'permanent').length,Object.keys(previous.words).length);
 assert.deepEqual(syncImports(data,cards,now),data);assert(isLegacyReview(by.get('evaluate')));assert(!isLegacyReview(by.get('prescribe')));
 assert.equal(activeQueue(cards,'all','',data).length,240);
 for(const c of activeQueue(cards,'latest','2026-10-31',data)){assert(isProtected(c,new Date(2026,10,3,23)));assert(!isProtected(c,new Date(2026,10,4)));}
});
