import { useRef, useState } from 'react';

export function FileUpload({
  id,
  name,
  accept,
  actionLabel,
  emptyLabel,
  hint,
  currentFileLabel,
  file,
  onChange,
  disabled = false,
}: {
  id: string;
  name: string;
  accept: string;
  actionLabel: string;
  emptyLabel: string;
  hint: string;
  currentFileLabel?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function choose(next?: File) {
    if (next) onChange(next);
  }

  return (
    <div
      className={`ui-file-dropzone ${dragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDragOver={(event) => event.preventDefault()}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) choose(event.dataTransfer.files[0]);
      }}
    >
      <input
        ref={input}
        id={id}
        name={name}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <span className="ui-file-upload-icon" aria-hidden="true">
        ↑
      </span>
      <button
        type="button"
        className="ui-file-upload-action"
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {file || currentFileLabel ? actionLabel : 'Click to upload'}
        <span> or drag and drop</span>
      </button>
      <p className="ui-file-upload-name" title={file?.name}>
        {file?.name ?? currentFileLabel ?? emptyLabel}
      </p>
      {!file && <p className="ui-file-upload-hint">{hint}</p>}
      {file && (
        <button
          type="button"
          className="ui-file-upload-remove"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label={`Remove ${file.name}`}
        >
          Remove selected file
        </button>
      )}
    </div>
  );
}
