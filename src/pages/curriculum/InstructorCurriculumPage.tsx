import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccessState } from '../../state/access';
import { getAdminCourse } from '../../api/services/courses';
import {
  listAdminLectures,
  type AdminLecture,
} from '../../api/services/lectures';
import {
  listAdminSections,
  createInstructorSection,
  patchInstructorSection,
  deleteInstructorSection,
  submitInstructorSection,
  type AdminSection,
} from '../../api/services/sections';
import { submitInstructorLecture } from '../../api/services/lectures';
import {
  saveCurriculumOrder,
  saveInstructorLecture,
  deleteInstructorLecture,
} from '../../api/services/instructorCurriculum';
import { apiErrorMessage } from '../../api/errors';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field, Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  TrashIcon,
  LectureIcon,
  BookIcon,
  GearIcon,
} from '../../components/icons/AdminIcons';
import { CurriculumDialog } from '../../components/curriculum/CurriculumDialog';
import { SortableCards } from '../../components/curriculum/SortableCards';
import {
  ContentApproval,
  ContentApprovalAction,
} from '../../components/ui/ContentApproval';
import { ActionMenu } from '../../components/ui/ActionMenu';
import {
  SectionForm,
  LectureForm,
} from '../../components/curriculum/CurriculumForms';

type CurriculumFilters = {
  search: string;
  status: string;
  lecture_type: string;
  is_preview: string;
};

const emptyCurriculumFilters: CurriculumFilters = {
  search: '',
  status: '',
  lecture_type: '',
  is_preview: '',
};

