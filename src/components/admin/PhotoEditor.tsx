'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { ImagePlus, Star, X } from 'lucide-react';
import { updateProductPhotos } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { MAX_UPLOAD_BYTES, resizeImage } from '@/lib/resize-image';

const MAX_IMAGES = 6;

type Photo = { kind: 'saved'; url: string } | { kind: 'new'; file: File; url: string };

/** Change an existing product's photos: add (camera or gallery), remove, and pick the main one. */
export function PhotoEditor({
  productId,
  images,
  uploadsEnabled,
  onDone,
}: {
  productId: string;
  images: string[];
  uploadsEnabled: boolean;
  onDone: (saved: boolean) => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() => images.map((url) => ({ kind: 'saved', url })));
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // Free the local previews when the editor closes.
  useEffect(
    () => () => photos.forEach((p) => p.kind === 'new' && URL.revokeObjectURL(p.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on unmount
    [],
  );

  const add = (files: FileList | null) => {
    if (!files) return;
    const next: Photo[] = Array.from(files).map((file) => ({ kind: 'new', file, url: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...next].slice(0, Math.max(MAX_IMAGES, images.length)));
  };
  const remove = (index: number) => setPhotos((current) => current.filter((_, i) => i !== index));
  const makeMain = (index: number) => setPhotos((current) => [current[index], ...current.filter((_, i) => i !== index)]);

  const save = () =>
    startTransition(async () => {
      setError('');
      if (photos.length === 0) {
        setError('Keep at least one photo.');
        return;
      }
      const formData = new FormData();
      formData.set('id', productId);
      const files: File[] = [];
      for (const photo of photos) {
        if (photo.kind === 'saved') {
          formData.append('order', `url:${photo.url}`);
        } else {
          formData.append('order', `new:${files.length}`);
          files.push(await resizeImage(photo.file));
        }
      }
      if (files.reduce((sum, f) => sum + f.size, 0) > MAX_UPLOAD_BYTES) {
        setError('New photos are too large together. Add fewer at a time.');
        return;
      }
      files.forEach((file) => formData.append('images', file));
      const result = await updateProductPhotos(formData);
      if (result.ok) onDone(true);
      else setError(result.message);
    });

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((photo, index) => (
          <div key={photo.url} className="relative aspect-square overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
            {photo.kind === 'saved' ? (
              // Small resized copies keep this light on mobile data.
              <Image src={photo.url} alt="" fill sizes="120px" className="object-contain p-1" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file
              <img src={photo.url} alt="" className="h-full w-full object-contain p-1" />
            )}
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(index)}
                className="absolute left-1 top-1 rounded-full bg-white p-1 text-slate-600 shadow hover:text-amber-600"
                aria-label="Make main photo"
                title="Make main photo"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute right-1 top-1 rounded-full bg-white p-1 text-slate-600 shadow hover:text-red-600"
              aria-label="Remove photo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {uploadsEnabled && photos.length < Math.max(MAX_IMAGES, images.length) && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 bg-white text-xs text-slate-500 hover:border-slate-950 hover:text-slate-950">
            <ImagePlus className="h-5 w-5" />
            Add photo
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                add(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
      {!uploadsEnabled && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-xs text-amber-900">
          Adding photos is off until Vercel Blob storage is connected (Vercel → Storage → Blob → connect to this project, then redeploy).
          You can still remove photos or change the main one.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Up to {MAX_IMAGES} photos. Tap the star to make a photo the main one.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onDone(false)} disabled={pending}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? 'Saving...' : 'Save photos'}
          </Button>
        </div>
      </div>
    </div>
  );
}
