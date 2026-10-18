'use client';
import {useEffect,useRef,useState} from 'react';
import {exportDraft,importDraft,saveDraft,type Draft,type DraftFile} from '../../lib/drafts';
import s from './Study.module.css';
function dimensions(file:File,kind:'photo'|'video'):Promise<{width:number;height:number}>{
  return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const el=kind==='photo'?new Image():document.createElement('video');const done=()=>{URL.revokeObjectURL(url);};
    el.onerror=()=>{done();reject(new Error(`${file.name} 暂不能在此浏览器预览，请通过本地素材流程转换后导入`));};
    if(el instanceof HTMLImageElement)el.onload=()=>{resolve({width:el.naturalWidth,height:el.naturalHeight});done();};
    else{el.preload='metadata';el.onloadedmetadata=()=>{if(!el.videoWidth){done();reject(new Error(`${file.name} 无可读取画面`));return;}resolve({width:el.videoWidth,height:el.videoHeight});done();};}el.src=url;
  });
}
function Preview({file}:{file:DraftFile}){const [url,setUrl]=useState('');useEffect(()=>{const u=URL.createObjectURL(file.blob);setUrl(u);return()=>URL.revokeObjectURL(u);},[file]);if(!url)return null;return file.kind==='photo'?<img src={url} alt={file.name}/>:<video src={url} muted playsInline preload="metadata"/>;}
export default function DraftEditor({initial,onSaved,onClose}:{initial?:Draft;onSaved:(draft:Draft,read?:boolean)=>void;onClose:()=>void}){
  const [draft,setDraft]=useState<Draft>(initial??{version:1,id:`draft-${crypto.randomUUID()}`,title:'未命名的记忆',place:'',date:'',note:'',files:[]}),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const input=useRef<HTMLInputElement>(null),archive=useRef<HTMLInputElement>(null);
  const ingest=async(files:File[])=>{setBusy(true);setMessage('正在读取照片与视频…');const added:DraftFile[]=[],errors:string[]=[];
    for(const f of files){try{const kind=f.type.startsWith('video/')||/\.(mp4|mov|m4v)$/i.test(f.name)?'video':'photo';const size=await dimensions(f,kind);added.push({id:`draft-media-${crypto.randomUUID()}`,name:f.name,blob:f,kind,...size});}catch(e){errors.push((e as Error).message);}}
    setDraft(d=>({...d,files:[...d.files,...added]}));setMessage(errors.join('；')||`已加入 ${added.length} 个媒体。`);setBusy(false);
  };
  const save=async(read=false)=>{if(!draft.files.length){setMessage('先放入一张照片或一个视频。');return;}setBusy(true);try{await saveDraft(draft);onSaved(draft,read);setMessage('草稿已保存到此浏览器。建议同时导出资料包备份。');}catch{setMessage('本机保存失败，请导出资料包保留内容。');}finally{setBusy(false);}};
  const move=(i:number,delta:number)=>setDraft(d=>{const files=[...d.files];[files[i],files[i+delta]]=[files[i+delta],files[i]];return{...d,files};});
  return <div className={s.editor} role="dialog" aria-modal="true" aria-label="制作一本记忆小书"><header><div><span className={s.miniLabel}>A NEW MEMORY</span><h2>留下一本小书</h2></div><button onClick={onClose} aria-label="关闭编辑器">×</button></header>
    <div className={s.editorGrid}><section><label>书名<input value={draft.title} maxLength={24} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><div className={s.fieldPair}><label>地点<input placeholder="可以稍后补充" value={draft.place} onChange={e=>setDraft({...draft,place:e.target.value})}/></label><label>时间<input placeholder="日期，或一段时间" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label></div><label>诗句、回忆或想说的话<textarea rows={7} placeholder="这里可以是一句诗，也可以是一次旅行的开头。" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label><p className={s.editorNote}>草稿保存在本机浏览器。导出资料包后，可以备份或换一台设备重新导入。不会自动更新公开书架。</p></section>
    <section><div className={s.dropzone} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)void ingest([...e.dataTransfer.files]);}}><span>＋</span><p>把照片和视频放在这里</p><button disabled={busy} onClick={()=>input.current?.click()}>或选择文件</button><small>照片与可播放视频 · 保留画面比例</small><input hidden ref={input} type="file" multiple accept="image/*,video/*" onChange={e=>{void ingest([...e.target.files??[]]);e.target.value='';}}/></div><div className={s.draftPreviews}>{draft.files.map((f,i)=><figure key={f.id}><Preview file={f}/><figcaption>{String(i+1).padStart(2,'0')} · {f.name}</figcaption><div><button disabled={!i} onClick={()=>move(i,-1)} aria-label={`前移 ${f.name}`}>←</button><button disabled={i===draft.files.length-1} onClick={()=>move(i,1)} aria-label={`后移 ${f.name}`}>→</button><button onClick={()=>setDraft({...draft,files:draft.files.filter(x=>x.id!==f.id)})}>移除</button></div></figure>)}</div></section></div>
    <p className={s.editorMessage} role="status">{message}</p><footer><button disabled={busy} onClick={()=>archive.current?.click()}>导入资料包</button><input hidden ref={archive} type="file" accept=".zip" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setBusy(true);try{setDraft(await importDraft(f));setMessage('资料包已载入，可以继续编辑。');}catch(err){setMessage((err as Error).message);}finally{setBusy(false);e.target.value='';}}}/><button disabled={busy||!draft.files.length} onClick={()=>exportDraft(draft).catch(()=>setMessage('导出失败，请重试。'))}>导出备份</button><button disabled={busy} onClick={()=>save()}>保存草稿</button><button className={s.primary} disabled={busy} onClick={()=>save(true)}>预览这本书 ↗</button></footer>
  </div>;
}
