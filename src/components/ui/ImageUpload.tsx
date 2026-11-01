import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
export function ImageUpload({
  id,
  value,
  existingUrl,
  onChange,
  onError,
}: {
  id: string;
  value: File | null;
  existingUrl?: string;
  onChange: (value: File | null) => void;
  onError: (message: string) => void;
}) {
  const [replacing, setReplacing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!value) {
      if (preview.current) preview.current.src = existingUrl ?? '';
      return;
    }
    const url = URL.createObjectURL(value);
    if (preview.current) preview.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [value, existingUrl]);
  function select(file?: File) {
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      onError('Choose a PNG, JPEG, or WebP image no larger than 5 MiB.');
      return;
    }
    onChange(file);
    setReplacing(false);
    onError('');
  }
  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => {
          select(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {((!value && !existingUrl) || replacing) && (
        <>
          <button
            type="button"
            className="flex min-h-28 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 hover:border-brand focus-visible:outline-brand"
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              select(event.dataTransfer.files[0]);
            }}
          >
            Drag and drop your thumbnail here, or click to select an image
          </button>
          <p className="mt-2 text-xs text-slate-400">
            PNG, JPEG or WebP · Maximum 5 MiB
          </p>
        </>
      )}
      {(value || existingUrl) && (
        <div className="mt-4 flex items-center gap-4">
          <img
            ref={preview}
            alt="Course thumbnail preview"
            className="h-24 w-40 rounded-lg object-cover"
          />
          <Button onClick={() => setReplacing(true)} disabled={replacing}>
            Re-upload
          </Button>
        </div>
      )}
    </div>
  );
}
