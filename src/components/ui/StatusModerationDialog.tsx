import { useState } from 'react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { Field, Textarea } from './Input';
import { Select } from './Select';

export type ModerationStatusOption = {
  value: string;
  label: string;
};

export function StatusModerationDialog({
  currentStatus,
  statuses,
  rejectionReason = false,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  currentStatus: string;
  statuses: readonly ModerationStatusOption[];
  rejectionReason?: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (status: string, reason: string) => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const isChanged = status !== currentStatus;

  return (
    <ConfirmationDialog
      title="Change publication status"
      description={`Current status: ${statuses.find((option) => option.value === currentStatus)?.label ?? currentStatus}.`}
      confirmLabel="Change status"
      pendingLabel="Updating status…"
      pending={pending}
      confirmDisabled={!isChanged}
      error={error}
      variant="primary"
      onCancel={onCancel}
      onConfirm={() => onConfirm(status, reason)}
    >
      <div className="grid gap-4">
        <Field label="New status" htmlFor="moderation-status">
          <Select
            id="moderation-status"
            label="New status"
            value={status}
            disabled={pending}
            onChange={setStatus}
            options={statuses}
          />
        </Field>
        {rejectionReason && status === 'rejected' && (
          <Field label="Rejection reason (optional)" htmlFor="rejection-reason">
            <Textarea
              id="rejection-reason"
              rows={3}
              value={reason}
              disabled={pending}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        )}
      </div>
    </ConfirmationDialog>
  );
}
