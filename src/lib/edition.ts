import type {LibraryBook} from './library';
export const accents:Record<string,string>={guiyang:'#444e3d',japan:'#a7473a',hailing:'#244f53',beijing:'#8d3c38',shanghai:'#a84436',suzhou:'#768777',hongkong:'#ba922f',napa:'#6d7d6a'};
const identities:Record<string,{latin:string;lines:string[];family:'city'|'landscape';paper:string;spinePaper:string;spineInk:string;coverVersion?:number}>={
 guiyang:{coverVersion:6,latin:'SCHOOL DAYS',lines:['贵阳','一中'],family:'landscape',paper:'#444e3d',spinePaper:'#444e3d',spineInk:'#eee9da'},
 japan:{coverVersion:6,latin:'JAPAN',lines:['日本'],family:'landscape',paper:'#f2ede1',spinePaper:'#e9e1cf',spineInk:'#372e28'},
 hailing:{coverVersion:8,latin:'HAILING ISLAND',lines:['海陵岛'],family:'landscape',paper:'#244f53',spinePaper:'#244f53',spineInk:'#efece0'},
 beijing:{coverVersion:5,latin:'BEIJING',lines:['北京'],family:'city',paper:'#eee6d6',spinePaper:'#a83e32',spineInk:'#f3e8d1'},
 shanghai:{coverVersion:5,latin:'SHANGHAI',lines:['上海'],family:'city',paper:'#eee8d9',spinePaper:'#eee8d9',spineInk:'#232421'},
 suzhou:{coverVersion:8,latin:'CLASSICAL GARDENS',lines:['苏州'],family:'landscape',paper:'#edeee1',spinePaper:'#e4e6d3',spineInk:'#3f5145'},
 hongkong:{coverVersion:5,latin:'HONG KONG',lines:['香港'],family:'city',paper:'#f0ede4',spinePaper:'#f0ede4',spineInk:'#252622'},
 napa:{coverVersion:8,latin:'SHANGRI-LA',lines:['香格','里拉'],family:'landscape',paper:'#f0ede1',spinePaper:'#e5e7d9',spineInk:'#59664f'},
};
export function edition(book:LibraryBook){const identity=identities[book.id]||{coverVersion:undefined,latin:'MEMORY',lines:[book.title],family:'landscape' as const,paper:'#f0eee7',spinePaper:book.color,spineInk:book.ink};const english=['japan','shanghai','hongkong'].includes(book.id);return {...identity,english,displayName:english?identity.latin:book.title,accent:accents[book.id]||book.color,ink:'#242722',art:book.id.startsWith('draft-')?null:identity.coverVersion?`/covers/${book.id}-front-v${identity.coverVersion}.png`:null,name:book.title};}
