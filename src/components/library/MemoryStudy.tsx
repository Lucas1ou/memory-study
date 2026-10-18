'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import dynamic from 'next/dynamic';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {DndContext,DragOverlay,MouseSensor,TouchSensor,KeyboardSensor,useSensor,useSensors,useDroppable,closestCenter,type DragOverEvent,type DragEndEvent} from '@dnd-kit/core';
import {SortableContext,useSortable,horizontalListSortingStrategy,sortableKeyboardCoordinates,arrayMove} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {edition} from '../../lib/edition';
import {library,objects,initialShelves,objectWidth,validShelves,type ShelfItem,type LibraryBook,type MediaItem} from '../../lib/library';
import {loadDrafts,draftContent,type Draft} from '../../lib/drafts';
import {occupiedWidth,packShelves,loadGlobePlacement} from '../../lib/shelf-layout';
import BookSession from './BookSession';
import BookSpine from './BookSpine';
import EditionCover from './EditionCover';
import DraftEditor from './DraftEditor';
import GlobeBase from './GlobeBase';
import s from './Study.module.css';
const MiniGlobe=dynamic(()=>import('../MemoryGlobe').then(m=>m.MiniMemoryGlobe),{ssr:false});
const Globe=dynamic(()=>import('../MemoryGlobe'),{ssr:false,loading:()=> <p className={s.loading}>正在展开记忆地球…</p>});
type OpenBook={book:LibraryBook;media:Record<string,MediaItem>;rect:{x:number;y:number;width:number;height:number};urls?:string[];spine?:HTMLElement};
const PATTERNS:Record<string,string>={leaves:'M8 58Q20 30 32 58M8 86Q20 58 32 86M20 30V105',petals:'M20 35Q0 12 20 16Q40 12 20 35Q45 35 28 48Q18 58 20 35Q-5 50 8 34Z',waves:'M2 30Q12 18 22 30T42 30M2 48Q12 36 22 48T42 48M2 66Q12 54 22 66T42 66',lattice:'M4 20H36V90H4ZM4 40H36M4 65H36M20 20V90',skyline:'M3 90V50H12V30H19V10H23V50H32V36H38V90',window:'M3 30Q20 6 37 30V86H3ZM3 56H37M20 18V86',grid:'M3 20H37V90H3ZM3 44H37M3 68H37M14 20V90M26 20V90',mountains:'M0 75L13 48L23 62L31 32L43 75M0 90L14 65L27 84L38 62L45 90'};
function Motif({name}:{name:string}){return <svg viewBox="0 0 44 110" aria-hidden="true"><path d={PATTERNS[name]||PATTERNS.lattice}/></svg>;}
function ShelfObject({item,book,lit,dim,selected,onOpen,onSelect,onPreview,dragging,taken,globeGap=0}:{item:ShelfItem;book?:LibraryBook;lit:boolean;dim:boolean;selected:boolean;onOpen:(id:string,el:HTMLElement)=>void;onSelect:(id:string)=>void;onPreview:(id:string|null,el?:HTMLElement)=>void;dragging:boolean;taken:boolean;globeGap?:number}){
 const isGlobe=item.kind==='globe';
 const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:item.id,disabled:taken,animateLayoutChanges:isGlobe?()=>false:undefined,transition:isGlobe?null:undefined});

 const style={transform:isGlobe?undefined:CSS.Transform.toString(transform),transition:isGlobe?'none':transition,visibility:taken?'hidden':undefined,width:objectWidth(item),marginLeft:isGlobe?globeGap:undefined,opacity:isDragging?0:undefined,'--binding':book?edition(book).accent:'#b6a98c','--binding-ink':book?edition(book).spineInk:'#3e3b30'} as CSSProperties;
 return <div ref={setNodeRef} style={style} className={`${s.object} ${lit?s.lit:''} ${dim?s.dim:''} ${item.kind==='globe'?s.globeObject:''} ${selected?s.chosen:''}`} data-object={item.id}>
   <button className={item.kind==='globe'?s.globeButton:`${s.spine} ${book?s.editionSpine:''}`} {...attributes} {...listeners} onPointerEnter={e=>{if(book&&!dragging)onPreview(item.id,e.currentTarget);}} onPointerLeave={()=>onPreview(null)} onFocus={e=>{if(book)onPreview(item.id,e.currentTarget);}} onBlur={()=>onPreview(null)} style={item.kind==='guide'?{'--binding':'#4c4940','--binding-ink':'#ddd4bb'} as CSSProperties:undefined} onClick={e=>{if(dragging)return;onSelect(item.id);if(lit||item.kind!=='book')onOpen(item.id,e.currentTarget);}} onDoubleClick={e=>{if(!dragging&&item.kind==='book')onOpen(item.id,e.currentTarget);}} onKeyDown={e=>{if(e.key===' '){listeners?.onKeyDown?.(e);return;}if(e.key==='Enter'){e.preventDefault();onOpen(item.id,e.currentTarget);}}} aria-label={book?`${book.subtitle} · ${book.title}${lit?'，点击阅读':'，双击取书'}`:item.kind==='globe'?'打开记忆地球':item.kind==='blank'?'制作一本新书':'关于记忆书房'}>
   {item.kind==='globe'?<><MiniGlobe locations={library.places}/><span className={s.holoStem}/><GlobeBase className={s.holoBase}/></>:book?<BookSpine book={book}/>:<><span className={s.spineTop}>{item.kind==='blank'?'＋':'序'}</span><span className={s.spineTitle}>{item.kind==='blank'?'未写的记忆':'借书说明'}</span><span className={s.motif}><Motif name="lattice"/></span><span className={s.spineBottom}>{item.kind==='blank'?'新的小书':'记忆书房'}</span></>}
   </button>
 </div>;
}
function cloneSurface(node:HTMLElement){const copy=node.cloneNode(true) as HTMLElement;const targets=copy.querySelectorAll('canvas');node.querySelectorAll('canvas').forEach((canvas,i)=>{targets[i]?.getContext('2d')?.drawImage(canvas,0,0);});return copy;}
function ObjectPreview({node}:{node:HTMLElement}){const host=useRef<HTMLDivElement>(null);useEffect(()=>{const copy=cloneSurface(node);copy.inert=true;Object.assign(copy.style,{transform:'none',transition:'none',opacity:'1',visibility:'visible'});host.current?.replaceChildren(copy);return()=>host.current?.replaceChildren();},[node]);return <div ref={host} style={{pointerEvents:'none'}}/>;}
function Tier({id,children,litGap=0}:{id:string;children:React.ReactNode;litGap?:number}){const {setNodeRef,isOver}=useDroppable({id});return <section ref={setNodeRef} className={`${s.tier} ${isOver?s.tierOver:''}`} aria-label={`书架第 ${Number(id.split('-')[1])+1} 层`}><div className={s.nicheLight}/><div className={s.tierContents} data-shelf-contents style={{'--lit-space':`${litGap}px`} as CSSProperties}>{children}</div><div className={s.plank} data-shelf-plank/><span className={s.bracket}/></section>;}

