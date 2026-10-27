import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batchKey,batchLabel,latestBatch,selectQueue,isPriority,queueStorage} from '../src/queues.mjs';
import {newRound,rateCard,restoreRound,deckKey,validRound} from '../src/review.mjs';
import {isCardList} from '../src/cards.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
test('October 22 import covers every source line and distinguishes old repeats from same-file duplicates',()=>{
 const report=JSON.parse(readFileSync('public/data/imports/2026-10-22.json','utf8'));
 const latest=selectQueue(cards,'latest','2026-10-22');
 assert.equal(report.mapping.length,245);assert.equal(report.uniqueInputs,242);
 assert.equal(latest.length,240);assert.equal(report.newCards,236);assert.equal(report.totalCount,1179);
 for(const {original,front} of report.mapping){
  const card=latest.find(c=>c.front===front);assert(card,original);assert(card.originals.includes(original),original);
  assert.equal(card.batches.filter(b=>batchKey(b)==='2026-10-22').length,1);
 }
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-22')).map(c=>c.front).sort(),['criterion','decimate','status quo','sturdy']);
 for(const front of ['be subject to','harbor','crucial','entrench','cultivate']){
  assert.equal(latest.filter(c=>c.front===front).length,1);assert(!isPriority(latest.find(c=>c.front===front),'2026-10-22'));
 }
 assert.deepEqual(latest.find(c=>c.front==='entrench').originals,['entrenches','entrench']);
 assert.deepEqual(latest.find(c=>c.front==='cultivate').originals,['cultivated','cultivate']);
 assert(latest.find(c=>c.front==='sturdy').originals.includes('sturdier'));
 assert(latest.some(c=>c.front==='supposed'));assert(cards.some(c=>c.front==='be supposed to'));
 assert.equal(selectQueue(cards,'latest','2026-10-21').length,182);
 for(const card of latest.filter(c=>!isPriority(c,'2026-10-22'))){
  assert(card.back.core,card.front);
  for(const sense of card.back.senses){assert(sense.pos);assert(sense.translation);assert(sense.exampleHighlights.length);assert(sense.exampleHighlights.every(h=>sense.example.includes(h)));}
 }
});
test('today contains all imported forms, merged plurals, and five grammar topics',()=>{
 const latest=selectQueue(cards,'latest','2026-10-15');
 assert.equal(latestBatch(cards),'2026-10-27');assert.equal(latest.length,142);assert.equal(cards.length,1542);assert.equal(selectQueue(cards,'latest').length,229);
 assert.equal(latest.filter(c=>c.kind==='grammar').length,5);
 assert.equal(new Set(cards.map(c=>c.front.toLowerCase())).size,cards.length);
 assert.deepEqual(latest.find(c=>c.front==='grocery').originals,['grocery','groceries']);
 assert(latest.filter(c=>c.kind!=='grammar').flatMap(c=>c.originals).length>=138);
 assert.equal(latest.find(c=>c.front==='spoil').back.senses.length,4);
 assert(latest.filter(c=>c.kind==='grammar').every(c=>c.back.senses.length>=4));
});
test('old repeated words appear once in both decks and are starred only for matching batch',()=>{
 const repeat={front:'spoil',batches:[{date:'2026-10-14',repeat:false},{date:'2026-10-15',repeat:true}]};
 const fresh={front:'dip',batches:[{date:'2026-10-15',repeat:false}]};
 const old={front:'retail',batches:[{date:'2026-10-14',repeat:false}]};
 assert.deepEqual(selectQueue([repeat,fresh,old],'latest'),[repeat,fresh]);
 assert.equal(selectQueue([repeat,fresh,old],'all').length,3);
 assert(isPriority(repeat,'2026-10-15'));assert(!isPriority(repeat,'2026-10-14'));assert(!isPriority(fresh,'2026-10-15'));
 assert.notEqual(queueStorage('test','latest','2026-10-15'),queueStorage('test','all','2026-10-15'));
 assert.notEqual(queueStorage('test','latest','2026-10-15'),queueStorage('test','latest','2026-10-16'));
});
test('metadata and expanded senses validate without accepting malformed batches',()=>{
 assert(isCardList(cards));
 const c=structuredClone(cards[0]);c.batches=[{date:'2026-10-15',repeat:'yes'}];assert(!isCardList([c]));
 c.batches=[{date:'2026-10-15',repeat:true},{date:'2026-10-15',repeat:false}];assert(!isCardList([c]));
});

