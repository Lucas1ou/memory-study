import {objectWidth,type ShelfItem} from './library';
export const SHELF_GAP=3;
export function occupiedWidth(ids:string[],items:ShelfItem[],mobile=false){
 return ids.reduce((sum,id)=>{const item=items.find(i=>i.id===id);return sum+(item?objectWidth(item,mobile):0);},0)+Math.max(0,ids.length-1)*SHELF_GAP;
}
export function packShelves(ids:string[],items:ShelfItem[],capacity:number,mobile=false){
 const rows:string[][]=[[]];
 for(const id of ids){const row=rows[rows.length-1];if(row.length&&occupiedWidth([...row,id],items,mobile)>capacity)rows.push([id]);else row.push(id);}
 return rows;
}
export function loadGlobePlacement(mobile:boolean):number|null{
 try{const value=JSON.parse(localStorage.getItem(`memory-globe-placement-${mobile?'mobile':'desktop'}-v1`)||'null');return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?value:null;}catch{return null;}
}
