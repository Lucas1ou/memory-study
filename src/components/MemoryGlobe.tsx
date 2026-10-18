"use client";

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { MeshBasicMaterial,BufferGeometry,Float32BufferAttribute,Points,PointsMaterial } from "three";
import land from "../../public/data/ne_110m_land.json";
import borders from "../../public/data/ne_110m_admin_0_boundary_lines_land.json";
import styles from "./MemoryGlobe.module.css";
import {library} from "../lib/library";

const Globe = lazy(() => import("react-globe.gl"));

export type MemoryPlace = {
  id: string;
  city: string;
  lat: number;
  lng: number;
  chapterId: string;
  date: string;
};

const defaultPlaces: MemoryPlace[] = library.places;

const grid = [
  ...Array.from({ length: 12 }, (_, i) => ({ kind: "grid", coordinates: Array.from({ length: 91 }, (_, j) => [j * 2 - 90, i * 30 - 180]) })),
  ...Array.from({ length: 5 }, (_, i) => ({ kind: "grid", coordinates: Array.from({ length: 181 }, (_, j) => [i * 30 - 60, j * 2 - 180]) })),
];




const geography = [
  ...grid,
  ...borders.features.flatMap(feature => {
    const lines = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates as unknown as number[][][] : [feature.geometry.coordinates as unknown as number[][]];
    return lines.map(line => ({kind: 'border', coordinates: line.map(([lng,lat])=>[lat,lng,0.003])}));
  }),
  ...land.features.map((feature) => ({
    kind: "coast",
    coordinates: feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng, 0.004]),
  })),
];
const continentDots=land.features.flatMap(feature=>{
 const ring=feature.geometry.coordinates[0] as number[][];
 const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);const xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.max(-55,Math.min(...ys)),ymax=Math.min(80,Math.max(...ys));
 const dots:{lat:number;lng:number}[]=[];
 if(xmax-xmin>350)return dots;
 for(let lat=Math.ceil(ymin/2)*2;lat<=ymax;lat+=2){for(let lng=Math.ceil(xmin/2)*2;lng<=xmax;lng+=2){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat)&&lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;}if(inside)dots.push({lat,lng});}}
 return dots;
});
type GeographicPath = (typeof geography)[number];

function GlobeFallback({ loading = false }: { loading?: boolean }) {
  return <div className={styles.fallback} role="status"><span className={styles.fallbackCircle} aria-hidden="true" /><p>{loading ? "正在展开记忆地球…" : "地球暂时无法显示，仍可从地点列表进入回忆。"}</p></div>;
}

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <GlobeFallback /> : this.props.children; }
}

function GlobeScene({ width, height, material, onSelect, onContextLost, places, hologram, compact }: {
  hologram:boolean;compact:boolean;
  places: MemoryPlace[];
  width: number;
  height: number;
  material: MeshBasicMaterial;
  onSelect: (place: MemoryPlace) => void;
  onContextLost: () => void;
}) {
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const markers = useRef(new Map<string, HTMLElement>());
  const createMarker = useCallback((datum: object) => {
    const place = datum as MemoryPlace;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = hologram?`${styles.pin} ${styles.beacon}`:styles.pin;
    button.dataset.place = place.id;
    button.setAttribute('aria-label', `${place.city}，选择记忆地点`);
    button.title = place.city;
    button.innerHTML = hologram?'<span class="'+styles.beaconVisual+'"><i></i><b></b></span>':'<span class="'+styles.pinVisual+'"><svg viewBox="0 0 24 30" aria-hidden="true"><path d="M12 29S1 17 1 11a11 11 0 0 1 22 0c0 6-11 18-11 18Z" fill="currentColor" stroke="#f6f4ef" stroke-width="1.5"/><circle cx="12" cy="11" r="3.5" fill="#f6f4ef"/></svg></span>';
    button.addEventListener('click', event => { event.stopPropagation(); onSelect(place); });
    markers.current.set(place.id,button);
    return button;
  }, [onSelect,hologram]);



  useEffect(() => {
    const instance = globe.current;
    if (!instance) return;
    instance.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const controls = instance.controls();
    controls.autoRotate = compact&&!matchMedia('(prefers-reduced-motion: reduce)').matches;controls.autoRotateSpeed=.16;controls.enabled=!compact;
    controls.enablePan = false;
    controls.minDistance = 115;
    controls.maxDistance = 650;
    instance.pointOfView({ lat: 30, lng: 119, altitude: compact?1.6:1.85 }, 0);
    const dotsGeometry=new BufferGeometry(),dotsMaterial=new PointsMaterial({color:0x9fdcf2,size:compact?.48:.3,transparent:true,opacity:.42,depthWrite:false});
    dotsGeometry.setAttribute('position',new Float32BufferAttribute(continentDots.flatMap(p=>{const c=instance.getCoords(p.lat,p.lng,.004);return [c.x,c.y,c.z];}),3));
    const dots=new Points(dotsGeometry,dotsMaterial);if(hologram)instance.scene().add(dots);
    const resizePins = () => {
      const distance = instance.camera().position.length();


      const scale = Math.max(0.43, Math.min(1, (distance - 100) / 185));
      for (const marker of markers.current.values()) marker.style.setProperty('--pin-scale',String(scale));
    };
    controls.addEventListener('change',resizePins);
    resizePins();
    const canvas = instance.renderer().domElement;
    const visibility = () => { if (document.hidden) instance.pauseAnimation(); else instance.resumeAnimation(); };
    const contextLost = (event: Event) => { event.preventDefault(); instance.pauseAnimation(); onContextLost(); };
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    visibility();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      controls.removeEventListener('change',resizePins);
      instance.pauseAnimation();instance.scene().remove(dots);dotsGeometry.dispose();dotsMaterial.dispose();

    };
  }, [onContextLost,hologram,compact]);

  return <Globe ref={globe} rendererConfig={{alpha:true,antialias:true,preserveDrawingBuffer:compact}} width={width} height={height} backgroundColor="rgba(0,0,0,0)" globeMaterial={material} showAtmosphere={hologram} atmosphereColor="#a5dff2" atmosphereAltitude={.045} {...{ animateIn: false }}
    pathsData={geography} pathPoints="coordinates" pathPointLat={(point: number[]) => point[0]} pathPointLng={(point: number[]) => point[1]} pathPointAlt={(point: number[]) => point[2] ?? 0.001}
    pathColor={(path: object) => hologram ? ((path as GeographicPath).kind==='grid'?'rgba(147,213,237,.10)':(path as GeographicPath).kind==='border'?'rgba(147,213,237,.26)':'rgba(147,213,237,.58)') : (path as GeographicPath).kind === "coast" ? "#393a34" : (path as GeographicPath).kind === 'border' ? 'rgba(58,58,54,0.62)' : "rgba(58,58,54,0.18)"}
    pathStroke={(path) => (path as GeographicPath).kind === "coast" ? 0.48 : (path as GeographicPath).kind === 'border' ? 0.32 : 0.14} pathTransitionDuration={0}
    ringsData={hologram?places:[]} ringLat="lat" ringLng="lng" ringAltitude={.012} ringColor={()=>(t:number)=>`rgba(246,208,104,${(1-t)*.72})`} ringMaxRadius={compact?2.4:1.4} ringPropagationSpeed={1.2} ringRepeatPeriod={matchMedia('(prefers-reduced-motion: reduce)').matches?100000:1700}
    htmlElementsData={compact?[]:places} htmlLat="lat" htmlLng="lng" htmlAltitude={0.008} htmlElement={createMarker}
    htmlElementVisibilityModifier={(element,visible)=>{element.style.visibility=visible?'visible':'hidden';element.style.pointerEvents=visible?'auto':'none';}} />;
}

