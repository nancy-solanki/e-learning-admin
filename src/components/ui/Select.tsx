import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDownIcon, CheckIcon } from '../icons/AdminIcons';

type Option = { value: string; label: string; description?: string };
export function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  leading,
  title,
  id: controlId,
  describedBy,
  invalid,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  leading?: ReactNode;
  title?: string;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selected);
  useEffect(() => {
    if (!open) return;
    const menu = list.current;
    const button = trigger.current;
    if (!menu || !button) return;
    menu.showPopover();
    const place = () => {
      const rect = button.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 210), window.innerWidth - 24);
      menu.style.width = `${width}px`;
      menu.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      const below = window.innerHeight - rect.bottom - 20;
      const above = rect.top - 20;
      const upwards = below < Math.min(menu.scrollHeight, 260) && above > below;
      menu.style.maxHeight = `${Math.max(60, Math.min(320, upwards ? above : below))}px`;
      menu.style.top = upwards ? 'auto' : `${rect.bottom + 8}px`;
      menu.style.bottom = upwards
        ? `${window.innerHeight - rect.top + 8}px`
        : 'auto';
    };
    place();
    menu.focus();
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      if (menu.matches(':popover-open')) menu.hidePopover();
    };
  }, [open]);
  function choose(index: number) {
    onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      ref={root}
      className={`ui-select ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={controlId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        type="button"
        className="ui-select-trigger ui-input"
        disabled={disabled}
        title={title}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => {
          setActive(selected);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            setActive(selected);
            setOpen(true);
          }
        }}
      >
        <span className="ui-select-value">
          {leading}
          {options[selected]?.label}
        </span>
        <ArrowDownIcon
          aria-hidden="true"
          className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          ref={list}
          id={`${id}-list`}
          role="listbox"
          popover="manual"
          aria-label={label}
          tabIndex={-1}
          aria-activedescendant={`${id}-${active}`}
          className="ui-select-menu"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              trigger.current?.focus();
            } else if (
              ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
            ) {
              event.preventDefault();
              setActive((index) =>
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? options.length - 1
                    : (index +
                        (event.key === 'ArrowDown' ? 1 : -1) +
                        options.length) %
                      options.length,
              );
            } else if (['Enter', ' '].includes(event.key)) {
              event.preventDefault();
              choose(active);
            } else if (event.key.length === 1) {
              const index = options.findIndex((option) =>
                option.label.toLowerCase().startsWith(event.key.toLowerCase()),
              );
              if (index >= 0) setActive(index);
            }
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`ui-select-option ${index === active ? 'is-active' : ''}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span>
                {option.label}
                {option.description && <small>{option.description}</small>}
              </span>
              {option.value === value && (
                <CheckIcon aria-hidden="true" className="h-4 w-4" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
