import type { ReactNode } from 'react';

export function PageHeading({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 text-slate-900">
      <div>
        {eyebrow && (
          <p className="font-display text-[10px] font-bold uppercase tracking-[1.8px] text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
          {title}
          <span className="text-brand">.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </header>
  );
}
