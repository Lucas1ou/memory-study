'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import {flushSync} from 'react-dom';
import BookSpine from './BookSpine';
import {animateHardcover,type CoverCapture} from '../HardcoverMotion';
import LibraryReader from './LibraryReader';
import EditionCover from './EditionCover';
import {edition} from '../../lib/edition';
import {SINGLE_PAGE_QUERY} from '../../lib/reader-layout';
import type {LibraryBook,MediaItem} from '../../lib/library';
import s from './Study.module.css';

type Phase='closed'|'opening'|'reading'|'closing'|'returning';
export type SessionBook={book:LibraryBook;media:Record<string,MediaItem>;rect:{x:number;y:number;width:number;height:number};spine?:HTMLElement;urls?:string[]};
export default function BookSession({entry,reduced,onReturn}:{entry:SessionBook;reduced:boolean;onReturn:()=>void}){
 const [phase,setPhase]=useState<Phase>('closed'),[arrived,setArrived]=useState(reduced),[side,setSide]=useState<'front'|'back'>('front'),[destination,setDestination]=useState(entry.rect),[viewport,setViewport]=useState({w:innerWidth,h:innerHeight});
 const frontCover=useRef<HTMLButtonElement>(null),rearCover=useRef<HTMLButtonElement>(null),root=useRef<HTMLDivElement>(null),cleanup=useRef<(()=>void)|null>(null),phaseRef=useRef(phase),back=useRef(false);phaseRef.current=phase;
 const coverRatio=edition(entry.book).coverVersion?1.5:1.55;
 const width=Math.min(viewport.w-76,420,(viewport.h-170)/coverRatio),height=width*coverRatio,left=(viewport.w-width)/2,top=(viewport.h-height)/2;
 const ratio=destination.height/height,depth=destination.width/ratio;

 const sourcePose={x:destination.x+destination.width-left-width/2,y:destination.y-top-height/2+destination.height/2,z:-width*ratio/2,scale:ratio,rotateY:90};


 const pose=phase==='returning'?sourcePose:{x:0,y:0,z:side==='back'?-depth:0,scale:1,rotateY:side==='back'?180:0};
 useEffect(()=>{const resize=()=>setViewport({w:innerWidth,h:innerHeight});window.addEventListener('resize',resize);return()=>{window.removeEventListener('resize',resize);cleanup.current?.();};},[]);

 useEffect(()=>{
   let live=true,cursor=0;
   const order=entry.book.readingOrder||entry.book.mediaIds;
   const ids=(side==='back'?[...order].reverse():order).filter(id=>entry.media[id]?.kind==='photo').slice(0,4);
   const warm=async()=>{while(live&&cursor<ids.length){const item=entry.media[ids[cursor++]];const img=new Image();img.decoding='async';img.fetchPriority='low';img.src=item.src;try{await img.decode();}catch{/* The reader retains its normal error/retry path. */}}};
   void warm();void warm();return()=>{live=false;};
 },[entry,side]);
 const turn=useCallback((direction:'opening'|'closing')=>{
   const cover=back.current?rearCover.current:frontCover.current;if(!cover||!root.current)return;
   const slot=root.current.querySelector<HTMLElement>('.flip-slot');if(!slot)return;
   const spread=slot.getBoundingClientRect();if(!spread.width)return;
   const leaves=Array.from(slot.querySelectorAll<HTMLElement>('.book-page[aria-hidden="false"]'));
   const mobile=matchMedia(SINGLE_PAGE_QUERY).matches,isBack=back.current;
   const capture:CoverCapture={rect:{left,top,width,height},artwork:cover.cloneNode(true) as HTMLElement};
   const inside=isBack?leaves.find(el=>el.dataset.pageSide==='right'):leaves.find(el=>el.dataset.pageSide==='left');
   const paper=isBack?leaves.find(el=>el.dataset.pageSide==='left'):leaves.find(el=>el.dataset.pageSide==='right');
   if(reduced){setPhase(direction==='opening'?'reading':'closed');return;}
   cleanup.current=animateHardcover({direction,cover:capture,spread,inside:inside??leaves[0],paper:paper??leaves[0],mobile,reduced,backCover:isBack,done:()=>{flushSync(()=>setPhase(direction==='opening'?'reading':'closed'));cleanup.current=null;}});
 },[reduced,left,top,width,height]);
 const readerReady=useCallback(()=>{if(phaseRef.current==='opening')requestAnimationFrame(()=>turn('opening'));},[turn]);
 const close=useCallback((fromBack=false)=>{if(phaseRef.current!=='reading')return;root.current?.querySelectorAll('video').forEach(v=>v.pause());back.current=fromBack;setSide(fromBack?'back':'front');const slot=root.current?.querySelector('.flip-slot');if(!slot){setPhase('closed');return;}setPhase('closing');requestAnimationFrame(()=>turn('closing'));},[turn]);
 const putBack=useCallback(()=>{if(phaseRef.current!=='closed'||!arrived)return;const el=document.querySelector<HTMLElement>(`[data-object="${CSS.escape(entry.book.id)}"] button`);if(el){const r=el.getBoundingClientRect();setDestination({x:r.x,y:r.y,width:r.width,height:r.height});}if(reduced){onReturn();return;}setPhase('returning');},[arrived,entry.book.id,onReturn,reduced]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&phaseRef.current==='closed'){e.stopImmediatePropagation();putBack();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[putBack]);
 const busy=phase==='opening'||phase==='closing',coverVisible=phase==='closed'||phase==='returning';



 return <motion.div ref={root} className={s.session} style={{perspectiveOrigin:`${destination.x+destination.width/2}px 50%`}} role="dialog" aria-modal="true" aria-label={`${entry.book.subtitle} · ${phase==='reading'?'阅读':'封面'}`} initial={{backgroundColor:'#10121400'}} animate={{backgroundColor:phase==='reading'||busy?'#e8e7e1':'#101214b0'}} exit={{backgroundColor:'#10121400'}} transition={{duration:reduced?0:.24}} data-phase={phase}>
   <div className={s.sessionReader} inert={phase!=='reading'} style={{opacity:phase==='reading'?1:0,visibility:phase==='reading'?'visible':'hidden',pointerEvents:phase==='reading'?'auto':'none'}}>{(phase==='opening'||phase==='reading'||phase==='closing')&&<LibraryReader book={entry.book} media={entry.media} reduced={reduced} onClose={close} onReaderReady={readerReady} initialId={side==='back'?'end':'title'}/>}</div>
   <motion.div className={s.extractedBook} data-moving-book={entry.book.id} transformTemplate={(_,transform)=>transform.replace(/scale\(([^)]+)\)/,'scale3d($1, $1, $1)')} style={{left,top,width,height,visibility:coverVisible?'visible':'hidden',transformOrigin:'50% 50%'}} initial={reduced?false:sourcePose} animate={pose} transition={{duration:reduced||busy?0:phase==='returning'?.65:.5,ease:[.22,.78,.22,1]}} onAnimationComplete={()=>{if(phaseRef.current==='returning')onReturn();else if(phaseRef.current==='closed')setArrived(true);}}>
     <div className={s.sessionFront}><EditionCover ref={frontCover} book={entry.book} side="front" width={width} height={height} onClick={()=>{if(arrived&&phase==='closed')setPhase('opening');}}/></div>
     <div className={s.sessionRear} style={{transform:`translateZ(${-depth}px) rotateY(180deg)`}}><EditionCover ref={rearCover} book={entry.book} side="back" width={width} height={height} onClick={()=>{if(arrived&&phase==='closed')setPhase('opening');}}/></div>
     <div className={s.sessionSpine} style={{width:depth,height,transform:`translateZ(${-depth}px) rotateY(-90deg)`}}><div style={{position:'relative',width:destination.width,height:destination.height,transform:`scale(${1/ratio})`,transformOrigin:'0 0'}}><BookSpine book={entry.book}/></div></div>
   </motion.div>
   {phase==='closed'&&<motion.div className={s.coverActions} style={{top:top+height+22}} initial={{opacity:0}} animate={{opacity:arrived?1:0}} exit={{opacity:0}} transition={{duration:.18}}><button onClick={putBack} disabled={!arrived}>← 放回书架</button><button onClick={()=>setPhase('opening')} disabled={!arrived}>{side==='back'?'重新翻开封底 ↗':'翻开这本书 ↗'}</button>{side==='back'&&<button onClick={()=>{back.current=false;setSide('front');}}>查看封面</button>}</motion.div>}
 </motion.div>;
}
