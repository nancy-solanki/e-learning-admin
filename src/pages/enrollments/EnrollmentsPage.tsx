import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useState } from 'react';
import { EnrollmentIcon } from '../../components/icons/AdminIcons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PageHeading } from '../../components/ui/PageHeading';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { ListSkeleton } from '../../components/ui/ListSkeleton';
import { FormNotice } from '../../components/ui/FormNotice';
import { Select } from '../../components/ui/Select';

import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '../../state/profile';
import { listAdminCourses } from '../../api/services/courses';
import { getSessionVersion } from '../../state/session';
import { apiErrorMessage } from '../../api/errors';
import { Avatar } from '../../components/ui/Avatar';
import {
  listEnrollments,
  listCourseEnrollments,
  enrollmentDetail,
  type Enrollment,
} from '../../api/services/enrollments';

const studentName = (entry: Enrollment) =>
  entry.user.full_name || entry.user.username;
const enrolledDate = (entry: Enrollment) =>
  new Date(entry.created_at).toLocaleString();
const statusCode = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined;
function ErrorNotice({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="my-4 space-y-3">
      <FormNotice
        notice={{
          type: 'error',
          text:
            statusCode(error) === 404
              ? 'Enrollment not found.'
              : apiErrorMessage(
                  error,
                  'Unable to load enrollments. Please try again.',
                  { includeFieldErrors: true },
                ),
        }}
      />
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
function Progress({ entry }: { entry: Enrollment }) {
  return (
    <div className="text-xs text-slate-500">
      <p>{entry.progress}%</p>
      <p className="mt-2">Lesson tracking unavailable</p>
    </div>
  );
}

function EnrollmentDialog({
  id,
  onClose,
  onAccessError,
}: {
  id: string;
  onClose: () => void;
  onAccessError: (error: unknown) => void;
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const detail = useQuery({
    queryKey: ['enrollments', 'detail', id],
    queryFn: async ({ signal }) => {
      try {
        return await enrollmentDetail(id, signal);
      } catch (error) {
        onAccessError(error);
        throw error;
      }
    },
    retry: false,
    gcTime: 0,
  });
  const entry = detail.data;
  return (
    <Modal
      title="Enrollment details"
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {detail.isPending && <ListSkeleton label="Loading enrollments…" />}
      {detail.isError && (
        <ErrorNotice error={detail.error} retry={() => void detail.refetch()} />
      )}
      {entry && !detail.isError && (
        <>
          <Avatar user={entry.user} className="mb-3 size-10" />
          <h3 className="font-bold">{studentName(entry)}</h3>
          <p className="my-5 rounded-xl bg-violet-50 p-4 text-sm font-semibold leading-6 text-brand">
            {entry.course.title}
          </p>
          <dl className="mb-6 grid grid-cols-2 gap-5 text-sm">
            {[
              ['Enrollment ID', entry.id],
              ['Enrolled on', enrolledDate(entry)],
              ['Average rating', entry.average_rating ?? 'Not rated'],
              ['Progress', `${entry.progress}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="mb-1 text-xs text-slate-500">{label}</dt>
                <dd className="break-all font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <Progress entry={entry} />
          <Button
            className="my-4"
            onClick={() => {
              void navigator.clipboard.writeText(entry.id).then(
                () => setCopyMessage('Enrollment ID copied.'),
                () =>
                  setCopyMessage(
                    'Unable to copy. Select the enrollment ID above.',
                  ),
              );
            }}
          >
            Copy enrollment ID
          </Button>
          <p role="status">{copyMessage}</p>
        </>
      )}
    </Modal>
  );
}
export default function EnrollmentsPage() {
  const { data: profile, isPending } = useCurrentUser();
  if (isPending) return <p role="status">Loading enrollments…</p>;
  if (!profile) return <p role="alert">Unable to load your account.</p>;
  return <EnrollmentReport key={`${profile.id}:${getSessionVersion()}`} />;
}
function EnrollmentReport() {
  const profile = useCurrentUser();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [course, setCourse] = useState('');
  const [pagination, setPagination] = useState({ key: '', page: 1 });
  const filters = {
    search: debouncedSearch || undefined,
    ordering: '-created_at' as const,
  };
  const filterKey = JSON.stringify(filters);
  const page = pagination.key === filterKey ? pagination.page : 1;
  const [selected, setSelected] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<number>();
  const handleAccessError = (error: unknown) => {
    const code = statusCode(error);
    if (code === 401 || code === 403) {
      setAccessError(code);
    }
  };
  const guarded = async <T,>(request: () => Promise<T>) => {
    try {
      return await request();
    } catch (error) {
      handleAccessError(error);
      throw error;
    }
  };
  const courses = useQuery({
    queryKey: ['enrollments', 'courses', profile.data?.id],
    queryFn: ({ signal }) =>
      guarded(async () => {
        const result = await listAdminCourses(
          { status: 'published', ordering: 'title' },
          signal,
        );
        return result.results
          .filter((item) => item.status === 'published' && item.slug)
          .map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug!,
          }));
      }),
    retry: false,
    enabled: !accessError,
    gcTime: 0,
  });
  const selectedCourse = courses.data?.find((item) => item.id === course);
  const table = useQuery({
    queryKey: ['enrollments', 'list', filters, selectedCourse?.slug, page],
    queryFn: ({ signal }) =>
      guarded(() =>
        selectedCourse
          ? listCourseEnrollments(selectedCourse.slug, filters, page, signal)
          : listEnrollments(filters, page, signal),
      ),
    retry: false,
    enabled: !accessError && (!course || !!selectedCourse),
    gcTime: 0,
  });
  const filtered = table.isError ? [] : (table.data?.results ?? []);
  if (accessError)
    return (
      <div role="alert">
        <h1>{accessError === 403 ? 'Access denied' : 'Session expired'}</h1>
        <p>
          {accessError === 403
            ? 'You do not have permission to view enrollments.'
            : 'Please sign in again.'}
        </p>
      </div>
    );
  return (
    <section className="text-slate-900 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#7054d8]">
      <PageHeading
        title="Enrollments"
        eyebrow="Enrollment management"
        description="View learners enrolled in your courses."
      />
      {courses.isError && (
        <ErrorNotice
          error={courses.error}
          retry={() => void courses.refetch()}
        />
      )}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-0 basis-full gap-1.5 text-xs font-semibold text-slate-600 lg:flex-1">
            Search enrollments
            <Input
              aria-label="Search enrollments"
              placeholder="Search students, courses, or enrollment ID…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Select
            className="min-w-40 flex-1 lg:max-w-64"
            label="Filter by course"
            value={course}
            onChange={setCourse}
            options={[
              { value: '', label: 'All courses' },
              ...(courses.data ?? []).map((value) => ({
                value: value.id,
                label: value.title,
              })),
            ]}
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">Student enrollments</h2>
          <span className="text-sm text-slate-500">
            {table.data && !table.isError ? `${table.data.count} total` : '—'}
          </span>
        </div>
        {table.isError && (
          <ErrorNotice error={table.error} retry={() => void table.refetch()} />
        )}
        {table.isPending && <ListSkeleton label="Loading enrollments…" />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Student enrollments</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  'Student',
                  'Course',
                  'Enrolled on',
                  'Progress',
                  'Average rating',
                  'Details',
                ].map((label) => (
                  <th
                    scope="col"
                    key={label}
                    className="px-5 py-3 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={entry.user} className="size-9 text-xs" />
                      <div>
                        <p className="whitespace-nowrap font-semibold">
                          {studentName(entry)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-60 px-5 py-4">
                    <p className="font-semibold leading-5">
                      {entry.course.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.id.slice(0, 8)}…
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {enrolledDate(entry)}
                  </td>
                  <td className="px-5 py-4">
                    <Progress entry={entry} />
                  </td>
                  <td className="px-5 py-4">
                    <span className="whitespace-nowrap rounded-md bg-slate-100 px-2 py-1 text-slate-600">
                      {entry.average_rating ?? 'Not rated'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Button
                      className="whitespace-nowrap font-semibold text-brand"
                      aria-label={`View enrollment ${entry.id}`}
                      onClick={() => setSelected(entry.id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!table.isPending && !table.isError && !filtered.length && (
            <div className="p-10 text-center">
              <EnrollmentIcon className="mx-auto mb-3 size-9 text-violet-300" />
              <h3 className="font-bold">No enrollments found</h3>
              <p className="my-3 text-sm text-slate-500">
                Try another search or adjust your filters.
              </p>
              <Button
                onClick={() => {
                  setSearch('');
                  setCourse('');
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
        <Pagination
          page={page}
          count={table.isError ? 0 : (table.data?.count ?? 0)}
          visibleCount={filtered.length}
          hasNext={!!table.data?.next && !table.isError}
          pending={table.isPending}
          label="Enrollment pagination"
          onPageChange={(next) => setPagination({ key: filterKey, page: next })}
        />
      </div>
      {selected && (
        <EnrollmentDialog
          id={selected}
          onAccessError={handleAccessError}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
