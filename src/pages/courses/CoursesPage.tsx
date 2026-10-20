import { CourseImage } from '../../components/courses/CourseImage';
import { AsyncSelect } from '../../components/ui/AsyncSelect';
import {
  listCategoryOptions,
  listInstructorOptions,
} from '../../api/services/options';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BookIcon, CloseIcon } from '../../components/icons/AdminIcons';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Select } from '../../components/ui/Select';
import { Field, Input } from '../../components/ui/Input';
import { useCurrentUser } from '../../state/profile';
import { apiErrorMessage } from '../../api/errors';
import {
  listAdminCourses,
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
function CourseDialog({
  course,
  onClose,
}: {
  course: AdminCourse;
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
      <CourseImage
        src={course.thumbnail?.url}
        title={course.title}
        className="mb-5 rounded-xl"
      />
      <p className="mb-5 whitespace-pre-wrap">
        {course.long_description || course.short_description}
      </p>
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ['Status', course.status],
          ['Price', price(course)],
          ['Instructor ID', course.instructor],
          ['Category IDs', course.categories.join(', ')],
          ['Tag IDs', course.tags.join(', ')],
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
    </dialog>
  );
}

function CourseFilters({
  filters,
  onApply,
  onClose,
}: {
  filters: AdminCourseFilters;
  onApply: (filters: AdminCourseFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, String(value)]),
    ),
  );
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
    onApply(next as AdminCourseFilters);
  }
  return (
    <Drawer
      title="Filter courses"
      description="Narrow your course library to what you need."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft({})}>Reset filters</Button>
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
                const next: Record<string, string> = {
                  ...current,
                  category: value,
                };
                delete next.category_slug;
                return next;
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
  const allowed = Boolean(
    user?.is_superuser ||
    user?.role?.some(
      (role) =>
        role
          .trim()
          .toLowerCase()
          .replace(/^role_/, '') === 'admin',
    ),
  );
  const [params, setParams] = useSearchParams();
  const filters: AdminCourseFilters = {};
  const status = params.get('status');
  if (statuses.includes(status as CourseStatus))
    filters.status = status as CourseStatus;
  for (const key of ['category', 'category_slug', 'instructor'] as const) {
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
  function setFilters(next: AdminCourseFilters) {
    setParams(
      Object.fromEntries(
        Object.entries(next).map(([key, value]) => [key, String(value)]),
      ),
    );
  }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [ordering, setOrdering] = useState('');
  const search = useDebouncedValue(searchInput.trim());
  const [selected, setSelected] = useState<AdminCourse | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ['admin-courses', user?.id, filters, search, ordering],
    initialPageParam: 1,
    getNextPageParam: (lastPage: AdminCoursePage, _pages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
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
            }}
          />
        </div>
        <Select
          className="w-full sm:w-[190px]"
          label="Sort courses"
          value={ordering}
          onChange={(value) => {
            setOrdering(value);
          }}
          options={[
            { value: '', label: 'Newest first' },
            { value: 'created_at', label: 'Oldest first' },
            { value: 'title', label: 'Title: A–Z' },
            { value: '-title', label: 'Title: Z–A' },
            { value: 'price', label: 'Price: low to high' },
            { value: '-price', label: 'Price: high to low' },
            { value: '-updated_at', label: 'Recently updated' },
          ]}
        />
        <Button
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          Filters{' '}
          {Object.keys(filters).length > 0 && (
            <span className="rounded-full bg-violet-100 px-2 text-xs text-violet-700">
              {Object.keys(filters).length}
            </span>
          )}
        </Button>
        {Object.keys(filters).length > 0 && (
          <Button
            onClick={() => {
              setFilters({});
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      {filtersOpen && (
        <CourseFilters
          key={params.toString()}
          filters={filters}
          onClose={() => setFiltersOpen(false)}
          onApply={(next) => {
            setFilters(next);
            setFiltersOpen(false);
          }}
        />
      )}
      {query.isPending && <p role="status">Loading courses…</p>}
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
      {query.data && (
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
                <CourseImage src={course.thumbnail?.url} title={course.title} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                    <BookIcon className="mr-auto size-6 text-[#8062bc]" />
                    <span className="rounded bg-violet-50 px-2 py-1">
                      {course.status}
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
        <CourseDialog course={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
