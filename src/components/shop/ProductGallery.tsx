'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
        <Image src={images[active]} alt={name} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain p-8" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:w-20 lg:flex-col">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'relative aspect-square w-16 shrink-0 overflow-hidden rounded-md bg-white ring-1 transition lg:w-full',
                index === active ? 'ring-2 ring-slate-950' : 'ring-slate-200 hover:ring-slate-400',
              )}
              aria-label={`Show photo ${index + 1}`}
            >
              <Image src={image} alt="" fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
