import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSenses, isCardList } from './cards.mjs';
import { deckKey, newRound, rateCard, restoreRound } from './review.mjs';
import './style.css';

type Sense={term:string;pos?:string;meaning:string;core?:string;example:string;translation?:string};
type Card={front:string;back:{senses?:Sense[];meaning?:string;explanation?:string;example?:string;translation?:string;pos?:string}};
type Round={version:number;order:number[];current:number|null;step:number;last:number|null;states:{seen:boolean;score:number;done:boolean;due:number|null}[]};
type Rating='known'|'vague'|'forgot';
const STORAGE=`english-review-round:${import.meta.env.BASE_URL}`;
function App(){
 const [cards,setCards]=useState<Card[]>([]);
 const [round,setRound]=useState<Round|null>(null);
 const [flipped,setFlipped]=useState(false);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const [storageWarning,setStorageWarning]=useState(false);
 const updating=useRef(false);
 const lastRating=useRef(0);
 const save=(next:Round,data=cards)=>{try{localStorage.setItem(STORAGE,JSON.stringify({key:deckKey(data),round:next}));}catch{setStorageWarning(true);}setRound(next);};
 useEffect(()=>{
  let cancelled=false;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);setError('');
  fetch(`${import.meta.env.BASE_URL}data/cards.json`,{cache:'no-store',signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('load');const data=await r.json();if(!isCardList(data))throw Error('format');
   if(!cancelled){let raw='';try{raw=localStorage.getItem(STORAGE)||'';}catch{setStorageWarning(true);}setCards(data);save(restoreRound(raw,data),data);setFlipped(false);}
  }).catch(e=>{if(!cancelled)setError(e.message==='format'?'词库为空或格式不正确，请检查 cards.json。':'无法读取词库，请联网后重试。');}).finally(()=>clearTimeout(timer));
  return()=>{cancelled=true;clearTimeout(timer);controller.abort();};
 },[attempt]);
 useEffect(()=>{
  if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
  const alreadyControlled=!!navigator.serviceWorker.controller;
  const refresh=()=>{if(alreadyControlled&&!updating.current){updating.current=true;location.reload();}};
  navigator.serviceWorker.addEventListener('controllerchange',refresh);
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{updateViaCache:'none'}).catch(()=>{});
  return()=>navigator.serviceWorker.removeEventListener('controllerchange',refresh);
 },[]);
 const done=!!round&&round.current===null;
 const card=round&&round.current!==null?cards[round.current]:null;
 const flip=()=>{if(card)setFlipped(v=>!v);};
 const rate=(rating:Rating)=>{
  if(!round||!card||performance.now()-lastRating.current<300)return;
  lastRating.current=performance.now();save(rateCard(round,rating));setFlipped(false);
 };
 const restart=()=>{save(newRound(cards.length));setFlipped(false);lastRating.current=0;};
 return <main className="app">
  <header><h1>英语复习</h1></header>
  <section className={`stage ${card?'interactive':''}`} role={card?'button':undefined} tabIndex={card?0:undefined} aria-label={card?(flipped?'返回英文':`${card.front}，查看答案`):undefined} aria-pressed={card?flipped:undefined} onClick={flip} onKeyDown={e=>{if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();flip();}}}>
   {error?<div className="message" role="alert"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重试</button></div>:
    !round?<p className="message" role="status">正在读取词库…</p>:
    done?<div className="message"><h2>本轮复习完成</h2><p>所有词已完成</p></div>:
    card?<div className={`card ${flipped?'answer':''}`}>
     {!flipped?<h2 className="front" lang="en">{card.front}</h2>:<div className="back">{(getSenses(card) as Sense[]).map((s,i)=><section className="sense" key={i}>
      <h2><span lang="en">{s.term}</span>{s.pos&&<span className="pos">{s.pos}</span>}<span className="meaning">{s.meaning}</span></h2>
      {s.core&&<p className="core">{s.core}</p>}
      <p className="example" lang="en">{s.example}</p>{s.translation&&<p className="translation">{s.translation}</p>}
     </section>)}</div>}
    </div>:null}
  </section>
  <footer>{done?<button className="primary restart" onClick={restart}>重新复习</button>:<>
   <button className="flip-control" disabled={!card} onClick={flip}>{flipped?'返回英文':'查看答案'}</button>
   <div className="actions"><button disabled={!card} onClick={()=>rate('forgot')}>忘记</button><button disabled={!card} onClick={()=>rate('vague')}>模糊</button><button className="primary" disabled={!card} onClick={()=>rate('known')}>认识</button></div>
  </>}{storageWarning&&<p className="storage-warning">当前浏览器无法保存进度，关闭后会重新开始。</p>}</footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
