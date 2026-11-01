import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccessState } from '../../state/access';
import { listCategoryOptions } from '../../api/services/options';
import {
  createInstructorCourse,
  listCourseLocalizations,
} from '../../api/services/courses';
import { apiErrorMessage, apiFieldErrors } from '../../api/errors';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Input';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Stepper } from '../../components/ui/Stepper';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { TagInput } from '../../components/ui/TagInput';
import { ImageUpload } from '../../components/ui/ImageUpload';

const steps = ['Overview', 'Meta Data', 'Description', 'Gallery', 'Final'];
const initial = {
  title: '',
  short_description: '',
  categories: [] as string[],
  localization: '',
  tags: [] as string[],
  price: '0',
  is_free: false,
  long_description: '',
  requirements: '',
  learn_description_points: '',
  thumbnail: null as File | null,
};
function plainText(html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.body
    .querySelectorAll('br')
    .forEach((node) => node.replaceWith('\n'));
  document.body
    .querySelectorAll('p, div, li')
    .forEach((node) => node.append('\n'));
  return document.body.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
}
function CourseForm() {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const categories = useQuery({
    queryKey: ['course-filter-options', 'categories'],
    queryFn: ({ signal }) => listCategoryOptions(signal),
  });
  const localizations = useQuery({
    queryKey: ['course-localizations'],
    queryFn: ({ signal }) => listCourseLocalizations(signal),
  });
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: createInstructorCourse,
    onSuccess: (course) => {
      queryClient.setQueryData(['admin-course', course.id], course);
      void queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      void queryClient.invalidateQueries({ queryKey: ['course-options'] });
      setStep(4);
    },
    onError: (error) => {
      setFieldErrors(apiFieldErrors(error));
      setError(
        apiErrorMessage(
          error,
          'Could not create the course. Please try again.',
        ),
      );
    },
  });
  function update<K extends keyof typeof initial>(
    key: K,
    value: (typeof initial)[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setFieldErrors({});
    if (
      step === 0 &&
      (!draft.title.trim() ||
        draft.title.trim().length > 250 ||
        !draft.short_description.trim())
    ) {
      setError(
        'Enter a title of at most 250 characters and a short description.',
      );
      return;
    }
    if (step === 1 && !draft.categories.length) {
      setError('Choose at least one category.');
      return;
    }
    if (
      step === 1 &&
      !draft.is_free &&
      (!draft.price.trim() ||
        !Number.isSafeInteger(Number(draft.price)) ||
        Number(draft.price) < 0)
    ) {
      setError('Enter a non-negative whole-number price.');
      return;
    }
    if (
      step === 2 &&
      (!plainText(draft.long_description) || !plainText(draft.requirements))
    ) {
      setError('Enter a long description and course requirements.');
      return;
    }
    if (step === 3) {
      if (!plainText(draft.learn_description_points) || !draft.thumbnail) {
        setError('Add learning points and a course thumbnail.');
        return;
      }
      if (draft.tags.some((tag) => tag.length > 100)) {
        setError('Keywords must be at most 100 characters each.');
        return;
      }
      submitting.current = true;
      setError('');
      try {
        await create.mutateAsync({
          title: draft.title.trim(),
          short_description: draft.short_description.trim(),
          long_description: plainText(draft.long_description),
          requirements: plainText(draft.requirements),
          learn_description_points: plainText(draft.learn_description_points),
          categories: draft.categories,
          ...(draft.localization ? { localization: draft.localization } : {}),
          tags: draft.tags,
          thumbnail: draft.thumbnail,
          is_free: draft.is_free,
          price: draft.is_free ? 0 : Number(draft.price),
          status: 'draft',
        });
      } catch {
        /* Mutation displays API errors without discarding the form. */
      } finally {
        submitting.current = false;
      }
      return;
    }
    setError('');
    setStep((current) => current + 1);
  }
  return (
    <section className="mx-auto max-w-6xl pb-10 text-[#202134]">
      <Link to="/courses" className="mb-5 inline-block text-sm text-brand">
        ← Back to courses
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Create course<span className="text-brand">.</span>
          </h1>
          <p className="text-sm text-slate-500">
            Turn what you know into something worth learning.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {step === 4 ? 'Draft created' : 'New course'}
        </span>
      </div>
      <div className="min-w-0">
        <div className="rounded-2xl border border-[#e9e9f0] bg-white p-5 shadow-[0_8px_40px_-20px_#43387825] sm:p-8">
          <Stepper steps={steps} current={step} />
          {step < 4 && (
            <div className="mb-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
                Step {step + 1} of 4
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight">
                {
                  [
                    'Start with a great first impression',
                    'Help the right learners find you',
                    'Tell learners what to expect',
                    'Give your course the finishing touch',
                  ][step]
                }
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {
                  [
                    'A clear title and a short introduction make your course stand out.',
                    'Choose your categories, language, keywords, and course price.',
                    'Describe the journey and what learners need before they begin.',
                    'Highlight the skills learners will gain and choose an inviting cover image.',
                  ][step]
                }
              </p>
            </div>
          )}
          {step === 4 ? (
            <div
              role="status"
              className="flex min-h-80 flex-col items-center justify-center gap-6 text-center"
            >
              <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-full bg-green-500 text-4xl text-white"
              >
                ✓
              </span>
              <h2 className="font-display text-2xl font-bold">
                Course created successfully
              </h2>
              <p className="max-w-lg text-sm text-slate-500">
                Your course has been saved as a draft. Curriculum management is
                not yet available for instructors.
              </p>
              <Link to="/courses" className="text-sm text-brand">
                Back to courses
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <fieldset
                disabled={create.isPending}
                className="grid min-w-0 gap-6"
              >
                {step === 0 && (
                  <>
                    <Field
                      label="Course title"
                      htmlFor="course-title"
                      required
                      hint={`${draft.title.length} / 250 characters`}
                    >
                      <Input
                        id="course-title"
                        maxLength={250}
                        autoFocus
                        required
                        placeholder="e.g. Python for Beginners: From Zero to Your First Project"
                        value={draft.title}
                        onChange={(event) =>
                          update('title', event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="Short description"
                      htmlFor="course-short-description"
                      required
                    >
                      <Textarea
                        id="course-short-description"
                        required
                        placeholder="What will learners achieve? Describe your course in a sentence or two."
                        value={draft.short_description}
                        onChange={(event) =>
                          update('short_description', event.target.value)
                        }
                      />
                    </Field>
                  </>
                )}
                {step === 1 && (
                  <>
                    <Field
                      label="Category"
                      htmlFor="create-categories"
                      required
                      hint="Choose all the categories that fit your course."
                    >
                      <MultiSelect
                        id="create-categories"
                        label="Categories"
                        describedBy="create-categories-help"
                        options={categories.data ?? []}
                        value={draft.categories}
                        onChange={(value) => update('categories', value)}
                        placeholder={
                          categories.isPending
                            ? 'Loading categories…'
                            : 'Choose categories'
                        }
                        disabled={categories.isPending || categories.isError}
                      />
                      {categories.isPending && (
                        <p role="status">Loading categories…</p>
                      )}
                      {categories.isError && (
                        <Button onClick={() => void categories.refetch()}>
                          Retry loading categories
                        </Button>
                      )}
                      {categories.isSuccess && !categories.data.length && (
                        <p>No categories available.</p>
                      )}
                    </Field>
                    <Field
                      label="Localization"
                      htmlFor="course-localization"
                      hint="Optional. Choose the language and region for this course."
                    >
                      <MultiSelect
                        id="course-localization"
                        label="Localization"
                        describedBy="course-localization-help"
                        options={localizations.data ?? []}
                        value={draft.localization ? [draft.localization] : []}
                        maxSelected={1}
                        onChange={(value) =>
                          update('localization', value[0] ?? '')
                        }
                        placeholder={
                          localizations.isPending
                            ? 'Loading localizations…'
                            : 'Choose a language and region'
                        }
                        disabled={
                          localizations.isPending || localizations.isError
                        }
                      />
                      {localizations.isError && (
                        <div role="alert" className="text-xs text-red-600">
                          Could not load localizations.{' '}
                          <Button onClick={() => void localizations.refetch()}>
                            Retry
                          </Button>
                        </div>
                      )}
                      {localizations.isSuccess &&
                        !localizations.data.length && (
                          <p className="text-xs text-slate-500">
                            No localizations available yet.
                          </p>
                        )}
                    </Field>
                    <Field
                      label="Keywords"
                      htmlFor="course-keywords"
                      hint="Optional. Add up to 10 keywords, at most 100 characters each."
                    >
                      <TagInput
                        id="course-keywords"
                        value={draft.tags}
                        onChange={(value) => update('tags', value)}
                      />
                    </Field>
                    <div className="max-w-48">
                      <Field label="Price" htmlFor="course-price">
                        <Input
                          id="course-price"
                          type="number"
                          min="0"
                          step="1"
                          required
                          disabled={draft.is_free}
                          value={draft.is_free ? '0' : draft.price}
                          onChange={(event) =>
                            update('price', event.target.value)
                          }
                        />
                      </Field>
                    </div>
                    <label className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand"
                        checked={draft.is_free}
                        onChange={(event) =>
                          update('is_free', event.target.checked)
                        }
                      />
                      Free
                    </label>
                  </>
                )}
                {step === 2 && (
                  <>
                    {(
                      [
                        ['long_description', 'Long Description'],
                        ['requirements', 'Requirements'],
                      ] as const
                    ).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        htmlFor={`course-${key}`}
                        required
                      >
                        <RichTextEditor
                          id={`course-${key}`}
                          label={label}
                          value={draft[key]}
                          onChange={(value) => update(key, value)}
                        />
                      </Field>
                    ))}
                  </>
                )}
                {step === 3 && (
                  <>
                    <Field
                      label="Learn Description Points"
                      htmlFor="course-learning"
                      required
                    >
                      <RichTextEditor
                        id="course-learning"
                        label="Learn Description Points"
                        value={draft.learn_description_points}
                        onChange={(value) =>
                          update('learn_description_points', value)
                        }
                      />
                    </Field>
                    <Field
                      label="Course Thumbnail"
                      htmlFor="course-thumbnail"
                      required
                    >
                      <ImageUpload
                        id="course-thumbnail"
                        value={draft.thumbnail}
                        onChange={(value) => update('thumbnail', value)}
                        onError={setError}
                      />
                    </Field>
                  </>
                )}
                {Object.keys(fieldErrors).length > 0 && (
                  <ul role="alert" className="text-sm text-red-700">
                    {Object.entries(fieldErrors).map(([field, message]) => (
                      <li key={field}>
                        {field.replaceAll('_', ' ')}: {message}
                      </li>
                    ))}
                  </ul>
                )}
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div
                  className={`mt-4 flex gap-3 border-t border-slate-100 pt-6 ${step > 0 ? 'justify-between' : ''}`}
                >
                  {step > 0 && (
                    <Button
                      onClick={() => {
                        setError('');
                        setStep(step - 1);
                      }}
                    >
                      Previous
                    </Button>
                  )}
                  <Button variant="primary" type="submit">
                    {create.isPending
                      ? 'Saving…'
                      : step === 3
                        ? 'Create course'
                        : 'Continue →'}
                  </Button>
                </div>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
export default function CreateCoursePage() {
  const access = useAccessState();
  if (access.isPending) return <p role="status">Loading course form…</p>;
  if (!access.isInstructor) return <Navigate to="/courses" replace />;
  return <CourseForm key={access.data!.id} />;
}
