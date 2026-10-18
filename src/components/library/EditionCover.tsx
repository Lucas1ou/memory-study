import {forwardRef,type CSSProperties} from 'react';
import {edition} from '../../lib/edition';
import type {LibraryBook} from '../../lib/library';
import e from './EditionCover.module.css';
import EditionTitle from './EditionTitle';
const EditionCover=forwardRef<HTMLButtonElement,{book:LibraryBook;side:'front'|'back';width:number;height:number;onClick:()=>void}>(function EditionCover({book,side,width,height,onClick},ref){
 const design=edition(book);const generated=Boolean(design.coverVersion);const art=generated?`/covers/${book.id}-${side}-v${design.coverVersion}.png`:design.art;
 return <button ref={ref} className={`${e.cover} ${side==='back'?e.back:''}`} data-cover-side={side} data-edition={book.id} data-generated-cover={generated||undefined} style={{width,height,'--edition-accent':design.accent,'--edition-paper':design.paper,'--edition-ink':design.ink} as CSSProperties} onClick={onClick} aria-label={`翻开${side==='back'?'封底':''} ${design.name}`}>
   {art&&<img className={generated?e.generatedArt:e.art} src={art} alt="" aria-hidden="true" decoding="sync" loading="eager"/>}
   <span className={e.binding}/>
   {side==='front'?(generated?<h1 className={e.generatedTitle}>{design.name}</h1>:<EditionTitle book={book}/>):!generated?<><span className={e.backLatin} aria-hidden="true">{design.latin}</span>{book.id!=='beijing'&&<span className={e.backMark}><b>{design.displayName}</b><span>{book.mediaIds.length} 个瞬间</span></span>}</>:null}
 </button>;
});
export default EditionCover;
