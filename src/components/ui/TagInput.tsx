import { useState } from 'react';
import { Input } from './Input';
export function TagInput({
  id,
  value,
  onChange,
  max = 10,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}) {
  const [text, setText] = useState('');
  function add() {
    const tag = text.trim();
    if (!tag || value.length >= max) return;
    if (!value.some((item) => item.toLowerCase() === tag.toLowerCase()))
      onChange([...value, tag]);
    setText('');
  }
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1 text-sm text-violet-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => onChange(value.filter((item) => item !== tag))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Input
        id={id}
        maxLength={100}
        value={text}
        disabled={value.length >= max}
        placeholder="Add a tag and press Enter"
        onChange={(event) => setText(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
        }}
      />
      <p className="mt-1 text-right text-xs text-slate-400">
        {value.length} / {max} keywords
      </p>
    </div>
  );
}
