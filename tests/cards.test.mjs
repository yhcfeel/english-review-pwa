import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isCardList,newRound,deckKey,restoreRound,validRound} from '../src/cards.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
test('shuffle visits each card exactly once and starts at zero',()=>{
 for(let n=1;n<=100;n++){const r=newRound(n);assert(validRound(r,n));assert.equal(new Set(r.order).size,n);assert.equal(r.position,0);}
 assert.notDeepEqual(newRound(5,()=>0).order,[0,1,2,3,4]);
});
test('resume midway and preserve completed rounds',()=>{
 const round=newRound(cards.length);round.position=20;
 assert.deepEqual(restoreRound(JSON.stringify({key:deckKey(cards),round}),cards),round);
 round.position=cards.length;
 assert.equal(restoreRound(JSON.stringify({key:deckKey(cards),round}),cards).position,cards.length);
});
test('invalid saved state and changed decks start fresh',()=>{
 for(const raw of ['broken','null',JSON.stringify({key:deckKey(cards),round:{order:[0,0],position:0}}),JSON.stringify({key:'old deck',round:newRound(cards.length)})])assert.equal(restoreRound(raw,cards).position,0);
 assert(!validRound({order:[0,1],position:-1},2));
 assert(!validRound({order:[0,1],position:3},2));
});
test('validate both JSON formats and reject empty data or missing examples',()=>{
 assert(isCardList([{front:'test',back:{meaning:'含义',explanation:'解释',example:'This is a test.'}}]));
 assert(isCardList([{front:'test',back:{senses:[{term:'test',pos:'n.',meaning:'测试',example:'This is a test.'}]}}]));
 for(const data of [[],{},null,[{front:'test'}],[{front:'x',back:{senses:[]}}],[{front:'x',back:{meaning:'义',example:''}}]])assert(!isCardList(data));
});
test('library has complete, concise senses and distinct fronts',()=>{
 assert(isCardList(cards));
 for(const card of cards)for(const s of card.back.senses){assert(s.pos);assert(s.translation);assert(s.example);assert(s.meaning.length<45);}
 const c=cards.find(c=>c.front==='classify');assert.equal(c.back.senses[1].term,'classified');
 assert(!cards.some(c=>['maintained','estimated','exerting','urges'].includes(c.front)));
});