test('October 16 import retains all encountered forms, old-word stars and same-day grammar',()=>{
 const report=JSON.parse(readFileSync('public/data/imports/2026-10-16.json','utf8'));
 assert.equal(report.mapping.length,110);
 const latest=selectQueue(cards,'latest','2026-10-16');
 assert.equal(latest.length,109);
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-16')).map(c=>c.front).sort(),['disorder','survey','worsen']);
 for(const {original,front} of report.mapping){
  const c=latest.find(c=>c.front.toLowerCase()===front.toLowerCase());
  assert(c,original);assert(c.originals.includes(original),original);
 }
 const grammar=latest.filter(c=>c.front==='so + 助动词／情态动词 + 主语');assert.equal(grammar.length,1);assert(!isPriority(grammar[0],'2026-10-16'));
 assert(cards.find(c=>c.front==='diminish').originals.includes('diminished'));
 assert(cards.find(c=>c.front==='diminish').back.senses.some(s=>s.term==='diminished'));
 for(const c of latest)assert.equal(c.batches.filter(b=>b.date==='2026-10-16').length,1);
});

test('October 19 line-based import retains every source entry and merges repeated intimacy',()=>{
 const report=JSON.parse(readFileSync('public/data/imports/2026-10-19.json','utf8'));
 assert.equal(report.mapping.length,80);assert.equal(report.uniqueInputs,79);
 const latest=selectQueue(cards,'latest','2026-10-19');assert.equal(latest.length,79);
 for(const {original,front} of report.mapping){const c=latest.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original),original);assert(c.back.core,front);}
 assert.equal(latest.filter(c=>c.front==='intimacy').length,1);
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-19')).map(c=>c.front).sort(),['come up with','conduct']);
 assert(!isPriority(latest.find(c=>c.front==='intimacy'),'2026-10-19'));
 const conduct=cards.find(c=>c.front==='conduct');assert(conduct.back.senses.some(s=>s.meaning.includes('传导')));
 assert(cards.find(c=>c.front==='come up with').back.senses.some(s=>s.example==='They are coming up with other tweaks.'));
 assert(latest.every(c=>c.batches.filter(b=>batchKey(b)==='2026-10-19').length===1));
});


test('second October 19 file is a separate latest queue while all earlier words survive',()=>{
 const report=JSON.parse(readFileSync('public/data/imports/2026-10-19-02.json','utf8'));
 const latest=selectQueue(cards,'latest','2026-10-19-02');
 assert.equal(report.mapping.length,111);assert.equal(latest.length,110);assert.equal(report.newCards,107);
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-19-02')).map(c=>c.front).sort(),['olfactory','pigment','resin']);
 for(const {original,front} of report.mapping){const c=latest.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original),original);assert(c.back.core,front);}
 assert.deepEqual(latest.find(c=>c.front==='dub').originals,['dub','dubbed']);
 assert(!latest.some(c=>c.front==='intimacy'));assert(selectQueue(cards,'all').some(c=>c.front==='intimacy'));
 assert.equal(selectQueue(cards,'latest','2026-10-19').length,79);
 assert.notEqual(queueStorage('test','latest','2026-10-19'),queueStorage('test','latest','2026-10-19-02'));
 assert.equal(batchLabel('2026-10-19-02'),'2026-10-19 · 第 2 批');
 assert.equal(latestBatch([...cards,{batches:[{date:'2026-10-20',repeat:false}]}]),'2026-10-27');
 const c=structuredClone(cards[0]);c.batches=[{date:'2026-10-19',repeat:false},{date:'2026-10-19',id:'2026-10-19-02',repeat:true}];assert(isCardList([c]));
 c.batches[1].id='2026-10-20-02';assert(!isCardList([c]));
 c.batches[1].id='2026-10-19-02';c.batches.push({...c.batches[1]});assert(!isCardList([c]));
});


test('October 20 import covers all 240 lines with preserved forms and exactly two old-word stars',()=>{
 const report=JSON.parse(readFileSync('public/data/imports/2026-10-20.json','utf8'));
 const latest=selectQueue(cards,'latest','2026-10-20');assert.equal(latest.length,235);assert.equal(report.totalCount,763);assert.equal(cards.length,1542);
 assert.equal(report.mapping.length,240);assert.equal(report.newCards,233);
 for(const {original,front} of report.mapping){const c=latest.find(c=>c.front===front);assert(c,original);assert(c.originals.includes(original),original);assert(c.back.core,front);}
 assert.deepEqual(latest.filter(c=>isPriority(c,'2026-10-20')).map(c=>c.front).sort(),['instant','take off']);
 for(const front of ['former','aquatic','optimise','scour','achievement'])assert.equal(latest.filter(c=>c.front===front).length,1);
 assert(latest.find(c=>c.front==='comatose').originals.includes('omatose.'));
 assert(latest.find(c=>c.front==='arrest').back.senses.some(s=>s.meaning.includes('骤停')));
 assert(latest.find(c=>c.front==='cone').back.senses.some(s=>s.meaning.includes('视锥')));
 for(const front of ['be of + 名词','there is more to A than B'])assert(latest.find(c=>c.front===front).back.senses.length>=3);
 assert.equal(selectQueue(cards,'latest','2026-10-19-02').length,110);assert.equal(selectQueue(cards,'latest','2026-10-19').length,79);
});


