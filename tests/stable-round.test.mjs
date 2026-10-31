import test from 'node:test';
import assert from 'node:assert/strict';
import {newRound,rateCard,vocabularyRevision} from '../src/review.mjs';
import {emptyKnowledge,emptyWord,openQueue,saveQueue,recordKnowledge,restoreQueue} from '../src/knowledge.mjs';
import {milestone} from '../src/importPolicy.mjs';
const cards=['alpha','beta','gamma'].map(front=>({front,batches:[{date:'2026-10-01',repeat:false}],back:{meaning:front,example:front}}));
const batch='2026-10-01',rev=vocabularyRevision(cards);
const identity=n=>({...newRound(n),current:n?0:null,order:Array.from({length:Math.max(0,n-1)},(_,i)=>i+1)});
const completed=r=>r.states.filter(s=>s.done).length;
test('mastery cannot shrink a live round or its completed count across reloads and mode switches',()=>{
 let data={...emptyKnowledge(),allRound:1,words:{alpha:{...emptyWord(),known:2,knownDay:'2026-10-30'}}};
 let round=identity(3);data=saveQueue(data,cards,round,'all',batch,rev);
 data=recordKnowledge(data,'alpha','known','all',true,false,new Date(2026,9,31));
 assert(data.words.alpha.mastered);round=rateCard(round,'known');data=saveQueue(data,cards,round,'all',batch,rev);
 let resumed=openQueue(data,cards,'all',batch,rev);
 assert.deepEqual(resumed.cards,cards);assert.deepEqual(resumed.round,round);assert.equal(completed(resumed.round),1);assert.equal(resumed.data.allRound,1);
 const latest=openQueue(resumed.data,cards,'latest',batch,rev);assert(!latest.cards.some(c=>c.front==='alpha'));
 resumed=openQueue(latest.data,cards,'all',batch,rev);assert.deepEqual(resumed.round,round);assert.equal(resumed.cards.length,3);
 // Finish, reopen the completion screen, then explicitly begin a fresh membership.
 while(round.current!==null)round=rateCard(round,'known');data=saveQueue(resumed.data,cards,round,'all',batch,rev);
 resumed=openQueue(data,cards,'all',batch,rev);assert.equal(completed(resumed.round),3);assert.equal(resumed.round.current,null);
 const next=openQueue(resumed.data,cards,'all',batch,rev,true);assert.deepEqual(next.cards.map(c=>c.front),['beta','gamma']);assert.equal(completed(next.round),0);assert.equal(next.data.allRound,2);
});
test('repeat presentations count only the moment of round completion, never clicks or sightings',()=>{
 let r=identity(1);r=rateCard(r,'forgot');assert.equal(completed(r),0);
 r=rateCard(r,'known');assert.equal(completed(r),0);r=rateCard(r,'vague');assert.equal(completed(r),0);
 r=rateCard(r,'known');assert.equal(completed(r),0);r=rateCard(r,'known');assert.equal(completed(r),1);
 assert.equal(completed(rateCard(r,'known')),1);
});
test('fresh vocabulary resets both saved scopes but preserves learned records',()=>{
 let d={...emptyKnowledge(),allRound:1,words:{alpha:{...emptyWord(),mastered:true,known:3,permanent:true}}};
 const r=rateCard(identity(3),'vague');for(const mode of ['all','latest'])d=saveQueue(d,cards,r,mode,batch,rev);
 const next=[...cards,{front:'delta',batches:[{date:'2026-11-01',repeat:false}],back:{meaning:'d',example:'d'}}],revision=vocabularyRevision(next);
 const all=openQueue(d,next,'all','2026-11-01',revision);assert.equal(all.round.step,0);assert.equal(all.cards.length,3);assert.deepEqual(all.data.words,d.words);
 const latest=openQueue(all.data,next,'latest','2026-11-01',revision);assert.deepEqual(latest.cards.map(c=>c.front),['delta']);assert.equal(latest.round.step,0);
});
test('existing saved rounds retain pending due positions and completed states without a schema migration',()=>{
 let r=identity(3);r=rateCard(r,'forgot',()=>0);r=rateCard(r,'known');
 const data=saveQueue(emptyKnowledge(),cards,r,'all',batch,rev);
 assert.deepEqual(restoreQueue(data.queues.all,cards,'all',batch,rev),{cards,round:r});
 const bad=JSON.parse(data.queues.all);bad.key=JSON.stringify(['alpha','alpha','gamma']);assert.equal(restoreQueue(JSON.stringify(bad),cards,'all',batch,rev),null);
});
test('fixed membership keeps halfway and last hundred stable when completed words become mastered',()=>{
 const deck=Array.from({length:240},(_,i)=>({...cards[0],front:`word${i}`})),revision=vocabularyRevision(deck);
 let r=identity(240),d=emptyKnowledge();for(let i=0;i<120;i++)r=rateCard(r,'known');
 d=saveQueue({...d,words:{word0:{...emptyWord(),mastered:true,known:3}}},deck,r,'all',batch,revision);
 const opened=openQueue(d,deck,'all',batch,revision);assert.equal(opened.cards.length,240);assert.equal(milestone(opened.round,'all'),'halfway');assert.equal(milestone(opened.round,'latest'),'');
 r=opened.round;for(let i=0;i<20;i++)r=rateCard(r,'known');assert.equal(milestone(r,'all'),'last-hundred');assert.equal(milestone(r,'latest'),'');
});
