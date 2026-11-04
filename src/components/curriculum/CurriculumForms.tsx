import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import type { AdminSection } from '../../api/services/sections';
import type { AdminLecture } from '../../api/services/lectures';

export function SectionForm({
  record,
  pending,
  error,
  onSubmit,
}: {
  record?: AdminSection;
  pending: boolean;
  error?: string;
  onSubmit: (data: { title: string; description: string }) => void;
}) {
  const [title, setTitle] = useState(record?.title ?? '');
  const [description, setDescription] = useState(record?.description ?? '');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim() && description.trim())
          onSubmit({ title: title.trim(), description: description.trim() });
      }}
    >
      <fieldset disabled={pending} className="grid gap-6">
        <Field label="Title" htmlFor="section-title" required>
          <Input
            id="section-title"
            autoFocus
            required
            maxLength={250}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Getting started"
          />
        </Field>
        <Field label="Description" htmlFor="section-description" required>
          <Textarea
            id="section-description"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What will learners cover in this section?"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || !description.trim()}
          >
            {pending ? 'Saving…' : record ? 'Save changes' : 'Create section'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

export function LectureForm({
  record,
  saveEnabled = true,
  pending,
  error,
  onSubmit,
}: {
  record?: AdminLecture;
  saveEnabled?: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (data: FormData) => void;
}) {
  const [type, setType] = useState(record?.lecture_type ?? 'video');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saveEnabled || pending) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get('title') ?? '').trim();
    const description = String(data.get('description') ?? '').trim();
    if (!title || !description) {
      setFileError('Enter a title and description.');
      return;
    }
    if (
      type === 'video' &&
      !file &&
      (!record?.source || record.lecture_type !== 'video')
    ) {
      setFileError('Choose a video to continue.');
      return;
    }
    data.set('title', title);
    data.set('description', description);
    data.set('is_preview', data.has('is_preview') ? 'true' : 'false');
    data.delete('source');
    if (type === 'video' && file) data.set('source', file);
    onSubmit(data);
  }
  function chooseFile(next?: File) {
    if (next && !next.type.startsWith('video/')) {
      setFileError('Choose a video file.');
      return;
    }
    setFile(next ?? null);
    setFileError('');
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={pending} className="grid gap-6">
        <Field label="Lecture title" htmlFor="lecture-title" required>
          <Input
            id="lecture-title"
            name="title"
            autoFocus
            required
            maxLength={250}
            defaultValue={record?.title}
          />
        </Field>
        <Field label="Description" htmlFor="lecture-description" required>
          <Textarea
            id="lecture-description"
            name="description"
            required
            defaultValue={record?.description}
          />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Lecture type" htmlFor="lecture-type" required>
            <select
              id="lecture-type"
              name="lecture_type"
              className="ui-input"
              value={type}
              onChange={(event) => {
                setType(event.target.value as 'video' | 'document');
                setFileError('');
              }}
            >
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
          </Field>
          <Field label="Lecture status" htmlFor="lecture-status" required>
            <select
              id="lecture-status"
              name="status"
              className="ui-input"
              defaultValue={record?.status ?? 'draft'}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="is_preview"
            defaultChecked={record?.is_preview}
            className="size-4 accent-violet-600"
          />
          Allow learners to preview this lecture
        </label>
        {type === 'video' ? (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!pending) chooseFile(event.dataTransfer.files[0]);
            }}
            className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 transition hover:border-violet-300"
          >
            <Field
              label={record?.source ? 'Replace video (optional)' : 'Video'}
              htmlFor="lecture-video"
              required={!record?.source}
            >
              <p className="mb-3 text-sm text-slate-500">
                Drag a video here or choose a file.
              </p>
              <Input
                id="lecture-video"
                name="source"
                type="file"
                accept="video/*"
                onChange={(event) => chooseFile(event.target.files?.[0])}
              />
            </Field>
            {file && (
              <p className="mt-3 break-all text-sm text-violet-700">
                {file.name}
              </p>
            )}
          </div>
        ) : (
          <Field
            label={
              record?.lecture_type === 'document'
                ? 'Replace document content (optional)'
                : 'Document content'
            }
            htmlFor="lecture-content"
            required={record?.lecture_type !== 'document'}
          >
            <Textarea
              id="lecture-content"
              name="document_content"
              required={record?.lecture_type !== 'document'}
            />
          </Field>
        )}
        {(error || fileError) && (
          <p role="alert" className="text-sm text-red-700">
            {error || fileError}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="primary"
            disabled={!saveEnabled}
            title={
              !saveEnabled ? 'Lecture saving is not available yet' : undefined
            }
          >
            {pending ? 'Saving…' : record ? 'Save changes' : 'Create lecture'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
