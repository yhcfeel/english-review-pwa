import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCardList} from '../src/cards.mjs';
import {newRound,rateCard,deckKey,restoreRound,validRound} from '../src/review.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
const identity=n=>({...newRound(n),current:0,order:Array.from({length:n-1},(_,i)=>i+1)});
test('initially known cards leave immediately, once each',()=>{
 let r=newRound(98);const seen=new Set();
 while(r.current!==null){assert(!seen.has(r.current));seen.add(r.current);r=rateCard(r,'known');assert(validRound(r,98));}
 assert.equal(seen.size,98);assert(r.states.every(s=>s.done));
});
test('vague 1 → known 2 → known 3; repeats within 10–15 future cards',()=>{
 for(const random of [()=>0,()=>.999]){
  let r=identity(40);r=rateCard(r,'vague',random);assert.equal(r.states[0].score,1);
  let ahead=1;while(r.current!==0){r=rateCard(r,'known',random);ahead++;}
  assert(ahead>=10&&ahead<=15);r=rateCard(r,'known',random);assert.equal(r.states[0].score,2);assert(!r.states[0].done);
  while(r.current!==0)r=rateCard(r,'known',random);
  r=rateCard(r,'known',random);assert.equal(r.states[0].score,3);assert(r.states[0].done);
 }
});
test('forgotten cards return in 3–5 future presentations',()=>{
 for(const random of [()=>0,()=>.999]){
  let r=rateCard(identity(20),'forgot',random);let ahead=1;
  while(r.current!==0){r=rateCard(r,'known',random);ahead++;}
  assert(ahead>=3&&ahead<=5);assert.equal(r.states[0].score,0);
 }
});
test('vague keeps score; forgetting lowers score with floor zero',()=>{
 let r=newRound(1);r=rateCard(r,'vague');r=rateCard(r,'known');assert.equal(r.states[0].score,2);
 r=rateCard(r,'vague');assert.equal(r.states[0].score,2);
 r=rateCard(r,'forgot');assert.equal(r.states[0].score,1);
 r=rateCard(r,'forgot');r=rateCard(r,'forgot');assert.equal(r.states[0].score,0);
 for(let i=0;i<3;i++)r=rateCard(r,'known');assert.equal(r.current,null);
});
test('small deck shrinks intervals and avoids immediate repeat if another card remains',()=>{
 let r=identity(2);r=rateCard(r,'forgot');assert.equal(r.current,1);r=rateCard(r,'vague');assert.equal(r.current,0);
});
test('due review interrupts new words; valid state maintained under mixed ratings',()=>{
 let r=identity(60);r=rateCard(r,'forgot',()=>0);r=rateCard(r,'known');r=rateCard(r,'known');assert.equal(r.current,0);
 let seed=123;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 r=newRound(98,rand);
 for(let i=0;i<2000&&r.current!==null;i++){r=rateCard(r,['known','vague','forgot'][Math.floor(rand()*3)],rand);assert(validRound(r,98));}
 while(r.current!==null){r=rateCard(r,'known');assert(validRound(r,98));}
});
test('save and resume queue, scores and completion; restart clears all',()=>{
 let r=rateCard(newRound(cards.length),'vague');assert.deepEqual(restoreRound(JSON.stringify({key:deckKey(cards),round:r}),cards),r);
 while(r.current!==null)r=rateCard(r,'known');assert.equal(restoreRound(JSON.stringify({key:deckKey(cards),round:r}),cards).current,null);
 const fresh=newRound(cards.length);assert(fresh.states.every(s=>!s.seen&&s.score===0));
});
test('old progress migrates without assuming mastery; corrupt progress resets',()=>{
 const old={order:Array.from({length:cards.length},(_,i)=>i),position:5};const r=restoreRound(JSON.stringify({key:deckKey(cards),round:old}),cards);
 assert.equal(r.current,5);assert(r.states.every(s=>!s.done));assert(validRound(r,cards.length));
 for(const raw of ['broken','null',JSON.stringify({key:deckKey(cards),round:{version:2,states:[]}})])assert(validRound(restoreRound(raw,cards),cards.length));
 const corrupt=newRound(2);corrupt.states[0].score=99;assert(!validRound(corrupt,2));
});
test('both JSON formats, complete examples, common parts of speech',()=>{
 assert(isCardList(cards));assert(isCardList([{front:'test',back:{meaning:'测试',example:'This is a test.'}}]));
 for(const v of [[],null,{},[{front:'a',back:{senses:[]}}]])assert(!isCardList(v));
 for(const c of cards)for(const s of c.back.senses){assert(s.pos);assert(s.translation);assert(s.meaning.length<45);}
 for(const front of ['desire','conduct','survey','influence','dent','implement'])assert.equal(cards.find(c=>c.front===front).back.senses.length,2);
 assert(cards.some(c=>c.front==='estimate (n.)'));
});
