import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { isCardList, randomIndex } from './cards.mjs';
import './style.css';

type Card = { front: string; back: { meaning: string; explanation: string; example: string; translation?: string; note?: string } };

function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(-1);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [saved, setSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setError('');
    fetch(`${import.meta.env.BASE_URL}data/cards.json`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('load');
        const data: unknown = await response.json();
        if (!isCardList(data)) throw new Error('format');
        if (!cancelled) { setCards(data as Card[]); setIndex(randomIndex((data as Card[]).length)); setFlipped(false); }
      }).catch(err => {
        if (!cancelled) setError(err.message === 'format' ? '词库格式不正确或没有卡片。请检查 cards.json。' : '暂时无法打开词库。请联网后重试。');
      }).finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      // Registration completes only after the full offline shell has installed.
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
        .then(() => navigator.serviceWorker.ready).then(() => setSaved(true)).catch(() => {});
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const current = cards[index];
  const flip = () => { if (current) { setFlipped(value => !value); cardRef.current?.scrollTo(0, 0); } };
  const next = () => { setIndex(value => randomIndex(cards.length, value)); setFlipped(false); cardRef.current?.scrollTo(0, 0); };
  return <main className="app">
    <header><div className="brand"><span className="brand-mark" aria-hidden="true">Aa</span><h1>英语复习</h1></div><span className="mode">随时读一张</span></header>
    <section className="stage" aria-label="词汇卡片">
      {error ? <div className="message" role="alert"><h2>词库还没准备好</h2><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>重新加载</button></div> : !current ? <div className="message" role="status">正在打开词库…</div> :
        <div ref={cardRef} className={`card ${flipped ? 'answer' : ''}`} role="button" tabIndex={0} aria-label={flipped ? '答案，点击返回英文' : `${current.front}，点击查看答案`} aria-pressed={flipped} onClick={flip} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); } }}>
          <div className="card-top"><span>{flipped ? '重新理解这个词' : '今天，再认识一次'}</span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2m10-16h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M10 7l4 5-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          {!flipped ? <div className="front"><span className="eyebrow">READ · RECALL · UNDERSTAND</span><h2 lang="en">{current.front}</h2><p>先想一想，它在文章里是什么意思？</p></div> : <div className="back" key={index}>
            <h2 lang="en">{current.front}</h2>
            <section><h3>核心意思</h3><p className="meaning">{current.back.meaning}</p></section>
            <section><h3>核心理解</h3><p>{current.back.explanation}</p></section>
            <section className="example"><h3>例句</h3><p lang="en">{current.back.example}</p>{current.back.translation && <p className="translation">{current.back.translation}</p>}</section>
            {current.back.note && <section className="note"><h3>补充</h3><p>{current.back.note}</p></section>}
          </div>}
          <div className="card-hint">{flipped ? '轻点卡片 · 返回英文' : '轻点卡片 · 查看理解'}<span aria-hidden="true">↻</span></div>
        </div>}
    </section>
    <footer><div className="actions"><button className="secondary" disabled={!current} onClick={flip}>{flipped ? '返回正面' : '查看答案'}</button><button className="primary" disabled={!current} onClick={next}>下一张 <span aria-hidden="true">→</span></button></div><p className="footer-note" role="status">{offline ? '离线中 · 继续复习已缓存的词库' : saved ? '词库已备好，离线也能读' : '一点留白，重温读过的英文'}</p></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
