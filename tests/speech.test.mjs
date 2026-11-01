import test from 'node:test';
import assert from 'node:assert/strict';
import {spokenWord,pronunciationOptions,englishVoice,createSpeaker} from '../src/speech.mjs';
import {audioRangeResponse} from '../src/audioRange.mjs';
test('only lexical single-word fronts receive speech; labels are not spoken',()=>{
 for(const front of ['bear','light-hearted','résumé','estimate (n.)'])assert(spokenWord({front}));
 for(const front of ['off we went','be borne out','go + past participle','sink – sank – sunk'])assert.equal(spokenWord({front}),'');
 assert.equal(spokenWord({front:'word',kind:'grammar'}),'');assert.equal(spokenWord({front:'word',mergedInto:'base'}),'');
 assert.deepEqual(pronunciationOptions({front:'bear'}),[{label:'',text:'bear'}]);
});
test('voice selection prefers local US English, then English, never a Chinese voice',()=>{
 const cn={lang:'zh-CN',localService:true},uk={lang:'en-GB',localService:true},us={lang:'en-US',localService:true};
 assert.equal(englishVoice([cn,uk,us]),us);assert.equal(englishVoice([cn,uk]),uk);assert.equal(englishVoice([cn]),null);
});
test('one click speaks one word; repeated clicks cancel and restart; stale errors do not leak',async()=>{
 const spoken=[],audio=[],status=[];let cancels=0;
 class Utterance{constructor(text){this.text=text;}}
 class Audio{constructor(src){this.src=src;audio.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){}}
 const env={Audio,SpeechSynthesisUtterance:Utterance,speechSynthesis:{getVoices:()=>[{lang:'en-US',localService:true}],cancel:()=>cancels++,speak:u=>spoken.push(u)}};
 const player=createSpeaker(env,'/app/',s=>status.push(s));player.speak({text:'bear'});assert.equal(spoken[0].text,'bear');assert.equal(spoken[0].lang,'en-US');
 player.speak({text:'bear'});assert.equal(spoken.length,2);assert.equal(cancels,2);assert.equal(spoken[0].onerror,null);
 player.speak({audio:'audio/lead-1.mp3'});assert.equal(audio[0].src,'/app/audio/lead-1.mp3');assert.equal(spoken.length,2);
 const oldError=audio[0].onerror;player.speak({audio:'audio/lead-2.mp3'});assert(audio[0].paused);oldError();assert.equal(status.at(-1),'');
 audio[1].onerror();assert(status.at(-1).includes('无法播放'));assert.equal(spoken.length,2);player.stop();assert(audio[1].paused);
});
test('speech absence and rejected audio playback are visible without guessing a pronunciation',async()=>{
 const status=[];const p=createSpeaker({},'/',s=>status.push(s));p.speak({text:'bear'});assert(status.at(-1).includes('不支持'));
 const a=createSpeaker({Audio:class{play(){return Promise.reject(Error());}pause(){}removeAttribute(){}load(){}}},'/',s=>status.push(s));a.speak({audio:'audio/a.mp3'});await Promise.resolve();assert(status.at(-1).includes('无法播放'));
});
test('offline audio responds to Safari byte ranges and rejects invalid ranges',async()=>{
 const response=()=>new Response(new Uint8Array([1,2,3,4,5]),{headers:{'Content-Type':'audio/mpeg'}});
 for(const [range,expected] of [['bytes=0-1',[1,2]],['bytes=2-',[3,4,5]],['bytes=-2',[4,5]],['bytes=0-99',[1,2,3,4,5]]]){
  const r=await audioRangeResponse(response(),range);assert.equal(r.status,206);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],expected);assert.equal(r.headers.get('Content-Type'),'audio/mpeg');
 }
 for(const range of ['bytes=99-','bytes=4-1','bytes=0-1,3-4','bytes=-0'])assert.equal((await audioRangeResponse(response(),range)).status,416);
 assert.equal((await audioRangeResponse(response(),null)).status,200);
});

test('curated heteronyms have distinct existing recordings and matching attribution',async()=>{
 const {pronunciations}=await import('../src/pronunciations.mjs');
 const {readFileSync,statSync}=await import('node:fs');const {createHash}=await import('node:crypto');
 const credits=JSON.parse(readFileSync('public/audio/credits.json','utf8'));
 for(const [word,options] of Object.entries(pronunciations)){
  assert(spokenWord({front:word}));const hashes=new Set();
  for(const o of options){assert(statSync('public/'+o.audio).size>1000);assert(credits.some(c=>'audio/'+c.file===o.audio&&c.word===word));hashes.add(createHash('sha256').update(readFileSync('public/'+o.audio)).digest('hex'));}
  assert.equal(hashes.size,options.length,word);
 }
 for(const word of ['lead','content','produce','decrease','project','contract'])assert.equal(pronunciationOptions({front:word}).length,2);
});
