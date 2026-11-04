import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Drawer } from '../../components/ui/Drawer';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { apiErrorMessage } from '../../api/errors';
import {
  createAdminSection,
  patchAdminSection,
  deleteAdminSection,
  type AdminSection,
  type SectionPayload,
  type SectionStatus,
} from '../../api/services/sections';
import { queryClient } from '../../state/queryClient';

export function SectionEditor({
  record,
  course,
  courses,
  onClose,
}: {
  record?: AdminSection;
  course: string;
  courses: Array<{ id: string; title: string }>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(record?.title ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  const [courseId, setCourseId] = useState(record?.course ?? course);
  const [order, setOrder] = useState(record?.order ?? 0);
  const [status, setStatus] = useState<SectionStatus>(
    record?.status ?? 'draft',
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mutation = useMutation({
    mutationFn: async (remove: boolean) => {
      if (remove && record) return deleteAdminSection(record.id);
      const payload: SectionPayload = {
        title: title.trim(),
        description: description.trim(),
        course: courseId,
        order,
        status,
      };
      if (!record) return createAdminSection(payload);
      const changes = Object.fromEntries(
        Object.entries(payload).filter(
          ([key, value]) => record[key as keyof SectionPayload] !== value,
        ),
      );
      if (Object.keys(changes).length)
        return patchAdminSection(record.id, changes);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin-content-list', 'sections'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin-content-detail', 'sections'],
        }),
        queryClient.invalidateQueries({ queryKey: ['admin-sections'] }),
      ]);
      onClose();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() && description.trim()) mutation.mutate(false);
  };
  return (
    <Drawer
      title={record ? 'Edit section' : 'Create section'}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <form onSubmit={submit} className="grid gap-5">
        <fieldset disabled={mutation.isPending} className="grid gap-5">
          <Field label="Title" htmlFor="section-title" required>
            <Input
              id="section-title"
              required
              maxLength={250}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="section-description" required>
            <Textarea
              id="section-description"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field label="Course" htmlFor="section-course" required>
            <select
              className="ui-input"
              id="section-course"
              required
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Select course</option>
              {courseId && !courses.some((item) => item.id === courseId) && (
                <option value={courseId}>
                  {record?.course_title || courseId}
                </option>
              )}
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Order" htmlFor="section-order">
            <Input
              id="section-order"
              type="number"
              required
              step={1}
              value={order}
              onChange={(event) => setOrder(event.target.valueAsNumber)}
            />
          </Field>
          <Field label="Status" htmlFor="section-status">
            <select
              className="ui-input"
              id="section-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SectionStatus)
              }
            >
              {['draft', 'published', 'rejected'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || !description.trim()}
          >
            {mutation.isPending ? 'Saving…' : 'Save section'}
          </Button>
          {record && (
            <Button onClick={() => setConfirmDelete(true)}>
              Delete section
            </Button>
          )}
          {confirmDelete && (
            <div role="alert" className="grid gap-3">
              <p>
                Delete “{record?.title}”? It will disappear from your sections
                and cannot be restored here.
              </p>
              <Button onClick={() => mutation.mutate(true)}>
                Confirm deletion
              </Button>
              <Button onClick={() => setConfirmDelete(false)}>
                Cancel deletion
              </Button>
            </div>
          )}
        </fieldset>
        {mutation.isError && (
          <p role="alert" className="text-red-700">
            {apiErrorMessage(mutation.error, 'Could not save section.', {
              includeFieldErrors: true,
            })}
          </p>
        )}
      </form>
    </Drawer>
  );
}
