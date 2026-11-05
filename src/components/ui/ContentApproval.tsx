import axios from 'axios';
import { apiErrorMessage } from '../../api/errors';
import { Button } from './Button';

type WorkflowStatus =
  'draft' | 'in-review' | 'rejected' | 'published' | 'approved';

function canSubmit(status: WorkflowStatus) {
  return status === 'draft' || status === 'rejected';
}

function approvalError(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return 'Access denied.';
    if (error.response?.status === 404)
      return 'This resource was not found in your account.';
  }
  return apiErrorMessage(error, 'Could not submit for approval.', {
    includeFieldErrors: true,
  });
}

export function ContentApproval({
  status,
  rejectReason,
  parentWaiting = false,
  pending = false,
  error,
  message,
  sectionNeedsLecture = false,
  onSubmit,
}: {
  status: WorkflowStatus;
  rejectReason?: string | null;
  parentWaiting?: boolean;
  pending?: boolean;
  error?: unknown;
  message?: string;
  sectionNeedsLecture?: boolean;
  onSubmit?: () => void;
}) {
  const label =
    status === 'in-review'
      ? 'In review'
      : status === 'approved'
        ? 'Approved'
        : status[0].toUpperCase() + status.slice(1);
  return (
    <div className="grid justify-items-start gap-2">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          status === 'published'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : status === 'in-review'
                ? 'bg-amber-50 text-amber-800'
                : 'bg-violet-50 text-violet-700'
        }`}
      >
        {label}
      </span>
      {status === 'in-review' && (
        <p className="text-xs text-slate-500">
          Awaiting admin approval. Resubmission is disabled while in review.
        </p>
      )}
      {status === 'approved' && (
        <p className="text-xs text-slate-500">
          Approved courses are not public until their status is published.
        </p>
      )}
      {status === 'rejected' && rejectReason && (
        <p className="text-xs text-red-700">Reason: {rejectReason}</p>
      )}
      {parentWaiting && (
        <p className="text-xs text-amber-700">Waiting for parent approval.</p>
      )}
      {message && (
        <p role="status" className="text-xs text-emerald-700">
          {message}
        </p>
      )}
      {error !== undefined && error !== null && (
        <div className="grid gap-1">
          <p role="alert" className="text-xs text-red-700">
            {approvalError(error)}
          </p>
          {sectionNeedsLecture && (
            <p className="text-xs text-slate-600">
              A section needs at least one active lecture before it can be
              submitted. Add a lecture, then try again.
            </p>
          )}
        </div>
      )}
      {onSubmit && (
        <ContentApprovalAction
          status={status}
          pending={pending}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}

export function ContentApprovalAction({
  status,
  pending = false,
  keepMenuOpen = false,
  onSubmit,
}: {
  status: WorkflowStatus;
  pending?: boolean;
  keepMenuOpen?: boolean;
  onSubmit: () => void;
}) {
  if (!canSubmit(status)) return null;

  return (
    <Button
      disabled={pending}
      onClick={onSubmit}
      data-keep-action-menu-open={keepMenuOpen || undefined}
      className="w-full justify-start whitespace-nowrap !px-3 !py-2 text-left text-sm"
    >
      {pending
        ? 'Submitting…'
        : status === 'rejected'
          ? 'Resubmit for approval'
          : 'Submit for approval'}
    </Button>
  );
}
