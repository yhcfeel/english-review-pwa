import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyKnowledge,emptyWord,activeQueue,validKnowledge,recordKnowledge,tableRows} from '../src/knowledge.mjs';
import {syncImports,isLegacyReview,isProtected} from '../src/importPolicy.mjs';
import {isPriority} from '../src/queues.mjs';
import {isCardList} from '../src/cards.mjs';
// Reconstruct this historical release's batch membership; later imports must not rewrite its policy assertions.
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8')).filter(c=>[...(c.batches||[]),...(c.familyBatches||[])].some(b=>b.date<='2026-10-30')).map(c=>({...c,batches:c.batches.filter(b=>b.date<='2026-10-30')}));
const report=JSON.parse(readFileSync('public/data/imports/2026-10-30.json','utf8'));
const by=new Map(cards.map(c=>[c.front,c]));
const now=new Date(2026,9,30,12);
test('October 30 combines 221 inputs into 218 new cards and reviews every old card by editorial decision',()=>{
 assert(isCardList(cards));assert.equal(report.previousDayInputs,107);assert.equal(report.todayInputs,114);assert.equal(report.mapping.length,221);
 assert.equal(activeQueue(cards,'latest','2026-10-30',emptyKnowledge()).length,218);
 assert.deepEqual(activeQueue(cards,'latest','2026-10-30',emptyKnowledge()).filter(c=>isPriority(c,'2026-10-30')).map(c=>c.front).sort(),report.repeatedOldWords);
 assert.equal(cards.length,2084);assert.equal(activeQueue(cards,'all','',emptyKnowledge()).length,1792);assert.equal(cards.filter(c=>c.relearnOn).length,1574);
 for(const m of report.mapping){const c=by.get(m.front);assert(c.originals.includes(m.original));assert(!c.mergedInto);assert(!c.relearnOn);}
 for(const [alias,base] of Object.entries(report.familyMerges)){assert.equal(by.get(alias).mergedInto,base);for(const s of by.get(alias).back.senses)assert(by.get(base).back.senses.some(t=>t.example===s.example));}
 for(const [front,form] of [['acute','acutely'],['instruct','instruction'],['refrigerate','refrigeration'],['common','commonality'],['brutal','brutally']])assert(by.get(front).back.senses.some(s=>s.term===form));
 for(const front of ['resolution','definitive','coincidence','given','hardly','fairly'])assert(!by.get(front).mergedInto);
 const audit=JSON.parse(readFileSync('public/data/imports/2026-10-30-family-audit.json','utf8'));assert.equal(audit.decisions.length,1873);assert.equal(audit.decisions.filter(d=>d.decision==='merge').length,281);
});
test('full old install migrates permanent records, restarts old words once, leaves combined new words on new policy',()=>{
 const old=cards.slice(0,1770).map(c=>({...c,mergedInto:undefined,familyBatches:undefined,relearnOn:undefined,reviewBatches:undefined,batches:c.batches.filter(b=>b.date<='2026-10-29')}));
 let data=syncImports(emptyKnowledge(),old,new Date(2026,9,29));data.allRound=5;
 for(const c of old)data.words[c.front]={...emptyWord(),mastered:true,known:2,knownDay:'2026-10-30',permanent:true,forgot:3,ratedRound:5};
 data=syncImports(data,cards,now);assert(validKnowledge(data));assert.equal(data.relearnVersion,'2026-10-30');
 for(const c of cards.filter(c=>c.relearnOn)){const w=data.words[c.front];assert(w,c.front);assert(!w.mastered,c.front);assert.equal(w.known,0);assert.equal(w.knownDay,undefined);assert(w.permanent);assert(isLegacyReview(c));assert(!isProtected(c,now));}
 for(const f of report.repeatedOldWords){assert(data.words[f].difficult,f);assert(!data.words[f].mastered,f);assert(data.words[f].permanent);assert.equal(data.words[f].knownDay,'2026-10-30');}
 for(const c of cards.filter(c=>c.mergedInto))assert(!Object.hasOwn(data.words,c.front));
 assert(tableRows(cards,data,'permanent').some(c=>c.front==='evaluate'));
 data=recordKnowledge(data,'evaluate','known','all',true,false,now,true);
 assert.equal(data.words.evaluate.known,1);assert.deepEqual(syncImports(data,cards,now),data);
 const updated=structuredClone(cards);updated.find(c=>c.front==='evaluate').back.core+=' ';assert.deepEqual(syncImports(data,updated,now),data);
});
test('both ordinary and difficult legacy words finish on day two, all new words need three or four days',()=>{
 for(const difficult of [false,true])for(const legacy of [false,true]){
  let d={...emptyKnowledge(),allRound:1,words:{word:{...emptyWord(),difficult,permanent:true}}};const threshold=legacy?2:difficult?4:3;
  for(let i=0;i<threshold;i++){
   d=recordKnowledge(d,'word','known','all',i===0,false,new Date(2026,10,3+i),legacy);
   assert.equal(d.words.word.mastered,i===threshold-1);assert.equal(d.words.word.known,i+1);assert(d.words.word.permanent);
   const repeated=recordKnowledge({...d,allRound:d.allRound+1},'word','known','all',true,false,new Date(2026,10,3+i),legacy);assert.equal(repeated.words.word.known,i+1);
  }
  assert(validKnowledge(d));
 }
});
test('old-word exemption ends on a genuine future import and four-day protection covers month boundary',()=>{
 const old=by.get('evaluate');assert(isLegacyReview(old));assert(!isProtected(old,now));
 const later={...old,batches:[...old.batches,{date:'2026-10-31',repeat:true}]};assert(!isLegacyReview(later));
 for(const date of [new Date(2026,9,31),new Date(2026,10,1),new Date(2026,10,2),new Date(2026,10,3,23)])assert(isProtected(later,date));
 assert(!isProtected(later,new Date(2026,10,4)));
 const newWord=by.get('refrigerate');assert(!isLegacyReview(newWord));assert(isProtected(newWord,new Date(2026,10,2,23)));assert(!isProtected(newWord,new Date(2026,10,3)));
 const carry=by.get('brief');assert(!isLegacyReview(carry));assert(isProtected(carry,new Date(2026,10,2,23)));
});
test('first install marks reset complete without inventing ratings; corrupt reset markers are rejected',()=>{
 const d=syncImports(emptyKnowledge(),cards,now);assert.equal(d.relearnVersion,'2026-10-30');assert.deepEqual(d.words,{});assert(validKnowledge(d));assert.deepEqual(syncImports(d,cards,now),d);
 assert(!validKnowledge({...d,relearnVersion:'bad'}));assert(!validKnowledge({...d,relearnVersion:'2026-02-30'}));
 for(const mutation of [c=>c.relearnOn='bad',c=>c.familyBatches='bad',c=>c.batches={},c=>c.familyBatches=[{date:'bad',repeat:false}]]){const bad=structuredClone(cards);mutation(bad[0]);assert(!isCardList(bad));}
});
test('old app fetching new data before worker activation cannot swallow a genuine family reimport',()=>{
 const source=by.get('brutally'),base=by.get('brutal');
 let d={...emptyKnowledge(),allRound:3,imports:{brutally:source.batches.map(b=>b.id||b.date),brutal:['2026-10-30']},words:{brutally:{...emptyWord(),known:2,knownDay:'2026-10-29',mastered:true,permanent:true,ratedRound:3}}};
 d=syncImports(d,cards,now);assert(d.words.brutal.difficult);assert(!d.words.brutal.mastered);assert.equal(d.words.brutal.known,0);assert.equal(d.words.brutal.knownDay,'2026-10-29');assert(d.words.brutal.permanent);
 d=recordKnowledge(d,'brutal','known','all',true,false,new Date(2026,10,3));assert.equal(d.words.brutal.known,1);assert.deepEqual(syncImports(d,cards,new Date(2026,10,3)),d);
});
