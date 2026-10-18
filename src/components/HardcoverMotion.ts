type Rect = Pick<DOMRect,'left'|'top'|'width'|'height'>;
export type CoverCapture = {rect:Rect;artwork:HTMLElement;ghost?:HTMLElement};

export function captureCover(element:HTMLElement):CoverCapture {
  const rect=element.getBoundingClientRect(),artwork=element.cloneNode(true) as HTMLElement;
  const ghost=artwork.cloneNode(true) as HTMLElement;
  ghost.classList.add('cover-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert=true;
  Object.assign(ghost.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,maxHeight:'none',minHeight:'0',margin:'0',transform:'none',opacity:'1'});
  document.body.appendChild(ghost);
  return {rect,artwork,ghost};
}

/** A rigid board has two distinct faces. The back board closes right-to-left;
 * its exterior is on the reverse face, with upright lettering after rotation.
 * Paper and its shading are cloned without discarding their layout classes. */
export function animateHardcover({direction,cover,spread,inside,paper,mobile,reduced,backCover=false,done}:{
  direction:'opening'|'closing';cover:CoverCapture;spread:Rect;inside?:HTMLElement;paper?:HTMLElement;
  mobile:boolean;reduced:boolean;backCover?:boolean;done:()=>void;
}) {
  const width=spread.width/(mobile?1:2);
  const hinge=mobile&&!backCover?0:width;
  const root=document.createElement('div');root.className=`binding-flight ${backCover?'binding-rear':'binding-front-cover'} ${mobile?'is-single':''}`;root.setAttribute('aria-hidden','true');root.inert=true;
  Object.assign(root.style,{left:`${spread.left}px`,top:`${spread.top}px`,width:`${spread.width}px`,height:`${spread.height}px`,transformOrigin:`${hinge}px 0`,perspectiveOrigin:`${hinge}px 50%`});
  const clonePage=(source:HTMLElement|undefined,side:'left'|'right')=>{
    const clone=source?source.cloneNode(true) as HTMLElement:document.createElement('article');
    clone.removeAttribute('style');clone.classList.remove('stf__item','--left','--right','--soft','--hard');clone.classList.add('book-page','binding-endpaper');
    if(!source)clone.classList.add('page-endpaper');
    clone.dataset.pageSide=side;clone.setAttribute('aria-hidden','true');clone.inert=true;return clone;
  };
  const stack=document.createElement('div');stack.className='binding-page-stack';
  Object.assign(stack.style,{left:`${backCover?hinge-width:hinge}px`,width:`${width}px`});
  stack.appendChild(clonePage(paper,backCover?'left':'right'));
  const cast=document.createElement('div');cast.className='binding-cast-shadow';stack.appendChild(cast);root.appendChild(stack);
  const leaf=document.createElement('div');leaf.className='binding-board';
  Object.assign(leaf.style,{left:`${hinge}px`,width:`${width}px`,transformOrigin:'0 50%'});
  const outer=document.createElement('div');outer.className=`binding-face binding-outer ${backCover?'binding-back':'binding-front'}`;
  const artwork=cover.artwork.cloneNode(true) as HTMLElement;
  const customProperties=Array.from(artwork.style).filter(name=>name.startsWith('--')).map(name=>[name,artwork.style.getPropertyValue(name)]);
  artwork.removeAttribute('style');customProperties.forEach(([name,value])=>artwork.style.setProperty(name,value));artwork.tabIndex=-1;
  artwork.style.setProperty('width',`${cover.rect.width}px`,'important');artwork.style.setProperty('height',`${cover.rect.height}px`,'important');
  artwork.style.setProperty('transform',`scale(${width/cover.rect.width},${spread.height/cover.rect.height})`,'important');artwork.style.setProperty('transform-origin','0 0');
  outer.appendChild(artwork);
  const inner=document.createElement('div');inner.className=`binding-face binding-inner ${backCover?'binding-front':'binding-back'}`;
  inner.appendChild(clonePage(inside,backCover?'right':'left'));
  const edge=document.createElement('div');edge.className='binding-board-edge';
  const light=document.createElement('div');light.className='binding-light';
  leaf.append(outer,inner,edge,light);root.appendChild(leaf);document.body.appendChild(root);cover.ghost?.remove();
  const sx=cover.rect.width/width,sy=cover.rect.height/spread.height;

  const closedLeft=hinge-(backCover?width:0);
  const dx=cover.rect.left-(spread.left+hinge+(closedLeft-hinge)*sx),dy=cover.rect.top-spread.top;
  const closed=`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,open='translate3d(0,0,0) scale(1,1)';
  const opening=direction==='opening',duration=reduced?1:720,easing='cubic-bezier(.33,0,.2,1)';
  const closedAngle=backCover?-180:0,openAngle=backCover?0:-180;
  root.dataset.closedAngle=String(closedAngle);root.dataset.openAngle=String(openAngle);
  const options={duration,easing,fill:'both' as FillMode};
  const movement=root.animate([{transform:opening?closed:open},{transform:opening?open:closed}],options);
  const rotation=leaf.animate([{transform:`rotateY(${opening?closedAngle:openAngle}deg)`},{transform:`rotateY(${opening?openAngle:closedAngle}deg)`}],options);
  const lighting=light.animate([{opacity:.01},{opacity:.24,offset:.45},{opacity:.01}],options);
  const shadow=cast.animate([{opacity:0},{opacity:.27,offset:.5},{opacity:0}],options);
  let cancelled=false;
  const cleanup=()=>{cancelled=true;[movement,rotation,lighting,shadow].forEach(a=>a.cancel());root.remove();cover.ghost?.remove();};


  Promise.all([movement.finished,rotation.finished]).then(()=>{if(cancelled)return;done();root.remove();}).catch(()=>{});
  return cleanup;
}
