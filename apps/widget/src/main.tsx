import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@modelcontextprotocol/ext-apps';
import { StoredTalkMapSchema, type StoredTalkMap } from '@talkmap/schemas';
import './style.css';
function SpeakingMode() {
  const [map,setMap] = useState<StoredTalkMap>();
  const [index,setIndex] = useState(0);
  const [status,setStatus] = useState('ChatGPTでTalkMapを作成すると、ここにカードが表示されます。');
  const touch = useRef<number | null>(null);
  useEffect(() => {
    const app = new App({name:'TalkMap Speaking Mode',version:'0.1.0'});
    app.ontoolresult = result => {
      const parsed = StoredTalkMapSchema.safeParse(result.structuredContent?.talkmap);
      if (parsed.success) {setMap(parsed.data);setIndex(0);setStatus('');}
      else setStatus('カードを読み込めませんでした。ChatGPTでTalkMapを再取得してください。');
    };
    void app.connect().catch(() => setStatus('プレビュー表示です。ChatGPTに接続するとカードを表示できます。'));
    return () => { void app.close(); };
  },[]);
  const chapter = map?.chapters[index];
  const move = (delta:number) => setIndex(i => Math.max(0,Math.min((map?.chapters.length ?? 1)-1,i+delta)));
  return <main onTouchStart={e => {touch.current=e.touches[0]?.clientX ?? null;}}
    onTouchEnd={e => { const end=e.changedTouches[0]?.clientX; if(touch.current!==null && end!==undefined && Math.abs(end-touch.current)>50) move(end<touch.current?1:-1);touch.current=null; }}>
    <header><span className="brand">TalkMap</span><span>SPEAKING MODE</span></header>
    {status && <p role="status">{status}</p>}
    {map && chapter && <>
      <p className="message">{map.one_message}</p>
      <div className="progress" aria-label="章の進行">{map.chapters.map((c,i) => <button key={i} aria-label={`${i+1}章 ${c.title}`} aria-current={i===index?'step':undefined} onClick={()=>setIndex(i)} className={i===index?'active':''}/>)}</div>
      <article aria-live="polite"><p className="eyebrow">CHAPTER {index+1} / {map.chapters.length} · {chapter.estimated_minutes} 分</p>
        <h1>{chapter.title}</h1><p className="question">{chapter.question}</p>
        <div className="keywords">{chapter.recall_keywords.map(k=><strong key={k}>{k}</strong>)}</div>
        <div className="landing"><span>着地点</span><p>{chapter.landing}</p></div>
        {chapter.support && <details><summary>補足を見る</summary><p>{chapter.support}</p></details>}
      </article>
      <nav aria-label="カード移動"><button disabled={index===0} onClick={()=>move(-1)}>← 前へ</button><span>{index+1} / {map.chapters.length}</span><button disabled={index===map.chapters.length-1} onClick={()=>move(1)}>次へ →</button></nav>
      <footer>{map.title} · 合計 {map.chapters.reduce((n,c)=>n+c.estimated_minutes,0)} 分</footer>
    </>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<SpeakingMode/>);
