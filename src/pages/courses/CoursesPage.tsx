import { CourseImage } from '../../components/courses/CourseImage';
import { AsyncSelect } from '../../components/ui/AsyncSelect';
import {
  listCategoryOptions,
  listInstructorOptions,
} from '../../api/services/options';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BookIcon, CloseIcon } from '../../components/icons/AdminIcons';
import { Button } from '../../components/ui/Button';
import { StatusModerationDialog } from '../../components/ui/StatusModerationDialog';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { OrderingSelect } from '../../components/ui/OrderingSelect';
import { Field, Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../state/profile';
import { apiErrorMessage } from '../../api/errors';
import { isAdmin } from '../../lib/permissions';
import { queryClient } from '../../state/queryClient';
import {
  getAdminCourse,
  listAdminCourses,
  patchAdminCourse,
  type AdminCourse,
  type AdminCoursePage,
  type AdminCourseFilters,
  type CourseStatus,
} from '../../api/services/courses';

const statuses: CourseStatus[] = [
  'published',
  'in-review',
  'approved',
  'draft',
  'rejected',
];
function price(course: AdminCourse) {
  return course.is_free ? 'Free' : course.price.toLocaleString();
}
function date(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}
function statusLabel(status: CourseStatus) {
  return status === 'in-review'
    ? 'In Review'
    : status[0].toUpperCase() + status.slice(1);
}
function CourseDialog({
  course,
  instructorName,
  categoryNames,
  onChangeStatus,
  onClose,
}: {
  course: AdminCourse;
  instructorName: string;
  categoryNames: string[];
  onChangeStatus: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="course-dialog-title"
      className="fixed inset-0 m-auto max-h-[85vh] w-[min(640px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-6 text-[#202134] backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 id="course-dialog-title" className="text-xl font-bold">
          {course.title}
        </h2>
        <button aria-label="Close dialog" onClick={onClose}>
          <CloseIcon className="size-5" />
        </button>
      </div>
      <CourseImage title={course.title} className="mb-5 rounded-xl" />
      <p className="mb-5 whitespace-pre-wrap">
        {course.long_description || course.short_description}
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ['Status', statusLabel(course.status)],
          ['Price', price(course)],
          ['Instructor', instructorName],
          ['Categories', categoryNames.join(', ') || 'Category unavailable'],
          ['Students', course.student_count],
          ['Articles', course.total_articles],
          ['Total hours', course.total_hours],
          ['Learning points', course.learn_description_points],
          ['Requirements', course.requirements],
          ['Best seller', course.is_best_seller ? 'Yes' : 'No'],
          ['Rejection reason', course.reject_reason],
          ['Created', date(course.created_at)],
          ['Updated', date(course.updated_at)],
          ['Deleted', date(course.deleted_at)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
              {value ?? '—'}
            </dd>
          </div>
        ))}
      </dl>
      {!course.deleted_at && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <Button variant="primary" onClick={onChangeStatus}>
            Change status
          </Button>
        </div>
      )}
    </dialog>
  );
}

