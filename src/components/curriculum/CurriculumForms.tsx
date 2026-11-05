import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { FileUpload } from '../ui/FileUpload';
import type { AdminSection } from '../../api/services/sections';
import type {
  AdminLecture,
  LectureType,
} from '../../api/services/lectures';

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
  pending,
  error,
  onSubmit,
}: {
  record?: AdminLecture;
  pending: boolean;
  error?: string;
  onSubmit: (data: FormData) => void;
}) {
  const [type, setType] = useState<LectureType>(
    record?.lecture_type ?? 'video',
  );
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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
    data.set('lecture_type', type);
    data.set('is_preview', data.has('is_preview') ? 'true' : 'false');
    data.delete('source');
    if (type === 'video' && file) data.set('source', file);
    data.delete('thumbnail');
    if (thumbnail) data.set('thumbnail', thumbnail);
    onSubmit(data);
  }
  function chooseFile(next?: File | null) {
    if (next && !next.type.startsWith('video/')) {
      setFileError('Choose a video file.');
      return;
    }
    setFile(next ?? null);
    setFileError('');
  }
  function chooseThumbnail(next?: File | null) {
    if (next && !next.type.startsWith('image/')) {
      setFileError('Choose an image file for the thumbnail.');
      return;
    }
    setThumbnail(next ?? null);
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
            <Select
              id="lecture-type"
              label="Lecture type"
              value={type}
              onChange={(event) => {
                if (event === 'video' || event === 'document') setType(event);
                setFileError('');
              }}
              options={[
                { value: 'video', label: 'Video' },
                { value: 'document', label: 'Document' },
              ]}
            />
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
          <Field
            label={record?.source ? 'Replace video (optional)' : 'Video'}
            htmlFor="lecture-video"
            required={!record?.source}
          >
            <FileUpload
              id="lecture-video"
              name="source"
              accept="video/*"
              actionLabel="Choose video"
              emptyLabel="No video selected"
              hint="Video files"
              currentFileLabel={
                record?.source ? 'Current video uploaded' : undefined
              }
              file={file}
              onChange={chooseFile}
              disabled={pending}
            />
          </Field>
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
              defaultValue={record?.document_content ?? ''}
            />
          </Field>
        )}
        <Field label="Thumbnail (optional)" htmlFor="lecture-thumbnail">
          <FileUpload
            id="lecture-thumbnail"
            name="thumbnail"
            accept="image/*"
            actionLabel="Choose thumbnail"
            emptyLabel="No thumbnail selected"
            hint="Image files"
            currentFileLabel={
              record?.thumbnail ? 'Current thumbnail uploaded' : undefined
            }
            file={thumbnail}
            onChange={chooseThumbnail}
            disabled={pending}
          />
        </Field>
        {(error || fileError) && (
          <p role="alert" className="text-sm text-red-700">
            {error || fileError}
          </p>
        )}
        <div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Saving…' : record ? 'Save changes' : 'Create lecture'}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
