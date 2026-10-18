/** Fetch and decode offscreen, before the flip engine exposes a new leaf. */
export function prepareReaderImage(img:HTMLImageElement,width:number,priority:'high'|'low'='low'):Promise<void>{
 img.fetchPriority=priority;
 if(img.dataset.imageReady==='true')return Promise.resolve();
 const figure=img.closest('figure');figure?.classList.add('image-loading');
 img.loading='eager';img.decoding='async';img.sizes=`${width}px`;
 const avif=img.parentElement?.querySelector<HTMLSourceElement>('source[data-avif-source]');
 return new Promise<void>(resolve=>{
  let fallback=false;
  const finish=async()=>{
   try{await img.decode();img.dataset.imageReady='true';figure?.classList.remove('image-failed');}
   catch{if(!img.naturalWidth)figure?.classList.add('image-failed');}
   figure?.classList.remove('image-loading');cleanup();resolve();
  };
  const fail=()=>{
   if(avif?.srcset&&!fallback){fallback=true;avif.srcset='';img.src=img.dataset.src!;return;}
   figure?.classList.remove('image-loading');figure?.classList.add('image-failed');cleanup();resolve();
  };
  const cleanup=()=>{img.removeEventListener('load',finish);img.removeEventListener('error',fail);};
  img.addEventListener('load',finish);img.addEventListener('error',fail);
  if(!img.getAttribute('src')){
   if(avif)avif.srcset=avif.dataset.avifSource!;
   if(img.dataset.srcset)img.srcset=img.dataset.srcset;
   img.src=img.dataset.src!;
  }
  if(img.complete&&img.naturalWidth)void finish();
 });
}
