import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../icons/AdminIcons';
import { Button } from './Button';

/** Mount only when open. Restores focus to the trigger when dismissed. */
export function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-slate-100 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        <Button className="!p-2" aria-label="Close dialog" onClick={onClose}>
          <CloseIcon className="size-5" />
        </Button>
      </header>
      <div className="p-6">{children}</div>
      {footer && (
        <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
