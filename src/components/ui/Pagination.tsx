import { Button } from './Button';

export function Pagination({
  page,
  count,
  pageSize = 20,
  visibleCount,
  hasNext,
  pending,
  onPageChange,
  label = 'Pagination',
}: {
  page: number;
  count: number;
  pageSize?: number;
  visibleCount: number;
  hasNext: boolean;
  pending?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
      <span role="status">
        {pending
          ? 'Loading…'
          : `Showing ${visibleCount ? (page - 1) * pageSize + 1 : 0}–${visibleCount ? (page - 1) * pageSize + visibleCount : 0} of ${count}`}
      </span>
      <nav aria-label={label} className="flex items-center gap-3">
        <Button
          disabled={page === 1 || pending}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          disabled={!hasNext || pending}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </nav>
    </footer>
  );
}
