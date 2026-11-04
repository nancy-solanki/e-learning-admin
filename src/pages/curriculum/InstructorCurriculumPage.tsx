import { useEffect, useState } from 'react';
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
  createAdminSection,
  patchAdminSection,
  type AdminSection,
} from '../../api/services/sections';
import {
  lectureWritesEnabled,
  saveCurriculumOrder,
  saveInstructorLecture,
  deleteInstructorLecture,
} from '../../api/services/instructorCurriculum';
import { apiErrorMessage } from '../../api/errors';
import { Button } from '../../components/ui/Button';
import {
  TrashIcon,
  LectureIcon,
  BookIcon,
  GearIcon,
} from '../../components/icons/AdminIcons';
import { CurriculumDialog } from '../../components/curriculum/CurriculumDialog';
import { SortableCards } from '../../components/curriculum/SortableCards';
import {
  SectionForm,
  LectureForm,
} from '../../components/curriculum/CurriculumForms';

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
  const [managedSection, setManagedSection] = useState<AdminSection | null>(
    null,
  );
  const [lectureEditor, setLectureEditor] = useState<
    AdminLecture | 'new' | null
  >(null);
  const [deleteLecture, setDeleteLecture] = useState<AdminLecture | null>(null);
  const [notice, setNotice] = useState('');
  const sectionKey = ['course-curriculum-sections', courseId];
  const lectureKey = ['course-curriculum-lectures', courseId];
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
          { course: courseId, page, ordering: 'order' },
          signal,
        );
        records.push(...result.results);
        if (!result.next) return records;
      }
    },
  });
  const sectionRows = arrange(
    (sections.data ?? []).filter((item) => !item.deleted_at),
    sectionIds,
  );
  const lectureRows = arrange(
    (lectures.data ?? []).filter(
      (item) => !item.deleted_at && item.section === managedSection?.id,
    ),
    lectureIds,
  );
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
        return patchAdminSection(sectionEditor.id, changes);
      }
      return createAdminSection({
        ...data,
        course: courseId,
        status: 'draft',
        order: Math.max(0, ...sectionRows.map((item) => item.order)) + 1,
      });
    },
    onSuccess: async () => {
      await refresh('sections');
      setSectionEditor(null);
      setNotice('Section saved.');
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
      setNotice('Lecture deleted.');
    },
  });
  const busy =
    sectionSave.isPending ||
    orderSave.isPending ||
    lectureSave.isPending ||
    lectureDelete.isPending;
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
            variant="primary"
            onClick={() => {
              setNotice('');
              orderSave.mutate('sections');
            }}
            disabled={!sectionIds || busy}
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
        <span>{sectionRows.length} sections</span>
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
            Build your course curriculum
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Create your first section to start organizing lectures.
          </p>
        </div>
      ) : (
        <SortableCards
          label="Course sections"
          items={sectionRows}
          disabled={busy}
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
              </div>
              <details
                className="relative shrink-0"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    event.currentTarget.open = false;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.currentTarget.open = false;
                    event.currentTarget.querySelector('summary')?.focus();
                  }
                }}
              >
                <summary
                  aria-label={`Actions for ${item.title}`}
                  className="cursor-pointer list-none rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ⋮
                </summary>
                <div className="absolute right-0 top-11 z-30 grid w-44 gap-1 rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
                  <Button
                    disabled={busy}
                    onClick={(event) => {
                      event.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                      setManagedSection(item);
                      orderSave.reset();
                    }}
                  >
                    <GearIcon aria-hidden="true" className="size-4 shrink-0" />
                    Manage lectures
                  </Button>
                  <Button
                    disabled={busy || !!sectionIds}
                    onClick={(event) => {
                      event.currentTarget
                        .closest('details')
                        ?.removeAttribute('open');
                      sectionSave.reset();
                      setSectionEditor(item);
                    }}
                  >
                    Edit section
                  </Button>
                </div>
              </details>
            </>
          )}
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
      {managedSection && !lectureEditor && !deleteLecture && (
        <CurriculumDialog title="Manage lectures" onClose={closeLectures}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">
                {managedSection.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {lectureRows.length} lectures
                {lectureIds ? ' · Unsaved order' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                disabled={!lectureWritesEnabled || !lectureIds || busy}
                title={
                  !lectureWritesEnabled
                    ? 'Lecture saving is not available yet'
                    : undefined
                }
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
              No lectures yet. Add your first lecture to this section.
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
                      {item.lecture_type} · {item.status}
                      {item.is_preview ? ' · Free preview' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      aria-label={`Edit lecture ${item.title}`}
                      disabled={busy || !!lectureIds}
                      onClick={() => {
                        lectureSave.reset();
                        setLectureEditor(item);
                      }}
                    >
                      Edit lecture
                    </Button>
                    <Button
                      aria-label={`Delete lecture ${item.title}`}
                      title={
                        !lectureWritesEnabled
                          ? 'Lecture deletion is not available yet'
                          : undefined
                      }
                      disabled={!lectureWritesEnabled || busy || !!lectureIds}
                      onClick={() => {
                        lectureDelete.reset();
                        setDeleteLecture(item);
                      }}
                    >
                      <TrashIcon aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            />
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
            saveEnabled={lectureWritesEnabled}
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
          title="Delete lecture"
          onClose={() => {
            if (!busy) setDeleteLecture(null);
          }}
        >
          <p className="mb-6">
            Delete “{deleteLecture.title}” from this section?
          </p>
          {lectureDelete.isError && (
            <p role="alert" className="mb-4 text-red-700">
              {errorMessage(lectureDelete.error)}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button disabled={busy} onClick={() => setDeleteLecture(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={busy || !lectureWritesEnabled}
              title={
                !lectureWritesEnabled
                  ? 'Lecture deletion is not available yet'
                  : undefined
              }
              onClick={() => lectureDelete.mutate(deleteLecture.id)}
            >
              {busy ? 'Deleting…' : 'Delete lecture'}
            </Button>
          </div>
        </CurriculumDialog>
      )}
    </section>
  );
}
