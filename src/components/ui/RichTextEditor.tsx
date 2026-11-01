import { useLayoutEffect, useRef } from 'react';

const commands = [
  ['bold', 'Bold', 'B'],
  ['italic', 'Italic', 'I'],
  ['underline', 'Underline', 'U'],
  ['strikeThrough', 'Strikethrough', 'S'],
  ['insertUnorderedList', 'Bulleted list', '• List'],
  ['insertOrderedList', 'Numbered list', '1. List'],
  ['justifyLeft', 'Align left', '≡'],
  ['justifyCenter', 'Align center', '☰'],
  ['removeFormat', 'Clear formatting', 'Tx'],
  ['undo', 'Undo', '↶'],
  ['redo', 'Redo', '↷'],
] as const;

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current && ref.current.innerHTML !== value)
      ref.current.innerHTML = value;
  }, [value]);
  return (
    <div className="overflow-hidden rounded-xl border border-[#dfe5ee] bg-white focus-within:border-brand">
      <div
        role="toolbar"
        aria-label={`${label} formatting`}
        className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 p-2"
      >
        {commands.map(([command, title, text]) => (
          <button
            key={command}
            type="button"
            title={title}
            aria-label={title}
            className="min-w-8 rounded px-2 py-1 text-sm text-slate-600 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-brand"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              ref.current?.focus();
              document.execCommand(command);
              onChange(ref.current?.innerHTML ?? '');
            }}
          >
            {text}
          </button>
        ))}
      </div>
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-label={label}
        aria-required="true"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand(
            'insertText',
            false,
            event.clipboardData.getData('text/plain'),
          );
        }}
        className="min-h-36 p-4 text-sm text-slate-700 outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
    </div>
  );
}
