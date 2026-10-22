import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  BookIcon,
  LayersIcon,
  LectureIcon,
} from '../../components/icons/AdminIcons';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Drawer } from '../../components/ui/Drawer';
import { AsyncSelect } from '../../components/ui/AsyncSelect';
import { StatusFilterTabs } from '../../components/ui/StatusFilterTabs';
import { OrderingSelect } from '../../components/ui/OrderingSelect';
import { StatusModerationDialog } from '../../components/ui/StatusModerationDialog';
import { apiErrorMessage } from '../../api/errors';
import { listCourseOptions } from '../../api/services/courses';
import { listInstructorOptions } from '../../api/services/options';
import {
  getAdminLecture,
  listAdminLectures,
  patchAdminLecture,
  type AdminLecture,
  type AdminLectureFilters,
  type AdminLecturePage,
  type LectureStatus,
} from '../../api/services/lectures';
import {
  getAdminSection,
  listAdminSections,
  patchAdminSection,
  type AdminSection,
  type AdminSectionFilters,
  type AdminSectionPage,
  type SectionStatus,
} from '../../api/services/sections';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { isAdmin } from '../../lib/permissions';
import { queryClient } from '../../state/queryClient';
import { useCurrentUser } from '../../state/profile';
import InstructorCurriculumPage from './InstructorCurriculumPage';

const sectionStatuses: SectionStatus[] = ['published', 'draft', 'rejected'];
const lectureStatuses: LectureStatus[] = ['published', 'draft', 'rejected'];
const statusOptions = (values: readonly string[]) =>
  values.map((value) => ({
    value,
    label:
      value === 'in-review'
        ? 'In Review'
        : value[0].toUpperCase() + value.slice(1),
  }));

const filterKeys = [
  'course',
  'instructor',
  'ordering',
  'section',
  'lecture_type',
  'is_preview',
];
const removedFilterKeys = ['course_slug', 'section_slug'];

function CurriculumFiltersDrawer({
  kind,
  values,
  courses,
  sections,
  onClose,
  onApply,
}: {
  kind: 'sections' | 'lectures';
  values: Record<string, string>;
  courses: Array<{ id: string; title: string }>;
  sections: Array<{ id: string; title: string }>;
  onClose: () => void;
  onApply: (values: Record<string, string>) => void;
}) {
  const lecture = kind === 'lectures';
  const [draft, setDraft] = useState(values);
  const update = (key: string, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(
      Object.fromEntries(
        Object.entries(draft).filter(([, value]) => value.trim()),
      ),
    );
  };
  return (
    <Drawer
      title={`Filter ${kind}`}
      description="Choose filters to narrow the list."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft({})}>Reset filters</Button>
          <Button variant="primary" type="submit" form="curriculum-filters">
            Apply filters
          </Button>
        </>
      }
    >
      <form id="curriculum-filters" onSubmit={submit} className="grid gap-5">
        <Field label="Course" htmlFor="curriculum-filter-course">
          <Select
            id="curriculum-filter-course"
            label="Filter by course"
            value={draft.course ?? ''}
            onChange={(value) => update('course', value)}
            options={[
              { value: '', label: 'All courses' },
              ...courses.map(({ id, title }) => ({ value: id, label: title })),
              ...(draft.course && !courses.some(({ id }) => id === draft.course)
                ? [
                    {
                      value: draft.course,
                      label: 'Selected course unavailable',
                    },
                  ]
                : []),
            ]}
          />
        </Field>
        <Field label="Instructor" htmlFor="curriculum-filter-instructor">
          <AsyncSelect
            id="curriculum-filter-instructor"
            label="Instructors"
            allLabel="All instructors"
            value={draft.instructor ?? ''}
            onChange={(value) => update('instructor', value)}
            queryKey={['course-filter-options', 'instructors']}
            loadOptions={listInstructorOptions}
          />
        </Field>
        <OrderingSelect
          id="curriculum-filter-ordering"
          value={draft.ordering ?? ''}
          fields={['order', 'title', 'created_at', 'updated_at']}
          onChange={(value) => update('ordering', value)}
        />
        {lecture && (
          <>
            <Field label="Section" htmlFor="curriculum-filter-section">
              <Select
                id="curriculum-filter-section"
                label="Filter by section"
                value={draft.section ?? ''}
                onChange={(value) => update('section', value)}
                options={[
                  { value: '', label: 'All sections' },
                  ...sections.map(({ id, title }) => ({
                    value: id,
                    label: title,
                  })),
                  ...(draft.section &&
                  !sections.some(({ id }) => id === draft.section)
                    ? [
                        {
                          value: draft.section,
                          label: 'Selected section unavailable',
                        },
                      ]
                    : []),
                ]}
              />
            </Field>
            <Field label="Lecture type" htmlFor="curriculum-filter-type">
              <Select
                id="curriculum-filter-type"
                label="Filter by lecture type"
                value={draft.lecture_type ?? ''}
                onChange={(value) => update('lecture_type', value)}
                options={[
                  { value: '', label: 'All lecture types' },
                  { value: 'video', label: 'Video' },
                  { value: 'document', label: 'Document' },
                ]}
              />
            </Field>
            <Field label="Preview" htmlFor="curriculum-filter-preview">
              <Select
                id="curriculum-filter-preview"
                label="Filter preview lectures"
                value={draft.is_preview ?? ''}
                onChange={(value) => update('is_preview', value)}
                options={[
                  { value: '', label: 'All previews' },
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
              />
            </Field>
          </>
        )}
      </form>
    </Drawer>
  );
}
type SelectedRecord =
  { kind: 'sections'; id: string } | { kind: 'lectures'; id: string };
