import { useEffect, useId, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../icons/AdminIcons';
import { Button } from './Button';

/** Mount when open; native dialog provides modal focus containment and Escape. */
export function Drawer({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
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
      aria-describedby={description ? descriptionId : undefined}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-[440px] border-0 bg-white p-0 text-[#202134] shadow-xl backdrop:bg-[#20203266] backdrop:backdrop-blur-[2px]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[#eceaf2] p-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-2 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <Button
            aria-label="Close drawer"
            className="shrink-0 !p-2"
            onClick={onClose}
          >
            <CloseIcon className="size-5" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <footer className="flex justify-between gap-3 border-t border-[#eceaf2] bg-white p-6">
            {footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