function GlobeCanvas({ onSelect, places, hologram,compact=false }: { onSelect: (place: MemoryPlace) => void; places: MemoryPlace[]; hologram: boolean;compact?:boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 380 });
  const [lost, setLost] = useState(false);
  const [material, setMaterial] = useState<MeshBasicMaterial>();
  const onContextLost = useCallback(() => setLost(true), []);

  useEffect(() => {
    const surface = new MeshBasicMaterial({ color: hologram ? "#86cbe6" : "#f3f1eb",transparent:hologram,opacity:hologram?.11:1,depthWrite:!hologram });
    setMaterial(surface);
    const element = host.current;
    if (!element) return () => surface.dispose();
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      setSize({ width, height: compact?width:Math.max(260, Math.min(490, width)) });
    });
    observer.observe(element);
    return () => { observer.disconnect(); surface.dispose(); };
  }, [hologram,compact]);

  return <div className={`${styles.canvas} ${compact?styles.compact:''}`} ref={host} style={{ minHeight: size.height }} aria-label="旅行记忆地球，可拖拽旋转和缩放；所有地点也列于下方">
    {lost ? <GlobeFallback /> : size.width > 0 && material ? <GlobeBoundary><Suspense fallback={<GlobeFallback loading />}>
      <GlobeScene width={size.width} height={size.height} material={material} hologram={hologram} compact={compact} onSelect={onSelect} onContextLost={onContextLost} places={places} />
    </Suspense></GlobeBoundary> : <GlobeFallback loading />}
  </div>;
}

export default function MemoryGlobe({ onNavigate, locations = defaultPlaces, spotlight = false }: { onNavigate: (chapterId: string) => void; locations?: MemoryPlace[]; spotlight?: boolean }) {
  const [selected, setSelected] = useState<MemoryPlace | null>(null);
  useEffect(()=>{if(spotlight)window.getSelection()?.removeAllRanges();},[spotlight]);
  return <section className={`${styles.root} ${spotlight?styles.hologram:''}`}>
    <div className={styles.visual}>
      <GlobeCanvas places={locations} hologram={spotlight} onSelect={place=>{setSelected(place);if(spotlight)onNavigate(place.id);}} />
      <p className={styles.hint}>拖动旋转 · 缩放探索 · 点击记忆地点</p>
      <p className={styles.coordinateNote}>陆地轮廓与国界 · 城市与地区位置</p>
    </div>
    <div className={styles.index}>
      <p className={styles.eyebrow}>PLACES I REMEMBER</p>
      <h3 className={styles.title}>在这些地方，留下片刻。</h3>
      <div className={styles.selection} aria-live="polite">
        {selected ? <><span>{selected.city}</span><time>{selected.date}</time><button type="button" onClick={() => onNavigate(selected.chapterId)}>{spotlight ? "照亮相关书籍" : "进入这一章"} <span aria-hidden="true">↗</span></button></> : <p>选择地球上的标记，<br />或沿着地点重读。</p>}
      </div>
      <ul className={styles.list} aria-label="所有旅行记忆地点">
        {locations.map((place) => <li key={place.id}><button type="button" onClick={() => onNavigate(place.chapterId)}><span>{place.city}</span><span className={styles.date}>{place.date}</span><span aria-hidden="true">↗</span></button></li>)}
      </ul>
    </div>
  </section>;
}

export function MiniMemoryGlobe({locations=defaultPlaces}:{locations?:MemoryPlace[]}){return <div aria-hidden="true" className={styles.mini}><GlobeCanvas places={locations} hologram compact onSelect={()=>{}}/></div>;}
