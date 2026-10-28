import { useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../../api/errors';
import type {
  Rating,
  RatingFilters,
  RatingRelation,
} from '../../api/services/ratings';
import { CloseIcon, StarIcon } from '../../components/icons/AdminIcons';
import { RatingEditModal } from '../../components/ratings/RatingEditModal';
import { RatingsPageHeading } from '../../components/ratings/RatingsPageHeading';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RatingFiltersDrawer } from '../../components/ratings/RatingFiltersDrawer';
import {
  activeRatingFilterCount,
  defaultRatingFilters,
  type RatingFilterValues,
} from '../../components/ratings/ratingFilters';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRating, useRatingActions, useRatings } from '../../state/ratings';

const pageSize = 20;

function relationLabel(value: RatingRelation): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return (
    value.title ||
    value.full_name ||
    [value.first_name, value.last_name].filter(Boolean).join(' ') ||
    value.username ||
    value.email ||
    value.id ||
    '—'
  );
}

function courseLabel(rating: Rating) {
  return rating.course_title || relationLabel(rating.course);
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function RatingDetails({
  id,
  onClose,
  onEdit,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onEdit: (rating: Rating) => void;
  onDelete: (rating: Rating) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useRating(id);
  const rating = query.data;

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="rating-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-auto rounded-3xl border border-slate-100 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Rating details
          </p>
          <h2 id="rating-details-title" className="mt-2 text-xl font-bold">
            Course review
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>
      {query.isLoading ? (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Loading rating…
        </p>
      ) : query.isError ? (
        <div className="py-8 text-center">
          <p role="alert" className="text-sm text-rose-700">
            {apiErrorMessage(
              query.error,
              'Unable to load this rating. Please try again.',
            )}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      ) : rating ? (
        <>
          <dl className="grid gap-5 text-sm">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Course</dt>
              <dd className="mt-1 font-semibold">{courseLabel(rating)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Reviewer</dt>
              <dd className="mt-1">{relationLabel(rating.user)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Rating</dt>
              <dd className="mt-1">{rating.rating}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Comment</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {rating.comment || 'No comment'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">
                Instructor response
              </dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {rating.response || 'No response'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500">Date</dt>
              <dd className="mt-1">{dateLabel(rating.created_at)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button onClick={() => onDelete(rating)}>Delete rating</Button>
            <Button variant="primary" onClick={() => onEdit(rating)}>
              Edit rating
            </Button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}

export default function RatingsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [filters, setFilters] =
    useState<RatingFilterValues>(defaultRatingFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingRating, setEditingRating] = useState<Rating | null>(null);
  const [deletingRating, setDeletingRating] = useState<Rating | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [notice, setNotice] = useState('');
  const { deleteRating } = useRatingActions();

  const queryFilters: RatingFilters = {
    page,
    ...(filters.course ? { course: filters.course } : {}),
    ...(filters.user ? { user: filters.user } : {}),
    ...(filters.rating ? { rating: filters.rating } : {}),
    ...(filters.rating_min ? { rating_min: filters.rating_min } : {}),
    ...(filters.rating_max ? { rating_max: filters.rating_max } : {}),
    ...(filters.created_at_after
      ? { created_at_after: filters.created_at_after }
      : {}),
    ...(filters.created_at_before
      ? { created_at_before: filters.created_at_before }
      : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ordering: filters.ordering,
  };
  const query = useRatings(queryFilters);
  const data = query.data;
  const filterCount = activeRatingFilterCount(filters);
  const hasFilters = Boolean(search.trim() || filterCount);

  function clearFilters() {
    setSearch('');
    setFilters(defaultRatingFilters);
    setPage(1);
  }

  async function confirmDelete() {
    if (!deletingRating || deletePending) return;
    setDeletePending(true);
    setDeleteError('');
    try {
      await deleteRating(deletingRating.id);
      setNotice('Rating deleted successfully.');
      setDeletingRating(null);
      if (data?.results.length === 1 && page > 1)
        setPage((current) => current - 1);
    } catch (failure) {
      setDeleteError(
        apiErrorMessage(
          failure,
          'Unable to delete this rating. Please try again.',
        ),
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <section className="text-slate-900">
      <RatingsPageHeading
        title="Ratings"
        description="Review learner ratings, comments, and instructor responses."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <label className="grid flex-1 gap-1.5 text-xs font-semibold text-slate-600">
          Search ratings
          <Input
            aria-label="Search ratings"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search comments or responses"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
            {filterCount > 0 && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                {filterCount}
              </span>
            )}
          </Button>
          <Button onClick={clearFilters} disabled={!hasFilters}>
            Clear filters
          </Button>
        </div>
      </div>

      {filtersOpen && (
        <RatingFiltersDrawer
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setPage(1);
            setFiltersOpen(false);
          }}
        />
      )}

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
            className="font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Ratings</h2>
          <span className="text-sm text-slate-500">
            {data ? `${data.count} total` : '—'}
          </span>
        </div>
        {query.isLoading ? (
          <p role="status" className="p-10 text-center text-sm text-slate-500">
            Loading ratings…
          </p>
        ) : query.isError ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-rose-700">
              {apiErrorMessage(
                query.error,
                'Unable to load ratings. Please try again.',
              )}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : !data?.results.length ? (
          <div className="px-5 py-14 text-center">
            <StarIcon className="mx-auto h-10 w-10 text-violet-300" />
            <h3 className="mt-3 font-semibold">No ratings found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the filters or search terms.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Rating
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Course
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Reviewer
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Comment
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Instructor response
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Date
                    </th>
                    <th
                      scope="col"
                      className="relative px-5 py-3 font-semibold"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.results.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {item.rating}
                      </td>
                      <td className="max-w-48 px-5 py-4">
                        <span className="break-words">{courseLabel(item)}</span>
                      </td>
                      <td className="max-w-40 px-5 py-4">
                        <span className="break-words">
                          {relationLabel(item.user)}
                        </span>
                      </td>
                      <td className="max-w-64 px-5 py-4">
                        <p className="whitespace-pre-wrap break-words">
                          {item.comment || '—'}
                        </p>
                      </td>
                      <td className="max-w-64 px-5 py-4">
                        <p className="whitespace-pre-wrap break-words">
                          {item.response || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {dateLabel(item.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className="font-semibold text-brand hover:underline"
                            aria-label={`View rating by ${relationLabel(item.user)}`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRating(item)}
                            className="font-semibold text-brand hover:underline"
                            aria-label={`Edit rating by ${relationLabel(item.user)}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setDeletingRating(item);
                            }}
                            className="font-semibold text-rose-700 hover:underline"
                            aria-label={`Delete rating by ${relationLabel(item.user)}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              <span>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, data.count)} of {data.count}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!data.previous || query.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!data.next || query.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      {selectedId && (
        <RatingDetails
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onEdit={(rating) => {
            setSelectedId(null);
            setEditingRating(rating);
          }}
          onDelete={(rating) => {
            setSelectedId(null);
            setDeleteError('');
            setDeletingRating(rating);
          }}
        />
      )}
      {editingRating && (
        <RatingEditModal
          rating={editingRating}
          onClose={() => setEditingRating(null)}
          onSaved={() => {
            setEditingRating(null);
            setNotice('Rating updated successfully.');
          }}
        />
      )}
      {deletingRating && (
        <ConfirmationDialog
          title="Delete rating?"
          description={`This rating for “${deletingRating.course_title || courseLabel(deletingRating)}” will be soft-deleted and removed from the management list.`}
          confirmLabel="Delete rating"
          pendingLabel="Deleting…"
          pending={deletePending}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            if (deletePending) return;
            setDeletingRating(null);
            setDeleteError('');
          }}
        />
      )}
    </section>
  );
}
