import test from 'node:test';
import assert from 'node:assert/strict';
import {newRound,rateCard,deckKey,validRound,vocabularyRevision,restoreVocabularyRound} from '../src/review.mjs';
const cards=[{front:'old',batches:[{date:'2026-10-19',repeat:false}],back:{meaning:'旧'}},{front:'other',batches:[{date:'2026-10-19',repeat:false}],back:{meaning:'其他'}}];
const saved=(deck,revision)=>{let round={...newRound(deck.length),current:0,order:deck.map((_,i)=>i).slice(1)};round=rateCard(round,'known');return JSON.stringify({revision,key:deckKey(deck),round});};
test('same vocabulary preserves exact local round on reopen and unchanged refresh',()=>{const revision=vocabularyRevision(cards),raw=saved(cards,revision);assert.deepEqual(restoreVocabularyRound(raw,cards,revision),JSON.parse(raw).round);});
test('vocabulary update resets both queues even when an inactive queue has same card list',()=>{
 const revision=vocabularyRevision(cards),raw=saved(cards,revision),next=[...cards,{front:'new'}],newRevision=vocabularyRevision(next);
 for(const deck of [cards,next]){const r=restoreVocabularyRound(raw,deck,newRevision);assert(validRound(r,deck.length));assert.equal(r.step,0);assert(r.states.every(s=>!s.seen&&!s.done&&s.score===0));assert.equal(r.order.length+1,deck.length);}
});
test('repeated-only batch and definition edits count as vocabulary updates',()=>{for(const change of [c=>c[0].batches.push({date:'2026-10-20',repeat:true}),c=>c[0].back.meaning='修订']){const next=structuredClone(cards);change(next);assert.notEqual(vocabularyRevision(next),vocabularyRevision(cards));}});
test('legacy progress resets once; saved new policy round then remains stable',()=>{const revision=vocabularyRevision(cards),legacy=JSON.parse(saved(cards,revision));delete legacy.revision;const round=restoreVocabularyRound(JSON.stringify(legacy),cards,revision,()=>0);assert(round.states.every(s=>!s.seen));const raw=JSON.stringify({revision,key:deckKey(cards),round});assert.deepEqual(restoreVocabularyRound(raw,cards,revision,()=>.9),round);});
test('complete round stays complete until explicit restart unless vocabulary changes',()=>{const revision=vocabularyRevision(cards);let r=newRound(cards.length);while(r.current!==null)r=rateCard(r,'known');const raw=JSON.stringify({revision,key:deckKey(cards),round:r});assert.equal(restoreVocabularyRound(raw,cards,revision).current,null);assert.notEqual(restoreVocabularyRound(raw,cards,revision+'new').current,null);assert(newRound(cards.length).states.every(s=>!s.done));});
