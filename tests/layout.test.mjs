import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {packSenses} from '../src/layout.mjs';
test('uses all available space without reserving unnecessary pagination',()=>{
 assert.deepEqual(packSenses([100,100,100],80,380),[[0,1,2]]);
 assert.deepEqual(packSenses([100,100,100,100],80,480),[[0,1,2,3]]);
});
test('only splits when necessary and never loses or clips a sense',()=>{
 assert.deepEqual(packSenses([100,100,100,100],80,350),[[0,1],[2,3]]);
 assert.deepEqual(packSenses([800,100],80,350),[[0],[1]]);
 for(let h=150;h<900;h+=25){const pages=packSenses([100,130,80,170],95,h);assert.deepEqual(pages.flat(),[0,1,2,3]);}
});
test('all multi-meaning cards have an explicit core explanation',()=>{
 const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
 for(const c of cards)if(c.back.senses.length>1)assert(c.back.core?.length>10,c.front);
 const spoil=cards.find(c=>c.front==='spoil');assert.match(spoil.back.core,/状态变坏/);assert.match(spoil.back.senses[0].meaning,/破坏/);
});
