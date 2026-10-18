import raw from '../data/library.json';
import type {BookPage} from '../data/book';
export type MediaItem={id:string;kind:'photo'|'video';src:string;highSrc?:string;thumb:string;poster?:string;width:number;height:number;date:string;place:string;detail:string;caption:string};
export type LibraryBook={id:string;title:string;subtitle:string;place:string;color:string;ink:string;pattern:string;quote?:string;date:string;note:string;mediaIds:string[];coverId:string;places:string[];spreadIds?:string[];readingOrder?:string[]};
export type ShelfItem={id:string;kind:'book'|'globe'|'blank'|'guide';bookId?:string};
export const library=raw as unknown as {version:number;name:string;books:LibraryBook[];media:Record<string,MediaItem>;places:{id:string;city:string;lat:number;lng:number;chapterId:string;date:string}[]};
export const objects:ShelfItem[]=[...library.books.map(book=>({id:book.id,kind:'book' as const,bookId:book.id})),{id:'globe',kind:'globe'},{id:'blank',kind:'blank'},{id:'guide',kind:'guide'}];
export const initialShelves=[['guiyang','japan','hailing','beijing','shanghai','suzhou','hongkong','napa','globe','blank','guide']];
export function pagesFor(book:LibraryBook,mobile=false):BookPage[]{
  const pages:BookPage[]=[{id:'title',type:'title'}];
  for(const id of book.readingOrder||book.mediaIds){
    if(!mobile&&book.spreadIds?.includes(id)){
      if(pages.length%2)pages.push({id:`${id}-breath`,type:'endpaper'});
      pages.push({id:`${id}-left`,type:'spread-left',assetIds:[id]},{id:`${id}-right`,type:'spread-right',assetIds:[id]});
    }else pages.push({id,type:'photo',assetIds:[id]});
  }
  pages.push({id:'end',type:'end'});
  if(pages.length%2)pages.push({id:'endpaper',type:'endpaper'});
  return pages;
}
export function objectWidth(item:ShelfItem,mobile=false){return item.kind==='globe'?(mobile?138:154):item.kind==='guide'?(mobile?25:30):item.kind==='blank'?(mobile?26:28):(mobile?27:28);}
export const SHELF_CAPACITY=810;
export function validShelves(value:unknown,items:ShelfItem[]):value is string[][]{
  if(!Array.isArray(value)||!value.length||value.length>30||!value.every(row=>Array.isArray(row)&&row.every(id=>typeof id==='string')))return false;

  const ids=value.flat();return ids.length===items.length&&new Set(ids).size===ids.length&&items.every(i=>ids.includes(i.id));
}
