"use client";

import { useState } from "react";

export default function EvidenceImage({ src, alt, fallbackText }: { src: string; alt: string; fallbackText: string }) {
  const [error, setError] = useState(false);

  return (
    <div className={`absolute inset-0 flex items-center justify-center transition-colors ${error ? 'bg-slate-200' : 'bg-slate-100'}`}>
      {!error ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img 
          src={src} 
          alt={alt} 
          className="object-cover w-full h-full" 
          onError={() => setError(true)} 
        />
      ) : (
        <span className="text-xs text-slate-400 font-medium px-4 text-center">
          Media placeholder: {fallbackText}
        </span>
      )}
    </div>
  );
}
