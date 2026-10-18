export type BookPage={id:string;type:'title'|'photo'|'spread-left'|'spread-right'|'end'|'endpaper';assetIds?:string[]};
export function resolvePageIndex(pages:BookPage[],id:string){const normalized=id.replace(/-(left|right)$/,'');return pages.findIndex(p=>p.id===normalized||p.assetIds?.includes(normalized));}
