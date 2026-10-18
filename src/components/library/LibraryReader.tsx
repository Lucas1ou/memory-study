'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import BookReader,{type ReaderHandle} from '../BookReader';
import {pagesFor,type LibraryBook,type MediaItem} from '../../lib/library';
import type {BookPage} from '../../data/book';
import s from './Study.module.css';
import EditionTitle from './EditionTitle';
import {edition} from '../../lib/edition';
import {SINGLE_PAGE_QUERY} from '../../lib/reader-layout';

export default function LibraryReader({book,media,onClose,reduced,onReaderReady,initialId='title'}:{book:LibraryBook;media:Record<string,MediaItem>;onClose:(fromBack?:boolean)=>void;reduced:boolean;onReaderReady?:()=>void;initialId?:string}){
  const reader=useRef<ReaderHandle>(null),[mobile,setMobile]=useState(()=>matchMedia(SINGLE_PAGE_QUERY).matches),[visible,setVisible]=useState([0,1]),[failed,setFailed]=useState(false),[plain,setPlain]=useState(false);
  const pages=useMemo(()=>pagesFor(book,mobile),[book,mobile]);
  useEffect(()=>{const q=matchMedia(SINGLE_PAGE_QUERY);const update=()=>setMobile(q.matches);update();q.addEventListener('change',update);return()=>q.removeEventListener('change',update);},[]);
  const action=useCallback(async(name:string,value?:string)=>{
    if(name==='close-cover'||name==='close-back'){onClose(name==='close-back');return;}
    if(name==='comfortable'){setPlain(true);return;}
    if(name==='binding-error'){setFailed(true);return;}
    if(name==='photo'&&value&&media[value]){
      const list=(book.readingOrder||book.mediaIds).filter(id=>media[id].kind==='photo');
      const {default:PhotoSwipe}=await import('photoswipe');
      new PhotoSwipe({dataSource:list.map(id=>({src:media[id].highSrc||media[id].src,width:media[id].width,height:media[id].height,alt:media[id].detail})),index:Math.max(0,list.indexOf(value)),bgOpacity:.97}).init();
    }
  },[book,media,onClose]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(document.querySelector('.pswp--open'))return;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLVideoElement)return;if(e.key==='Escape')onClose();if(e.key==='ArrowRight'){e.preventDefault();reader.current?.next();}if(e.key==='ArrowLeft'){e.preventDefault();reader.current?.prev();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
  const render=useCallback((page:BookPage,i:number,total:number)=>{
    const item=page.assetIds?.[0]?media[page.assetIds[0]]:null;const spread=page.type==='spread-left'||page.type==='spread-right';
    const mobileWide=mobile&&item?.kind==='photo'&&book.spreadIds?.includes(item.id);
    return <article key={page.id} className={`book-page ${s.leaf} ${spread?s.spreadLeaf:''} ${mobileWide?s.mobileWideLeaf:''}`} data-page-id={page.id} data-spread={spread?page.type:undefined} data-page-side={mobile?'single':i%2?'right':'left'}>
      <div className="page-content">
        {page.type==='title'?<div className={s.bookTitle}><div className={s.leafTitleComposition}><EditionTitle book={book} leaf/></div><p>{book.quote||book.note}</p><time>{book.date}</time></div>:page.type==='end'?<div className={s.bookEnd}><span>在此，留一会儿。</span><p>{book.subtitle}</p><button data-action="close-back">合上，放回书架 ↗︎</button></div>:item?<figure className={`${s.mediaFigure} ${spread?s.spreadFigure:''} ${page.type==='spread-right'?s.spreadRight:''}`}>
          {item.kind==='video'?<video controls playsInline preload="metadata" poster={item.poster} src={item.src} aria-label={`${item.detail} · 动态照片`}/>:<button className={s.photoSurface} style={{aspectRatio:spread?undefined:`${item.width}/${item.height}`}} data-action="photo" data-asset={item.id} aria-label={`查看完整照片 ${item.detail}`}><img data-src={item.src} data-srcset={spread&&item.highSrc&&item.width>3840?`${item.src} 3840w, ${item.highSrc} ${item.width}w`:undefined} alt={item.caption||item.detail} width={item.width} height={item.height} decoding="async"/></button>}
          {item.caption&&<figcaption>{item.caption}</figcaption>}
        </figure>:null}
      </div>
      {item&&<footer className={`page-footer ${s.leafFooter}`}><span>{item.detail}</span><div>{item.kind==='photo'&&<button data-action="photo" data-asset={item.id} aria-label={`放大 ${item.id}`}>⤢</button>}<span>{String(i+1).padStart(2,'0')}</span></div></footer>}
    </article>;
  },[book,media,mobile]);
  return <section className={s.reading} aria-label={`${book.title}阅读器`}>
    <header className={s.readingHeader}><button onClick={()=>onClose(false)}>← 放回书架</button><span>{edition(book).displayName}</span><button onClick={()=>setPlain(!plain)}>{plain?'翻页阅读':'纵向阅读'}</button></header>
    <div className={s.readingBody}>
      {plain?<div className={s.plain}><h1>{edition(book).displayName}</h1>{book.note&&<p>{book.note}</p>}{(book.readingOrder||book.mediaIds).map(id=><figure key={id}>{media[id].kind==='video'?<video src={media[id].src} poster={media[id].poster} controls playsInline/>:<button onClick={()=>action('photo',id)}><img src={media[id].highSrc||media[id].src} alt={media[id].caption||media[id].detail}/></button>}<figcaption>{media[id].caption||media[id].detail}</figcaption></figure>)}</div>:<BookReader ref={reader} pages={pages} pageRatio={1.55} mobile={mobile} initialId={initialId} reduced={reduced} renderPage={render} onPosition={(_,v)=>setVisible(v)} onAction={action} onReady={onReaderReady}/>}
    </div>
    {!plain&&<footer className={s.readerControls}><button aria-label="上一页" onClick={()=>reader.current?.prev()}>←</button><span>{visible.map(n=>String(n+1).padStart(2,'0')).join(' — ')} <small>/ {pages.length}</small></span><button aria-label="下一页" onClick={()=>reader.current?.next()}>→</button></footer>}
    {failed&&!plain&&<button className={s.fallbackButton} onClick={()=>setPlain(true)}>切换纵向阅读</button>}
  </section>;
}
