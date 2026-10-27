import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyKnowledge,emptyWord,recordKnowledge,validKnowledge,readKnowledge,knowledgeKey} from '../src/knowledge.mjs';
import {syncImports} from '../src/importPolicy.mjs';
const at=(d,h=12)=>new Date(2026,9,d,h);
const seed=extra=>({...emptyKnowledge(),allRound:1,words:{apple:{...emptyWord(),...extra}}});
const score=(d,rating,date,{first=true,protectedWord=false,mode='all',next=false}={})=>recordKnowledge({...d,allRound:d.allRound+(next?1:0)},'apple',rating,mode,first,protectedWord,date);
test('ordinary mastery requires two consecutive local days, never repeated rounds on one day',()=>{
 let d=score(seed(),'known',at(24));
 for(let i=0;i<5;i++)d=score(d,'known',at(24),{next:true});
 assert.equal(d.words.apple.known,1);assert(!d.words.apple.mastered);
 d=score(d,'known',at(25),{first:false});assert(d.words.apple.mastered);assert.equal(d.words.apple.known,2);assert(validKnowledge(d));
});
test('first daily bad rating cannot be replaced by later known; later bad cannot replace first known',()=>{
 for(const rating of ['vague','forgot']){
  let d=score(seed(),'known',at(24));d=score(d,rating,at(25),{first:false});
  d=score(d,'known',at(25),{next:true});assert.equal(d.words.apple.known,0);assert(!d.words.apple.mastered);
  d=score(d,'known',at(26),{next:true});assert.equal(d.words.apple.known,1);
 }
 let d=score(seed(),'known',at(24));d=score(d,'forgot',at(24),{next:true});assert.equal(d.words.apple.known,1);
 d=score(d,'known',at(25),{next:true});assert(d.words.apple.mastered);
});
test('difficult mastery needs three days; missing a day starts a new streak',()=>{
 let d=score(seed({difficult:true,permanent:true}),'known',at(24));d=score(d,'known',at(24),{next:true});
 d=score(d,'known',at(25),{next:true});assert.equal(d.words.apple.known,2);assert(!d.words.apple.mastered);
 d=score(d,'known',at(27),{next:true});assert.equal(d.words.apple.known,1);
 d=score(d,'known',at(28),{next:true});d=score(d,'known',at(29),{next:true});
 assert(d.words.apple.mastered);assert(!d.words.apple.difficult);assert(d.words.apple.permanent);
});
test('midnight and month boundaries count calendar days, clock rollback does not add credit',()=>{
 let d=score(seed(),'known',at(31,23));d=score(d,'known',at(30),{next:true});assert.equal(d.words.apple.known,1);
 d=score(d,'known',new Date(2026,10,1,0),{first:false});assert(d.words.apple.mastered);
});
test('protection and latest mode cannot earn mastery days',()=>{
 let d=seed();assert.deepEqual(score(d,'known',at(24),{mode:'latest'}),d);
 d=score(d,'known',at(24),{protectedWord:true});d=score(d,'known',at(25),{protectedWord:true,next:true});
 d=score(d,'known',at(26),{next:true});assert.equal(d.words.apple.known,1);assert(!d.words.apple.mastered);
 d=score(d,'known',at(27),{next:true});assert(d.words.apple.mastered);
});
test('legacy credits have no invented dates; mastered words and permanent flags remain intact',()=>{
 let d=score(seed({known:1,permanent:true}),'known',at(24));assert.equal(d.words.apple.known,1);assert(!d.words.apple.mastered);assert(d.words.apple.permanent);
 const mastered=seed({known:2,mastered:true,permanent:true});assert.deepEqual(score(mastered,'known',at(24)),mastered);
 const raw=JSON.stringify(d),storage={length:1,key:()=>knowledgeKey('test'),getItem:()=>raw};d=readKnowledge(storage,'test');
 d=score(d,'known',at(24),{next:true});assert.equal(d.words.apple.known,1);d=score(d,'known',at(25),{next:true});assert(d.words.apple.mastered);
 assert(!validKnowledge(seed({knownDay:'2026-02-30'})));assert(!validKnowledge(seed({knownDay:24})));
});
test('reimport clears mastery streak without losing daily first-rating guard or permanent membership',()=>{
 const cards=dates=>[{front:'apple',batches:dates.map(date=>({date}))}];
 let d=syncImports(seed({permanent:true}),cards(['2026-10-01']),at(24));d=score(d,'known',at(24));
 d=syncImports(d,cards(['2026-10-01','2026-10-24']),at(24));assert.equal(d.words.apple.known,0);assert(d.words.apple.difficult);assert(d.words.apple.permanent);
 d=score(d,'known',at(24),{next:true,protectedWord:true});assert.equal(d.words.apple.known,0);
 d=score(d,'known',at(27),{next:true});assert.equal(d.words.apple.known,1);
});