function CourseFilters({
  filters,
  ordering,
  onApply,
  onClose,
}: {
  filters: AdminCourseFilters;
  ordering: string;
  onApply: (filters: AdminCourseFilters, ordering: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    ),
  );
  const [draftOrdering, setDraftOrdering] = useState(ordering);
  const update = (name: string, value: string) =>
    setDraft((current) => ({ ...current, [name]: value }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(draft)) {
      const text = value.trim();
      if (!text) continue;
      next[key] =
        key === 'price_min' || key === 'price_max'
          ? Number(text)
          : key === 'is_free' || key === 'is_best_seller'
            ? text === 'true'
            : text;
    }
    onApply(next as AdminCourseFilters, draftOrdering);
  }
  return (
    <Drawer
      title="Filter courses"
      description="Narrow your course library to what you need."
      onClose={onClose}
      footer={
        <>
          <Button
            onClick={() => {
              setDraft({});
              setDraftOrdering('');
            }}
          >
            Reset filters
          </Button>
          <Button variant="primary" type="submit" form="course-filters">
            Apply filters
          </Button>
        </>
      }
    >
      <form id="course-filters" onSubmit={submit} className="grid gap-5">
        <Field label="Status" htmlFor="course-status">
          <Select
            id="course-status"
            label="Status"
            value={draft.status ?? ''}
            onChange={(value) => update('status', value)}
            options={[
              { value: '', label: 'All statuses' },
              ...statuses.map((value) => ({
                value,
                label:
                  value === 'in-review'
                    ? 'In review'
                    : value[0].toUpperCase() + value.slice(1),
              })),
            ]}
          />
        </Field>
        <Field label="Category" htmlFor="course-category">
          <AsyncSelect
            id="course-category"
            label="Categories"
            allLabel="All categories"
            value={draft.category ?? ''}
            onChange={(value) =>
              setDraft((current) => {
                return { ...current, category: value };
              })
            }
            queryKey={['course-filter-options', 'categories']}
            loadOptions={listCategoryOptions}
          />
        </Field>
        <Field label="Instructor" htmlFor="course-instructor">
          <AsyncSelect
            id="course-instructor"
            label="Instructors"
            allLabel="All instructors"
            value={draft.instructor ?? ''}
            onChange={(value) => update('instructor', value)}
            queryKey={['course-filter-options', 'instructors']}
            loadOptions={listInstructorOptions}
          />
        </Field>
        <OrderingSelect
          id="course-ordering"
          value={draftOrdering}
          fields={['title', 'price', 'created_at', 'updated_at']}
          onChange={setDraftOrdering}
        />
        <div className="grid grid-cols-2 gap-3">
          {(['price_min', 'price_max'] as const).map((name) => (
            <Field
              key={name}
              label={name === 'price_min' ? 'Minimum price' : 'Maximum price'}
              htmlFor={`course-${name}`}
            >
              <Input
                id={`course-${name}`}
                type="number"
                step="any"
                value={draft[name] ?? ''}
                onChange={(event) => update(name, event.target.value)}
              />
            </Field>
          ))}
        </div>
        {(
          [
            ['is_free', 'Free courses'],
            ['is_best_seller', 'Best sellers'],
          ] as const
        ).map(([name, label]) => (
          <Field key={name} label={label} htmlFor={`course-${name}`}>
            <Select
              id={`course-${name}`}
              label={label}
              value={draft[name] ?? ''}
              onChange={(value) => update(name, value)}
              options={[
                { value: '', label: 'All courses' },
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
            />
          </Field>
        ))}
      </form>
    </Drawer>
  );
}

export default function CoursesPage() {
  const { data: user, isPending: profilePending } = useCurrentUser();
  const allowed = isAdmin(user ?? null);
  const [params, setParams] = useSearchParams();
  const filters: AdminCourseFilters = {};
  const status = params.get('status');
  if (statuses.includes(status as CourseStatus))
    filters.status = status as CourseStatus;
  for (const key of ['category', 'instructor'] as const) {
    const value = params.get(key);
    if (value) filters[key] = value;
  }
  for (const key of ['price_min', 'price_max'] as const) {
    const value = params.get(key);
    if (value !== null && value !== '' && Number.isFinite(Number(value)))
      filters[key] = Number(value);
  }
  for (const key of ['is_free', 'is_best_seller'] as const) {
    const value = params.get(key);
    if (value === 'true' || value === 'false') filters[key] = value === 'true';
  }
  const pageValue = params.get('page');
  const initialPage: number | 'last' =
    pageValue === 'last'
      ? 'last'
      : pageValue && /^[1-9]\d*$/.test(pageValue)
        ? Number(pageValue)
        : 1;
  function setFilters(next: AdminCourseFilters, nextOrdering: string) {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      for (const key of [
        'status',
        'category',
        'category_slug',
        'tag',
        'tag_slug',
        'instructor',
        'price_min',
        'price_max',
        'is_free',
        'is_best_seller',
        'ordering',
      ]) {
        updated.delete(key);
      }
      for (const [key, value] of Object.entries(next)) {
        if (value !== undefined && value !== null && value !== '') {
          updated.set(key, String(value));
        }
      }
      if (nextOrdering) updated.set('ordering', nextOrdering);
      if (
        Object.keys(next).length ||
        updated.has('search') ||
        updated.has('ordering')
      ) {
        updated.set('page', '1');
      } else {
        updated.delete('page');
      }
      return updated;
    });
  }
  function clearFilters() {
    setSearchInput('');
    setOrdering('');
    setParams({});
  }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(
    () => params.get('search') ?? '',
  );
  const [ordering, setOrdering] = useState(() => params.get('ordering') ?? '');
  const activeFilterCount = Object.keys(filters).length + (ordering ? 1 : 0);
  useEffect(() => {
    const nextSearch = params.get('search') ?? '';
    const nextOrdering = params.get('ordering') ?? '';
    if (nextSearch !== searchInput) setSearchInput(nextSearch);
    if (nextOrdering !== ordering) setOrdering(nextOrdering);
  }, [params, searchInput, ordering]);
  const search = useDebouncedValue(searchInput.trim());
  const [selected, setSelected] = useState<AdminCourse | null>(null);
  const [moderating, setModerating] = useState<AdminCourse | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const detailQuery = useQuery({
    queryKey: ['admin-course', selected?.id],
    queryFn: () => getAdminCourse(selected!.id),
    enabled: allowed && Boolean(selected),
  });
  const categoryOptions = useQuery({
    queryKey: ['course-filter-options', 'categories'],
    queryFn: ({ signal }) => listCategoryOptions(signal),
    enabled: allowed,
  });
  const instructorOptions = useQuery({
    queryKey: ['course-filter-options', 'instructors'],
    queryFn: ({ signal }) => listInstructorOptions(signal),
    enabled: allowed,
  });
  const updateMutation = useMutation({
    mutationFn: ({
      status,
      reason,
    }: {
      status: CourseStatus;
      reason: string;
    }) => patchAdminCourse(moderating!.id, status, reason),
    onSuccess: async (course) => {
      queryClient.setQueryData(['admin-course', course.id], course);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
        queryClient.invalidateQueries({
          queryKey: ['admin-course', course.id],
        }),
      ]);
      setModerating(null);
    },
  });
  const query = useInfiniteQuery({
    queryKey: [
      'admin-courses',
      user?.id,
      filters,
      search,
      ordering,
      initialPage,
    ],
    initialPageParam: initialPage,
    getNextPageParam: (lastPage: AdminCoursePage, _pages, lastPageParam) =>
      lastPage.next && lastPageParam !== 'last' ? lastPageParam + 1 : undefined,
    queryFn: ({ signal, pageParam }) =>
      listAdminCourses(
        {
          ...filters,
          search: search || undefined,
          ordering: ordering || undefined,
          page: pageParam,
        },
        signal,
      ),
    enabled: allowed && search === searchInput.trim(),
  });
  const { hasNextPage, isFetching, isError, fetchNextPage } = query;
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (
      !sentinel ||
      !allowed ||
      search !== searchInput.trim() ||
      !hasNextPage ||
      isFetching ||
      isError
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage({ cancelRefetch: false });
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    allowed,
    search,
    searchInput,
    hasNextPage,
    isFetching,
    isError,
    fetchNextPage,
  ]);
  const courses = query.data?.pages.flatMap((page) => page.results) ?? [];
  const count = query.data?.pages[0]?.count ?? 0;
  if (profilePending) return <p role="status">Loading courses…</p>;
  if (!allowed) return <Navigate to="/" replace />;
  return (
    <section className="text-[#202134]">
      <h1 className="mb-2 font-display text-4xl font-extrabold">
        Courses<span className="text-[#7961dc]">.</span>
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Browse all instructors’ courses, including soft-deleted courses.
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#e9e9f0] bg-white p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            aria-label="Search courses"
            placeholder="Search courses or instructors…"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setParams((current) => {
                const next = new URLSearchParams(current);
                if (event.target.value) {
                  next.set('search', event.target.value);
                } else {
                  next.delete('search');
                }
                next.set('page', '1');
                return next;
              });
            }}
          />
        </div>
        <Button
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          Filters{' '}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-violet-100 px-2 text-xs text-violet-700">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {(Object.keys(filters).length > 0 || searchInput || ordering) && (
          <Button onClick={clearFilters}>Clear filters</Button>
        )}
      </div>
      {filtersOpen && (
        <CourseFilters
          key={params.toString()}
          filters={filters}
          ordering={ordering}
          onClose={() => setFiltersOpen(false)}
          onApply={(next, nextOrdering) => {
            setFilters(next, nextOrdering);
            setFiltersOpen(false);
          }}
        />
      )}
      {(query.isPending || search !== searchInput.trim()) && (
        <p role="status">Loading courses…</p>
      )}
      {query.isError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-red-800"
        >
          <p>{apiErrorMessage(query.error, 'Could not load courses.')}</p>
          <Button
            className="mt-3"
            onClick={() =>
              void (query.isFetchNextPageError
                ? query.fetchNextPage()
                : query.refetch())
            }
          >
            Retry
          </Button>
        </div>
      )}
      {query.data && search === searchInput.trim() && (
        <>
          <h2 className="mb-4 text-lg font-bold">Course library · {count}</h2>
          {courses.length === 0 && (
            <p className="py-10 text-center text-slate-500">
              No courses found. Try another search or adjust your filters.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <article
                key={course.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#e6e7ef] bg-white"
              >
                <CourseImage title={course.title} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                    <BookIcon className="mr-auto size-6 text-[#8062bc]" />
                    <span className="rounded bg-violet-50 px-2 py-1">
                      {statusLabel(course.status)}
                    </span>
                    {course.deleted_at && (
                      <span className="rounded bg-red-50 px-2 py-1 text-red-700">
                        Deleted
                      </span>
                    )}
                    {course.is_best_seller && (
                      <span className="rounded bg-amber-50 px-2 py-1">
                        Best seller
                      </span>
                    )}
                  </div>
                  <h3 className="mb-2 text-lg font-bold">
                    <button
                      className="text-left hover:text-[#7054d8]"
                      onClick={() => setSelected(course)}
                    >
                      {course.title}
                    </button>
                  </h3>
                  <p className="mb-4 line-clamp-3 text-sm text-slate-500">
                    {course.short_description}
                  </p>
                  <p className="mb-4 text-xs text-slate-500">
                    {course.total_articles} articles ·{' '}
                    {course.student_count.toLocaleString()} students
                  </p>
                  <footer className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                    <strong>{price(course)}</strong>
                    <button
                      className="text-sm text-[#8062bc]"
                      onClick={() => setSelected(course)}
                    >
                      View course ↗
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
          <div ref={loadMoreRef} className="mt-6 py-4 text-center">
            <p role="status" className="text-sm text-slate-500">
              {query.isFetchingNextPage
                ? 'Loading more courses…'
                : `Showing ${courses.length} of ${count} courses`}
            </p>
          </div>
        </>
      )}
      {selected && (
        <>
          {detailQuery.isPending && (
            <p role="status">Loading course details…</p>
          )}
          {detailQuery.isError && (
            <div
              role="alert"
              className="fixed inset-x-4 bottom-4 z-50 rounded-lg bg-red-50 p-4 text-red-800 shadow"
            >
              <p>
                {apiErrorMessage(
                  detailQuery.error,
                  'Could not load course details.',
                )}
              </p>
              <Button
                className="mt-2"
                onClick={() => void detailQuery.refetch()}
              >
                Retry
              </Button>
              <Button className="ml-2 mt-2" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          )}
          {detailQuery.data && (
            <CourseDialog
              course={detailQuery.data}
              instructorName={
                instructorOptions.data?.find(
                  (option) => option.value === detailQuery.data?.instructor,
                )?.label ?? 'Unknown instructor'
              }
              categoryNames={detailQuery.data.categories.map(
                (id) =>
                  categoryOptions.data?.find((option) => option.value === id)
                    ?.label ?? 'Category unavailable',
              )}
              onChangeStatus={() => setModerating(detailQuery.data!)}
              onClose={() => setSelected(null)}
            />
          )}
        </>
      )}
      {moderating && !moderating.deleted_at && (
        <StatusModerationDialog
          currentStatus={moderating.status}
          statuses={statuses.map((value) => ({
            value,
            label: statusLabel(value),
          }))}
          rejectionReason
          pending={updateMutation.isPending}
          error={
            updateMutation.error
              ? apiErrorMessage(
                  updateMutation.error,
                  'Could not change course status.',
                  { includeFieldErrors: true },
                )
              : null
          }
          onCancel={() => setModerating(null)}
          onConfirm={(status, reason) =>
            updateMutation.mutate({ status: status as CourseStatus, reason })
          }
        />
      )}
    </section>
  );
}
