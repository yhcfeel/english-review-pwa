import {useLayoutEffect,useRef,useState} from 'react';
import {getSenses} from './cards.mjs';
import {highlightParts} from './highlight.mjs';
import {packSenses} from './layout.mjs';

type Sense={term:string;pos?:string;meaning:string;core?:string;example:string;translation?:string;exampleHighlights?:string[];coreHighlights?:string[]};
type Card={front:string;back:{core?:string;senses?:Sense[];meaning?:string;explanation?:string;example?:string;translation?:string;pos?:string}};
function Highlight({text,phrases,words=false}:{text:string;phrases:string[];words?:boolean}){
 return <>{highlightParts(text,phrases,words).map((p,i)=>p.highlight?<strong key={i}>{p.text}</strong>:p.text)}</>;
}
export function Answer({card}:{card:Card}){
 const root=useRef<HTMLDivElement>(null),probe=useRef<HTMLDivElement>(null),body=useRef<HTMLDivElement>(null);
 const senses=getSenses(card) as Sense[];
 const [pages,setPages]=useState<number[][]>([senses.map((_,i)=>i)]);
 const [page,setPage]=useState(0);
 const selected=pages[Math.min(page,pages.length-1)];
 useLayoutEffect(()=>{
  let cancelled=false;
  const measure=()=>{
   if(cancelled||!root.current||!probe.current)return;
   const heading=probe.current.querySelector('.answer-heading')!.getBoundingClientRect().height;
   const heights=Array.from(probe.current.querySelectorAll('.sense')).map(el=>el.getBoundingClientRect().height);
   const next=packSenses(heights,heading,root.current.clientHeight-2);
   setPages(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
   setPage(current=>Math.min(current,next.length-1));
  };
  const observer=new ResizeObserver(measure);
  if(root.current)observer.observe(root.current);
  if(probe.current)observer.observe(probe.current);
  measure();void document.fonts.ready.then(measure);
  return()=>{cancelled=true;observer.disconnect();};
 },[card]);
 useLayoutEffect(()=>{if(body.current)body.current.scrollTop=0;},[page]);
 const heading=<div className="answer-heading"><h2 lang="en">{card.front}</h2>{card.back.core&&<p className="core-map"><span>核心理解</span>{card.back.core}</p>}</div>;
 const renderSense=(s:Sense,i:number)=><section className="sense" key={i}>
  <p className="definition"><span className="sense-number">{senses.length>1?`${i+1}. `:''}</span>{s.pos&&<span className="pos">{s.pos}</span>}<span className="meaning">{s.meaning}</span></p>
  {s.term.toLowerCase()!==card.front.toLowerCase()&&<p className="sense-form" lang="en">{s.term}</p>}
  {s.core&&<p className="core"><Highlight text={s.core} phrases={s.coreHighlights||[]}/></p>}
  <p className="example" lang="en"><Highlight text={s.example} phrases={s.exampleHighlights||[s.term]} words/></p>
  {s.translation&&<p className="translation">{s.translation}</p>}
 </section>;
 return <div className="answer-layout" ref={root}>
  <div className="answer-measure answer-sheet" ref={probe} aria-hidden="true">{heading}{senses.map(renderSense)}</div>
  <div className="answer-body answer-sheet" ref={body}>{heading}{selected.map(i=>renderSense(senses[i],i))}</div>
  {pages.length>1&&<nav className="sense-pages" aria-label="更多含义" onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}><button disabled={page===0} onClick={()=>setPage(n=>n-1)}>上一页</button><span aria-live="polite">{page+1} / {pages.length}</span><button disabled={page===pages.length-1} onClick={()=>setPage(n=>n+1)}>下一页</button></nav>}
 </div>;
}
