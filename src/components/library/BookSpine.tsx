import type {LibraryBook} from '../../lib/library';
import {edition} from '../../lib/edition';
import s from './BookSpine.module.css';
export default function BookSpine({book}:{book:LibraryBook}){
 const d=edition(book);
 return <span className={s.face} data-spine-edition={book.id} data-spine-language={d.english?'en':'zh'} style={{'--spine-paper':d.spinePaper,'--spine-ink':d.spineInk,'--spine-accent':d.accent} as React.CSSProperties}>
  <span className={s.band} aria-hidden="true"/>
  {d.art&&<img className={s.art} src={d.art} alt="" aria-hidden="true"/>}
  <span className={s.serial} aria-hidden="true">{String(['guiyang','japan','hailing','beijing','shanghai','suzhou','hongkong','napa'].indexOf(book.id)+1||'D').padStart(2,'0')}</span>
  <span className={s.title}>{d.displayName}</span>
  <span className={s.latin} aria-hidden="true">{d.latin}</span>
  <span className={s.imprint} aria-hidden="true">MS</span>
 </span>;
}
