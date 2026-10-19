import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchLatestCards,checkAppUpdate} from '../src/updates.mjs';
const cards=JSON.parse(readFileSync('public/data/cards.json','utf8'));
test('manual refresh requests network data and rejects invalid and failed responses',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.match(url,/\/data\/cards.json\?refresh=\d+$/);assert.equal(options.cache,'no-store');
  return new Response(JSON.stringify(cards));
 });
 assert.deepEqual(await fetchLatestCards('/english-review-pwa/'),cards);
 globalThis.fetch=async()=>new Response('[]');await assert.rejects(fetchLatestCards('/'),/format/);
 globalThis.fetch=async()=>new Response('offline',{status:503});await assert.rejects(fetchLatestCards('/'));
});
test('app check waits for activation and removes worker listeners',async()=>{
 const worker=new EventTarget();worker.state='installing';
 const registration={installing:worker,update:async()=>{setTimeout(()=>{worker.state='activated';worker.dispatchEvent(new Event('statechange'));},5);}};
 await checkAppUpdate({getRegistration:async()=>registration},'/');assert.equal(worker.state,'activated');
 worker.state='redundant';registration.update=async()=>{};
 await assert.rejects(checkAppUpdate({getRegistration:async()=>registration},'/'),/install/);
 await assert.rejects(checkAppUpdate({getRegistration:async()=>undefined},'/'),/registration/);
});
