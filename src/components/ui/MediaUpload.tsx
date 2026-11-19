import { useRef, useState } from 'react';
import { Button } from './Button';

export function MediaUpload({
  id,
  name,
  accept,
  file,
  existingUrl,
  previewUrl,
  previewType,
  previewAlt,
  onChange,
  disabled = false,
}: {
  id: string;
  name: string;
  accept: string;
  file: File | null;
  existingUrl?: string | null;
  previewUrl?: string;
  previewType: 'image' | 'video';
  previewAlt: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);
  const hasPreview = Boolean(previewUrl || existingUrl);

  function select(next?: File) {
    if (!next) return;
    onChange(next);
    setReplacing(false);
  }

  return (
    <div>
      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          select(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {(!hasPreview || replacing) && (
        <button
          type="button"
          className="flex min-h-28 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 hover:border-brand focus-visible:outline-brand disabled:opacity-50"
          disabled={disabled}
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!disabled) select(event.dataTransfer.files[0]);
          }}
        >
          Drag and drop your file here, or click to select a file
        </button>
      )}
      {hasPreview && !replacing && (
        <div className="mt-4 flex items-center gap-4">
          {previewType === 'video' ? (
            <video
              className="max-h-64 min-w-0 flex-1 rounded-lg bg-black"
              controls
              preload="metadata"
              src={previewUrl || existingUrl || undefined}
              aria-label={previewAlt}
            />
          ) : (
            <img
              className="max-h-24 max-w-40 rounded-lg object-contain"
              src={previewUrl || existingUrl || undefined}
              alt={previewAlt}
            />
          )}
          <Button onClick={() => setReplacing(true)} disabled={disabled}>
            Re-upload
          </Button>
        </div>
      )}
      {file && replacing && (
        <button
          type="button"
          className="mt-2 text-sm text-slate-500 underline"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setReplacing(false);
          }}
        >
          Cancel re-upload
        </button>
      )}
    </div>
  );
}