type ModerationTarget = {
  kind: 'sections' | 'lectures';
  id: string;
  status: string;
  deleted: boolean;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function AdminDetailDialog({
  record,
  courseTitle,
  sectionTitle,
  instructorName,
  onChangeStatus,
  onClose,
}: {
  record: AdminSection | AdminLecture;
  courseTitle: string;
  sectionTitle: string;
  instructorName: string;
  onChangeStatus: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const lecture = 'lecture_type' in record;
  const details: Array<[string, string]> = lecture
    ? [
        ['Status', record.status],
        ['Description', record.description || '—'],
        ['Course', courseTitle || 'Course unavailable'],
        ['Section', sectionTitle || 'Section unavailable'],
        ['Instructor', instructorName],
        ['Lecture type', record.lecture_type],
        ['Preview', record.is_preview ? 'Yes' : 'No'],
        ['Order', String(record.order)],
        ['Rejection reason', record.reject_reason ?? '—'],
        ['Created', formatDate(record.created_at)],
        ['Updated', formatDate(record.updated_at)],
        ['Deleted', formatDate(record.deleted_at)],
      ]
    : [
        ['Status', record.status],
        ['Description', record.description || '—'],
        ['Course', record.course_title || courseTitle || 'Course unavailable'],
        ['Instructor', instructorName],
        ['Order', String(record.order)],
        ['Created', formatDate(record.created_at)],
        ['Updated', formatDate(record.updated_at)],
        ['Deleted', formatDate(record.deleted_at)],
      ];
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-content-detail-title"
      onCancel={onClose}
      className="fixed inset-0 m-auto max-h-[85vh] w-[min(640px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-6 text-[#202134] shadow-xl backdrop:bg-black/40"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="admin-content-detail-title" className="text-xl font-bold">
            {record.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {lecture ? 'Lecture details' : 'Section details'}
          </p>
        </div>
        <button type="button" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </header>
      {lecture && record.thumbnail && (
        <img
          src={record.thumbnail}
          alt=""
          className="mb-4 max-h-48 max-w-full rounded-lg object-contain"
        />
      )}
      {lecture && record.source && (
        <p className="mb-4 break-all text-sm">
          <a
            className="text-violet-700 underline"
            href={record.source}
            target="_blank"
            rel="noreferrer"
          >
            Open lecture source
          </a>
        </p>
      )}
      {lecture && record.resources !== null && (
        <div className="mb-4">
          <h3 className="text-xs text-slate-500">Resources</h3>
          <pre className="mt-1 overflow-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(record.resources, null, 2)}
          </pre>
        </div>
      )}
      <dl className="grid gap-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {!record.deleted_at && (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <Button variant="primary" onClick={onChangeStatus}>
            Change status
          </Button>
        </div>
      )}
    </dialog>
  );
}

