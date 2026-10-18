import {get,set} from 'idb-keyval';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import type {LibraryBook,MediaItem} from './library';
export type DraftFile={id:string;name:string;blob:Blob;kind:'photo'|'video';width:number;height:number};
export type Draft={version:1;id:string;title:string;place:string;date:string;note:string;files:DraftFile[]};
const KEY='memory-study-drafts-v1';
export async function loadDrafts():Promise<Draft[]>{return(await get<Draft[]>(KEY))??[];}
export async function saveDraft(draft:Draft){const all=await loadDrafts();await set(KEY,[...all.filter(d=>d.id!==draft.id),draft]);}
export function draftContent(draft:Draft):{book:LibraryBook;media:Record<string,MediaItem>;urls:string[]}{
  const media:Record<string,MediaItem>={},urls:string[]=[];
  for(const f of draft.files){const src=URL.createObjectURL(f.blob);urls.push(src);media[f.id]={id:f.id,src,thumb:src,kind:f.kind,width:f.width,height:f.height,caption:'',date:draft.date,place:draft.place,detail:draft.place};}
  return {book:{id:draft.id,title:draft.title,subtitle:draft.place||'我的记忆',place:draft.place,color:'#a69880',ink:'#34332d',pattern:'lattice',date:draft.date,note:draft.note,quote:draft.note,mediaIds:draft.files.map(f=>f.id),coverId:draft.files[0]?.id,places:[]},media,urls};
}
export async function exportDraft(draft:Draft){
  const files:Record<string,Uint8Array>={};
  const manifest={...draft,files:draft.files.map((f,i)=>({id:f.id,name:f.name,kind:f.kind,width:f.width,height:f.height,path:`media/${i+1}.${f.name.split('.').pop()||'bin'}`,type:f.blob.type}))};
  for(let i=0;i<draft.files.length;i++)files[manifest.files[i].path]=new Uint8Array(await draft.files[i].blob.arrayBuffer());
  files['book.json']=strToU8(JSON.stringify(manifest,null,2));

  const data=zipSync(files,{level:0}),url=URL.createObjectURL(new Blob([data as Uint8Array<ArrayBuffer>],{type:'application/zip'}));
  const a=document.createElement('a');a.href=url;a.download=`${draft.title.replace(/[\\/:*?"<>|]/g,'_')}.memory-book.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export async function importDraft(file:File):Promise<Draft>{
  const archive=unzipSync(new Uint8Array(await file.arrayBuffer()));
  if(!archive['book.json'])throw new Error('资料包缺少 book.json');
  const data=JSON.parse(strFromU8(archive['book.json']));
  if(data.version!==1||typeof data.title!=='string'||!Array.isArray(data.files)||!data.files.length)throw new Error('无法识别这份书籍资料包');
  const files:DraftFile[]=data.files.map((f:{path:string;id:string;name:string;kind:string;width:number;height:number;type:string})=>{
    if(!archive[f.path]||!['photo','video'].includes(f.kind)||!(f.width>0&&f.height>0))throw new Error('资料包中的媒体信息不完整');
    return {id:f.id,name:f.name,kind:f.kind as 'photo'|'video',width:f.width,height:f.height,blob:new Blob([archive[f.path] as Uint8Array<ArrayBuffer>],{type:f.type})};
  });
  return {version:1,id:typeof data.id==='string'&&data.id.startsWith('draft-')?data.id:`draft-${crypto.randomUUID()}`,title:data.title,place:String(data.place||''),date:String(data.date||''),note:String(data.note||''),files};
}
