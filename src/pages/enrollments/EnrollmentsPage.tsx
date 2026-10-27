import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useEffect, useRef, useState } from 'react';
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
import { getSessionVersion } from '../../state/session';
import { apiErrorMessage } from '../../api/errors';
import { Avatar } from '../../components/ui/Avatar';
import {
  listEnrollments,
  enrollmentSummary,
  enrollmentCourses,
  enrollmentDetail,
  exportEnrollments,
  type Enrollment,
} from '../../api/services/enrollments';

const studentName = (entry: Enrollment) =>
  entry.user.full_name || entry.user.username;
const enrolledDate = (entry: Enrollment) =>
  entry.created_at
    ? new Date(entry.created_at).toLocaleString()
    : 'Unavailable';
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
      <p>Progress unavailable</p>
      <p className="mt-2">{entry.total_lessons} lessons</p>
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
          <p className="mt-1 text-sm text-slate-500">{entry.user.email}</p>
          <p className="my-5 rounded-xl bg-violet-50 p-4 text-sm font-semibold leading-6 text-brand">
            {entry.course.title}
          </p>
          <dl className="mb-6 grid grid-cols-2 gap-5 text-sm">
            {[
              ['Enrollment ID', entry.id],
              ['Enrolled on', enrolledDate(entry)],
              ['Status', 'Unknown'],
              ['Access', entry.access ?? 'Not specified'],
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
  const { data: profile } = useCurrentUser();
  if (!profile?.role?.includes('admin'))
    return (
      <div role="alert">
        <h1>Access denied</h1>
        <p>Enrollments are available to administrators only.</p>
      </div>
    );
  return <EnrollmentReport key={`${profile.id}:${getSessionVersion()}`} />;
}
function EnrollmentReport() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [course, setCourse] = useState('');
  const [pagination, setPagination] = useState({ key: '', page: 1 });
  const filters = {
    search: debouncedSearch || undefined,
    course: course || undefined,
    ordering: '-created_at' as const,
  };
  const filterKey = JSON.stringify(filters);
  const page = pagination.key === filterKey ? pagination.page : 1;
  const [selected, setSelected] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<number>();
  const [exportError, setExportError] = useState<unknown>();
  const [exporting, setExporting] = useState(false);
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  const handleAccessError = (error: unknown) => {
    const code = statusCode(error);
    if (code === 401 || code === 403) {
      exportController.current?.abort();
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
  const table = useQuery({
    queryKey: ['enrollments', 'list', filters, page],
    queryFn: ({ signal }) =>
      guarded(() => listEnrollments(filters, page, signal)),
    retry: false,
    enabled: !accessError,
    gcTime: 0,
  });
  const summary = useQuery({
    queryKey: ['enrollments', 'summary', filters],
    queryFn: ({ signal }) => guarded(() => enrollmentSummary(filters, signal)),
    retry: false,
    enabled: !accessError,
    gcTime: 0,
  });
  const courses = useQuery({
    queryKey: ['enrollments', 'courses'],
    queryFn: ({ signal }) => guarded(() => enrollmentCourses(signal)),
    retry: false,
    enabled: !accessError,
    gcTime: 0,
  });
  const filtered = table.isError ? [] : (table.data?.results ?? []);
  const exportCsv = async () => {
    if (exportController.current) return;
    const controller = new AbortController();
    exportController.current = controller;
    const version = getSessionVersion();
    setExporting(true);
    setExportError(undefined);
    try {
      const blob = await exportEnrollments(filters, controller.signal);
      if (controller.signal.aborted || version !== getSessionVersion()) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'enrollments.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!controller.signal.aborted) {
        handleAccessError(error);
        setExportError(error);
      }
    } finally {
      exportController.current = null;
      setExporting(false);
    }
  };
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
        description="View learner enrollments, course details, and enrollment records."
        action={
          <Button
            disabled={exporting || search.trim() !== debouncedSearch}
            onClick={() => void exportCsv()}
          >
            {exporting ? 'Exporting…' : 'Export enrollments'}
          </Button>
        }
      />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [
            'Total enrollments',
            summary.isPending
              ? '…'
              : summary.isError
                ? '—'
                : summary.data?.total_enrollments,
          ],
          ...['In progress', 'Completed', 'Not started'].map((value) => [
            value,
            '—',
          ]),
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <strong className="mt-2 block text-3xl font-bold">{value}</strong>
            {label !== 'Total enrollments' && (
              <p className="mt-2 text-xs text-slate-500">
                Progress tracking unavailable
              </p>
            )}
          </div>
        ))}
      </div>
      {summary.isError && (
        <ErrorNotice
          error={summary.error}
          retry={() => void summary.refetch()}
        />
      )}
      {courses.isError && (
        <ErrorNotice
          error={courses.error}
          retry={() => void courses.refetch()}
        />
      )}
      {exportError != null && (
        <ErrorNotice error={exportError} retry={() => void exportCsv()} />
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
          <Select
            className="min-w-40 flex-1 lg:max-w-44"
            label="Enrollment status"
            value=""
            disabled
            describedBy="status-hint"
            onChange={() => {}}
            options={[
              { value: '', label: 'All statuses' },
              ...['In progress', 'Completed', 'Not started'].map((value) => ({
                value,
                label: value,
              })),
            ]}
          />
        </div>
        <p id="status-hint" className="mt-3 text-xs text-slate-500">
          Status filtering is unavailable because progress tracking is
          unavailable.
        </p>
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
                  'Status',
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
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.user.email}
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
                      Unknown
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
