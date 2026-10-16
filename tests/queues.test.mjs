import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {latestBatch,selectQueue,isPriority,queueStorage} from '../src/queues.mjs';
import {newRound,rateCard,restoreRound,deckKey,validRound} from '../src/review.mjs';
import {isCardList} from '../src/cards.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
test('today contains all imported forms, merged plurals, and five grammar topics',()=>{
 const latest=selectQueue(cards,'latest','2026-10-15');
 assert.equal(latestBatch(cards),'2026-10-16');assert.equal(latest.length,142);assert.equal(cards.length,241);assert.equal(selectQueue(cards,'latest').length,1);
 assert.equal(latest.filter(c=>c.kind==='grammar').length,5);
 assert.equal(new Set(cards.map(c=>c.front.toLowerCase())).size,cards.length);
 assert.deepEqual(latest.find(c=>c.front==='grocery').originals,['grocery','groceries']);
 assert.equal(latest.filter(c=>c.kind!=='grammar').flatMap(c=>c.originals).length,138);
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
test('adding cards and reordering preserves current card, completed cards and scores',()=>{
 const old=[{front:'a'},{front:'b'},{front:'c'}];
 let round={...newRound(3),current:0,order:[1,2]};
 round=rateCard(round,'known');round=rateCard(round,'vague');
 const next=[{front:'new'},...old.toReversed()];
 const migrated=restoreRound(JSON.stringify({key:deckKey(old),round}),next);
 assert(validRound(migrated,4));
 for(let i=0;i<old.length;i++)assert.deepEqual(migrated.states[next.findIndex(c=>c.front===old[i].front)],round.states[i]);
 assert.equal(next[migrated.current].front,old[round.current].front);
 assert(migrated.order.includes(0));
});
test('finished old round accepts new words without resetting completed words',()=>{
 const old=[{front:'old'}];let round=rateCard(newRound(1),'known');
 const next=[...old,{front:'new'}];
 const r=restoreRound(JSON.stringify({key:deckKey(old),round}),next);
 assert(validRound(r,2));assert(r.states[0].done);assert.equal(r.current,1);
});
test('metadata and expanded senses validate without accepting malformed batches',()=>{
 assert(isCardList(cards));
 const c=structuredClone(cards[0]);c.batches=[{date:'2026-10-15',repeat:'yes'}];assert(!isCardList([c]));
 c.batches=[{date:'2026-10-15',repeat:true},{date:'2026-10-15',repeat:false}];assert(!isCardList([c]));
});
