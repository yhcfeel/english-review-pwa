import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyKnowledge,emptyWord,activeQueue} from '../src/knowledge.mjs';
import {syncImports,isProtected} from '../src/importPolicy.mjs';
import {isCardList} from '../src/cards.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8')),report=JSON.parse(readFileSync('public/data/imports/2026-11-01.json','utf8'));
test('November1 covers all155 inputs, corrects missing r, retains base-form supplements and old reset metadata',()=>{
 assert(isCardList(cards));assert.equal(report.inputCount,155);assert.equal(report.excludedPreviousLines,245);assert.equal(report.newCards,134);
 assert.equal(activeQueue(cards,'all','',emptyKnowledge()).length,2137);const latest=activeQueue(cards,'latest','2026-11-01',emptyKnowledge());assert.equal(latest.length,151);
 for(const m of report.sourceMapping){const c=latest.find(c=>c.front===m.fronts[0]);assert(c, m.original);assert(c.originals.includes(m.original));assert.equal(c.batches.filter(b=>b.date==='2026-11-01').length,1);}
 const by=new Map(cards.map(c=>[c.front,c]));assert(by.get('wear and tear').originals.includes('wear and tea'));
 for(const [front,term] of [['deep','deepen'],['trend','trendy'],['talisman','talismanic'],['precise','precisely'],['sink','sank / sunk']])assert(by.get(front).back.senses.some(s=>s.term===term));
 assert.equal(cards.filter(c=>c.relearnOn).length,1574);assert.equal(cards.filter(c=>c.mergedInto).length,292);
 for(const c of latest){assert(isProtected(c,new Date(2026,10,4,23)));assert(!isProtected(c,new Date(2026,10,5)));}
});
test('November1 import resets only 17 genuine repeats, keeps other mastery and permanent flags',()=>{
 const old=cards.filter(c=>[...(c.batches||[]),...(c.familyBatches||[])].some(b=>b.date<'2026-11-01')).map(c=>({...c,batches:c.batches.filter(b=>b.date<'2026-11-01')}));
 let d=syncImports(emptyKnowledge(),old,new Date(2026,10,1));for(const c of activeQueue(old,'all','',emptyKnowledge()))d.words[c.front]={...emptyWord(),known:3,mastered:true,permanent:true};
 const before=structuredClone(d);d=syncImports(d,cards,new Date(2026,10,1));assert.equal(report.repeatedOldWords.length,17);
 for(const [f,w] of Object.entries(before.words))assert.deepEqual(d.words[f],report.repeatedOldWords.includes(f)?{...w,known:0,mastered:false,difficult:true}:w,f);
 assert.deepEqual(syncImports(d,cards,new Date(2026,10,1)),d);
});
