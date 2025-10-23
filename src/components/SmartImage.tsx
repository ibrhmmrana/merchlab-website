"use client";
import NextImage, { ImageProps } from "next/image";
import { useMemo, useState } from "react";

type Props = Omit<ImageProps,"src"|"alt"> & { src: string | null | undefined; alt: string; className?: string; };
const ALLOWED = [
  "barronapidevb9ca.blob.core.windows.net",
  "daznsaapp02.blob.core.windows.net",
  "paznsaapp02.blob.core.windows.net",
  "bmkdwnfrldoqvduhpgsu.supabase.co",
];

export default function SmartImage({ src, alt, className, ...rest }: Props){
  const [fallback, setFallback] = useState(false);
  const allowed = useMemo(()=>{
    if(!src) return false;
    try { return ALLOWED.includes(new URL(src).hostname); } catch { return false; }
  }, [src]);

  if (!src) {
    return <div className={`w-full h-full grid place-items-center text-xs text-gray-400 ${className||""}`}>No image</div>;
  }
  if (allowed && !fallback) {
    return <NextImage src={src} alt={alt} className={className} {...rest} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className||""}`} style={{width:"100%",height:"100%"}} onError={()=>setFallback(true)} />;
}