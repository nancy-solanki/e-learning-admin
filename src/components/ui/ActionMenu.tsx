import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export function ActionMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const gap = 8;
    const top =
      trigger.bottom + menu.height + gap <= window.innerHeight
        ? trigger.bottom + gap
        : Math.max(gap, trigger.top - menu.height - gap);
    const left = Math.max(
      gap,
      Math.min(
        trigger.right - menu.width,
        window.innerWidth - menu.width - gap,
      ),
    );
    setPosition({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
        setHost(null);
      }
    };
    const closeOnViewportChange = () => {
      setOpen(false);
      setHost(null);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            setHost(null);
          } else {
            setHost(triggerRef.current?.closest('dialog') ?? document.body);
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            setOpen(false);
            setHost(null);
            triggerRef.current?.focus();
          }
        }}
        className="shrink-0 rounded-lg p-2 text-lg leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7054d8]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5"
        >
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={menuRef}
            role="group"
            aria-label={`${label} menu`}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                setHost(null);
                triggerRef.current?.focus();
              }
            }}
            onClick={(event) => {
              const target = event.target;
              if (
                !(target instanceof Element) ||
                !target.closest('[data-keep-action-menu-open]')
              ) {
                setOpen(false);
                setHost(null);
              }
            }}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              visibility: position.top ? 'visible' : 'hidden',
            }}
            className="z-[100] grid w-52 max-w-[calc(100vw-1rem)] gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {children}
          </div>,
          host,
        )}
    </>
  );
}
