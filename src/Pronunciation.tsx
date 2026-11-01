import {useEffect,useRef,useState} from 'react';
import {createSpeaker,pronunciationOptions,spokenWord} from './speech.mjs';
type Card={front:string;kind?:string;mergedInto?:string};
export function Pronunciation({card}:{card:Card}){
 const options=pronunciationOptions(card),word=spokenWord(card);
 const [message,setMessage]=useState('');
 const player=useRef<ReturnType<typeof createSpeaker>|null>(null);
 useEffect(()=>{
  const speaker=createSpeaker(window,import.meta.env.BASE_URL,setMessage);player.current=speaker;
  const hide=()=>{if(document.hidden)speaker.stop();};
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',speaker.stop);
  return()=>{speaker.stop();player.current=null;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',speaker.stop);};
 },[card.front]);
 if(!options.length)return null;
 return <div className="pronunciation" onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  <div className="pronunciation-buttons">{options.map((option:{label:string;text?:string;audio?:string},i:number)=><button key={i} type="button" className="pronounce-button" aria-label={`朗读 ${word}${option.label?`（${option.label}）`:''}`} title={`朗读${option.label?`：${option.label}`:''}`} onClick={()=>player.current?.speak(option)}>
   <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>
   {options.length>1&&<span>{option.label}</span>}
  </button>)}</div>
  {message&&<p className="speech-message" role="status">{message}</p>}
 </div>;
}
