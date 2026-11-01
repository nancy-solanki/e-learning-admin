import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDownIcon, CheckIcon } from '../icons/AdminIcons';
import { Input } from './Input';

type Option = { value: string; label: string };
export function MultiSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options',
  disabled = false,
  maxSelected,
  describedBy,
}: {
  id: string;
  label: string;
  options: readonly Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxSelected?: number;
  describedBy?: string;
}) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const activeIndex = Math.min(active, filtered.length - 1);
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, listId]);
  function choose(option: Option) {
    if (value.includes(option.value))
      onChange(value.filter((item) => item !== option.value));
    else if (maxSelected === 1) {
      onChange([option.value]);
      setOpen(false);
      trigger.current?.focus();
    } else if (!maxSelected || value.length < maxSelected)
      onChange([...value, option.value]);
  }
  return (
    <div
      ref={root}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className="ui-input flex items-center justify-between gap-3 text-left"
        onClick={() => {
          setQuery('');
          setActive(0);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={value.length ? 'text-slate-700' : 'text-slate-400'}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        <ArrowDownIcon
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {value.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-brand"
            >
              <span className="truncate">
                {options.find((option) => option.value === item)?.label ??
                  'Unavailable option'}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${options.find((option) => option.value === item)?.label ?? item}`}
                className="rounded px-1 hover:bg-violet-200 focus-visible:outline-2"
                onClick={() =>
                  onChange(value.filter((entry) => entry !== item))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {open && !disabled && (
        <div className="absolute inset-x-0 top-[54px] z-30 overflow-hidden rounded-xl border border-[#e5def3] bg-white shadow-xl shadow-violet-950/10">
          <div className="border-b border-slate-100 p-2">
            <Input
              ref={search}
              role="combobox"
              aria-label={`Search ${label.toLowerCase()}`}
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
              }
              placeholder={`Search ${label.toLowerCase()}…`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((index) =>
                    Math.max(
                      0,
                      Math.min(
                        filtered.length - 1,
                        index + (event.key === 'ArrowDown' ? 1 : -1),
                      ),
                    ),
                  );
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (filtered[activeIndex]) choose(filtered[activeIndex]);
                }
              }}
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            aria-multiselectable={maxSelected !== 1}
            className="max-h-56 overflow-y-auto overscroll-contain p-1.5"
          >
            {filtered.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={value.includes(option.value)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm ${index === activeIndex ? 'bg-violet-50 text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${value.includes(option.value) ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}
                >
                  {value.includes(option.value) && (
                    <CheckIcon className="size-3" />
                  )}
                </span>
                {option.label}
              </div>
            ))}
          </div>
          {!filtered.length && (
            <p role="status" className="p-5 text-center text-sm text-slate-400">
              No matching options.
            </p>
          )}
          <div className="flex justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
            <span>
              {maxSelected === 1
                ? 'Choose one option'
                : `${value.length} selected`}
            </span>
            <button
              type="button"
              className="font-semibold text-brand"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
