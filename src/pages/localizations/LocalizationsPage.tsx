import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiErrorMessage, apiFieldErrors } from '../../api/errors';
import type {
  Localization,
  LocalizationDraft,
} from '../../api/services/localizations';
import { GlobeIcon } from '../../components/icons/AdminIcons';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Field, Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useCurrentUser } from '../../state/profile';
import {
  useLocalizationActions,
  useLocalizations,
} from '../../state/localizations';
import { isAdmin } from '../../lib/permissions';
import { getLocalization } from '../../api/services/localizations';

function LocalizationEditor({
  localization,
  onClose,
  onSaved,
}: {
  localization: Localization | null;
  onClose: () => void;
  onSaved: (saved: Localization) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { createLocalization, replaceLocalization } = useLocalizationActions();
  const [languageName, setLanguageName] = useState(
    localization?.language_name ?? '',
  );
  const [country, setCountry] = useState(localization?.country ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const draft: LocalizationDraft = {
      language_name: languageName.trim(),
      country: country.trim(),
    };
    const validation: Record<string, string> = {};
    if (!draft.language_name)
      validation.language_name = 'Enter a language name.';
    else if (draft.language_name.length > 100)
      validation.language_name = 'Use 100 characters or fewer.';
    if (!draft.country) validation.country = 'Enter a country.';
    else if (draft.country.length > 100)
      validation.country = 'Use 100 characters or fewer.';
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setPending(true);
    setError('');
    try {
      const saved = localization
        ? await replaceLocalization(localization.id, draft)
        : await createLocalization(draft);
      onSaved(saved);
    } catch (failure) {
      setErrors(apiFieldErrors(failure));
      setError(
        apiErrorMessage(
          failure,
          'Unable to save this localization. Please try again.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="localization-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-slate-100 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
    >
      <form onSubmit={submit} className="p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Localization
          </p>
          <h2 id="localization-editor-title" className="mt-2 text-xl font-bold">
            {localization ? 'Edit localization' : 'Create localization'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the language and country for this localization.
          </p>
        </div>
        <fieldset disabled={pending} className="grid gap-5">
          <Field
            label="Language name"
            htmlFor="localization-language"
            required
            error={errors.language_name}
          >
            <Input
              autoFocus
              id="localization-language"
              maxLength={100}
              value={languageName}
              onChange={(event) => setLanguageName(event.target.value)}
              placeholder="e.g. English"
              aria-invalid={!!errors.language_name}
            />
          </Field>
          <Field
            label="Country"
            htmlFor="localization-country"
            required
            error={errors.country}
          >
            <Input
              id="localization-country"
              maxLength={100}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="e.g. India"
              aria-invalid={!!errors.country}
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
        <footer className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={pending}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending
              ? 'Saving…'
              : localization
                ? 'Save changes'
                : 'Create localization'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function LocalizationsPage() {
  const { data: user } = useCurrentUser();
  const canManage = isAdmin(user ?? null);
  const [search, setSearch] = useState('');
  const [languageName, setLanguageName] = useState('');
  const [country, setCountry] = useState('');
  const [query, setQuery] = useState({
    search: '',
    language_name: '',
    country: '',
  });
  const previousInputs = useRef({ search: '', languageName: '', country: '' });
  const [ordering, setOrdering] = useState('-created_at,-id');
  const [status, setStatus] = useState<'all' | 'active' | 'deleted'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const filters = {
    ...(query.search ? { search: query.search } : {}),
    ...(query.language_name ? { language_name: query.language_name } : {}),
    ...(query.country ? { country: query.country } : {}),
    ...(canManage && status !== 'all'
      ? { is_deleted: status === 'deleted' }
      : canManage
        ? {}
        : { is_deleted: false }),
    ordering,
    page,
    page_size: pageSize,
  };
  const listQuery = useLocalizations(filters);
  const { toggleLocalization } = useLocalizationActions();
  const { data } = listQuery;
  const [editor, setEditor] = useState<Localization | null | undefined>(
    undefined,
  );
  const [opening, setOpening] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Localization | null>(null);
  const [pendingToggle, setPendingToggle] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const loadError = listQuery.isError
    ? apiErrorMessage(
        listQuery.error,
        'Unable to load localizations. Please try again.',
      )
    : '';

  useEffect(() => {
    if (
      previousInputs.current.search === search &&
      previousInputs.current.languageName === languageName &&
      previousInputs.current.country === country
    )
      return;
    previousInputs.current = { search, languageName, country };
    const timer = setTimeout(() => {
      setQuery({
        search: search.trim(),
        language_name: languageName.trim(),
        country: country.trim(),
      });
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, languageName, country]);

  async function edit(localization: Localization) {
    setOpening(localization.id);
    setNotice('');
    try {
      setEditor(await getLocalization(localization.id));
    } catch (failure) {
      setNotice(
        apiErrorMessage(
          failure,
          'Unable to open this localization. Please try again.',
        ),
      );
    } finally {
      setOpening(null);
    }
  }

  async function toggle() {
    if (!confirming || pendingToggle) return;
    const target = confirming;
    setPendingToggle(true);
    setActionError('');
    try {
      const result = await toggleLocalization(target.id);
      setNotice(
        result?.message ??
          `"${target.language_name} — ${target.country}" was deleted.`,
      );
      setConfirming(null);
      const recordLeavesCurrentFilter =
        (status === 'active' && !target.deleted_at) ||
        (status === 'deleted' && !!target.deleted_at);
      if (recordLeavesCurrentFilter && data?.results.length === 1 && page > 1)
        setPage((current) => current - 1);
    } catch (failure) {
      setActionError(
        apiErrorMessage(
          failure,
          'Unable to update this localization. Please try again.',
        ),
      );
    } finally {
      setPendingToggle(false);
    }
  }

  return (
    <section className="text-slate-900">
      <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Language settings
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Localizations
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Browse language and country settings for the learning platform.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setEditor(null);
            }}
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
          >
            + Create localization
          </button>
        )}
      </header>

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
            className="font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Search
          <Input
            aria-label="Search localizations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search language or country"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Language name
          <Input
            aria-label="Filter by language name"
            value={languageName}
            onChange={(event) => setLanguageName(event.target.value)}
            placeholder="Exact language match"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Country
          <Input
            aria-label="Filter by country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Exact country match"
          />
        </label>
        <div className="grid content-start gap-1.5 text-xs font-semibold text-slate-600">
          <span>Sort by</span>
          <Select
            label="Sort localizations"
            value={ordering}
            onChange={(value) => {
              setOrdering(value);
              setPage(1);
            }}
            options={[
              { value: '-created_at,-id', label: 'Newest first' },
              { value: 'created_at', label: 'Oldest first' },
              { value: 'language_name', label: 'Language: A–Z' },
              { value: '-language_name', label: 'Language: Z–A' },
              { value: 'country', label: 'Country: A–Z' },
              { value: '-country', label: 'Country: Z–A' },
              { value: 'updated_at', label: 'Least recently updated' },
              { value: '-updated_at', label: 'Recently updated' },
            ]}
          />
        </div>
        {canManage && (
          <div className="grid content-start gap-1.5 text-xs font-semibold text-slate-600">
            <span>Record status</span>
            <Select
              label="Filter by record status"
              value={status}
              onChange={(value) => {
                if (
                  value === 'all' ||
                  value === 'active' ||
                  value === 'deleted'
                )
                  setStatus(value);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'All records' },
                { value: 'active', label: 'Active' },
                { value: 'deleted', label: 'Deleted' },
              ]}
            />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold">
            {status === 'deleted'
              ? 'Deleted localizations'
              : 'All localizations'}
          </h2>
          <span className="text-sm text-slate-500">
            {data ? `${data.count} total` : '—'}
          </span>
        </div>
        {listQuery.isLoading ? (
          <p role="status" className="p-10 text-center text-sm text-slate-500">
            Loading localizations…
          </p>
        ) : loadError ? (
          <div className="p-10 text-center">
            <p role="alert" className="text-sm text-rose-700">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Try again
            </button>
          </div>
        ) : !data?.results.length ? (
          <div className="px-5 py-14 text-center">
            <GlobeIcon className="mx-auto h-10 w-10 text-violet-300" />
            <h3 className="mt-3 font-semibold">No localizations found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the filters or search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Language</th>
                  <th className="px-5 py-3 font-semibold">Country</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  {canManage && (
                    <th className="px-5 py-3 font-semibold">Status</th>
                  )}
                  {canManage && (
                    <th className="px-5 py-3 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((localization) => (
                  <tr key={localization.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold">
                      {localization.language_name}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {localization.country}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {localization.created_at
                        ? new Date(localization.created_at).toLocaleDateString()
                        : 'Date unavailable'}
                    </td>
                    {canManage && (
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${localization.deleted_at ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          {localization.deleted_at ? 'Deleted' : 'Active'}
                        </span>
                      </td>
                    )}
                    {canManage && (
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {localization.deleted_at ? (
                            <span className="px-3 py-2 text-xs text-slate-400">
                              Read only
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={opening !== null}
                                onClick={() => void edit(localization)}
                                aria-label={`Edit ${localization.language_name} — ${localization.country}`}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                              >
                                {opening === localization.id
                                  ? 'Opening…'
                                  : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError('');
                                  setConfirming(localization);
                                }}
                                aria-label={`Delete ${localization.language_name} — ${localization.country}`}
                                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.count > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, data.count)} of {data.count}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!data.previous || listQuery.isFetching}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                type="button"
                disabled={!data.next || listQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editor !== undefined && (
        <LocalizationEditor
          localization={editor}
          onClose={() => setEditor(undefined)}
          onSaved={(saved) => {
            setNotice(
              `"${saved.language_name} — ${saved.country}" was ${editor ? 'updated' : 'created'} successfully.`,
            );
            setEditor(undefined);
          }}
        />
      )}
      {confirming && (
        <ConfirmationDialog
          title="Delete localization?"
          description={`“${confirming.language_name} — ${confirming.country}” will be marked deleted.`}
          confirmLabel="Delete localization"
          pendingLabel="Deleting…"
          pending={pendingToggle}
          error={actionError}
          onCancel={() => setConfirming(null)}
          onConfirm={() => void toggle()}
        />
      )}
    </section>
  );
}