export default function CurriculumPage({
  kind,
}: {
  kind: 'sections' | 'lectures';
}) {
  const { data: user, isPending: profilePending } = useCurrentUser();
  const allowed = isAdmin(user ?? null);
  const lecture = kind === 'lectures';
  const [params, setParams] = useSearchParams();
  const pageValue = params.get('page');
  const page: number | 'last' =
    pageValue === 'last'
      ? 'last'
      : pageValue && /^[1-9]\d*$/.test(pageValue)
        ? Number(pageValue)
        : 1;
  const statusValue = params.get('status') ?? '';
  const statusValues = lecture ? lectureStatuses : sectionStatuses;
  const status = statusValues.includes(statusValue as SectionStatus)
    ? statusValue
    : undefined;
  const searchInput = params.get('search') ?? '';
  const search = useDebouncedValue(searchInput.trim());
  const course = params.get('course') ?? '';
  const instructor = params.get('instructor') ?? '';
  const sectionId = params.get('section') ?? '';
  const lectureType = params.get('lecture_type') ?? '';
  const isPreview = params.get('is_preview') ?? '';
  const ordering = params.get('ordering') ?? '';
  const [selected, setSelected] = useState<SelectedRecord | null>(null);
  const [moderating, setModerating] = useState<ModerationTarget | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateFilter = (name: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      next.set('page', '1');
      return next;
    });
  const clearFilters = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of [...filterKeys, ...removedFilterKeys, 'status']) {
        next.delete(key);
      }
      next.set('page', '1');
      return next;
    });
  const applyFilters = (values: Record<string, string>) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of [...filterKeys, ...removedFilterKeys]) {
        next.delete(key);
      }
      for (const [key, value] of Object.entries(values)) {
        if (filterKeys.includes(key) && value) next.set(key, value);
      }
      next.set('page', '1');
      return next;
    });

  const courseOptions = useQuery({
    queryKey: ['course-options'],
    queryFn: ({ signal }) => listCourseOptions(signal),
    enabled: allowed,
  });
  const instructorOptions = useQuery({
    queryKey: ['course-filter-options', 'instructors'],
    queryFn: ({ signal }) => listInstructorOptions(signal),
    enabled: allowed,
  });
  const sectionOptions = useQuery({
    queryKey: ['admin-sections', 'lookup', 1],
    queryFn: ({ signal }) => listAdminSections({ page: 1 }, signal),
    enabled: allowed && lecture,
  });

  const sectionFilters: AdminSectionFilters = {
    ...(course ? { course } : {}),
    ...(instructor ? { instructor } : {}),
    ...(status ? { status: status as SectionStatus } : {}),
    ...(ordering ? { ordering } : {}),
  };
  const lectureFilters: AdminLectureFilters = {
    ...(course ? { course } : {}),
    ...(sectionId ? { section: sectionId } : {}),
    ...(instructor ? { instructor } : {}),
    ...(status ? { status: status as LectureStatus } : {}),
    ...(lectureType
      ? { lecture_type: lectureType as 'video' | 'document' }
      : {}),
    ...(isPreview === 'true' || isPreview === 'false'
      ? { is_preview: isPreview === 'true' }
      : {}),
    ...(ordering ? { ordering } : {}),
  };
  const listFilters = lecture ? lectureFilters : sectionFilters;
  const listQuery = useQuery<AdminSectionPage | AdminLecturePage>({
    queryKey: ['admin-content-list', kind, listFilters, search, page],
    queryFn: async ({
      signal,
    }): Promise<AdminSectionPage | AdminLecturePage> =>
      lecture
        ? listAdminLectures(
            { ...lectureFilters, search: search || undefined, page },
            signal,
          )
        : listAdminSections(
            { ...sectionFilters, search: search || undefined, page },
            signal,
          ),
    enabled: allowed && search === searchInput.trim(),
  });
  const detailQuery = useQuery<AdminSection | AdminLecture>({
    queryKey: ['admin-content-detail', selected?.kind, selected?.id],
    queryFn: async (): Promise<AdminSection | AdminLecture> => {
      const target = selected;
      if (!target) throw new Error('No record selected.');
      return target.kind === 'lectures'
        ? getAdminLecture(target.id)
        : getAdminSection(target.id);
    },
    enabled: allowed && Boolean(selected),
  });
  const sectionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SectionStatus }) =>
      patchAdminSection(id, status),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        ['admin-content-detail', 'sections', variables.id],
        record,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-content-list', 'sections'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-content-detail', 'sections', variables.id],
        }),
      ]);
      setModerating(null);
    },
  });
  const lectureMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: LectureStatus;
      reason: string;
    }) => patchAdminLecture(id, status, reason),
    onSuccess: async (record, variables) => {
      queryClient.setQueryData(
        ['admin-content-detail', 'lectures', variables.id],
        record,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-content-list', 'lectures'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-content-detail', 'lectures', variables.id],
        }),
      ]);
      setModerating(null);
    },
  });

  if (profilePending) return <p role="status">Checking access…</p>;
  if (!allowed) return <InstructorCurriculumPage kind={kind} />;

  const result = listQuery.data;
  const pageNumber =
    page === 'last' ? Math.max(1, Math.ceil((result?.count ?? 0) / 20)) : page;
  const activeFilters = [
    course,
    instructor,
    ordering,
    ...(lecture ? [sectionId, lectureType, isPreview] : []),
  ].some(Boolean);
  const hasActiveFilters = activeFilters || Boolean(status);
  const selectedSectionId =
    detailQuery.data && 'section' in detailQuery.data
      ? detailQuery.data.section
      : undefined;

  return (
    <section className="text-[#202134]">
      <header className="mb-7">
        <p className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
          COURSE STRUCTURE
        </p>
        <h1 className="my-2 font-display text-4xl font-extrabold tracking-tight">
          {lecture ? (
            <LectureIcon
              aria-hidden="true"
              className="mr-3 inline-block size-8 align-middle text-[#7961dc]"
            />
          ) : (
            <LayersIcon
              aria-hidden="true"
              className="mr-3 inline-block size-8 align-middle text-[#7961dc]"
            />
          )}
          {lecture ? 'Lectures' : 'Sections'}
          <span className="text-[#7961dc]">.</span>
        </h1>
        <p className="text-sm text-[#74798b]">
          Browse, filter, and moderate publication status. Deleted records are
          read-only.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-[#e9e9f0] bg-white p-4">
        <Input
          className="min-w-[220px] flex-1"
          aria-label={`Search ${kind}`}
          placeholder={`Search ${kind}…`}
          value={searchInput}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
        <Button
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          Filters
          {activeFilters && (
            <span className="ml-2 rounded-full bg-violet-100 px-2 text-xs text-violet-700">
              {
                [
                  course,
                  instructor,
                  ordering,
                  ...(lecture ? [sectionId, lectureType, isPreview] : []),
                ].filter(Boolean).length
              }
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button onClick={clearFilters}>Clear filters</Button>
        )}
      </div>
      <StatusFilterTabs
        label={`Filter ${kind} by status`}
        value={status ?? ''}
        options={statusOptions(statusValues)}
        onChange={(value) => updateFilter('status', value)}
      />
      {filtersOpen && (
        <CurriculumFiltersDrawer
          key={`${kind}:${params.toString()}`}
          kind={kind}
          values={Object.fromEntries(
            filterKeys
              .map((key) => [key, params.get(key) ?? ''])
              .filter(([, value]) => value),
          )}
          courses={courseOptions.data ?? []}
          sections={sectionOptions.data?.results ?? []}
          onClose={() => setFiltersOpen(false)}
          onApply={(values) => {
            applyFilters(values);
            setFiltersOpen(false);
          }}
        />
      )}

      {courseOptions.isError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-red-800"
        >
          <p>
            {apiErrorMessage(
              courseOptions.error,
              'Could not load course filters.',
            )}
          </p>
          <Button className="mt-3" onClick={() => void courseOptions.refetch()}>
            Retry course filters
          </Button>
        </div>
      )}
      {sectionOptions.isError && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-red-800"
        >
          <p>
            {apiErrorMessage(
              sectionOptions.error,
              'Could not load section details.',
            )}
          </p>
          <Button
            className="mt-3"
            onClick={() => void sectionOptions.refetch()}
          >
            Retry section lookup
          </Button>
        </div>
      )}
      {(listQuery.isPending || search !== searchInput.trim()) && (
        <p role="status">Loading {kind}…</p>
      )}
      {listQuery.isError && search === searchInput.trim() && (
        <div
          role="alert"
          className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"
        >
          <p>{apiErrorMessage(listQuery.error, `Could not load ${kind}.`)}</p>
          <Button className="mt-3" onClick={() => void listQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {result && search === searchInput.trim() && (
        <>
          <h2 className="mb-4 text-lg font-bold">
            {lecture ? 'Lecture' : 'Section'} library · {result.count}
          </h2>
          {result.results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#dcd5eb] p-10 text-center text-slate-500">
              No {kind} found. Try another search or adjust your filters.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.results.map((record) => {
                const isLecture = 'lecture_type' in record;
                const recordCourse = courseOptions.data?.find(
                  (option) => option.id === record.course,
                );
                const section = isLecture
                  ? sectionOptions.data?.results.find(
                      (option) => option.id === record.section,
                    )
                  : undefined;
                return (
                  <article
                    key={record.id}
                    className="flex flex-col rounded-xl border border-[#e6e7ef] bg-white p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="rounded-xl bg-[#f3effb] p-3 text-[#8b6ccb]">
                        {isLecture ? (
                          <LectureIcon className="size-5" />
                        ) : (
                          <LayersIcon className="size-5" />
                        )}
                      </span>
                      <div className="flex gap-2 text-xs">
                        <span className="rounded-md bg-[#f3f0f8] px-2 py-1">
                          {statusOptions([record.status])[0].label}
                        </span>
                        {record.deleted_at && (
                          <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                            Deleted · read-only
                          </span>
                        )}
                      </div>
                    </div>
                    {isLecture ? (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#8c7d9d]">
                        <BookIcon className="mt-0.5 size-4 shrink-0" />
                        {recordCourse?.title ?? 'Course unavailable'}
                        {' · '}
                        {section?.title ?? 'Section unavailable'}
                      </p>
                    ) : (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#8c7d9d]">
                        <BookIcon className="mt-0.5 size-4 shrink-0" />
                        {record.course_title ||
                          recordCourse?.title ||
                          'Course unavailable'}
                      </p>
                    )}
                    <h3 className="my-3 text-base font-bold">{record.title}</h3>
                    <p className="mb-4 line-clamp-3 text-xs leading-6 text-[#74798b]">
                      {record.description || 'No description'}
                    </p>
                    <p className="mb-4 text-xs text-[#858699]">
                      Instructor:{' '}
                      {instructorOptions.data?.find(
                        (option) => option.username === record.instructor,
                      )?.label ?? 'Instructor unavailable'}
                      {' · '}
                      {isLecture
                        ? record.lecture_type
                        : `Order ${record.order}`}
                    </p>
                    <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[#f0f0f5] pt-4">
                      <span className="text-xs text-[#858699]">
                        Updated {formatDate(record.updated_at)}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-bold text-[#8062bc]"
                        onClick={() => setSelected({ kind, id: record.id })}
                      >
                        View details
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[#858697]">
            <p>
              Showing {(pageNumber - 1) * 20 + (result.results.length ? 1 : 0)}–
              {Math.min(pageNumber * 20, result.count)} of {result.count} {kind}
            </p>
            <div className="flex items-center gap-3">
              <Button
                disabled={!result.previous || listQuery.isFetching}
                onClick={() =>
                  setParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('page', String(Math.max(1, pageNumber - 1)));
                    return next;
                  })
                }
              >
                Previous
              </Button>
              <span>Page {page === 'last' ? 'last' : page}</span>
              <Button
                disabled={!result.next || listQuery.isFetching}
                onClick={() =>
                  setParams((current) => {
                    const next = new URLSearchParams(current);
                    next.set('page', String(pageNumber + 1));
                    return next;
                  })
                }
              >
                Next
              </Button>
            </div>
          </footer>
        </>
      )}

      {selected && detailQuery.isPending && (
        <p role="status">Loading details…</p>
      )}
      {selected && detailQuery.isError && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 rounded-lg bg-red-50 p-4 text-red-800 shadow"
        >
          <p>{apiErrorMessage(detailQuery.error, 'Could not load details.')}</p>
          <Button className="mt-2" onClick={() => void detailQuery.refetch()}>
            Retry
          </Button>
          <Button className="ml-2 mt-2" onClick={() => setSelected(null)}>
            Close
          </Button>
        </div>
      )}
      {selected && detailQuery.data && (
        <AdminDetailDialog
          record={detailQuery.data}
          courseTitle={
            courseOptions.data?.find(
              (option) => option.id === detailQuery.data?.course,
            )?.title ?? ''
          }
          sectionTitle={
            selectedSectionId
              ? (sectionOptions.data?.results.find(
                  (option) => option.id === selectedSectionId,
                )?.title ?? '')
              : ''
          }
          instructorName={
            instructorOptions.data?.find(
              (option) => option.username === detailQuery.data?.instructor,
            )?.label ?? 'Instructor unavailable'
          }
          onChangeStatus={() =>
            setModerating({
              kind: selected.kind,
              id: selected.id,
              status: detailQuery.data!.status,
              deleted: Boolean(detailQuery.data!.deleted_at),
            })
          }
          onClose={() => setSelected(null)}
        />
      )}
      {moderating && !moderating.deleted && (
        <StatusModerationDialog
          currentStatus={moderating.status}
          statuses={statusOptions(
            moderating.kind === 'lectures' ? lectureStatuses : sectionStatuses,
          )}
          rejectionReason={moderating.kind === 'lectures'}
          pending={
            moderating.kind === 'lectures'
              ? lectureMutation.isPending
              : sectionMutation.isPending
          }
          error={
            (
              moderating.kind === 'lectures'
                ? lectureMutation.error
                : sectionMutation.error
            )
              ? apiErrorMessage(
                  moderating.kind === 'lectures'
                    ? lectureMutation.error
                    : sectionMutation.error,
                  `Could not change ${moderating.kind.slice(0, -1)} status.`,
                  { includeFieldErrors: true },
                )
              : null
          }
          onCancel={() => setModerating(null)}
          onConfirm={(nextStatus, reason) => {
            if (moderating.kind === 'lectures') {
              if (!lectureStatuses.includes(nextStatus as LectureStatus))
                return;
              lectureMutation.mutate({
                id: moderating.id,
                status: nextStatus as LectureStatus,
                reason,
              });
            } else {
              if (!sectionStatuses.includes(nextStatus as SectionStatus))
                return;
              sectionMutation.mutate({
                id: moderating.id,
                status: nextStatus as SectionStatus,
              });
            }
          }}
        />
      )}
    </section>
  );
}
