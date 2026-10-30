'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useFormState } from 'react-dom';
import { ImagePlus, X } from 'lucide-react';
import { createProduct, type ProductFormState } from '@/app/admin/actions';
import { STORE_CATEGORIES } from '@/config/store';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextField } from '@/components/admin/TextField';
import { MAX_UPLOAD_BYTES, resizeImage } from '@/lib/resize-image';

const MAX_IMAGES = 6;
const specFields = [
  { name: 'voltage', label: 'Voltage', placeholder: 'e.g. 3.7V' },
  { name: 'current', label: 'Current', placeholder: 'e.g. 2A max' },
  { name: 'capacity', label: 'Capacity / Power', placeholder: 'e.g. 2600mAh' },
  { name: 'chemistry', label: 'Chemistry / Type', placeholder: 'e.g. Li-ion 18650' },
  { name: 'connector', label: 'Connector', placeholder: 'e.g. JST 2-pin' },
];

export function ProductForm({ uploadsEnabled }: { uploadsEnabled: boolean }) {
  const [state, formAction] = useFormState<ProductFormState, FormData>(createProduct, {});
  const [pending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [localError, setLocalError] = useState('');
  const [preparing, setPreparing] = useState(false);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...next].slice(0, MAX_IMAGES));
  };

  const removePhoto = (index: number) => {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError('');
    const formData = new FormData(event.currentTarget);
    formData.delete('images');
    setPreparing(true);
    const resized = await Promise.all(photos.map((photo) => resizeImage(photo.file)));
    setPreparing(false);
    const totalBytes = resized.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_UPLOAD_BYTES) {
      setLocalError('Photos are too large together. Remove one or two and try again.');
      return;
    }
    resized.forEach((file) => formData.append('images', file));
    startTransition(() => formAction(formData));
  };

  const error = localError || state.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Basics</h2>
        <TextField label="Product name" name="name" required minLength={3} maxLength={120} placeholder="e.g. 18650 Li-ion Battery 2600mAh" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              id="category"
              name="category"
              required
              defaultValue=""
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
            >
              <option value="" disabled>Choose...</option>
              {STORE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <TextField label="Price (Rs.)" name="price" required inputMode="numeric" pattern="[0-9]+" placeholder="e.g. 450" />
          <TextField label="Stock (units)" name="stock" inputMode="numeric" pattern="[0-9]*" placeholder="Leave empty if not tracked" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <TextField label="Weight (grams)" name="weight" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 450" />
            <p className="mt-1 text-xs text-slate-500">One unit with its box. 1 kg = 1000 g. Used for the Trax delivery charge.</p>
          </div>
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
            placeholder="What it is, what it's used for, anything the customer should confirm."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="featured" className="h-4 w-4 accent-slate-950" />
          Show in &quot;Best sellers&quot; on the home page
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Specifications (optional)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {specFields.map((spec) => (
            <TextField key={spec.name} label={spec.label} name={spec.name} placeholder={spec.placeholder} maxLength={200} />
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Photos</h2>
        {uploadsEnabled ? (
          <>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {photos.map((photo, index) => (
                <div key={photo.url} className="relative aspect-square overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview of an unsaved file */}
                  <img src={photo.url} alt="" className="h-full w-full object-contain p-1" />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-semibold text-white">Main</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-1 top-1 rounded-full bg-white p-0.5 text-slate-600 shadow hover:text-red-600"
                    aria-label="Remove photo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_IMAGES && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-slate-300 text-xs text-slate-500 hover:border-slate-950 hover:text-slate-950">
                  <ImagePlus className="h-5 w-5" />
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500">Up to {MAX_IMAGES} photos. The first one is the main photo.</p>
          </>
        ) : (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Photo upload is off. In Vercel, open <strong>Storage</strong>, create a <strong>Blob</strong> store, connect
            it to this project, then redeploy. Until then, new products use a placeholder image.
          </p>
        )}
      </section>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3">
        <ButtonLink href="/admin" variant="outline">Cancel</ButtonLink>
        <Button type="submit" disabled={pending || preparing}>
          {pending || preparing ? 'Saving...' : 'Add product'}
        </Button>
      </div>
    </form>
  );
}