function CurriculumFiltersDrawer({
  kind,
  values,
  onClose,
  onApply,
}: {
  kind: 'sections' | 'lectures';
  values: CurriculumFilters;
  onClose: () => void;
  onApply: (values: CurriculumFilters) => void;
}) {
  const [draft, setDraft] = useState(values);
  const lecture = kind === 'lectures';
  const update = (key: keyof CurriculumFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({ ...draft, search: draft.search.trim() });
  };
  return (
    <Drawer
      title={`Filter ${kind}`}
      description="Choose filters to narrow the list."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(emptyCurriculumFilters)}>
            Reset filters
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="instructor-curriculum-filters"
          >
            Apply filters
          </Button>
        </>
      }
    >
      <form
        id="instructor-curriculum-filters"
        onSubmit={submit}
        className="grid gap-5"
      >
        <Field label="Title or description" htmlFor="curriculum-filter-search">
          <Input
            id="curriculum-filter-search"
            aria-label={`Search ${kind}`}
            value={draft.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder={`Search ${kind}…`}
          />
        </Field>
        <Field label="Status" htmlFor="curriculum-filter-status">
          <Select
            id="curriculum-filter-status"
            label={`Filter ${kind} by status`}
            value={draft.status}
            onChange={(value) => update('status', value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'published', label: 'Published' },
              { value: 'in-review', label: 'In Review' },
              { value: 'draft', label: 'Draft' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </Field>
        {lecture && (
          <>
            <Field label="Lecture type" htmlFor="curriculum-filter-type">
              <Select
                id="curriculum-filter-type"
                label="Filter lectures by type"
                value={draft.lecture_type}
                onChange={(value) => update('lecture_type', value)}
                options={[
                  { value: '', label: 'All types' },
                  { value: 'video', label: 'Video' },
                  { value: 'document', label: 'Document' },
                ]}
              />
            </Field>
            <Field label="Preview" htmlFor="curriculum-filter-preview">
              <Select
                id="curriculum-filter-preview"
                label="Filter preview lectures"
                value={draft.is_preview}
                onChange={(value) => update('is_preview', value)}
                options={[
                  { value: '', label: 'All lectures' },
                  { value: 'true', label: 'Preview' },
                  { value: 'false', label: 'Not preview' },
                ]}
              />
            </Field>
          </>
        )}
      </form>
    </Drawer>
  );
}

function arrange<T extends { id: string; order: number }>(
  records: T[],
  ids: string[] | null,
): T[] {
  if (!ids) return [...records].sort((a, b) => a.order - b.order);
  const positions = new Map(ids.map((id, index) => [id, index]));
  return [...records].sort(
    (a, b) =>
      (positions.get(a.id) ?? Infinity) - (positions.get(b.id) ?? Infinity),
  );
}

export default function InstructorCurriculumPage() {
  const { courseId = '' } = useParams();
  return <Curriculum key={courseId} courseId={courseId} />;
}

function Curriculum({ courseId }: { courseId: string }) {
  const access = useAccessState();
  const client = useQueryClient();
  const [sectionIds, setSectionIds] = useState<string[] | null>(null);
  const [lectureIds, setLectureIds] = useState<string[] | null>(null);
  const [sectionEditor, setSectionEditor] = useState<
    AdminSection | 'new' | null
  >(null);
  const [deleteSection, setDeleteSection] = useState<AdminSection | null>(null);
  const [managedSection, setManagedSection] = useState<AdminSection | null>(
    null,
  );
  const [lectureEditor, setLectureEditor] = useState<
    AdminLecture | 'new' | null
  >(null);
  const [deleteLecture, setDeleteLecture] = useState<AdminLecture | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<
    'sections' | 'lectures' | null
  >(null);
  const [sectionFilters, setSectionFilters] = useState(emptyCurriculumFilters);
  const [lectureFilters, setLectureFilters] = useState(emptyCurriculumFilters);
  const [restoreMode, setRestoreMode] = useState(false);
  const [notice, setNotice] = useState('');
  const sectionKey = ['course-curriculum-sections', courseId];
  const lectureKey = [
    'course-curriculum-lectures',
    courseId,
    managedSection?.id,
  ];
  const course = useQuery({
    queryKey: ['curriculum-course', courseId],
    queryFn: () => getAdminCourse(courseId),
    enabled: access.isInstructor,
  });
  const sections = useQuery({
    queryKey: sectionKey,
    enabled: access.isInstructor && course.isSuccess,
    queryFn: async ({ signal }) => {
      const records: AdminSection[] = [];
      for (let page = 1; ; page++) {
        const result = await listAdminSections(
          { course: courseId, page, ordering: 'order' },
          signal,
        );
        records.push(...result.results);
        if (!result.next) return records;
      }
    },
  });
  const lectures = useQuery({
    queryKey: lectureKey,
    enabled: access.isInstructor && !!managedSection,
    queryFn: async ({ signal }) => {
      const records: AdminLecture[] = [];
      for (let page = 1; ; page++) {
        const result = await listAdminLectures(
          {
            course: courseId,
            section: managedSection?.id,
            page,
            ordering: 'order',
          },
          signal,
        );
        records.push(...result.results);
        if (!result.next) return records;
      }
    },
  });
  const allSectionRows = arrange(
    (sections.data ?? []).filter((item) => !item.deleted_at),
    sectionIds,
  );
  const sectionFilterActive = Object.values(sectionFilters).some(Boolean);
  const sectionRows = allSectionRows.filter((item) => {
    const search = sectionFilters.search.toLowerCase();
    return (
      (!search ||
        `${item.title} ${item.description}`.toLowerCase().includes(search)) &&
      (!sectionFilters.status || item.status === sectionFilters.status)
    );
  });
  const allLectureRows = arrange(
    (lectures.data ?? []).filter(
      (item) => !item.deleted_at && item.section === managedSection?.id,
    ),
    lectureIds,
  );
  const lectureFilterActive = Object.values(lectureFilters).some(Boolean);
  const lectureRows = allLectureRows.filter((item) => {
    const search = lectureFilters.search.toLowerCase();
    return (
      (!search ||
        `${item.title} ${item.description}`.toLowerCase().includes(search)) &&
      (!lectureFilters.status || item.status === lectureFilters.status) &&
      (!lectureFilters.lecture_type ||
        item.lecture_type === lectureFilters.lecture_type) &&
      (lectureFilters.is_preview === '' ||
        item.is_preview === (lectureFilters.is_preview === 'true'))
    );
  });
  const deletedLectureRows = (lectures.data ?? [])
    .filter((item) => item.deleted_at && item.section === managedSection?.id)
    .sort((a, b) => a.order - b.order);
  const dirty = !!sectionIds || !!lectureIds;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function refresh(kind: 'sections' | 'lectures') {
    await Promise.all([
      client.invalidateQueries({
        queryKey: kind === 'sections' ? sectionKey : lectureKey,
      }),
      client.invalidateQueries({ queryKey: ['admin-content-list', kind] }),
      client.invalidateQueries({ queryKey: ['admin-content-detail', kind] }),
    ]);
  }
  const sectionSave = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      if (sectionEditor && sectionEditor !== 'new') {
        const changes = Object.fromEntries(
          Object.entries(data).filter(
            ([key, value]) =>
              sectionEditor[key as 'title' | 'description'] !== value,
          ),
        );
        if (!Object.keys(changes).length) return sectionEditor;
        return patchInstructorSection(sectionEditor.id, changes);
      }
      return createInstructorSection({
        ...data,
        course: courseId,
        order: Math.max(0, ...sectionRows.map((item) => item.order)) + 1,
      });
    },
    onSuccess: async () => {
      await refresh('sections');
      setSectionEditor(null);
      setNotice('Section saved.');
    },
  });
  const sectionDelete = useMutation({
    mutationFn: (id: string) => deleteInstructorSection(id),
    onSuccess: async (_, id) => {
      await refresh('sections');
      setDeleteSection(null);
      if (managedSection?.id === id) setManagedSection(null);
      setNotice('Section deleted.');
    },
  });
  const orderSave = useMutation({
    mutationFn: async (kind: 'sections' | 'lectures') => {
      // Individual PATCH requests are retryable; retain the desired order if any request fails.
      const rows = kind === 'sections' ? sectionRows : lectureRows;
      await saveCurriculumOrder(
        kind,
        rows.map((item) => item.id),
      );
      return kind;
    },
    onSuccess: async (kind) => {
      await refresh(kind);
      if (kind === 'sections') setSectionIds(null);
      else setLectureIds(null);
      setNotice(`${kind === 'sections' ? 'Section' : 'Lecture'} order saved.`);
    },
  });
  const lectureSave = useMutation({
    mutationFn: async (data: FormData) => {
      if (!managedSection) throw new Error('No section selected');
      data.set('course', courseId);
      data.set('section', managedSection.id);
      if (lectureEditor && lectureEditor !== 'new') {
        data.set('order', String(lectureEditor.order));
        if (!String(data.get('document_content') ?? '').trim())
          data.delete('document_content');
        return saveInstructorLecture(data, lectureEditor.id);
      }
      data.set(
        'order',
        String(Math.max(0, ...lectureRows.map((item) => item.order)) + 1),
      );
      return saveInstructorLecture(data);
    },
    onSuccess: async () => {
      await refresh('lectures');
      setLectureEditor(null);
      setNotice('Lecture saved.');
    },
  });
  const lectureDelete = useMutation({
    mutationFn: (id: string) => deleteInstructorLecture(id),
    onSuccess: async () => {
      await refresh('lectures');
      setDeleteLecture(null);
      setRestoreMode(false);
      setNotice('Lecture deleted.');
    },
  });
  const lectureRestore = useMutation({
    mutationFn: (id: string) => deleteInstructorLecture(id),
    onSuccess: async () => {
      await refresh('lectures');
      setDeleteLecture(null);
      setRestoreMode(false);
      setNotice('Lecture restored.');
    },
  });
  const sectionSubmit = useMutation({
    mutationFn: (id: string) => submitInstructorSection(id),
    onSuccess: async (result, id) => {
      client.setQueryData<AdminSection[]>(sectionKey, (current) =>
        current?.map((item) =>
          item.id === id ? { ...item, status: result.status } : item,
        ),
      );
      await refresh('sections');
      setNotice(result.message);
    },
  });
  const lectureSubmit = useMutation({
    mutationFn: (id: string) => submitInstructorLecture(id),
    onSuccess: async (result, id) => {
      client.setQueryData<AdminLecture[]>(lectureKey, (current) =>
        current?.map((item) =>
          item.id === id ? { ...item, status: result.status } : item,
        ),
      );
      await refresh('lectures');
      setNotice(result.message);
    },
  });
  const busy =
    sectionSave.isPending ||
    sectionDelete.isPending ||
    orderSave.isPending ||
    lectureSave.isPending ||
    lectureDelete.isPending ||
    lectureRestore.isPending ||
    sectionSubmit.isPending ||
    lectureSubmit.isPending;
  const errorMessage = (error: unknown) =>
    apiErrorMessage(error, 'Unable to save. Please try again.', {
      includeFieldErrors: true,
    });
  function closeLectures() {
    if (
      busy ||
      (lectureIds && !window.confirm('Discard the unsaved lecture order?'))
    )
      return;
    setLectureIds(null);
    setManagedSection(null);
    orderSave.reset();
  }
  if (access.isPending || (access.isInstructor && course.isPending))
    return <p role="status">Loading curriculum…</p>;
  if (!access.isInstructor || course.data?.deleted_at)
    return <Navigate to="/courses" replace />;
  if (course.isError)
    return (
      <div role="alert">
        <p>{apiErrorMessage(course.error, 'Could not load course.')}</p>
        <Button onClick={() => void course.refetch()}>Retry</Button>
      </div>
    );
  return (
    <section className="mx-auto max-w-6xl pb-12">
      <Link
        to="/courses"
        onClick={(event) => {
          if (dirty && !window.confirm('Discard unsaved curriculum order?'))
            event.preventDefault();
        }}
        className="text-sm font-medium text-violet-700"
      >
        ← Back to courses
      </Link>
      <header className="my-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-600">
            Course curriculum
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {course.data?.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Organize your sections and lectures in the order learners will see
            them.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            aria-haspopup="dialog"
            aria-expanded={filtersOpen === 'sections'}
            disabled={busy || !!sectionIds}
            onClick={() => setFiltersOpen('sections')}
          >
            Filter sections
            {sectionFilterActive && (
              <span className="ml-2 rounded-full bg-violet-100 px-2 text-xs text-violet-700">
                {Object.values(sectionFilters).filter(Boolean).length}
              </span>
            )}
          </Button>
          {sectionFilterActive && (
            <Button onClick={() => setSectionFilters(emptyCurriculumFilters)}>
              Clear filters
            </Button>
          )}
          <Button
            variant="primary"
            onClick={() => {
              setNotice('');
              orderSave.mutate('sections');
            }}
            disabled={!sectionIds || busy || sectionFilterActive}
          >
            {orderSave.isPending && orderSave.variables === 'sections'
              ? 'Saving…'
              : 'Save'}
          </Button>
          <Button
            variant="primary"
            disabled={busy || !!sectionIds || !sections.isSuccess}
            onClick={() => {
              sectionSave.reset();
              setSectionEditor('new');
            }}
          >
            + New section
          </Button>
        </div>
      </header>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      {orderSave.isError && orderSave.variables === 'sections' && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          Some changes may have saved. Your requested order is retained; press
          Save to retry. {errorMessage(orderSave.error)}
        </p>
      )}
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          {sectionRows.length}
          {sectionFilterActive ? ` of ${allSectionRows.length}` : ''} sections
        </span>
        {sectionIds && (
          <span className="font-medium text-amber-700">Unsaved order</span>
        )}
      </div>
      {sections.isPending ? (
        <p role="status" className="rounded-xl bg-white p-8">
          Loading sections…
        </p>
      ) : sections.isError ? (
        <div role="alert">
          <p>{apiErrorMessage(sections.error, 'Could not load sections.')}</p>
          <Button onClick={() => void sections.refetch()}>Retry</Button>
        </div>
      ) : !sectionRows.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold">
            {sectionFilterActive
              ? 'No sections match these filters'
              : 'Build your course curriculum'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {sectionFilterActive
              ? 'Adjust or clear the filters to see more sections.'
              : 'Create your first section to start organizing lectures.'}
          </p>
        </div>
      ) : (
        <SortableCards
          label="Course sections"
          items={sectionRows}
          disabled={busy || sectionFilterActive}
          onReorder={(items) => {
            setSectionIds(items.map((item) => item.id));
            setNotice('');
          }}
          renderItem={(item, index) => (
            <>
              <span className="hidden rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-600 sm:block">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="break-words font-semibold text-slate-800">
                  {item.title}
                </h2>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {item.description}
                </p>
                <ContentApproval
                  status={item.status}
                  rejectReason={item.reject_reason}
                  parentWaiting={
                    item.status === 'published' &&
                    course.data?.status !== 'published'
                  }
                  error={
                    sectionSubmit.isError && sectionSubmit.variables === item.id
                      ? sectionSubmit.error
                      : undefined
                  }
                  message={notice.includes('Section submitted') ? notice : ''}
                  sectionNeedsLecture
                />
              </div>
              <ActionMenu label={`Actions for ${item.title}`}>
                <Button
                  disabled={busy || lectureFilterActive}
                  className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
                  onClick={() => {
                    setManagedSection(item);
                    orderSave.reset();
                  }}
                >
                  <GearIcon aria-hidden="true" className="size-4 shrink-0" />
                  Manage lectures
                </Button>
                <ContentApprovalAction
                  status={item.status}
                  pending={
                    sectionSubmit.isPending &&
                    sectionSubmit.variables === item.id
                  }
                  keepMenuOpen
                  onSubmit={() => {
                    sectionSubmit.reset();
                    setNotice('');
                    sectionSubmit.mutate(item.id);
                  }}
                />
                <Button
                  disabled={busy || !!sectionIds}
                  className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
                  onClick={() => {
                    sectionSave.reset();
                    setSectionEditor(item);
                  }}
                >
                  Edit section
                </Button>
                <Button
                  disabled={busy || !!sectionIds}
                  className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
                  onClick={() => {
                    sectionDelete.reset();
                    setDeleteSection(item);
                  }}
                >
                  <TrashIcon aria-hidden="true" className="size-4 shrink-0" />
                  Delete section
                </Button>
              </ActionMenu>
            </>
          )}
        />
      )}
      {filtersOpen === 'sections' && (
        <CurriculumFiltersDrawer
          kind="sections"
          values={sectionFilters}
          onClose={() => setFiltersOpen(null)}
          onApply={(values) => {
            setSectionFilters(values);
            setFiltersOpen(null);
          }}
        />
      )}
      {sectionEditor && (
        <CurriculumDialog
          title={sectionEditor === 'new' ? 'Create section' : 'Edit section'}
          onClose={() => {
            if (!busy) setSectionEditor(null);
          }}
        >
          <SectionForm
            record={sectionEditor === 'new' ? undefined : sectionEditor}
            pending={busy}
            error={
              sectionSave.isError ? errorMessage(sectionSave.error) : undefined
            }
            onSubmit={(data) => sectionSave.mutate(data)}
          />
        </CurriculumDialog>
      )}
      {deleteSection && (
        <CurriculumDialog
          title="Delete section"
          onClose={() => {
            if (!busy) setDeleteSection(null);
          }}
        >
          <p className="mb-6">
            Delete “{deleteSection.title}”? It will disappear from your sections
            and cannot be restored here.
          </p>
          {sectionDelete.isError && (
            <p role="alert" className="mb-4 text-red-700">
              {errorMessage(sectionDelete.error)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button disabled={busy} onClick={() => setDeleteSection(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => sectionDelete.mutate(deleteSection.id)}
            >
              {sectionDelete.isPending ? 'Deleting…' : 'Delete section'}
            </Button>
          </div>
        </CurriculumDialog>
      )}
      {managedSection && !lectureEditor && !deleteLecture && (
        <CurriculumDialog title="Manage lectures" onClose={closeLectures}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">
                {managedSection.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {lectureRows.length}
                {lectureFilterActive ? ` of ${allLectureRows.length}` : ''}{' '}
                lectures
                {lectureIds ? ' · Unsaved order' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                aria-haspopup="dialog"
                aria-expanded={filtersOpen === 'lectures'}
                disabled={busy || !!lectureIds}
                onClick={() => setFiltersOpen('lectures')}
              >
                Filter lectures
                {lectureFilterActive && (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 text-xs text-violet-700">
                    {Object.values(lectureFilters).filter(Boolean).length}
                  </span>
                )}
              </Button>
              {lectureFilterActive && (
                <Button
                  onClick={() => setLectureFilters(emptyCurriculumFilters)}
                >
                  Clear filters
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!lectureIds || busy || lectureFilterActive}
                onClick={() => {
                  setNotice('');
                  orderSave.mutate('lectures');
                }}
              >
                {orderSave.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                variant="primary"
                disabled={busy || !!lectureIds || !lectures.isSuccess}
                onClick={() => {
                  lectureSave.reset();
                  setLectureEditor('new');
                }}
              >
                + New lecture
              </Button>
            </div>
          </div>
          {orderSave.isError && orderSave.variables === 'lectures' && (
            <p role="alert" className="mb-4 text-sm text-red-700">
              Some changes may have saved. Press Save to retry your requested
              order. {errorMessage(orderSave.error)}
            </p>
          )}
          {notice && (
            <p role="status" className="mb-4 text-sm text-emerald-700">
              {notice}
            </p>
          )}
          {lectures.isPending ? (
            <p role="status">Loading lectures…</p>
          ) : lectures.isError ? (
            <div role="alert">
              <p>
                {apiErrorMessage(lectures.error, 'Could not load lectures.')}
              </p>
              <Button onClick={() => void lectures.refetch()}>Retry</Button>
            </div>
          ) : !lectureRows.length ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              {lectureFilterActive
                ? 'No lectures match these filters. Adjust or clear the filters to see more lectures.'
                : 'No lectures yet. Add your first lecture to this section.'}
            </div>
          ) : (
            <SortableCards
              label="Section lectures"
              items={lectureRows}
              disabled={busy}
              onReorder={(items) => {
                setLectureIds(items.map((item) => item.id));
                setNotice('');
              }}
              renderItem={(item) => (
                <>
                  <span
                    aria-hidden="true"
                    className="rounded-lg bg-violet-50 p-2 text-violet-600"
                  >
                    {item.lecture_type === 'video' ? (
                      <LectureIcon className="size-5" />
                    ) : (
                      <BookIcon className="size-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {item.lecture_type}
                      {item.is_preview ? ' · Free preview' : ''}
                    </p>
                    <ContentApproval
                      status={item.status}
                      rejectReason={item.reject_reason}
                      parentWaiting={
                        item.status === 'published' &&
                        (sections.data?.find(
                          (section) => section.id === item.section,
                        )?.status !== 'published' ||
                          course.data?.status !== 'published')
                      }
                      pending={
                        lectureSubmit.isPending &&
                        lectureSubmit.variables === item.id
                      }
                      error={
                        lectureSubmit.isError &&
                        lectureSubmit.variables === item.id
                          ? lectureSubmit.error
                          : undefined
                      }
                      message={
                        notice.includes('Lecture submitted') ? notice : ''
                      }
                    />
                  </div>
                  <ActionMenu label={`Actions for lecture ${item.title}`}>
                    <ContentApprovalAction
                      status={item.status}
                      pending={
                        lectureSubmit.isPending &&
                        lectureSubmit.variables === item.id
                      }
                      keepMenuOpen
                      onSubmit={() => {
                        lectureSubmit.reset();
                        setNotice('');
                        lectureSubmit.mutate(item.id);
                      }}
                    />
                    <Button
                      aria-label={`Edit lecture ${item.title}`}
                      disabled={busy || !!lectureIds}
                      className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
                      onClick={() => {
                        lectureSave.reset();
                        setLectureEditor(item);
                      }}
                    >
                      Edit lecture
                    </Button>
                    <Button
                      aria-label={`Delete lecture ${item.title}`}
                      disabled={busy || !!lectureIds}
                      className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
                      onClick={() => {
                        lectureDelete.reset();
                        setRestoreMode(false);
                        setDeleteLecture(item);
                      }}
                    >
                      <TrashIcon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                      Delete lecture
                    </Button>
                  </ActionMenu>
                </>
              )}
            />
          )}
          {filtersOpen === 'lectures' && (
            <CurriculumFiltersDrawer
              kind="lectures"
              values={lectureFilters}
              onClose={() => setFiltersOpen(null)}
              onApply={(values) => {
                setLectureFilters(values);
                setFiltersOpen(null);
              }}
            />
          )}
          {deletedLectureRows.length > 0 && (
            <section className="mt-8 border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-600">
                Deleted lectures
              </h3>
              <ul className="grid gap-3">
                {deletedLectureRows.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
                  >
                    <span className="font-medium text-slate-600">
                      {item.title}
                    </span>
                    <Button
                      disabled={busy || !!lectureIds}
                      onClick={() => {
                        lectureDelete.reset();
                        lectureRestore.reset();
                        setRestoreMode(true);
                        setDeleteLecture(item);
                      }}
                    >
                      Restore lecture
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </CurriculumDialog>
      )}
      {lectureEditor && (
        <CurriculumDialog
          title={lectureEditor === 'new' ? 'Create lecture' : 'Edit lecture'}
          onClose={() => {
            if (!busy) setLectureEditor(null);
          }}
        >
          <LectureForm
            record={lectureEditor === 'new' ? undefined : lectureEditor}
            pending={busy}
            error={
              lectureSave.isError ? errorMessage(lectureSave.error) : undefined
            }
            onSubmit={(data) => lectureSave.mutate(data)}
          />
        </CurriculumDialog>
      )}
      {deleteLecture && (
        <CurriculumDialog
          title={restoreMode ? 'Restore lecture' : 'Delete lecture'}
          onClose={() => {
            if (!busy) {
              setDeleteLecture(null);
              setRestoreMode(false);
            }
          }}
        >
          <p className="mb-6">
            {restoreMode
              ? `Restore “${deleteLecture.title}” to this section?`
              : `Delete “${deleteLecture.title}” from this section?`}
          </p>
          {(restoreMode ? lectureRestore.isError : lectureDelete.isError) && (
            <p role="alert" className="mb-4 text-red-700">
              {errorMessage(
                restoreMode ? lectureRestore.error : lectureDelete.error,
              )}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              disabled={busy}
              onClick={() => {
                setDeleteLecture(null);
                setRestoreMode(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                restoreMode
                  ? lectureRestore.mutate(deleteLecture.id)
                  : lectureDelete.mutate(deleteLecture.id)
              }
            >
              {restoreMode
                ? lectureRestore.isPending
                  ? 'Restoring…'
                  : 'Restore lecture'
                : lectureDelete.isPending
                  ? 'Deleting…'
                  : 'Delete lecture'}
            </Button>
          </div>
        </CurriculumDialog>
      )}
    </section>
  );
}
