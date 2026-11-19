import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { Field, Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type {
  TransactionFilters,
  TransactionWalletOption,
} from '../../api/services/transactions';

const defaultFilters: TransactionFilters = { ordering: '-created_at' };

export function TransactionFiltersDrawer({
  filters,
  wallets,
  showWalletFilter,
  onApply,
  onClose,
}: {
  filters: TransactionFilters;
  wallets: TransactionWalletOption[];
  showWalletFilter: boolean;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TransactionFilters>(filters);
  const update = (key: keyof TransactionFilters, value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: value
        ? key === 'amount_min' || key === 'amount_max'
          ? Number(value)
          : value
        : undefined,
    }));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply({
      ...draft,
      wallet: draft.wallet?.trim() || undefined,
      tx_id: draft.tx_id?.trim() || undefined,
    });
  }
  return (
    <Drawer
      title="Filter transactions"
      description="Narrow transactions by status, type, wallet, amount, or date."
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => setDraft(defaultFilters)}>
            Reset filters
          </Button>
          <Button variant="primary" type="submit" form="transaction-filters">
            Apply filters
          </Button>
        </>
      }
    >
      <form id="transaction-filters" onSubmit={submit} className="grid gap-5">
        <Field label="Status" htmlFor="transaction-filter-status">
          <Select
            id="transaction-filter-status"
            label="Transaction status"
            value={draft.status ?? ''}
            onChange={(value) => update('status', value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'success', label: 'Success' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </Field>
        <Field label="Transaction type" htmlFor="transaction-filter-type">
          <Select
            id="transaction-filter-type"
            label="Transaction type"
            value={draft.transaction_type ?? ''}
            onChange={(value) => update('transaction_type', value)}
            options={[
              { value: '', label: 'All types' },
              { value: 'credit', label: 'Credit' },
              { value: 'debit', label: 'Debit' },
            ]}
          />
        </Field>
        {showWalletFilter && (
          <Field label="Wallet" htmlFor="transaction-filter-wallet">
            <Select
              id="transaction-filter-wallet"
              label="Wallet"
              value={draft.wallet ?? ''}
              onChange={(value) => update('wallet', value)}
              options={[
                { value: '', label: 'All wallets' },
                ...wallets.map(({ id, user }) => ({
                  value: id,
                  label: `${user.full_name || user.username} (${id})`,
                })),
                ...(draft.wallet &&
                !wallets.some(({ id }) => id === draft.wallet)
                  ? [{ value: draft.wallet, label: draft.wallet }]
                  : []),
              ]}
            />
          </Field>
        )}
        <Field label="Transaction ID" htmlFor="transaction-filter-tx-id">
          <Input
            id="transaction-filter-tx-id"
            value={draft.tx_id ?? ''}
            onChange={(event) => update('tx_id', event.target.value)}
            placeholder="Any transaction ID"
          />
        </Field>
        <Field label="Minimum amount" htmlFor="transaction-filter-min">
          <Input
            id="transaction-filter-min"
            type="number"
            min="0"
            value={draft.amount_min ?? ''}
            onChange={(event) => update('amount_min', event.target.value)}
            placeholder="No minimum"
          />
        </Field>
        <Field label="Maximum amount" htmlFor="transaction-filter-max">
          <Input
            id="transaction-filter-max"
            type="number"
            min="0"
            value={draft.amount_max ?? ''}
            onChange={(event) => update('amount_max', event.target.value)}
            placeholder="No maximum"
          />
        </Field>
        <Field label="Created after" htmlFor="transaction-filter-after">
          <Input
            id="transaction-filter-after"
            type="date"
            value={draft.created_at_after ?? ''}
            onChange={(event) => update('created_at_after', event.target.value)}
          />
        </Field>
        <Field label="Created before" htmlFor="transaction-filter-before">
          <Input
            id="transaction-filter-before"
            type="date"
            value={draft.created_at_before ?? ''}
            onChange={(event) =>
              update('created_at_before', event.target.value)
            }
          />
        </Field>
        <Field label="Sort by" htmlFor="transaction-filter-ordering">
          <Select
            id="transaction-filter-ordering"
            label="Transaction sorting"
            value={draft.ordering ?? '-created_at'}
            onChange={(value) => update('ordering', value)}
            options={[
              { value: '-created_at', label: 'Newest first' },
              { value: 'created_at', label: 'Oldest first' },
              { value: '-amount', label: 'Highest amount' },
              { value: 'amount', label: 'Lowest amount' },
            ]}
          />
        </Field>
      </form>
    </Drawer>
  );
}
