import test from 'node:test';
import assert from 'node:assert/strict';
import {isProtected,syncImports,milestone} from '../src/importPolicy.mjs';
import {emptyKnowledge,emptyWord,recordKnowledge,validKnowledge,openQueue} from '../src/knowledge.mjs';
import {newRound,rateCard,vocabularyRevision} from '../src/review.mjs';
const now=d=>new Date(2026,9,d,12);
const card=(dates,front='coffee')=>({front,batches:dates.map(date=>({date,repeat:false})),back:{meaning:'咖啡',example:'Coffee.'}});
test('protection uses latest batch and local calendar dates, including midnight/month boundaries',()=>{
 const c=card(['2026-10-10','2026-10-22']);
 for(const d of [22,23,24])assert(isProtected(c,now(d)));
 assert(!isProtected(c,new Date(2026,9,25,0,0)));assert(isProtected(c,new Date(2026,9,24,23,59)));
 assert(isProtected(card(['2026-10-31']),new Date(2026,10,2,23)));assert(!isProtected(card(['2026-10-31']),new Date(2026,10,3)));
 assert(!isProtected({front:'legacy'},now(22)));assert(!isProtected(card(['2026-02-30']),now(22)));
});
test('protected known ratings finish the local round but never build mastery; after expiry counts start at one',()=>{
 let data=emptyKnowledge();
 for(let round=1;round<=4;round++){
  data={...data,allRound:round};data=recordKnowledge(data,'coffee','known','all',true,true);
  assert.equal(data.words.coffee.known,0);assert(!data.words.coffee.mastered);
  assert.equal(rateCard(newRound(1),'known').current,null);
 }
 data={...data,allRound:5};data=recordKnowledge(data,'coffee','known','all',true,false);assert.equal(data.words.coffee.known,1);
 data={...data,allRound:6};data=recordKnowledge(data,'coffee','known','all',true,false);assert(data.words.coffee.mastered);
});
test('difficulty and permanent forgetting still accumulate during protection',()=>{
 let d=emptyKnowledge();
 for(let round=1;round<=3;round++){
  d={...d,allRound:round};d=recordKnowledge(d,'coffee','forgot','all',true,true);d=recordKnowledge(d,'coffee','vague','all',false,true);
 }
 assert(d.words.coffee.difficult);assert(d.words.coffee.permanent);assert.equal(d.words.coffee.forgot,3);
});
test('upgrade baselines historical batches without retiring or reactivating words, resets only protected pending known credits',()=>{
 const d={...emptyKnowledge(),allRound:3,words:{coffee:{...emptyWord(),known:2,mastered:true,permanent:true,ratedRound:3},tea:{...emptyWord(),known:1,ratedRound:3}}};
 const deck=[card(['2026-10-20','2026-10-22']),card(['2026-10-22'],'tea')];
 const next=syncImports(d,deck,now(22));assert.deepEqual(next.words.coffee,d.words.coffee);assert.equal(next.words.tea.known,0);
 assert.equal(next.imports.coffee.length,2);assert(validKnowledge(next));assert.deepEqual(syncImports(next,deck,now(22)),next);
 const before=openQueue(d,deck,'all','2026-10-22',vocabularyRevision(deck));
 const after=openQueue(syncImports(before.data,deck,now(22)),deck,'all','2026-10-22',vocabularyRevision(deck));
 assert.deepEqual(after.round,before.round);assert.equal(after.data.allRound,before.data.allRound);
});
test('second distinct batch reactivates mastered word as difficult, preserving permanent flag; refresh never reapplies it',()=>{
 let d=syncImports(emptyKnowledge(),[card(['2026-10-18'])],now(22));
 d={...d,allRound:3,words:{coffee:{...emptyWord(),known:2,mastered:true,permanent:true,ratedRound:3}}};
 const deck=[card(['2026-10-18','2026-10-22','2026-10-22'])];
 d=syncImports(d,deck,now(22));assert.equal(d.imports.coffee.length,2);assert(d.words.coffee.difficult);assert(!d.words.coffee.mastered);assert.equal(d.words.coffee.known,0);assert(d.words.coffee.permanent);
 for(let i=1;i<=3;i++){
  d={...d,allRound:3+i};d=recordKnowledge(d,'coffee','known','all',true,false);
  assert.equal(d.words.coffee.mastered,i===3);assert.deepEqual(syncImports(d,deck,now(26)),d);
 }
 const third=[card(['2026-10-18','2026-10-22','2026-10-26'])];d=syncImports(d,third,now(26));assert(!d.words.coffee.mastered);assert(d.words.coffee.difficult);assert(d.words.coffee.permanent);
});
test('same-day separate batches count independently; edits, rollback and reload cannot create more imports',()=>{
 let d=syncImports(emptyKnowledge(),[card(['2026-10-22'])],now(22));const c=card(['2026-10-22']);c.batches.push({date:'2026-10-22',id:'2026-10-22-02',repeat:true});
 d=syncImports(d,[c],now(22));assert.equal(d.imports.coffee.length,2);assert(d.words.coffee.difficult);
 const old=syncImports(d,[card(['2026-10-22'])],now(23));assert.deepEqual(old,d);assert.deepEqual(syncImports(old,[c],now(23)),d);
 assert(!validKnowledge({...d,imports:{coffee:['oops']}}));
});
test('new vocabulary queue includes reintroduced mastered word and keeps permanent table intact',()=>{
 const old=[card(['2026-10-18'])];let d=syncImports(emptyKnowledge(),old,now(22));
 d={...d,allRound:2,words:{coffee:{...emptyWord(),known:2,mastered:true,permanent:true,ratedRound:2}}};
 d=openQueue(d,old,'all','2026-10-18',vocabularyRevision(old)).data;
 const updated=[card(['2026-10-18','2026-10-22'])];const opened=openQueue(syncImports(d,updated,now(22)),updated,'all','2026-10-22',vocabularyRevision(updated));
 assert.equal(opened.cards.length,1);assert.equal(opened.round.step,0);assert(opened.data.words.coffee.permanent);
});
test('daily milestone lasts one presentation and respects completion, collision and short decks',()=>{
 let r=newRound(240,()=>0);
 for(let i=0;i<120;i++)r=rateCard(r,'known',()=>0);
 assert.equal(milestone(r,'latest'),'halfway');assert.equal(milestone(r,'all'),'');assert.equal(milestone(JSON.parse(JSON.stringify(r)),'latest'),'halfway');
 r=rateCard(r,'forgot',()=>0);assert.equal(milestone(r,'latest'),'');
 const make=(n,done)=>{let x=newRound(n,()=>0);for(let i=0;i<done;i++)x=rateCard(x,'known',()=>0);return x;};
 assert.equal(milestone(make(240,140),'latest'),'last-hundred');assert.equal(milestone(make(200,100),'latest'),'last-hundred');
 assert.equal(milestone(make(100,0),'latest'),'');assert.equal(milestone(make(99,50),'latest'),'halfway');assert.equal(milestone(make(1,1),'latest'),'');
});
