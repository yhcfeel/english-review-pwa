import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { deckKey, getSenses, isCardList, newRound, restoreRound } from './cards.mjs';
import './style.css';

type Sense = { term: string; pos?: string; meaning: string; core?: string; example: string; translation?: string };
type Card = { front: string; back: { senses?: Sense[]; meaning?: string; explanation?: string; example?: string; translation?: string; pos?: string } };
type Round = {order:number[];position:number};
const STORAGE = `english-review-round:${import.meta.env.BASE_URL}`;

function App() {
  const [cards,setCards]=useState<Card[]>([]);
  const [round,setRound]=useState<Round|null>(null);
  const [flipped,setFlipped]=useState(false);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [storageWarning,setStorageWarning]=useState(false);
  const updating=useRef(false);
  useEffect(()=>{
    let cancelled=false;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    setError('');
    fetch(`${import.meta.env.BASE_URL}data/cards.json`,{cache:'no-store',signal:controller.signal})
      .then(async r=>{if(!r.ok)throw Error('load');const data=await r.json();if(!isCardList(data))throw Error('format');
        if(!cancelled){let raw='';try{raw=localStorage.getItem(STORAGE)||'';}catch{setStorageWarning(true);}
          setCards(data);setRound(restoreRound(raw,data));setFlipped(false);}
      }).catch(e=>{if(!cancelled)setError(e.message==='format'?'词库为空或格式不正确，请检查 cards.json。':'无法读取词库，请联网后重试。');}).finally(()=>clearTimeout(timer));
    return ()=>{cancelled=true;clearTimeout(timer);controller.abort();};
  },[attempt]);
  useEffect(()=>{
    if(!round||!cards.length)return;
    try{localStorage.setItem(STORAGE,JSON.stringify({key:deckKey(cards),round}));}catch{setStorageWarning(true);}
  },[round,cards]);
  useEffect(()=>{
    if(!import.meta.env.PROD||!('serviceWorker' in navigator))return;
    const alreadyControlled=!!navigator.serviceWorker.controller;
    const refresh=()=>{if(alreadyControlled&&!updating.current){updating.current=true;location.reload();}};
    navigator.serviceWorker.addEventListener('controllerchange',refresh);
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{updateViaCache:'none'}).catch(()=>{});
    return()=>navigator.serviceWorker.removeEventListener('controllerchange',refresh);
  },[]);
  const done=!!round&&round.position===cards.length;
  const card=round&&!done?cards[round.order[round.position]]:null;
  const next=()=>{setFlipped(false);setRound(r=>r?{...r,position:Math.min(r.position+1,cards.length)}:r);};
  const restart=()=>{setFlipped(false);setRound(newRound(cards.length));};
  const flip=()=>{if(card)setFlipped(v=>!v);};
  return <main className="app">
    <header><h1>英语复习</h1></header>
    <section className="stage">
      {error?<div className="message" role="alert"><p>{error}</p><button onClick={()=>setAttempt(n=>n+1)}>重试</button></div>:
      !round?<p className="message" role="status">正在读取词库…</p>:
      done?<div className="message"><h2>本轮复习完成</h2><p>所有词已看完</p></div>:
      card?<div className={`card ${flipped?'answer':''}`} role="button" tabIndex={0} aria-label={flipped?'返回英文':`${card.front}，查看答案`} aria-pressed={flipped} onClick={flip} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}}}>
        {!flipped?<h2 className="front" lang="en">{card.front}</h2>:<div className="back">{(getSenses(card) as Sense[]).map((sense,i)=><section className="sense" key={i}>
          <h2><span lang="en">{sense.term}</span>{sense.pos&&<span className="pos">{sense.pos}</span>}<span className="meaning">{sense.meaning}</span></h2>
          {sense.core&&<p className="core">{sense.core}</p>}
          <p className="example" lang="en">{sense.example}</p>
          {sense.translation&&<p className="translation">{sense.translation}</p>}
        </section>)}</div>}
      </div>:null}
    </section>
    <footer>{done?<button className="primary restart" onClick={restart}>重新复习</button>:<div className="actions"><button disabled={!card} onClick={flip}>{flipped?'返回英文':'查看答案'}</button><button className="primary" disabled={!card} onClick={next}>{round&&round.position===cards.length-1?'完成本轮':'下一张'}</button></div>}{storageWarning&&<p className="storage-warning">当前浏览器无法保存进度，关闭后会重新开始。</p>}</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