export default function MemoryStudy(){
 const reduced=!!useReducedMotion();const [mobile,setMobile]=useState(false),[shelves,setShelves]=useState(initialShelves),[organizing,setOrganizing]=useState(false),[ready,setReady]=useState(false),[selected,setSelected]=useState<string|null>(null),[active,setActive]=useState<OpenBook|null>(null),[panel,setPanel]=useState<'globe'|'guide'|'draft'|null>(null),[spotlight,setSpotlight]=useState<string|null>(null),[lighting,setLighting]=useState(false),[dragging,setDragging]=useState(false),[returning,setReturning]=useState<string|null>(null),[message,setMessage]=useState(''),[drafts,setDrafts]=useState<Draft[]>([]),[editing,setEditing]=useState<Draft|undefined>(),[dragPreview,setDragPreview]=useState<HTMLElement|null>(null),[globeAnchor,setGlobeAnchor]=useState({x:0,y:0,scale:.2});
 const [preview,setPreview]=useState<{id:string;x:number}|null>(null);
 const [contentWidth,setContentWidth]=useState(0),[globePlacement,setGlobePlacement]=useState<number|null>(null);
 const previewTimer=useRef<ReturnType<typeof setTimeout>|null>(null),suppressOpenUntil=useRef(0),bookcase=useRef<HTMLDivElement>(null);
 const beforeDrag=useRef<string[][]>([]),shelfRef=useRef(shelves),timer=useRef<ReturnType<typeof setTimeout>|null>(null),returnFocus=useRef<HTMLElement|null>(null);shelfRef.current=shelves;
 const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:8}}),useSensor(TouchSensor,{activationConstraint:{delay:240,tolerance:6}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
 const items=useMemo(()=>[...objects,...drafts.map(d=>({id:d.id,kind:'book' as const,bookId:d.id}))],[drafts]);
 const books=useMemo(()=>[...library.books,...drafts.map(d=>({id:d.id,title:d.title,subtitle:d.place||'草稿',place:d.place,color:'#9c8b73',ink:'#eee7d5',pattern:'lattice',date:d.date,note:d.note,mediaIds:d.files.map(f=>f.id),coverId:d.files[0]?.id,places:[]} as LibraryBook))],[drafts]);
 const previewBook=books.find(b=>b.id===preview?.id);
 const showPreview=useCallback((id:string|null,el?:HTMLElement)=>{if(previewTimer.current)clearTimeout(previewTimer.current);if(!id){previewTimer.current=setTimeout(()=>setPreview(null),160);return;}if(el&&bookcase.current){const r=el.getBoundingClientRect(),shelf=bookcase.current.getBoundingClientRect();const x=Math.max(78,Math.min(shelf.width-78,r.x+r.width/2-shelf.x));previewTimer.current=setTimeout(()=>setPreview({id,x}),160);}},[]);
 useEffect(()=>()=>{if(previewTimer.current)clearTimeout(previewTimer.current);},[]);
 const cap=contentWidth||(mobile?310:810);
 useEffect(()=>{const root=bookcase.current;if(!root)return;const observer=new ResizeObserver(()=>{const row=root.querySelector<HTMLElement>('[data-shelf-contents]');if(row)setContentWidth(row.clientWidth);});observer.observe(root);return()=>observer.disconnect();},[]);
 useEffect(()=>setGlobePlacement(loadGlobePlacement(mobile)),[mobile]);
 useEffect(()=>{const q=matchMedia('(max-width:760px)');const change=()=>setMobile(q.matches);change();q.addEventListener('change',change);let live=true;
   loadDrafts().then(all=>{if(!live)return;setDrafts(all);const allItems=[...objects,...all.map(d=>({id:d.id,kind:'book' as const,bookId:d.id}))];let saved:unknown;try{saved=JSON.parse(localStorage.getItem(q.matches?'memory-shelves-mobile-v4':'memory-shelves-desktop-v4')||'null');}catch{}setShelves(validShelves(saved,allItems)?saved:q.matches?packShelves([...initialShelves.flat(),...all.map(d=>d.id)],allItems,310,true):[...initialShelves.map(row=>[...row]),...all.map(d=>[d.id])]);setReady(true);}).catch(()=>{if(live){setReady(true);setMessage('本机草稿暂未读取，可使用导入资料包。');}});
   return()=>{live=false;q.removeEventListener('change',change);if(timer.current)clearTimeout(timer.current);};
 },[]);
 useEffect(()=>{if(!ready)return;setShelves(old=>{if(validShelves(old,items)&&old.every(row=>occupiedWidth(row,items,mobile)<=cap))return old;return packShelves(old.flat().filter(id=>items.some(i=>i.id===id)),items,cap,mobile);});},[mobile,ready,cap,items]);
 useEffect(()=>{if(ready&&!dragging)try{localStorage.setItem(mobile?'memory-shelves-mobile-v4':'memory-shelves-desktop-v4',JSON.stringify(shelves));}catch{setMessage('本机布局保存失败，本次整理仍可继续。');}},[shelves,ready,mobile,dragging]);
 useEffect(()=>{if(!active&&!panel)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!active)setPanel(null);};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',key);};},[active,panel]);
 const closeBook=useCallback(()=>{setActive(old=>{setReturning(old?.book.id??null);if(old?.urls){const urls=old.urls;setTimeout(()=>urls.forEach(u=>URL.revokeObjectURL(u)),700);}return null;});setTimeout(()=>returnFocus.current?.focus(),600);},[]);
 const open=useCallback((id:string,el:HTMLElement)=>{if(Date.now()<suppressOpenUntil.current)return;if(previewTimer.current)clearTimeout(previewTimer.current);setPreview(null);returnFocus.current=el;if(id==='globe'){const r=el.getBoundingClientRect();setGlobeAnchor({x:r.x+r.width/2-innerWidth/2,y:r.y+r.height/2-innerHeight/2,scale:Math.min(.25,r.width/Math.min(innerWidth-56,1060))});setPanel('globe');return;}if(id==='guide'){setPanel('guide');return;}if(id==='blank'){setEditing(undefined);setPanel('draft');return;}const b=library.books.find(b=>b.id===id);const r=el.getBoundingClientRect();const rect={x:r.x,y:r.y,width:r.width,height:r.height};if(b)setActive({book:b,media:library.media,rect,spine:el.cloneNode(true) as HTMLElement});else{const d=drafts.find(d=>d.id===id);if(d){const content=draftContent(d);setActive({...content,rect,spine:el.cloneNode(true) as HTMLElement});}}},[drafts]);
 const light=(id:string)=>{setPanel(null);setLighting(true);setOrganizing(false);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{setSpotlight(id);setLighting(false);},reduced?0:480);};
 const selectedBook=books.find(b=>b.id===selected),place=library.places.find(p=>p.id===spotlight),litBooks=books.filter(b=>!!spotlight&&b.places.includes(spotlight));
 const over=(e:DragOverEvent)=>{if(!e.over)return;const id=String(e.active.id),overId=String(e.over.id);if(id===overId)return;setShelves(old=>{const from=old.findIndex(row=>row.includes(id));const to=overId.startsWith('tier-')?Number(overId.split('-')[1]):old.findIndex(row=>row.includes(overId));if(from<0||to<0||!old[to])return old;
   if(from===to){if(overId.startsWith('tier-'))return old;const next=[...old];next[from]=arrayMove(old[from],old[from].indexOf(id),old[from].indexOf(overId));return next;}
   if(occupiedWidth([...old[to],id],items,mobile)>cap)return old;
   const next=old.map(row=>row.filter(k=>k!==id));const at=overId.startsWith('tier-')?next[to].length:next[to].indexOf(overId);next[to].splice(Math.max(0,at),0,id);return next;
 });};
 const finishDrag=(e:DragEndEvent)=>{
   if(e.active.id==='globe'){
     const el=bookcase.current?.querySelector<HTMLElement>('[data-object="globe"]'),row=el?.parentElement,initial=e.active.rect.current.initial;
     if(el&&row&&initial){
       const gap=parseFloat(getComputedStyle(el).marginLeft)||0;
       const children=Array.from(row.children) as HTMLElement[];
       const used=children.reduce((sum,child)=>{const style=getComputedStyle(child);return sum+child.offsetWidth+(child===el?0:parseFloat(style.marginLeft)||0)+(parseFloat(style.marginRight)||0);},0)+Math.max(0,children.length-1)*3;
       const free=Math.max(0,row.clientWidth-used),natural=el.offsetLeft-gap;
       const desired=initial.left+e.delta.x-row.getBoundingClientRect().left;
       const ratio=free>0?Math.max(0,Math.min(1,(desired-natural)/free)):0;
       setGlobePlacement(ratio);try{localStorage.setItem(`memory-globe-placement-${mobile?'mobile':'desktop'}-v1`,JSON.stringify(ratio));}catch{setMessage('本机布局保存失败，本次摆放仍可继续。');}
     }
   }
   suppressOpenUntil.current=Date.now()+300;setDragPreview(null);setDragging(false);setMessage('摆放已保存在本机。');
 };
 const arrange=(mode:string)=>{setSpotlight(null);const ids=[...items].sort((a,b)=>{if(a.kind!=='book')return 1;if(b.kind!=='book')return -1;const aa=books.find(x=>x.id===a.id)!,bb=books.find(x=>x.id===b.id)!;return mode==='time'?aa.date.localeCompare(bb.date):aa.subtitle.localeCompare(bb.subtitle,'zh-CN');}).map(i=>i.id);setShelves(packShelves(ids,items,cap,mobile));setGlobePlacement(null);try{localStorage.removeItem(`memory-globe-placement-${mobile?'mobile':'desktop'}-v1`);}catch{}setMessage(mode==='time'?'已按时间整理。':'已按地点整理。');};
 const saved=(d:Draft,read=false)=>{const next=[...drafts.filter(x=>x.id!==d.id),d];setDrafts(next);if(!drafts.some(x=>x.id===d.id))setShelves(old=>{const rows=old.map(row=>[...row]);const at=rows.findIndex(row=>occupiedWidth([...row,d.id],[...items,{id:d.id,kind:'book'}],mobile)<=cap);if(at>=0)rows[at].push(d.id);else rows.push([d.id]);return rows;});if(read){const content=draftContent(d);setPanel(null);requestAnimationFrame(()=>{const el=document.querySelector<HTMLElement>(`[data-object="${globalThis.CSS.escape(d.id)}"] button`);const r=el?.getBoundingClientRect();if(el)returnFocus.current=el;setActive({...content,rect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:{x:innerWidth/2,y:innerHeight-40,width:28,height:246},spine:el?.cloneNode(true) as HTMLElement|undefined});});}};
 return <main className={`${s.room} ${spotlight?s.spotlightMode:''} ${lighting?s.returningGlobe:''}`}>
   <header className={s.header}><a href="/" className={s.brand}>记忆书房<span>THE MEMORY STUDY</span></a><div><button className={s.glass} onClick={()=>setPanel('guide')}>关于书房</button></div></header>
   <section className={s.intro}><p>私 人 影 像 藏 书</p><h1>把走过的地方，<br/>留在书架上。</h1><div className={s.roomMeta}><span>{books.length} 本小书</span><i/><span>{Object.keys(library.media).length} 个瞬间</span><span className={s.smallDot}/></div></section>
   <div className={s.trackLights} aria-hidden="true"><i/><i/><i/></div>
   <div className={s.shelfToolbar}><p aria-live="polite">{place?`${place.city} · ${litBooks.length} 本相关的书，点击灯下书籍阅读`:'双击取书 · 按住拖动排列'}</p><div>{spotlight&&<button onClick={()=>setSpotlight(null)}>恢复灯光</button>}<button className={s.glass} aria-pressed={organizing} onClick={()=>{setOrganizing(!organizing);setSpotlight(null);}}>{organizing?'收起':'自动排列'}</button>{organizing&&<><button onClick={()=>arrange('time')}>按时间</button><button onClick={()=>arrange('place')}>按地点</button><button onClick={()=>setShelves(old=>[...old,[]])}>＋ 新增书架</button></>}</div></div>
   <DndContext id="memory-study-shelves" sensors={sensors} collisionDetection={closestCenter} onDragStart={e=>{const source=document.querySelector<HTMLElement>(`[data-object="${String(e.active.id)}"]`);if(source){const r=source.getBoundingClientRect(),clone=cloneSurface(source);Object.assign(clone.style,{width:`${r.width}px`,height:`${r.height}px`,marginLeft:'0',marginRight:'0'});setDragPreview(clone);}beforeDrag.current=shelfRef.current.map(r=>[...r]);setDragging(true);setPreview(null);if(previewTimer.current)clearTimeout(previewTimer.current);setMessage('');}} onDragOver={over} onDragEnd={finishDrag} onDragCancel={()=>{setDragPreview(null);setShelves(beforeDrag.current);setDragging(false);}}>
   <div ref={bookcase} className={s.bookcase} data-ready={ready}>
   {shelves.map((ids,i)=>{
     const count=spotlight?ids.filter(id=>books.find(b=>b.id===id)?.places.includes(spotlight)).length:0;
     const space=Math.max(0,cap-occupiedWidth(ids,items,mobile)),litGap=count?Math.min(mobile?4:16,space/(2*count)):0;
     const free=space-count*2*litGap,globeGap=globePlacement===null?Math.min(28,free):globePlacement*free;
     return <Tier key={i} id={`tier-${i}`} litGap={litGap}><SortableContext items={ids} strategy={horizontalListSortingStrategy}>{ids.map(id=>{
       const item=items.find(x=>x.id===id);if(!item)return null;const book=books.find(b=>b.id===id);
       return <ShelfObject globeGap={globeGap} key={id} item={item} book={book} lit={!!spotlight&&!!book?.places.includes(spotlight)} dim={!!spotlight&&!book?.places.includes(spotlight)} selected={selected===id} dragging={dragging} taken={active?.book.id===id||returning===id} onSelect={setSelected} onPreview={showPreview} onOpen={open}/>;
     })}</SortableContext></Tier>;
   })}
   </div><DragOverlay dropAnimation={null}>{dragPreview&&<ObjectPreview node={dragPreview}/>}</DragOverlay></DndContext>
   <div className={s.previewDock} data-preview={previewBook?.id||''} onPointerEnter={()=>{if(previewTimer.current)clearTimeout(previewTimer.current);}} onPointerLeave={()=>showPreview(null)}><AnimatePresence>{previewBook&&!active&&!panel&&!dragging&&<motion.div key={previewBook.id} className={s.previewCard} style={{left:preview?.x??78}} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}} transition={{duration:.16}}><EditionCover book={previewBook} side="front" width={116} height={180} onClick={()=>{const el=document.querySelector<HTMLElement>(`[data-object="${previewBook.id}"] button`);if(el)open(previewBook.id,el);}}/><p>{edition(previewBook).displayName}<span>{previewBook.mediaIds.length} 个瞬间</span></p></motion.div>}</AnimatePresence></div>
   <footer className={s.roomFooter}><div aria-live="polite">{message||selectedBook&&`${selectedBook.subtitle} / ${selectedBook.mediaIds.length} 个瞬间`||'一些影像，一些仍在生长的记忆。'}</div><span>光影之间 · 私人收藏</span></footer>
   <AnimatePresence onExitComplete={()=>setReturning(null)}>{active&&<BookSession key={active.book.id} entry={active} reduced={reduced} onReturn={closeBook}/>}</AnimatePresence>
   <AnimatePresence>{panel&&<motion.div key={panel} className={s.scrim} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:.3}} onClick={()=>setPanel(null)}>
     <motion.div className={`${s.panel} ${panel==='globe'?s.globePanel:''}`} role="dialog" aria-modal="true" aria-label={panel==='globe'?'记忆地球':panel==='guide'?'关于记忆书房':'制作小书'} initial={reduced?false:panel==='globe'?globeAnchor:{y:30,scale:.94}} animate={{x:0,y:0,scale:1,rotate:0}} exit={reduced?undefined:panel==='globe'?{...globeAnchor,rotate:12}:{y:20,scale:.96}} transition={{duration:reduced?0:.44,ease:[.22,.78,.22,1]}} onClick={e=>e.stopPropagation()}>
       {panel==='globe'?<><button className={s.closePanel} aria-label="关闭地球" onClick={()=>setPanel(null)}>×</button><span className={s.miniLabel}>A WORLD OF MEMORIES</span><Globe locations={library.places} spotlight onNavigate={light}/></>:panel==='guide'?<><button className={s.closePanel} aria-label="关闭说明" onClick={()=>setPanel(null)}>×</button><span className={s.miniLabel}>THE MEMORY STUDY</span><h2>记忆书房</h2><p>这里收着一些走过的地方，和被留下的瞬间。</p><p>双击一本书，慢慢翻阅。打开记忆地球，选择一个地点，让相关的书在灯下相遇。</p><p>“未写的记忆”是一册空白小书。你可以放入照片、视频和文字，把它保存成自己的草稿。</p></>:<DraftEditor initial={editing} onSaved={saved} onClose={()=>setPanel(null)}/>}
     </motion.div>
   </motion.div>}</AnimatePresence>
 </main>;
}
