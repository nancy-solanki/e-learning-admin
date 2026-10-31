import './pagination.css';

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
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = Math.max(2, Math.min(page - 1, totalPages - 3));
  const end = Math.min(totalPages - 1, Math.max(page + 1, 4));
  const pages: (number | string)[] = [1];
  if (start > 2) pages.push('before');
  for (let current = start; current <= end; current++) pages.push(current);
  if (end < totalPages - 1) pages.push('after');
  if (totalPages > 1) pages.push(totalPages);
  const from = visibleCount ? (page - 1) * pageSize + 1 : 0;
  const to = visibleCount
    ? Math.min((page - 1) * pageSize + visibleCount, count)
    : 0;
  return (
    <footer className="app-pagination" aria-busy={pending}>
      <p className="app-pagination-summary" role="status" aria-live="polite">
        {pending ? (
          'Loading…'
        ) : (
          <>
            <strong>
              {from.toLocaleString()}–{to.toLocaleString()}
            </strong>{' '}
            of <strong>{count.toLocaleString()}</strong> results
          </>
        )}
      </p>
      <nav aria-label={label} className="app-pagination-controls">
        <button
          type="button"
          className="app-pagination-arrow"
          aria-label="Previous page"
          disabled={page <= 1 || pending}
          onClick={() => onPageChange(page - 1)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m12 5-5 5 5 5" />
          </svg>
          <span>Previous</span>
        </button>
        <div className="app-pagination-pages">
          {pages.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                disabled={pending}
                onClick={() => {
                  if (item !== page) onPageChange(item);
                }}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                className="app-pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ),
          )}
        </div>
        <span className="app-pagination-mobile">
          Page <strong>{page}</strong> of {totalPages}
        </span>
        <button
          type="button"
          className="app-pagination-arrow"
          aria-label="Next page"
          disabled={!hasNext || pending}
          onClick={() => onPageChange(page + 1)}
        >
          <span>Next</span>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m8 5 5 5-5 5" />
          </svg>
        </button>
      </nav>
    </footer>
  );
}
