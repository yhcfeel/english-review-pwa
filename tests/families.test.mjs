import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyKnowledge,emptyWord,activeQueue,validKnowledge,tableRows,recordKnowledge} from '../src/knowledge.mjs';
import {migrateFamilies} from '../src/families.mjs';
import {syncImports,isProtected} from '../src/importPolicy.mjs';
import {isCardList} from '../src/cards.mjs';
const back={meaning:'test',example:'test'};
const cards=[{front:'quickly',mergedInto:'quick',batches:[{date:'2026-10-29',repeat:false}],back},{front:'quick',batches:[{date:'2026-10-29',repeat:false}],reviewBatches:['2026-10-30'],back}];
const state=()=>({...emptyKnowledge(),allRound:4,imports:{quickly:['2026-10-29']},words:{quickly:{...emptyWord(),permanent:true,difficult:true,known:1,knownDay:'2026-10-29',forgot:3,ratedRound:4,firstForgot:true,candidate:4}}});
test('family migration preserves permanent/daily history once, with one base in review/export',()=>{
 const before=state(),after=syncImports(before,cards,new Date(2026,9,30));
 assert.deepEqual(after.words.quick,before.words.quickly);assert(!Object.hasOwn(after.words,'quickly'));
 assert.deepEqual(after.imports.quick,['2026-10-29']);assert(validKnowledge(after));
 assert.deepEqual(syncImports(after,cards),after);assert(before.words.quickly);
 assert.deepEqual(activeQueue(cards,'all','2026-10-30',after).map(c=>c.front),['quick']);
 assert.deepEqual(tableRows(cards,before,'permanent').map(c=>c.front),['quick']);
});
test('carry-forward does not reactivate mastered words; a real new form does and is idempotent',()=>{
 let before=state();before.words.quickly={...emptyWord(),mastered:true,known:2,knownDay:'2026-10-29',permanent:true};
 const carry=syncImports(before,cards);assert(carry.words.quick.mastered);assert.equal(activeQueue(cards,'all','2026-10-30',carry).length,0);
 const real=structuredClone(cards);real[1].batches.push({date:'2026-10-30',repeat:true});
 const after=syncImports(carry,real);assert(after.words.quick.difficult);assert(!after.words.quick.mastered);assert(after.words.quick.permanent);assert.equal(after.words.quick.known,0);assert.equal(after.words.quick.knownDay,'2026-10-29');
 assert.deepEqual(syncImports(after,real),after);
 const future=structuredClone(cards);future[1].batches.push({date:'2026-11-01',repeat:true});assert(syncImports(carry,future).words.quick.difficult);
});
test('multiple records never add mastery days, preserve newest daily guard and strongest difficulty',()=>{
 const before=state();before.words.quick={...emptyWord(),known:1,knownDay:'2026-10-30',ratedRound:3};
 const after=migrateFamilies(before,cards);assert.equal(after.words.quick.known,1);assert.equal(after.words.quick.knownDay,'2026-10-30');assert(after.words.quick.permanent);assert(after.words.quick.difficult);assert.equal(after.words.quick.forgot,3);assert.equal(after.words.quick.candidate,4);assert(validKnowledge(after));
 assert.equal(recordKnowledge(after,'quick','known','all',false,false,new Date(2026,9,30)).words.quick.known,1);
 const conflict=state();conflict.words.quick={...emptyWord(),mastered:true,known:2,knownDay:'2026-10-29'};assert(!migrateFamilies(conflict,cards).words.quick.mastered);
});
test('family metadata remains optional and rejects missing targets, chains, self links and invalid carry flags',()=>{
 assert(isCardList(cards));assert(isCardList([{front:'old',back}]));
 for(const target of ['quickly','missing']){const bad=structuredClone(cards);bad[0].mergedInto=target;assert(!isCardList(bad));}
 const chain=structuredClone(cards);chain[1].mergedInto='third';chain.push({front:'third',back});assert(!isCardList(chain));
 const bad=structuredClone(cards);bad[1].reviewBatches=['invalid'];assert(!isCardList(bad));
});
test('first installation stays a baseline and combined batch has normal four-day protection',()=>{
 const data=syncImports(emptyKnowledge(),cards,new Date(2026,9,30));assert.deepEqual(data.words,{});
 assert(isProtected(cards[1],new Date(2026,10,1)));assert(isProtected(cards[1],new Date(2026,10,2)));assert(!isProtected(cards[1],new Date(2026,10,3)));
});
