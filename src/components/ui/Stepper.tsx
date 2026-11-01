export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <nav
      aria-label="Course creation progress"
      className="mb-8 overflow-x-auto border-b border-slate-100 pb-6"
    >
      <ol className="flex min-w-[480px] gap-2">
        {steps.map((label, index) => {
          const complete = index < current || current === steps.length - 1;
          return (
            <li
              key={label}
              aria-current={index === current ? 'step' : undefined}
              className="flex flex-1 items-center gap-2.5"
            >
              <span
                aria-hidden="true"
                className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${complete ? 'bg-emerald-50 text-emerald-600' : index === current ? 'bg-brand text-white shadow-md shadow-violet-200' : 'bg-slate-100 text-slate-400'}`}
              >
                {complete ? '✓' : String(index + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-xs font-semibold ${index === current ? 'text-brand' : complete ? 'text-slate-600' : 'text-slate-400'}`}
              >
                {label}
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-1 hidden h-px flex-1 bg-slate-200 sm:block"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
