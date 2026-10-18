import type {Metadata,Viewport} from 'next';
import './globals.css';
import 'photoswipe/style.css';
export const metadata:Metadata={title:'记忆书房 · The Memory Study',description:'把走过的地方，留在书架上。个人影像、旅行小书与仍在生长的记忆。',robots:{index:false,follow:false}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#e8e6e1'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><head><link rel="preload" href="/fonts/noto-serif-sc-library.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/inter-regular-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>}
