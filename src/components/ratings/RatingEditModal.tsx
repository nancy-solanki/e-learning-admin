import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiErrorMessage, apiFieldErrors } from '../../api/errors';
import type { Rating, RatingUpdate } from '../../api/services/ratings';
import { useRatingActions } from '../../state/ratings';
import { CloseIcon } from '../icons/AdminIcons';
import { Button } from '../ui/Button';
import { Field, Textarea } from '../ui/Input';

export function RatingEditModal({
  rating,
  onClose,
  onSaved,
}: {
  rating: Rating;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { updateRating } = useRatingActions();
  const [comment, setComment] = useState(rating.comment ?? '');
  const [response, setResponse] = useState(rating.response ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    const overflow = document.body.style.overflow;
    node?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const values: RatingUpdate = {
      comment: comment.trim() || null,
      response: response.trim() || null,
    };
    setFieldErrors({});
    setSaving(true);
    setError('');
    try {
      await updateRating(rating.id, values);
      onSaved();
    } catch (failure) {
      setFieldErrors(apiFieldErrors(failure));
      setError(
        apiErrorMessage(
          failure,
          'Unable to update this rating. Please try again.',
          { includeFieldErrors: true },
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const reviewer =
    rating.user && typeof rating.user === 'object'
      ? rating.user.full_name ||
        rating.user.username ||
        rating.user.email ||
        'Reviewer'
      : 'Reviewer';

  return (
    <dialog
      ref={dialog}
      aria-labelledby="rating-edit-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
    >
      <form
        id="rating-edit"
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-2rem)] flex-col"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <p className="font-display text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
              FEEDBACK MODERATION
            </p>
            <h2
              id="rating-edit-title"
              className="mt-1 font-display text-2xl font-bold"
            >
              Edit rating
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {rating.course_title || 'Course review'} · {reviewer} · Rating{' '}
              {rating.rating}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
          >
            <CloseIcon className="size-5" />
          </button>
        </header>
        <fieldset
          disabled={saving}
          className="ui-scroll-area grid gap-5 overflow-y-auto p-6 sm:p-8"
        >
          <Field
            label="Comment"
            htmlFor="rating-edit-comment"
            error={fieldErrors.comment}
          >
            <Textarea
              id="rating-edit-comment"
              aria-label="Rating comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              aria-invalid={Boolean(fieldErrors.comment)}
              autoFocus
            />
          </Field>
          <Field
            label="Instructor response"
            htmlFor="rating-edit-response"
            error={fieldErrors.response}
          >
            <Textarea
              id="rating-edit-response"
              aria-label="Instructor response"
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              aria-invalid={Boolean(fieldErrors.response)}
            />
          </Field>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
        </fieldset>
        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
