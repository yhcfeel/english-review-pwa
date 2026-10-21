import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newRound,rateCard,deckKey,validRound,vocabularyRevision} from '../src/review.mjs';
import {emptyKnowledge,wordState,readKnowledge,knowledgeKey,activeQueue,openQueue,saveQueue,recordKnowledge,restoreActiveRound,validKnowledge,tableRows,tableCSV,tablesJSON} from '../src/knowledge.mjs';
const batch='2026-10-21';
const cards=['apple','spoil','take off'].map(front=>({front,batches:[{date:batch,repeat:false}],back:{meaning:`${front} 的释义`,example:`Example ${front}.`}}));
const revision=vocabularyRevision(cards);
const identity=n=>({...newRound(n),current:n?0:null,order:Array.from({length:Math.max(0,n-1)},(_,i)=>i+1)});
function start(data=emptyKnowledge(),deck=cards,mode='all',rev=revision,restart=false){return openQueue(data,deck,mode,batch,rev,restart);}
function rate(session,rating,deck=cards,mode='all',rev=revision){
 const first=!session.round.states[session.round.current].seen,front=session.cards[session.round.current].front;
 const data=recordKnowledge(session.data,front,rating,mode,first),next=rateCard(session.round,rating,()=>0);
 const active=activeQueue(deck,mode,batch,data),saved=saveQueue(data,session.cards,next,mode,batch,rev);
 const round=restoreActiveRound(saved.queues[mode==='all'?'all':`latest:${batch}`],active,rev,data);
 assert(round);assert(validRound(round,active.length));assert(validKnowledge(data));
 return {data:saveQueue(data,active,round,mode,batch,rev),cards:active,round};
}
const one=[cards[0]],oneRev=vocabularyRevision(one);
const beginOne=(data=emptyKnowledge())=>start(data,one,'all',oneRev,true);
const rateOne=(session,rating)=>rate(session,rating,one,'all',oneRev);
function finish(session){while(session.round.current!==null)session=rateOne(session,'known');return session;}
test('ordinary word needs first-known in two distinct rounds and leaves both queues without deleting the card',()=>{
 let s=rateOne(beginOne(),'known');assert.equal(wordState(s.data,'apple').known,1);assert(!wordState(s.data,'apple').mastered);
 const resumed=start(s.data,one,'all',oneRev);assert.equal(resumed.data.allRound,1);assert.equal(resumed.round.current,null);
 s=rateOne(beginOne(resumed.data),'known');assert(wordState(s.data,'apple').mastered);assert.equal(s.cards.length,0);
 assert.equal(activeQueue(one,'latest',batch,s.data).length,0);assert.equal(one.length,1);
});
test('latest ratings, same-round repeats, and later-known after vague do not count as first-known rounds',()=>{
 let s=start(emptyKnowledge(),one,'latest',oneRev);s=rate(s,'known',one,'latest',oneRev);assert.deepEqual(s.data.words,{});assert.equal(s.data.allRound,0);
 s=rateOne(beginOne(s.data),'vague');s=finish(s);assert.equal(wordState(s.data,'apple').known,0);
 s=rateOne(beginOne(s.data),'known');assert.equal(wordState(s.data,'apple').known,1);
 s=rateOne(beginOne(s.data),'forgot');assert.equal(wordState(s.data,'apple').known,0);
});
test('hard candidate needs first forgotten then later vague/forgot, survives later known, confirms only next first bad',()=>{
 for(const repeated of ['vague','forgot']){
  let s=rateOne(beginOne(),'forgot');assert.equal(wordState(s.data,'apple').candidate,null);
  s=rateOne(s,repeated);assert.equal(wordState(s.data,'apple').candidate,1);s=finish(s);assert.equal(wordState(s.data,'apple').candidate,1);
  s=rateOne(beginOne(s.data),'vague');assert(wordState(s.data,'apple').difficult);
 }
 let s=rateOne(beginOne(),'vague');s=rateOne(s,'forgot');assert.equal(wordState(s.data,'apple').candidate,null);
});
test('next-round first known cancels a hard candidate rather than confirming it',()=>{
 let s=rateOne(beginOne(),'forgot');s=rateOne(s,'vague');s=finish(s);
 s=rateOne(beginOne(s.data),'known');assert(!wordState(s.data,'apple').difficult);assert.equal(wordState(s.data,'apple').candidate,null);assert.equal(wordState(s.data,'apple').known,1);
});
test('confirmed difficult word needs three consecutive first-known rounds, then leaves hard table and joins mastered table',()=>{
 let s=rateOne(beginOne(),'forgot');s=rateOne(s,'forgot');s=finish(s);
 s=rateOne(beginOne(s.data),'forgot');s=finish(s);assert(wordState(s.data,'apple').difficult);
 for(let pass=1;pass<=3;pass++){
  s=rateOne(beginOne(s.data),'known');const w=wordState(s.data,'apple');assert.equal(w.known,pass);assert.equal(w.mastered,pass===3);assert.equal(w.difficult,pass<3);
 }
 assert.equal(tableRows(one,s.data,'difficult').length,0);assert.equal(tableRows(one,s.data,'mastered').length,1);
});
test('first vague or forgotten interrupts difficult three-round known streak',()=>{
 let s=rateOne(beginOne(),'forgot');s=rateOne(s,'forgot');s=finish(s);s=finish(rateOne(beginOne(s.data),'vague'));
 s=rateOne(beginOne(s.data),'known');s=rateOne(beginOne(s.data),'known');assert.equal(wordState(s.data,'apple').known,2);assert(!wordState(s.data,'apple').mastered);
 s=rateOne(beginOne(s.data),'vague');assert.equal(wordState(s.data,'apple').known,0);assert(wordState(s.data,'apple').difficult);
});
test('three first-forgotten rounds create a permanent independent flag even without the hard pattern',()=>{
 let s=beginOne();
 for(let pass=1;pass<=3;pass++){
  if(pass>1)s=beginOne(s.data);
  s=rateOne(s,'forgot');assert.equal(wordState(s.data,'apple').forgot,pass);s=finish(s);
  assert.equal(wordState(s.data,'apple').permanent,pass===3);assert(!wordState(s.data,'apple').difficult);
 }
 s=rateOne(beginOne(s.data),'known');s=rateOne(beginOne(s.data),'known');assert(wordState(s.data,'apple').mastered);assert(wordState(s.data,'apple').permanent);
 const tables=tablesJSON(one,s.data);assert.equal(tables.mastered.length,1);assert.equal(tables.permanent.length,1);assert.equal(tables.difficult.length,0);
 assert.equal(tableRows([],s.data,'permanent')[0].front,'apple');
});
test('vague is not forgotten; it resets a pre-threshold forgotten streak but cannot clear an existing permanent flag',()=>{
 let s=finish(rateOne(beginOne(),'forgot'));s=finish(rateOne(beginOne(s.data),'forgot'));
 s=rateOne(beginOne(s.data),'vague');assert.equal(wordState(s.data,'apple').forgot,0);assert(!wordState(s.data,'apple').permanent);
});
test('reopen preserves counters, round ID, and repeat tracking; neither a duplicate first event nor same-round repeat advances a round',()=>{
 let s=rateOne(beginOne(),'forgot');s=rateOne(s,'vague');const raw=JSON.stringify(s.data);
 const store={length:1,key:()=>knowledgeKey('test'),getItem:key=>key===knowledgeKey('test')?raw:null};
 const loaded=readKnowledge(store,'test');s=start(loaded,one,'all',oneRev);assert.equal(s.data.allRound,1);assert.equal(wordState(s.data,'apple').candidate,1);
 s=rateOne(s,'vague');assert.equal(wordState(s.data,'apple').forgot,1);assert.equal(wordState(s.data,'apple').candidate,1);
 const duplicate=recordKnowledge(s.data,'apple','forgot','all',true);assert.equal(wordState(duplicate,'apple').forgot,1);
});
test('vocabulary revision resets current and inactive queue rounds while preserving long-term word records',()=>{
 let s=rateOne(beginOne(),'known');s=start(s.data,one,'latest',oneRev);s=rate(s,'vague',one,'latest',oneRev);
 const changed=[{...one[0],back:{meaning:'修改释义',example:'New.'}}],rev=vocabularyRevision(changed),before=s.data.words;
 s=start(s.data,changed,'latest',rev);assert.equal(s.round.step,0);assert.deepEqual(s.data.words,before);
 s=start(s.data,changed,'all',rev);assert.equal(s.round.step,0);assert.equal(s.data.allRound,2);assert.deepEqual(s.data.words,before);
});
test('pruning a newly mastered word preserves remaining current card, score, schedule and completion',()=>{
 let data={...emptyKnowledge(),allRound:1};data=recordKnowledge(data,'apple','known','all',true);
 let s=start(data);s.round=identity(3);s.data=saveQueue(s.data,cards,s.round,'all',batch,revision);
 s.round.current=1;s.round.order=[0,2];s=rate(s,'vague');assert.equal(s.round.current,0);
 s=rate(s,'known');assert.equal(s.cards[s.round.current].front,'take off');assert.equal(s.round.states[0].score,1);assert.equal(s.round.states[0].due,10);
});
test('same vocabulary legacy revision queues preserve scores but never invent earlier first-rating records',()=>{
 const round=rateCard(identity(3),'vague',()=>0),raw=JSON.stringify({revision,key:deckKey(cards),round});
 const entries=new Map([['test:all',raw],['test:latest:2026-10-20',raw]]);
 const store={get length(){return entries.size;},key:i=>[...entries.keys()][i],getItem:key=>entries.get(key)??null};
 const data=readKnowledge(store,'test'),s=start(data);assert.deepEqual(s.round,round);assert.equal(s.data.allRound,1);assert.deepEqual(s.data.words,{});assert(s.data.queues['latest:2026-10-20']);assert.equal(entries.get('test:all'),raw);
});
test('skipped all rounds cannot join two nonconsecutive first-known or first-forgotten rounds',()=>{
 let s=rateOne(beginOne(),'known');s=beginOne(s.data);s=beginOne(s.data);s=rateOne(s,'known');assert.equal(wordState(s.data,'apple').known,1);
});
test('export has only three word tables, supports overlap, and CSV escapes Chinese, quotes and formula prefixes',()=>{
 let data={...emptyKnowledge(),allRound:3};data.words['=test']={known:2,difficult:false,mastered:true,forgot:3,permanent:true,candidate:null,ratedRound:3,firstForgot:false};
 const deck=[{front:'=test',back:{meaning:'中文,"引号"',example:'Example.'}}];
 const rows=tableRows(deck,data,'mastered'),csv=tableCSV(rows,'mastered');assert(csv.startsWith('\uFEFF'));assert(csv.includes('"\'=test"'));assert(csv.includes('"中文,""引号"""'));
 const report=tablesJSON(deck,data);assert.equal(report.mastered.length,1);assert.equal(report.permanent.length,1);assert(!JSON.stringify(report).includes('score'));assert(!JSON.stringify(report).includes('lastRating'));
});
test('malformed knowledge is rejected without overwriting and prototype-like word names remain ordinary keys',()=>{
 assert.throws(()=>readKnowledge({getItem:()=>'{bad'},'test'));
 let data={...emptyKnowledge(),allRound:1};data=recordKnowledge(data,'__proto__','known','all',true);data=recordKnowledge(data,'constructor','forgot','all',true);assert.equal(wordState(data,'__proto__').known,1);assert.equal(wordState(data,'constructor').forgot,1);assert(validKnowledge(data));
});
test('October 21 import preserves all 186 inputs, old content, duplicates, corrections, and historical batches',()=>{
 const full=JSON.parse(readFileSync('public/data/cards.json','utf8')),report=JSON.parse(readFileSync('public/data/imports/2026-10-21.json','utf8'));
 assert.equal(full.length,943);assert.equal(report.inputCount,186);assert.equal(report.mapping.length,186);assert.equal(report.newCards,180);assert.equal(report.latestCount,182);
 for(const {front,original} of report.mapping){const c=full.find(c=>c.front===front);assert(c);assert(c.originals.includes(original));assert(c.batches.some(b=>b.date===batch));}
 assert.deepEqual(report.repeatedOldWords,['modify','fluctuate']);assert(full.find(c=>c.front==='roll out').originals.includes('olled out'));assert(full.find(c=>c.front==='learn a trade').originals.includes('earn a trade'));
 assert.equal(full.filter(c=>c.front==='lucid').length,1);assert.equal(full.filter(c=>c.front==='synchronize').length,1);
 assert(full.some(c=>c.front==='arouse'));assert(full.some(c=>c.front==='arousal'));assert(full.some(c=>c.front==='noninvasive'));assert(full.some(c=>c.front==='noninvasively'));
});
