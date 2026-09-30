import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { Input, Field } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  CouponIcon,
  CloseIcon,
  SearchIcon,
} from '../../components/icons/AdminIcons';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { apiErrorMessage, apiFieldErrors } from '../../api/errors';
import {
  getCoupon,
  listCoupons,
  saveCoupon,
  toggleCoupon,
  type Coupon,
  type CouponDraft,
} from '../../api/services/coupons';
import { listCourseOptions } from '../../api/services/courses';
import { useCurrentUser } from '../../state/profile';
import { getSessionVersion } from '../../state/session';
import { queryClient } from '../../state/queryClient';
import { isAdmin } from '../../lib/permissions';
import { couponStatus, draftSchema, emptyDraft, importDraft } from './model';
import '../categories/categories.css';
import './coupons.css';

function CouponEditor({
  coupon,
  admin,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  admin: boolean;
  onClose: () => void;
  onSaved: (coupon: Coupon) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<CouponDraft>(() =>
    coupon ? draftSchema.parse(coupon) : emptyDraft(admin),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState('');
  const busy = pending || reading;
  const courses = useQuery({
    queryKey: ['courses', 'coupon-options'],
    queryFn: ({ signal }) => listCourseOptions(signal),
  });
  const courseOptions = (courses.data ?? []).map((course) => ({
    value: course.id,
    label: course.title,
  }));
  if (
    draft.course &&
    coupon?.course === draft.course &&
    !courseOptions.some((option) => option.value === draft.course)
  ) {
    courseOptions.unshift({
      value: draft.course,
      label: coupon.course_title,
    });
  }

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
  function update<K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }
  async function choose(files: File[]) {
    if (busy || !files.length) return;
    setError('');
    setReading(true);
    try {
      if (files.length !== 1)
        throw new Error('Select one JSON file at a time.');
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.json'))
        throw new Error('Please choose a .json coupon file.');
      if (file.size > 1024 * 1024)
        throw new Error('Choose a file smaller than 1 MB.');
      const imported = importDraft(await file.text(), admin);
      const available = await courses.refetch();
      const validCourse =
        available.isSuccess &&
        available.data.some((course) => course.id === imported.course);
      setDraft({ ...imported, course: validCourse ? imported.course : '' });
      setFilename(file.name);
      setErrors(
        validCourse
          ? {}
          : {
              course: available.isError
                ? 'Your draft is imported. Reload the course list and select a course before saving.'
                : imported.course
                  ? 'The imported course is unavailable. Select a course from the list before saving.'
                  : 'Your draft is imported. Select a course before saving.',
            },
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to read this file.',
      );
    } finally {
      setReading(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (
      (!coupon || coupon.course !== draft.course) &&
      !courses.data?.some((course) => course.id === draft.course)
    ) {
      setErrors({ course: 'Select an available course before saving.' });
      return;
    }
    const result = draftSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    setPending(true);
    setError('');
    setErrors({});
    try {
      const body = coupon
        ? Object.fromEntries(
            Object.entries(result.data).filter(
              ([key, value]) => coupon[key as keyof CouponDraft] !== value,
            ),
          )
        : result.data;
      onSaved(await saveCoupon(body, coupon?.id));
    } catch (failure) {
      setErrors(apiFieldErrors(failure));
      setError(apiErrorMessage(failure, 'Unable to save this coupon.'));
    } finally {
      setPending(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="category-dialog coupon-dialog"
      aria-labelledby="coupon-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <header className="category-dialog-heading">
          <div>
            <span className="category-eyebrow">
              A LITTLE INCENTIVE. A BIG OPPORTUNITY.
            </span>
            <h2 id="coupon-editor-title">
              {coupon ? 'Edit coupon' : 'Create a coupon'}
            </h2>
            <p>Give learners a reason to take their next step.</p>
          </div>
          <button
            type="button"
            className="category-icon-button"
            aria-label="Close editor"
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <fieldset className="category-form" disabled={busy}>
          <div className="coupon-preview">
            <CouponIcon className="h-7 w-7" />
            <div>
              <strong>
                {draft.coupon_type === 'percentage'
                  ? `${draft.value || 0}%`
                  : draft.value || 0}{' '}
                OFF
              </strong>
              <span>{draft.code || 'YOUR NEXT GREAT OFFER'}</span>
            </div>
            <small>{draft.is_global ? 'All courses' : 'Course offer'}</small>
          </div>
          {!coupon && (
            <div
              className={`category-dropzone ${dragging ? 'is-dragging' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void choose(Array.from(event.dataTransfer.files));
              }}
            >
              <span className="category-upload-icon" aria-hidden="true">
                ↑
              </span>
              <button
                type="button"
                className="category-upload-button"
                onClick={() => fileInput.current?.click()}
              >
                {reading ? 'Reading file…' : 'Upload a coupon draft'}
                <span> or drag and drop</span>
              </button>
              <p>
                {filename
                  ? `${filename} · Ready to review below`
                  : 'One JSON file · Up to 1 MB · Select a course after import'}
              </p>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                aria-label="Upload coupon draft"
                className="sr-only"
                onChange={(event) => {
                  void choose(Array.from(event.target.files ?? []));
                  event.target.value = '';
                }}
              />
              <a
                className="category-text-button"
                href="/templates/coupon.json"
                download
              >
                Download example JSON
              </a>
            </div>
          )}
          <Field
            label="Coupon code"
            htmlFor="coupon-code"
            required
            error={errors.code}
          >
            <Input
              id="coupon-code"
              autoFocus
              maxLength={100}
              value={draft.code}
              placeholder="e.g. LEARN20"
              onChange={(e) => update('code', e.target.value)}
              aria-invalid={!!errors.code}
              aria-describedby="coupon-code-help"
            />
          </Field>
          <Field
            label="Course"
            htmlFor="coupon-course"
            required
            error={errors.course}
            hint="A course is required, including for global offers."
          >
            <Select
              id="coupon-course"
              label="Course"
              value={draft.course}
              onChange={(value) => update('course', value)}
              disabled={busy || courses.isPending}
              invalid={!!errors.course}
              describedBy="coupon-course-help"
              options={[
                {
                  value: '',
                  label: courses.isPending
                    ? 'Loading courses…'
                    : 'Select a course',
                },
                ...courseOptions,
              ]}
            />
            {courses.isError && (
              <div role="alert" className="ui-field-error">
                Unable to load courses.{' '}
                <button
                  type="button"
                  className="category-text-button"
                  onClick={() => void courses.refetch()}
                >
                  Try again
                </button>
              </div>
            )}
            {courses.isSuccess && !courses.data.length && (
              <p className="ui-field-hint">No courses available to select.</p>
            )}
          </Field>
          <div className="coupon-form-grid">
            <Field
              label="Discount type"
              htmlFor="coupon-type"
              error={errors.coupon_type}
            >
              <Select
                id="coupon-type"
                label="Discount type"
                value={draft.coupon_type}
                onChange={(value) =>
                  update('coupon_type', value as CouponDraft['coupon_type'])
                }
                disabled={busy}
                invalid={!!errors.coupon_type}
                describedBy="coupon-type-help"
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'fixed', label: 'Fixed amount' },
                ]}
              />
            </Field>
            <Field
              label="Discount value"
              htmlFor="coupon-value"
              error={errors.value}
              required
            >
              <Input
                id="coupon-value"
                type="number"
                step="1"
                required
                value={Number.isNaN(draft.value) ? '' : draft.value}
                onChange={(e) => update('value', e.target.valueAsNumber)}
                aria-describedby="coupon-value-help"
              />
            </Field>
          </div>
          <div className="coupon-form-grid">
            <Field
              label="Usage limit"
              htmlFor="coupon-limit"
              error={errors.limit}
            >
              <Input
                id="coupon-limit"
                type="number"
                step="1"
                required
                disabled={draft.is_unlimited}
                value={Number.isNaN(draft.limit) ? '' : draft.limit}
                onChange={(e) => update('limit', e.target.valueAsNumber)}
                aria-describedby="coupon-limit-help"
              />
            </Field>
            <Field
              label="Expiry date"
              htmlFor="coupon-expiry"
              error={errors.expired_at}
              hint="Leave blank for the default of 3 days."
            >
              <Input
                id="coupon-expiry"
                type="date"
                value={draft.expired_at ?? ''}
                onChange={(e) => update('expired_at', e.target.value || null)}
                aria-describedby="coupon-expiry-help"
              />
            </Field>
          </div>
          <div className="coupon-options">
            {(
              [
                [
                  'is_unlimited',
                  'Unlimited redemptions',
                  'Remove the usage cap for this offer.',
                ],
                [
                  'is_global',
                  'Global coupon',
                  'Make this offer available across courses.',
                ],
                ...(admin
                  ? [
                      [
                        'is_instructor_created',
                        'Instructor-managed',
                        'Allow the course instructor to manage this coupon.',
                      ],
                    ]
                  : []),
              ] as [keyof CouponDraft, string, string][]
            ).map(([key, label, hint]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(draft[key])}
                  onChange={(e) => update(key, e.target.checked)}
                />
                <span>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </span>
              </label>
            ))}
          </div>
          {error && (
            <p role="alert" className="category-error">
              {error}
            </p>
          )}
        </fieldset>
        <footer className="category-dialog-footer">
          <button
            type="button"
            className="category-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="category-primary" disabled={busy}>
            {pending ? 'Saving…' : coupon ? 'Save changes' : 'Create coupon'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default function CouponsPage() {
  const { data: user } = useCurrentUser();
  const admin = isAdmin(user ?? null);
  const allowed =
    admin ||
    !!user?.role?.some(
      (role) =>
        role
          .trim()
          .toLowerCase()
          .replace(/^role_/, '') === 'instructor',
    );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('current');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ coupon: Coupon | null } | null>(null);
  const [target, setTarget] = useState<Coupon | null>(null);
  const [pending, setPending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const version = getSessionVersion();
  const filters = {
    search: query || undefined,
    coupon_type: type || undefined,
    is_deleted: status === 'all' ? undefined : status === 'deleted',
    ordering,
    page,
    page_size: 9,
  };
  const coupons = useQuery({
    queryKey: ['coupons', filters],
    queryFn: ({ signal }) => listCoupons(filters, signal),
    enabled: allowed,
  });
  const data = coupons.data;
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  async function refresh() {
    if (version === getSessionVersion())
      await queryClient.invalidateQueries({ queryKey: ['coupons'] });
  }
  async function edit(coupon: Coupon) {
    setOpening(true);
    setActionError('');
    try {
      const latest = await getCoupon(coupon.id);
      if (version === getSessionVersion()) setEditor({ coupon: latest });
    } catch (failure) {
      setActionError(apiErrorMessage(failure, 'Unable to open this coupon.'));
    } finally {
      setOpening(false);
    }
  }
  async function toggle() {
    if (!target || pending) return;
    setPending(true);
    setActionError('');
    try {
      const result = await toggleCoupon(target.id);
      setNotice(result.message);
      setTarget(null);
      if (data?.results.length === 1 && page > 1 && status !== 'all')
        setPage(page - 1);
      await refresh();
    } catch (failure) {
      setActionError(
        apiErrorMessage(
          failure,
          'Unable to change this coupon. Refresh the list to verify its current state before trying again.',
        ),
      );
    } finally {
      setPending(false);
    }
  }
  if (!allowed) return <Navigate to="/" replace />;
  return (
    <section className="categories-page coupons-page">
      <div className="category-page-heading">
        <div>
          <span className="category-eyebrow">
            MORE LEARNING. MORE POSSIBILITY.
          </span>
          <h1>
            Coupons<span className="category-heading-dot">.</span>
          </h1>
          <p>Create a little motivation for their next big step.</p>
        </div>
        <button
          className="category-primary"
          onClick={() => setEditor({ coupon: null })}
        >
          <span aria-hidden="true">＋</span> Create coupon
        </button>
      </div>
      <div className="coupon-hero">
        <div>
          <span className="coupon-hero-label">
            GOOD THINGS START WITH AN OFFER
          </span>
          <h2>
            Open the door to
            <br />
            something new.
          </h2>
          <p>Thoughtful offers that turn curiosity into learning.</p>
        </div>
        <div className="coupon-hero-ticket" aria-hidden="true">
          <CouponIcon className="h-8 w-8" />
          <strong>
            Learn more.
            <br />
            Spend less.
          </strong>
          <span>THE NEXT CHAPTER STARTS HERE</span>
        </div>
      </div>
      {notice && (
        <div role="status" className="category-notice">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {actionError && !target && (
        <p role="alert" className="category-error">
          {actionError}
        </p>
      )}
      <div className="coupon-collection-heading">
        <h2>
          Your offers <span>{data?.count ?? '—'}</span>
        </h2>
        <p>Manage every incentive in one place.</p>
      </div>
      <div className="coupon-toolbar">
        <div className="category-search">
          <SearchIcon className="h-4 w-4" />
          <Input
            aria-label="Search coupons"
            placeholder="Search code or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          label="Discount type"
          value={type}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All discount types' },
            { value: 'percentage', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed amount' },
          ]}
        />
        {admin && (
          <Select
            label="Coupon visibility"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'current', label: 'Not deleted' },
              { value: 'deleted', label: 'Deleted' },
              { value: 'all', label: 'All coupons' },
            ]}
          />
        )}
        <Select
          label="Sort coupons"
          value={ordering}
          onChange={(value) => {
            setOrdering(value);
            setPage(1);
          }}
          options={[
            { value: '-created_at', label: 'Newest first' },
            { value: 'expired_at', label: 'Expiry date' },
            { value: '-value', label: 'Highest value' },
            { value: 'code', label: 'Code: A–Z' },
          ]}
        />
      </div>
      {coupons.isFetching ? (
        <div
          className="category-grid"
          role="status"
          aria-label="Loading coupons"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div className="category-skeleton" key={i}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : coupons.isError ? (
        <div className="category-empty" role="alert">
          <h2>We couldn’t load your coupons</h2>
          <p>
            {apiErrorMessage(
              coupons.error,
              'Check your connection and try again.',
            )}
          </p>
          <button
            className="category-secondary"
            onClick={() => {
              if (page > 1) setPage(1);
              else void coupons.refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : !data?.results.length ? (
        <div className="category-empty">
          <CouponIcon className="mx-auto h-12 w-12 text-violet-300" />
          <h2>
            {query || type || status !== 'current'
              ? 'No matching offers'
              : 'Your first offer starts here'}
          </h2>
          <p>
            Create a coupon or adjust your filters to find an existing offer.
          </p>
          <button
            className="category-primary"
            onClick={() => setEditor({ coupon: null })}
          >
            Create coupon
          </button>
          <button
            className="category-secondary ml-3"
            onClick={() => {
              setSearch('');
              setType('');
              setStatus('current');
              setPage(1);
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="category-grid">
            {data.results.map((coupon) => {
              const state = couponStatus(coupon);
              return (
                <article className="coupon-card" key={coupon.id}>
                  <div className="coupon-card-top">
                    <span className="coupon-kind">
                      <CouponIcon className="h-4 w-4" />
                      {coupon.coupon_type === 'percentage'
                        ? 'PERCENTAGE'
                        : 'FIXED AMOUNT'}
                    </span>
                    <span
                      className={`coupon-status status-${state.toLowerCase()}`}
                    >
                      {state}
                    </span>
                  </div>
                  <div className="coupon-card-content">
                    <div className="coupon-value">
                      {coupon.value}
                      {coupon.coupon_type === 'percentage' && '%'}
                      <span>off</span>
                    </div>
                    <h3>{coupon.code}</h3>
                    <p className="coupon-course">
                      {coupon.is_global
                        ? 'All courses'
                        : coupon.course_title || 'Course offer'}
                    </p>
                    <div className="coupon-usage">
                      <span>Redemptions</span>
                      <strong>
                        {coupon.used.toLocaleString()} /{' '}
                        {coupon.is_unlimited
                          ? 'Unlimited'
                          : coupon.limit.toLocaleString()}
                      </strong>
                    </div>
                    <div className="coupon-meter" aria-hidden="true">
                      <span
                        style={{
                          width: `${coupon.is_unlimited ? 0 : Math.min(100, Math.max(0, (coupon.used / Math.max(1, coupon.limit)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <footer>
                    <span>
                      {coupon.expired_at
                        ? `Expires ${new Date(`${coupon.expired_at}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'No expiry date'}
                    </span>
                    <div>
                      {!coupon.deleted_at && (
                        <button
                          disabled={opening}
                          onClick={() => void edit(coupon)}
                          aria-label={`Edit ${coupon.code}`}
                        >
                          Edit ↗
                        </button>
                      )}
                      {(!coupon.deleted_at || admin) && (
                        <button
                          className={coupon.deleted_at ? '' : 'coupon-delete'}
                          onClick={() => {
                            setActionError('');
                            setTarget(coupon);
                          }}
                          aria-label={`${coupon.deleted_at ? 'Restore' : 'Delete'} ${coupon.code}`}
                        >
                          {coupon.deleted_at ? 'Restore' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
          <div className="category-pagination">
            <p>
              Showing {(page - 1) * 9 + 1}–{Math.min(page * 9, data.count)} of{' '}
              {data.count} coupons
            </p>
            <div>
              <button
                className="category-secondary"
                disabled={!data.previous}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(data.count / 9))}
              </span>
              <button
                className="category-secondary"
                disabled={!data.next}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      {editor && (
        <CouponEditor
          coupon={editor.coupon}
          admin={admin}
          onClose={() => setEditor(null)}
          onSaved={(saved) => {
            setNotice(
              `“${saved.code}” was ${editor.coupon ? 'updated' : 'created'} successfully.`,
            );
            setEditor(null);
            void refresh();
          }}
        />
      )}
      {target && (
        <ConfirmationDialog
          title={target.deleted_at ? 'Restore coupon?' : 'Delete coupon?'}
          description={
            target.deleted_at
              ? `“${target.code}” will be restored. Its expiry and usage limit still apply.`
              : `“${target.code}” will no longer be redeemable.${admin ? ' You can restore it from the deleted coupons filter.' : ''}`
          }
          confirmLabel={target.deleted_at ? 'Restore coupon' : 'Delete coupon'}
          variant={target.deleted_at ? 'primary' : 'danger'}
          pending={pending}
          error={actionError}
          onCancel={() => {
            setTarget(null);
            setActionError('');
          }}
          onConfirm={() => void toggle()}
        />
      )}
    </section>
  );
}
