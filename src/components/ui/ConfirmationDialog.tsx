import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertIcon, CloseIcon } from '../icons/AdminIcons';

type ConfirmationDialogProps = {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  variant?: 'danger' | 'primary';
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

// Mount when confirmation is needed; the caller owns the action and its state.
export function ConfirmationDialog({
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  pendingLabel = 'Working…',
  pending = false,
  error,
  variant = 'danger',
  icon,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const danger = variant === 'danger';

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    cancelRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = buttons[0];
        const last = buttons.at(-1);
        if (!first) {
          event.preventDefault();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[28px] border border-white bg-white p-0 text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
    >
      <div className="relative px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
        <button
          type="button"
          aria-label="Close confirmation"
          disabled={pending}
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
        >
          <CloseIcon aria-hidden="true" className="h-4 w-4" />
        </button>
        <div
          aria-hidden="true"
          className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl ring-8 ${danger ? 'bg-rose-100 text-rose-600 ring-rose-50' : 'bg-violet-100 text-brand ring-violet-50'}`}
        >
          {icon ?? <AlertIcon className="h-6 w-6" />}
        </div>
        <h2 id={titleId} className="text-xl font-bold tracking-tight">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
        {children && <div className="mt-5">{children}</div>}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:px-8">
        <button
          ref={cancelRef}
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          aria-label={pending ? pendingLabel : confirmLabel}
          onClick={onConfirm}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 ${danger ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700 focus-visible:outline-rose-600' : 'bg-brand hover:bg-brand-dark focus-visible:outline-brand'}`}
        >
          {pending && (
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
            />
          )}
          <span role={pending ? 'status' : undefined}>
            {pending ? pendingLabel : confirmLabel}
          </span>
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
