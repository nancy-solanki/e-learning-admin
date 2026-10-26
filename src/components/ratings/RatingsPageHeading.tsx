import type { ReactNode } from 'react';

export function RatingsPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 text-[#202134]">
      <div>
        <p className="font-display text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
          FEEDBACK MODERATION
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
          {title}
          <span className="text-[#7961dc]">.</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </header>
  );
}
