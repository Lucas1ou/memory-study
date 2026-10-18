'use client';

import {useEffect,useRef,useState,useImperativeHandle,forwardRef,type ReactNode} from 'react';
import type {PageFlip,BookSnapshot} from '@gullabs/flipbook-core';
import {resolvePageIndex,type BookPage} from '../data/book';
import {prepareReaderImage} from '../lib/reader-images';

export type ReaderHandle={next:()=>void;prev:()=>void;goTo:(index:number)=>void;cancel:()=>void};
type Props={pages:BookPage[];mobile:boolean;initialId:string;reduced:boolean;pageRatio?:number;onPosition:(index:number,visible:number[])=>void;onAction:(action:string,value?:string)=>void;onReady?:()=>void;renderPage:(page:BookPage,index:number,total:number)=>ReactNode};

const BookReader=forwardRef<ReaderHandle,Props>(function BookReader({pages,mobile,initialId,reduced,pageRatio,onPosition,onAction,onReady,renderPage},ref){
  const stage=useRef<HTMLDivElement>(null),slot=useRef<HTMLDivElement>(null),templates=useRef<HTMLDivElement>(null),engine=useRef<PageFlip|null>(null);
  const position=useRef(initialId),currentPage=useRef(0),atEnd=useRef(false),callbacks=useRef({onPosition,onAction,onReady});
  callbacks.current={onPosition,onAction,onReady};
  const [ready,setReady]=useState(false),[error,setError]=useState(false);
  const [box,setBox]=useState({w:0,h:0});
  const navigate=useRef<(direction:'next'|'prev'|number)=>void>(()=>{});
  useImperativeHandle(ref,()=>({
    next:()=>navigate.current('next'),prev:()=>navigate.current('prev'),
    goTo:(i)=>navigate.current(i),cancel:()=>engine.current?.cancelTurn(),
  }),[reduced]);
  useEffect(()=>{const el=stage.current;if(!el)return;const update=()=>{const r=el.getBoundingClientRect();const ratio=pageRatio??(mobile?1.48:1.25);const w=Math.max(1,Math.floor(Math.min(mobile?r.width-24:(r.width-56)/2,mobile?460:560,Math.max(1,r.height-16)/ratio)));const h=Math.max(1,Math.floor(w*ratio));setBox({w,h});};const ro=new ResizeObserver(update);ro.observe(el);update();return()=>ro.disconnect();},[mobile,pageRatio]);
  useEffect(()=>{
    if(!box.w||!slot.current||!templates.current)return;
    let disposed=false;let book:PageFlip|null=null;const host=document.createElement('div');host.className='flip-book';host.style.width=`${box.w*(mobile?1:2)}px`;host.style.height=`${box.h}px`;slot.current.appendChild(host);setReady(false);setError(false);
    const leaves=Array.from(templates.current.children).map(child=>child.cloneNode(true) as HTMLElement);
    let lastStable=0;
    let pointerStart:{x:number;y:number}|null=null,ignoreClickUntil=0;
    const preparations=new Map<HTMLImageElement,Promise<void>>();
    const preparePages=(indices:number[],priority:'high'|'low'='high')=>Promise.all(indices.flatMap(i=>Array.from(leaves[i]?.querySelectorAll<HTMLImageElement>('img[data-src]')??[]).map(img=>{
      if(priority==='high')img.fetchPriority='high';
      if(!preparations.has(img)){const spread=pages[i].type.startsWith('spread-');preparations.set(img,prepareReaderImage(img,spread?box.w*2:mobile?box.w-48:box.w-72,priority));}
      return preparations.get(img)!;
    })));
    const loadImages=(indices:number[])=>{const needed=new Set<number>();for(const index of indices)for(let n=Math.max(0,index-4);n<=Math.min(pages.length-1,index+8);n++)needed.add(n);void preparePages([...needed],'low');};
    let pendingTurn=false;
    navigate.current=async direction=>{
      if(!book||disposed||pendingTurn)return;
      if(direction==='next'&&atEnd.current){book.cancelTurn();callbacks.current.onAction('close-back');return;}
      if(direction==='prev'&&currentPage.current===0){book.cancelTurn();callbacks.current.onAction('close-cover');return;}
      const step=mobile?1:2,target=typeof direction==='number'?direction:Math.max(0,Math.min(pages.length-1,lastStable+(direction==='next'?step:-step)));
      pendingTurn=true;await preparePages([target,target+1,target+2]);pendingTurn=false;
      if(disposed||!book)return;
      if(typeof direction==='number')book.turnToPage(target);
      else if(direction==='next')reduced?book.turnToNextPage():book.flipNext();
      else reduced?book.turnToPrevPage():book.flipPrev();
    };
    const sync=(snapshot:BookSnapshot)=>{
      if(disposed)return;const indices=snapshot.visiblePages;atEnd.current=indices.includes(pages.length-1);lastStable=snapshot.page;currentPage.current=snapshot.page;position.current=pages[snapshot.page]?.id??'cover';
      leaves.forEach((el,i)=>{const visible=indices.includes(i);el.setAttribute('aria-hidden',String(!visible));el.inert=!visible;if(!visible)el.querySelectorAll('video').forEach(video=>video.pause());});
      slot.current?.style.setProperty('--left-depth',`${1+Math.round(6*snapshot.page/Math.max(1,pages.length-1))}px`);
      slot.current?.style.setProperty('--right-depth',`${7-Math.round(6*snapshot.page/Math.max(1,pages.length-1))}px`);
      loadImages(indices);callbacks.current.onPosition(snapshot.page,indices);
    };
    const action=(event:MouseEvent)=>{
      if(Date.now()<ignoreClickUntil)return;
      const element=event.target as HTMLElement,target=element.closest<HTMLElement>('[data-action]');
      const photoSurface=target?.dataset.action==='photo'&&Boolean(target.querySelector('img'));
      const control=element.closest('button,a,input,textarea,select,video,[role="button"]');


      if(event.detail>0&&(!control||photoSurface)){
        const rect=host.getBoundingClientRect(),x=event.clientX-rect.left,edge=Math.max(26,box.w*.07);
        if(x>=0&&x<=rect.width&&(x<edge||x>rect.width-edge)){
          event.preventDefault();
          if(x<edge){
            if(lastStable===0){book?.cancelTurn();callbacks.current.onAction('close-cover');}
            else navigate.current('prev');
          }else if(atEnd.current){book?.cancelTurn();callbacks.current.onAction('close-back');}
          else navigate.current('next');
          return;
        }
      }
      if(target){event.preventDefault();callbacks.current.onAction(target.dataset.action!,target.dataset.asset??target.dataset.chapter);}
    };
    const gate=(event:PointerEvent)=>{pointerStart={x:event.clientX,y:event.clientY};const target=event.target as HTMLElement;if(event.pointerType==='mouse'&&target.closest('.selectable-copy'))event.stopPropagation();};
    const release=(event:PointerEvent)=>{if(pointerStart&&lastStable===0&&event.clientX-pointerStart.x>65&&Math.abs(event.clientY-pointerStart.y)<100){const rect=host.getBoundingClientRect();if(mobile||pointerStart.x<rect.left+box.w){book?.cancelTurn();ignoreClickUntil=Date.now()+700;callbacks.current.onAction('close-cover');}}if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>8)ignoreClickUntil=Date.now()+500;pointerStart=null;};
    const cancel=()=>book?.cancelTurn();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')cancel();};
    (async()=>{try{const {PageFlip}=await import('@gullabs/flipbook-core');if(disposed)return;
      const start=Math.max(0,resolvePageIndex(pages,position.current));
      book=new PageFlip(host,{width:box.w,height:box.h,sizing:'fixed',autoSize:false,usePortrait:mobile,hardCovers:false,initialPage:start,flippingTime:reduced?0:620,drawShadow:true,maxShadowOpacity:.23,pageBackground:'#f6f4ef',allowTouchScroll:true,pointerInput:['mouse','touch','pen'],respectInteractiveContent:true,flipOnClick:'never',foldCornerOnHover:false,respectReducedMotion:true});
      engine.current=book;book.on('ready',async e=>{await preparePages([...e.data.visiblePages,start+2,start+3]);if(disposed)return;sync(e.data);requestAnimationFrame(()=>{if(disposed)return;book?.update();setReady(true);callbacks.current.onReady?.();});});book.on('flip',e=>sync(e.data));book.on('changeState',e=>{if(e.data.state==='user_fold'||e.data.state==='flipping'){loadImages([lastStable,lastStable+1]);}});book.loadFromHTML(leaves);
      host.addEventListener('click',action);host.addEventListener('pointerdown',gate,true);host.addEventListener('pointerup',release,true);document.addEventListener('visibilitychange',cancel);window.addEventListener('keydown',key);
    }catch(e){console.error('Book reader failed',e);if(!disposed){setError(true);callbacks.current.onAction('binding-error');}}})();
    return()=>{disposed=true;navigate.current=()=>{};host.removeEventListener('click',action);host.removeEventListener('pointerdown',gate,true);host.removeEventListener('pointerup',release,true);document.removeEventListener('visibilitychange',cancel);window.removeEventListener('keydown',key);book?.destroy();if(engine.current===book)engine.current=null;host.remove();};
  },[box.w,box.h,mobile,pages,reduced,renderPage]);
  return <div className={`reader-stage ${mobile?'is-single':'is-spread'}`} ref={stage}>
    <div className="book-templates" ref={templates} hidden inert aria-hidden="true">{pages.map((page,index)=>renderPage(page,index,pages.length))}</div>
    <div className={`flip-slot ${ready?'is-ready':''}`} ref={slot} tabIndex={-1} aria-label="旅行艺术书页" style={box.w?{width:box.w*(mobile?1:2),height:box.h}:undefined}><div className="paper-block paper-block-left" aria-hidden="true"/><div className="paper-block paper-block-right" aria-hidden="true"/></div>
    {!ready&&!error&&<div className="reader-loading" role="status">正在打开这本书…</div>}
    {error&&<div className="reader-loading"><p>书页暂时无法展开</p><button onClick={()=>onAction('comfortable')}>进入舒适阅读 →</button></div>}
  </div>;
});
export default BookReader;
