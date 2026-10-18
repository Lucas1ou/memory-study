/** Front elevation, sharing the shelf's flat baseline rather than a second camera. */
export default function GlobeBase({className}:{className:string}){
 return <svg className={className} viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true" focusable="false" data-globe-base>
  <path d="M14 0H106L120 44H0Z" fill="#504d46"/>
  <path d="M14 0H106" stroke="#817a6c" strokeWidth="1.5"/>
  <path d="M29 5H91" stroke="#282722" strokeWidth="3"/>
  <path d="M0 43.5H120" stroke="#282620"/>
 </svg>;
}
