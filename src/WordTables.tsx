import {useEffect,useRef,useState} from 'react';
import {TABLES,tableRows,tableCSV,tablesJSON} from './knowledge.mjs';
type Table=keyof typeof TABLES;
type Props={cards:Parameters<typeof tableRows>[0];knowledge:Parameters<typeof tableRows>[1];onClose:()=>void};
type Row={front:string;meaning:string};
export function WordTables({cards,knowledge,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null),busy=useRef(false);
 const [table,setTable]=useState<Table>('mastered'),[message,setMessage]=useState(''),[exporting,setExporting]=useState(false);
 const rows=tableRows(cards,knowledge,table) as Row[];
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
 const exportFile=async(json=false)=>{
  if(busy.current)return;busy.current=true;setExporting(true);setMessage('');
  try{
   const name=`english-review-${json?'three-tables':table}.${json?'json':'csv'}`;
   const file=new File([json?JSON.stringify(tablesJSON(cards,knowledge),null,2):tableCSV(rows,table)],name,{type:json?'application/json;charset=utf-8':'text/csv;charset=utf-8'});
   if(matchMedia('(pointer:coarse)').matches&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file],title:'英语复习词表'});setMessage('已打开系统分享，请选择存储位置。');
   }else{
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);setMessage('已发起导出，请检查下载或保存位置。');
   }
  }catch(error){setMessage(error instanceof Error&&error.name==='AbortError'?'已取消导出。':'导出未完成，请重试；词表仍保留。');}
  finally{busy.current=false;setExporting(false);}
 };
 return <dialog className="tables-dialog" ref={dialog} aria-labelledby="tables-title" onClose={onClose} onCancel={onClose}>
  <div className="tables-heading"><h2 id="tables-title">词表与导出</h2><button onClick={onClose} aria-label="关闭词表">关闭</button></div>
  <div className="tables-tabs" role="group" aria-label="选择词表">{(Object.keys(TABLES) as Table[]).map(key=><button key={key} aria-pressed={key===table} onClick={()=>{setTable(key);setMessage('');}}>{key==='permanent'?'三轮忘记':TABLES[key]} · {tableRows(cards,knowledge,key).length}</button>)}</div>
  <p className="tables-help">{table==='mastered'?'普通词连续两轮首次认识、难记词连续三轮首次认识后退出复习。':table==='difficult'?'同一轮首次忘记且复现仍模糊或忘记，下一轮首次又模糊或忘记的词。':'连续三轮全部复习首次都点忘记的永久记录；以后掌握或退出也不删除。'}</p>
  <div className="tables-exports"><button disabled={exporting||!rows.length} onClick={()=>void exportFile()}>导出当前表 CSV</button><button disabled={exporting} onClick={()=>void exportFile(true)}>导出三表 JSON</button></div>
  {message&&<p className="tables-help" role="status">{message}</p>}
  <ul className="tables-list" aria-label={TABLES[table]}>{rows.map(row=><li key={row.front}><strong lang="en">{row.front}</strong><p>{row.meaning}</p></li>)}</ul>
  {!rows.length&&<p className="tables-empty">这张词表暂时没有单词。</p>}
 </dialog>;
}
