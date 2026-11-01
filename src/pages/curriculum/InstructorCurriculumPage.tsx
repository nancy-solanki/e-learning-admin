import { useState, type FormEvent } from 'react';
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
  type AdminSection,
} from '../../api/services/sections';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { apiErrorMessage } from '../../api/errors';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export default function InstructorCurriculumPage() {
  const { courseId = '' } = useParams();
  const access = useAccessState();
  const client = useQueryClient();
  const [section, setSection] = useState('');
  const [type, setType] = useState('video');
  const [notice, setNotice] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLecture, setEditingLecture] = useState<AdminLecture | null>(
    null,
  );
  const [lectureEditType, setLectureEditType] = useState('video');
  const course = useQuery({
    queryKey: ['curriculum-course', courseId],
    queryFn: () => getAdminCourse(courseId),
    enabled: access.isInstructor,
  });
  const sections = useQuery({
    queryKey: ['course-curriculum-sections', courseId],
    enabled: access.isInstructor && course.isSuccess,
    queryFn: async ({ signal }) => {
      const records: AdminSection[] = [];
      let page = 1;
      while (true) {
        const result = await listAdminSections(
          { course: courseId, page },
          signal,
        );
        records.push(...result.results);
        if (!result.next) return records;
        page += 1;
      }
    },
  });
  const lectures = useQuery({
    queryKey: ['course-curriculum-lectures', courseId],
    enabled: access.isInstructor && course.isSuccess,
    queryFn: async ({ signal }) => {
      const records: AdminLecture[] = [];
      let page = 1;
      while (true) {
        const result = await listAdminLectures(
          { course: courseId, page },
          signal,
        );
        records.push(...result.results);
        if (!result.next) return records;
        page += 1;
      }
    },
  });
  const addSection = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form);
      return (
        await api.post<AdminSection>(ENDPOINTS.SECTION.ADMIN_LIST, {
          title: String(data.get('title')).trim(),
          description: String(data.get('description')).trim(),
          course: courseId,
          status: 'draft',
        })
      ).data;
    },
    onSuccess: async (created, form) => {
      form.reset();
      setSection(created.id);
      setNotice('Section created. You can now add a lecture.');
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['course-curriculum-sections', courseId],
        }),
        client.invalidateQueries({
          queryKey: ['admin-content-list', 'sections'],
        }),
      ]);
    },
  });
  const updateSection = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: HTMLFormElement }) => {
      const data = new FormData(form);
      return (
        await api.patch<AdminSection>(ENDPOINTS.SECTION.ADMIN_DETAIL(id), {
          title: String(data.get('title')).trim(),
          description: String(data.get('description')).trim(),
        })
      ).data;
    },
    onSuccess: async () => {
      setEditingSection(null);
      setNotice('Section updated.');
      await client.invalidateQueries({
        queryKey: ['course-curriculum-sections', courseId],
      });
      await client.invalidateQueries({
        queryKey: ['admin-content-list', 'sections'],
      });
    },
  });
  const addLecture = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form);
      data.set('course', courseId);
      data.set('section', section);
      data.set('lecture_type', type);
      data.set('status', 'draft');
      data.set('is_preview', data.has('is_preview') ? 'true' : 'false');
      await api.post(ENDPOINTS.LECTURE.ADMIN_LIST, data);
    },
    onSuccess: async (_, form) => {
      form.reset();
      setNotice(
        'Lecture created successfully. Add another lecture to keep building your course.',
      );
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['course-curriculum-lectures', courseId],
        }),
        client.invalidateQueries({
          queryKey: ['admin-content-list', 'lectures'],
        }),
        client.invalidateQueries({ queryKey: ['admin-courses'] }),
      ]);
    },
  });
  const updateLecture = useMutation({
    mutationFn: async ({
      id,
      form,
      current,
    }: {
      id: string;
      form: HTMLFormElement;
      current: AdminLecture;
    }) => {
      const data = new FormData(form);
      data.set('course', courseId);
      data.set('section', String(data.get('section')));
      data.set('lecture_type', String(data.get('lecture_type')));
      data.set('is_preview', data.has('is_preview') ? 'true' : 'false');
      data.set('status', current.status);
      const source = data.get('source');
      if (source instanceof File && !source.name) data.delete('source');
      if (!String(data.get('document_content') ?? '').trim())
        data.delete('document_content');
      return (
        await api.patch<AdminLecture>(ENDPOINTS.LECTURE.ADMIN_DETAIL(id), data)
      ).data;
    },
    onSuccess: async () => {
      setEditingLecture(null);
      setNotice('Lecture updated.');
      await client.invalidateQueries({
        queryKey: ['course-curriculum-lectures', courseId],
      });
      await Promise.all([
        client.invalidateQueries({
          queryKey: ['admin-content-list', 'lectures'],
        }),
        client.invalidateQueries({ queryKey: ['admin-courses'] }),
      ]);
    },
  });
  if (access.isPending || (access.isInstructor && course.isPending))
    return <p role="status">Loading curriculum…</p>;
  if (!access.isInstructor) return <Navigate to="/courses" replace />;
  if (course.isError)
    return (
      <div role="alert">
        <p>{apiErrorMessage(course.error, 'Could not load course.')}</p>
        <Button onClick={() => void course.refetch()}>Retry</Button>
      </div>
    );
  if (course.data?.deleted_at) return <Navigate to="/courses" replace />;
  const pending =
    addLecture.isPending ||
    addSection.isPending ||
    updateSection.isPending ||
    updateLecture.isPending;
  const activeSections =
    sections.data?.filter((item) => !item.deleted_at) ?? [];
  function submitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) {
      setNotice('');
      addSection.mutate(event.currentTarget);
    }
  }
  function submitLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending && section) {
      setNotice('');
      addLecture.mutate(event.currentTarget);
    }
  }
  function submitSectionEdit(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!pending) updateSection.mutate({ id, form: event.currentTarget });
  }
  function submitLectureEdit(
    event: FormEvent<HTMLFormElement>,
    current: AdminLecture,
  ) {
    event.preventDefault();
    if (!pending)
      updateLecture.mutate({
        id: current.id,
        form: event.currentTarget,
        current,
      });
  }
  return (
    <section className="mx-auto max-w-4xl">
      <Link to="/courses" className="text-sm text-brand">
        ← Back to courses
      </Link>
      <h1 className="mt-5 font-display text-3xl font-extrabold">
        Manage curriculum<span className="text-brand">.</span>
      </h1>
      <p className="mb-8 mt-2 text-slate-500">{course.data?.title}</p>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800"
        >
          {notice}
        </p>
      )}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">
          Existing sections and lectures
        </h2>
        {sections.isPending || lectures.isPending ? (
          <p role="status">Loading existing curriculum…</p>
        ) : sections.isError || lectures.isError ? (
          <div role="alert" className="grid gap-3 text-sm text-red-700">
            <p>
              Could not load the existing curriculum.{' '}
              {apiErrorMessage(
                sections.error ?? lectures.error,
                'Please try again.',
              )}
            </p>
            <Button
              onClick={() => {
                void sections.refetch();
                void lectures.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        ) : sections.data?.length ? (
          <div className="grid gap-4">
            {sections.data.map((item) => {
              const sectionLectures =
                lectures.data?.filter(
                  (lecture) => lecture.section === item.id,
                ) ?? [];
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  {editingSection === item.id ? (
                    <form
                      onSubmit={(event) => submitSectionEdit(event, item.id)}
                      className="grid gap-3"
                    >
                      <Field
                        label="Section title"
                        htmlFor={`edit-section-title-${item.id}`}
                        required
                      >
                        <Input
                          id={`edit-section-title-${item.id}`}
                          name="title"
                          defaultValue={item.title}
                          required
                          maxLength={250}
                        />
                      </Field>
                      <Field
                        label="Description"
                        htmlFor={`edit-section-description-${item.id}`}
                        required
                      >
                        <Textarea
                          id={`edit-section-description-${item.id}`}
                          name="description"
                          defaultValue={item.description}
                          required
                        />
                      </Field>
                      {updateSection.isError && (
                        <p role="alert" className="text-sm text-red-600">
                          {apiErrorMessage(
                            updateSection.error,
                            'Could not update section.',
                            { includeFieldErrors: true },
                          )}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          type="submit"
                          disabled={pending}
                        >
                          Save section
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingSection(null);
                            updateSection.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                          {item.description}
                        </p>
                        {item.deleted_at && (
                          <p className="mt-2 text-xs text-red-700">
                            Deleted · read-only
                          </p>
                        )}
                      </div>
                      {!item.deleted_at && (
                        <Button
                          onClick={() => {
                            setEditingSection(item.id);
                            updateSection.reset();
                          }}
                        >
                          Edit section
                        </Button>
                      )}
                    </div>
                  )}
                  {sectionLectures.length > 0 && (
                    <ul className="mt-4 grid gap-2 border-t border-slate-100 pt-4">
                      {sectionLectures.map((lecture) => (
                        <li
                          key={lecture.id}
                          className="flex flex-wrap items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            {lecture.title}
                            {lecture.deleted_at && (
                              <span className="ml-2 text-xs text-red-700">
                                Deleted · read-only
                              </span>
                            )}
                          </span>
                          {!lecture.deleted_at && (
                            <Button
                              onClick={() => {
                                setEditingLecture(lecture);
                                setLectureEditType(lecture.lecture_type);
                                updateLecture.reset();
                              }}
                            >
                              Edit lecture
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No sections have been created.
          </p>
        )}
      </section>
      {editingLecture && (
        <form
          key={editingLecture.id}
          onSubmit={(event) => submitLectureEdit(event, editingLecture)}
          className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-lg font-bold">Edit lecture</h2>
          <Field label="Section" htmlFor="edit-lecture-section" required>
            <Select
              id="edit-lecture-section"
              label="Section"
              value={editingLecture.section}
              onChange={(value) =>
                setEditingLecture({ ...editingLecture, section: value })
              }
              options={(sections.data ?? []).map((item) => ({
                value: item.id,
                label: item.title,
              }))}
            />
            <input
              type="hidden"
              name="section"
              value={editingLecture.section}
              readOnly
            />
          </Field>
          <Field label="Lecture title" htmlFor="edit-lecture-title" required>
            <Input
              id="edit-lecture-title"
              name="title"
              defaultValue={editingLecture.title}
              required
              maxLength={250}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="edit-lecture-description"
            required
          >
            <Textarea
              id="edit-lecture-description"
              name="description"
              defaultValue={editingLecture.description}
              required
            />
          </Field>
          <input
            type="hidden"
            name="lecture_type"
            value={lectureEditType}
            readOnly
          />
          <Field label="Order" htmlFor="edit-lecture-order">
            <Input
              id="edit-lecture-order"
              name="order"
              type="number"
              min="0"
              step="1"
              defaultValue={editingLecture.order}
              required
            />
          </Field>
          {lectureEditType === 'video' ? (
            <Field
              label="Replace video (optional)"
              htmlFor="edit-lecture-source"
            >
              <Input
                id="edit-lecture-source"
                name="source"
                type="file"
                accept="video/*"
              />
            </Field>
          ) : (
            <Field
              label="Update document content (optional)"
              htmlFor="edit-lecture-content"
            >
              <Textarea id="edit-lecture-content" name="document_content" />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              name="is_preview"
              type="checkbox"
              defaultChecked={editingLecture.is_preview}
              className="accent-brand"
            />
            Allow free preview
          </label>
          {updateLecture.isError && (
            <p role="alert" className="text-sm text-red-600">
              {apiErrorMessage(
                updateLecture.error,
                'Could not update lecture.',
                {
                  includeFieldErrors: true,
                },
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="primary" type="submit" disabled={pending}>
              Save lecture
            </Button>
            <Button
              onClick={() => {
                setEditingLecture(null);
                updateLecture.reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      <div className="grid gap-6">
        <form
          onSubmit={submitSection}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <fieldset disabled={pending} className="grid gap-4">
            <h2 className="text-lg font-bold">Create a section</h2>
            <p className="text-sm text-slate-500">
              Organize your lectures into sections.
            </p>
            <Field label="Section title" htmlFor="section-title" required>
              <Input
                id="section-title"
                name="title"
                required
                maxLength={250}
                placeholder="e.g. Getting started"
              />
            </Field>
            <Field label="Description" htmlFor="section-description" required>
              <Textarea id="section-description" name="description" required />
            </Field>
            {addSection.isError && (
              <p role="alert" className="text-sm text-red-600">
                {apiErrorMessage(
                  addSection.error,
                  'Could not create section.',
                  { includeFieldErrors: true },
                )}
              </p>
            )}
            <div>
              <Button variant="primary" type="submit">
                {addSection.isPending ? 'Creating…' : 'Create section'}
              </Button>
            </div>
          </fieldset>
        </form>
        <form
          onSubmit={submitLecture}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <fieldset disabled={pending} className="grid gap-5">
            <h2 className="text-lg font-bold">Create a lecture</h2>
            <Field label="Section" htmlFor="lecture-section" required>
              <Select
                id="lecture-section"
                label="Section"
                value={section}
                onChange={setSection}
                disabled={sections.isPending || sections.isError}
                options={[
                  {
                    value: '',
                    label: sections.isPending
                      ? 'Loading sections…'
                      : 'Choose a section',
                  },
                  ...activeSections.map((item) => ({
                    value: item.id,
                    label: item.title,
                  })),
                ]}
              />
            </Field>
            {sections.isError && (
              <div role="alert">
                Could not load sections.{' '}
                <Button onClick={() => void sections.refetch()}>Retry</Button>
              </div>
            )}
            {sections.isSuccess && !activeSections.length && (
              <p className="text-sm text-slate-500">
                Create your first section above before adding a lecture.
              </p>
            )}
            <Field label="Lecture title" htmlFor="lecture-title" required>
              <Input id="lecture-title" name="title" required maxLength={250} />
            </Field>
            <Field label="Description" htmlFor="lecture-description" required>
              <Textarea id="lecture-description" name="description" required />
            </Field>
            <Field label="Lecture type" htmlFor="lecture-type">
              <Select
                id="lecture-type"
                label="Lecture type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'video', label: 'Video' },
                  { value: 'document', label: 'Document' },
                ]}
              />
            </Field>
            {type === 'video' ? (
              <Field label="Video" htmlFor="lecture-source" required>
                <Input
                  id="lecture-source"
                  name="source"
                  type="file"
                  accept="video/*"
                  required
                />
              </Field>
            ) : (
              <Field
                label="Document content"
                htmlFor="lecture-content"
                required
              >
                <Textarea
                  id="lecture-content"
                  name="document_content"
                  required
                />
              </Field>
            )}
            <Field label="Order" htmlFor="lecture-order">
              <Input
                id="lecture-order"
                name="order"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="is_preview"
                type="checkbox"
                className="accent-brand"
              />
              Allow free preview
            </label>
            {addLecture.isError && (
              <p role="alert" className="text-sm text-red-600">
                {apiErrorMessage(
                  addLecture.error,
                  'Could not create lecture.',
                  { includeFieldErrors: true },
                )}
              </p>
            )}
            <div>
              <Button
                variant="primary"
                type="submit"
                disabled={!section || sections.isPending || sections.isError}
              >
                {addLecture.isPending ? 'Creating…' : 'Create lecture'}
              </Button>
            </div>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
