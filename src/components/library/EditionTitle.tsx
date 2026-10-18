import type {LibraryBook} from '../../lib/library';
import {edition} from '../../lib/edition';
import t from './EditionTitle.module.css';
/** Live type stays sharp, selectable and identical across cover and title leaf. */
export default function EditionTitle({book,leaf=false}:{book:LibraryBook;leaf?:boolean}){
 const d=edition(book);
 return <div className={`${t.composition} ${d.family==='city'?t.city:t.landscape} ${leaf?t.leaf:''} ${d.english?t.english:''}`} data-title-edition={book.id} style={{'--type-accent':d.accent} as React.CSSProperties}>
  <span className={t.index} aria-hidden="true">MEMORY STUDY <i/> {String(['guiyang','japan','hailing','beijing','shanghai','suzhou','hongkong','napa'].indexOf(book.id)+1||'D').padStart(2,'0')}</span>
  <h1 className={t.chinese} aria-label={d.name}>{(d.english?d.latin.split(' '):d.lines).map((line,i)=><span key={i}>{line}</span>)}</h1>
  <span className={t.latin} aria-hidden="true">{d.latin}</span>
  <span className={t.register} aria-hidden="true">{d.family==='city'?'CITY / NOTES':'LAND / MEMORIES'}</span>
 </div>;
}
