import {pronunciations} from './pronunciations.mjs';
export function spokenWord(card){
 if(!card||card.kind==='grammar'||card.mergedInto)return '';
 const word=card.front.trim().replace(/\s+\((?:n|v|adj|adv)\.\)$/i,'');
 return /^\p{L}+(?:[-'’]\p{L}+)*$/u.test(word)?word:'';
}
export function pronunciationOptions(card){
 const word=spokenWord(card);if(!word)return [];
 return pronunciations[word.toLowerCase()]||[{label:'',text:word}];
}
export function englishVoice(voices){
 const english=voices.filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
 return english.find(v=>/^en[-_]US$/i.test(v.lang)&&v.localService)||english.find(v=>/^en[-_]US$/i.test(v.lang))||english.find(v=>v.localService)||english[0]||null;
}
/** Called directly by a user gesture. A newer click cancels rather than queues. */
export function createSpeaker(env,base,onStatus=(message)=>{}){
 let serial=0,media=null,utterance=null;
 const stop=()=>{
  serial++;
  if(media){media.pause();media.removeAttribute('src');media.load();media=null;}
  if(utterance){utterance.onend=null;utterance.onerror=null;utterance=null;}
  env.speechSynthesis?.cancel();
 };
 const speak=option=>{
  stop();const token=serial;onStatus('');
  const fail=()=>{if(serial===token)onStatus('暂时无法播放，请再点一次。');};
  if(option.audio){
   // Never silently guess a heteronym with TTS when its precise recording fails.
   try{media=new env.Audio(base+option.audio);media.preload='auto';media.onerror=fail;const playing=media.play();playing?.catch(fail);}catch{fail();}
   return;
  }
  if(!env.speechSynthesis||!env.SpeechSynthesisUtterance){onStatus('此浏览器暂不支持朗读。');return;}
  try{
   const u=new env.SpeechSynthesisUtterance(option.text);utterance=u;
   const voice=englishVoice(env.speechSynthesis.getVoices());if(voice)u.voice=voice;
   u.lang=voice?.lang||'en-US';u.rate=0.85;u.pitch=1;u.volume=1;
   u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted')fail();};
   u.onend=()=>{if(serial===token)utterance=null;};
   env.speechSynthesis.speak(u);
  }catch{fail();}
 };
 return {speak,stop};
}
