import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSenses, isCardList } from './cards.mjs';
import { Answer } from './Answer';
import { deckKey, newRound, rateCard, restoreVocabularyRound, vocabularyRevision } from './review.mjs';
import { batchLabel, latestBatch, selectQueue, isPriority, queueStorage } from './queues.mjs';
import { checkAppUpdate, fetchLatestCards } from './updates.mjs';
import './style.css';

type Sense={term:string;pos?:string;meaning:string;core?:string;example:string;translation?:string;exampleHighlights?:string[];coreHighlights?:string[]};
type Card={front:string;batches?:{date:string;id?:string;repeat:boolean}[];back:{core?:string;senses?:Sense[];meaning?:string;explanation?:string;example?:string;translation?:string;pos?:string}};
type Round={version:number;order:number[];current:number|null;step:number;last:number|null;states:{seen:boolean;score:number;done:boolean;due:number|null}[]};
type Mode='latest'|'all';
type Rating='known'|'vague'|'forgot';
const STORAGE=`english-review-round:${import.meta.env.BASE_URL}`;
function App(){
 const [allCards,setAllCards]=useState<Card[]>([]);
 const [mode,setMode]=useState<Mode>(()=>{try{return localStorage.getItem(`${STORAGE}:mode`)==='all'?'all':'latest';}catch{return 'latest';}});
 const [round,setRound]=useState<Round|null>(null);
 const [flipped,setFlipped]=useState(false);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const [storageWarning,setStorageWarning]=useState(false);
 const updating=useRef(false);
 const checking=useRef(false);
 const [refreshing,setRefreshing]=useState(false);
 const [updateMessage,setUpdateMessage]=useState('');
 const lastRating=useRef(0);
 const stage=useRef<HTMLElement>(null);
 const revision=useRef('');
 const date=latestBatch(allCards);
 const cards=selectQueue(allCards,mode,date) as Card[];
 const save=(next:Round,data=cards,scope=mode,batch=date)=>{try{localStorage.setItem(queueStorage(STORAGE,scope,batch),JSON.stringify({revision:revision.current,key:deckKey(data),round:next}));}catch{setStorageWarning(true);}setRound(next);};
 const load=(data:Card[],scope:Mode,batch:string)=>{
  let raw='';try{raw=localStorage.getItem(queueStorage(STORAGE,scope,batch))||'';}catch{setStorageWarning(true);}
  save(restoreVocabularyRound(raw,data,revision.current),data,scope,batch);
 };
 useEffect(()=>{
  let cancelled=false;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);setError('');
  fetch(`${import.meta.env.BASE_URL}data/cards.json`,{cache:'no-store',signal:controller.signal}).then(async r=>{
   if(!r.ok)throw Error('load');const data=await r.json();if(!isCardList(data))throw Error('format');
   if(!cancelled){const batch=latestBatch(data);revision.current=vocabularyRevision(data);setAllCards(data);load(selectQueue(data,mode,batch),mode,batch);setFlipped(false);}
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
 const refreshContent=async()=>{
  if(checking.current)return;
  checking.current=true;setRefreshing(true);setUpdateMessage('正在检查词库和应用更新…');
  try{
   const [data,appResult]=await Promise.all([
    fetchLatestCards(import.meta.env.BASE_URL),
    checkAppUpdate(import.meta.env.PROD?navigator.serviceWorker:undefined,import.meta.env.BASE_URL).then(()=>true,()=>false)
   ]);
   const changed=JSON.stringify(data)!==JSON.stringify(allCards);
   if(changed||error){const batch=latestBatch(data);revision.current=vocabularyRevision(data);setAllCards(data);load(selectQueue(data,mode,batch),mode,batch);setFlipped(false);setError('');}
   setUpdateMessage(appResult?(changed?'词库已更新，两个队列已重新随机开始。':'已是最新版本。'):'词库已同步，应用检查未完成，请稍后重试。');
  }catch{setUpdateMessage('更新失败，请检查网络后重试；原词库和进度已保留。');}
  finally{checking.current=false;setRefreshing(false);}
 };
 useEffect(()=>{if(stage.current)stage.current.scrollTop=0;},[flipped,round?.current,mode]);
 const switchQueue=(next:Mode)=>{
  if(checking.current||next===mode||!allCards.length)return;
  setMode(next);try{localStorage.setItem(`${STORAGE}:mode`,next);}catch{setStorageWarning(true);}
  load(selectQueue(allCards,next,date),next,date);setFlipped(false);lastRating.current=0;
 };
 const done=!!round&&round.current===null;
 const card=round&&round.current!==null?cards[round.current]:null;
 const senses=card?getSenses(card) as Sense[]:[];
 const priority=isPriority(card,date);
 const flip=()=>{if(card){setFlipped(v=>!v);}};
 const rate=(rating:Rating)=>{
  if(checking.current||!round||!card||performance.now()-lastRating.current<300)return;
  lastRating.current=performance.now();save(rateCard(round,rating));setFlipped(false);
 };
 const restart=()=>{if(checking.current)return;save(newRound(cards.length));setFlipped(false);lastRating.current=0;};
 return <main className="app">
  <header><h1>英语复习</h1>
   <div className="queue-picker" role="group" aria-label="选择复习队列">
    <button disabled={refreshing||!allCards.length} aria-pressed={mode==='latest'} onClick={()=>switchQueue('latest')}>最新加入</button>
    <button disabled={refreshing||!allCards.length} aria-pressed={mode==='all'} onClick={()=>switchQueue('all')}>全部复习</button>
   </div>
   <div className="queue-meta">{!!cards.length&&<p className="queue-info">{mode==='latest'?`${batchLabel(date)} · `:''}{cards.length} 张{priority&&<span className="priority-note"> · ★ 今日再次遇到</span>}</p>}
    <button className="update-button" disabled={refreshing||(!round&&!error)} onClick={refreshContent}>{refreshing?'更新中…':'↻ 检查更新'}</button>
   </div>
   {updateMessage&&<p className="update-status" role="status">{updateMessage}</p>}
  </header>
  <section ref={stage} className={`stage ${card?'interactive':''} ${flipped?'show-answer':''}`} role={card?'button':undefined} tabIndex={card?0:undefined} aria-label={card?(flipped?'返回英文':`${card.front}，查看答案`):undefined} aria-pressed={card?flipped:undefined} onClick={flip} onKeyDown={e=>{if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();flip();}}}>
   {error?<div className="message" role="alert"><p>{error}</p><button onClick={e=>{e.stopPropagation();setAttempt(n=>n+1);}}>重试</button></div>:
    !round?<p className="message" role="status">正在读取词库…</p>:
    done?<div className="message"><h2>本轮复习完成</h2><p>当前队列所有词已完成</p></div>:
    card?<div className={`card ${flipped?'answer':''}`}>
     {priority&&<div className="priority-star" aria-label="重点复习：今日重复遇到的旧词">★</div>}
     {!flipped?<h2 className="front" lang="en">{card.front}</h2>:<Answer card={card} key={card.front}/>}
    </div>:null}
  </section>
  <footer>

   {done?<button className="primary restart" disabled={refreshing} onClick={restart}>重新复习</button>:<>
   <button className="flip-control" disabled={!card} onClick={flip}>{flipped?'返回英文':`查看答案${senses.length>1?` · ${senses.length} 个常见用法`:''}`}</button>
   <div className="actions"><button disabled={refreshing||!card} onClick={()=>rate('forgot')}>忘记</button><button disabled={refreshing||!card} onClick={()=>rate('vague')}>模糊</button><button className="primary" disabled={refreshing||!card} onClick={()=>rate('known')}>认识</button></div>
  </>}{storageWarning&&<p className="storage-warning">当前浏览器无法保存进度，关闭后会重新开始。</p>}</footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
