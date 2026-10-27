export function ListSkeleton({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="space-y-4 rounded-xl bg-white p-6">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((row) => (
        <div key={row} aria-hidden="true" className="flex animate-pulse gap-4">
          <div className="size-10 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
