import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { apiErrorMessage, apiFieldErrors } from '../../api/errors';
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccount,
  listBankAccounts,
  setDefaultBankAccount,
  updateBankAccount,
  type BankAccount,
  type BankDraft,
  type BankFilters,
} from '../../api/services/bank';
import { Button } from '../../components/ui/Button';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Field, Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { BankIcon, SearchIcon } from '../../components/icons/AdminIcons';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import '../categories/categories.css';
import './bank.css';
import { Pagination } from '../../components/ui/Pagination';
import { useCurrentUser } from '../../state/profile';
import { queryClient } from '../../state/queryClient';
import { getSessionVersion } from '../../state/session';

const fields = [
  ['name', 'Bank name'],
  ['ifsc_code', 'IFSC'],
  ['account_number', 'Account number'],
] as const;
const masked = (number: string) =>
  `•••• ${number.length > 4 ? number.slice(-4) : '••••'}`;

function AccountEditor({
  account,
  onClose,
  onSaved,
}: {
  account: BankAccount | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<BankDraft>(() => ({
    name: account?.name ?? '',
    ifsc_code: account?.ifsc_code ?? '',
    account_number: account?.account_number ?? '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const version = getSessionVersion();
  async function save() {
    if (lock.current) return;
    const values = Object.fromEntries(
      fields.map(([key]) => [key, draft[key].trim()]),
    ) as BankDraft;
    const invalid = Object.fromEntries(
      fields
        .filter(([key]) => !values[key] || values[key].length > 200)
        .map(([key]) => [
          key,
          'Enter a nonblank value of at most 200 characters.',
        ]),
    );
    setErrors(invalid);
    setError('');
    if (Object.keys(invalid).length) return;
    lock.current = true;
    setPending(true);
    try {
      if (account) {
        const changes = Object.fromEntries(
          fields
            .filter(([key]) => values[key] !== account[key])
            .map(([key]) => [key, values[key]]),
        );
        if (Object.keys(changes).length)
          await updateBankAccount(account.id, changes);
      } else await createBankAccount(values);
      if (version === getSessionVersion()) await onSaved();
    } catch (failure) {
      setErrors(apiFieldErrors(failure));
      setError(
        apiErrorMessage(
          failure,
          'Unable to save this bank account. Check the fields and try again.',
        ),
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <Modal
      title={account ? 'Edit bank account' : 'Add bank account'}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={pending} className="grid gap-5">
          {fields.map(([key, label]) => (
            <Field
              key={key}
              label={label}
              htmlFor={`bank-${key}`}
              error={errors[key]}
              required
            >
              <Input
                id={`bank-${key}`}
                type="text"
                required
                maxLength={200}
                value={draft[key]}
                onChange={(event) =>
                  setDraft({ ...draft, [key]: event.target.value })
                }
                aria-invalid={!!errors[key]}
                aria-describedby={errors[key] ? `bank-${key}-help` : undefined}
              />
            </Field>
          ))}
          {!account && (
            <p className="text-sm text-slate-500">
              Your first bank account is automatically set as default.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit">
              {pending ? 'Saving…' : 'Save account'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function BankAccountsPage() {
  const { data: user, isPending: profilePending } = useCurrentUser();
  const allowed = !!user?.role?.some(
    (role) =>
      role
        .trim()
        .toLowerCase()
        .replace(/^role_/, '') === 'instructor',
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const [defaultFilter, setDefaultFilter] = useState('');
  const [ordering, setOrdering] =
    useState<NonNullable<BankFilters['ordering']>>('-created_at');
  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setPage(1);
  }
  const filters: BankFilters = {
    page,
    search: query || undefined,
    default: defaultFilter === '' ? undefined : defaultFilter === 'true',
    ordering,
  };
  const filtered = !!query || defaultFilter !== '';
  function resetFilters() {
    setSearch('');
    setDefaultFilter('');
    setOrdering('-created_at');
    setPage(1);
  }
  const [editor, setEditor] = useState<{ account: BankAccount | null } | null>(
    null,
  );
  const [target, setTarget] = useState<BankAccount | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  const version = getSessionVersion();
  const accounts = useQuery({
    queryKey: ['bank-accounts', user?.id, filters],
    queryFn: ({ signal }) => listBankAccounts(filters, signal),
    enabled: allowed,
  });
  async function refresh() {
    if (version !== getSessionVersion()) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] }),
    ]);
  }
  async function act(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (failure) {
      setError(
        apiErrorMessage(
          failure,
          'Unable to complete this action. Refresh the list and try again.',
          { includeFieldErrors: true },
        ),
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  if (profilePending) return <p role="status">Checking access…</p>;
  if (!allowed) return <Navigate to="/" replace />;
  const data = accounts.data;
  return (
    <section className="categories-page bank-page">
      <div className="category-page-heading">
        <div>
          <span className="category-eyebrow">INSTRUCTOR PAYOUTS</span>
          <h1>
            Bank Accounts<span className="category-heading-dot">.</span>
          </h1>
          <p>Manage the bank accounts you use for instructor payouts.</p>
        </div>
        <Button
          variant="primary"
          className="!rounded-xl !px-[18px] !py-3"
          disabled={pending}
          onClick={() => setEditor({ account: null })}
        >
          Add bank account
        </Button>
      </div>
      <div className="bank-collection-heading">
        <h2>
          Your accounts <span>{accounts.data?.count ?? '—'}</span>
        </h2>
        <p>Your default account receives your payouts.</p>
      </div>
      <div className="bank-toolbar">
        <div className="category-search">
          <SearchIcon className="h-4 w-4" />
          <Input
            aria-label="Search bank accounts"
            placeholder="Search bank, account number or IFSC…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          label="Default account filter"
          value={defaultFilter}
          onChange={(value) => {
            setDefaultFilter(value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All accounts' },
            { value: 'true', label: 'Default account' },
            { value: 'false', label: 'Non-default accounts' },
          ]}
        />
        <Select
          label="Sort bank accounts"
          value={ordering}
          onChange={(value) => {
            setOrdering(value as NonNullable<BankFilters['ordering']>);
            setPage(1);
          }}
          options={[
            { value: '-created_at', label: 'Newest first' },
            { value: 'created_at', label: 'Oldest first' },
            { value: 'name', label: 'Bank name: A–Z' },
            { value: '-name', label: 'Bank name: Z–A' },
          ]}
        />
        {(filtered || search || ordering !== '-created_at') && (
          <Button onClick={resetFilters}>Reset filters</Button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-green-50 p-4 text-green-800"
        >
          {notice}
        </p>
      )}
      {error && !target && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {accounts.isPending ? (
        <div
          className="bank-grid"
          role="status"
          aria-label="Loading bank accounts"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div className="category-skeleton" key={index}>
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : accounts.isError ? (
        <div role="alert" className="category-empty">
          <p>
            {apiErrorMessage(accounts.error, 'Unable to load bank accounts.')}
          </p>
          <Button
            onClick={() => {
              if (page > 1) setPage(1);
              else void accounts.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div>
          {!data?.results.length ? (
            <div className="category-empty">
              <BankIcon className="mx-auto h-12 w-12 text-violet-300" />
              <h2>
                {filtered ? 'No matching accounts' : 'No bank accounts yet'}
              </h2>
              <p className="mt-2 text-slate-500">
                {filtered
                  ? 'Try another search or reset your filters to see your accounts.'
                  : 'Add a bank account to configure your payout destination.'}
              </p>
              {filtered && (
                <Button onClick={resetFilters}>Reset filters</Button>
              )}
            </div>
          ) : (
            <ul className="bank-grid">
              {data.results.map((account) => (
                <li key={account.id} className="bank-card">
                  <div className="bank-card-content">
                    <BankIcon className="bank-card-icon" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="bank-card-name">{account.name}</h2>
                      {account.default && (
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-brand">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="bank-account-number">
                      {masked(account.account_number)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      IFSC: {account.ifsc_code}
                    </p>
                    {account.default && (
                      <p className="mt-2 text-xs text-slate-500">
                        Make another account default before deleting this one.
                      </p>
                    )}
                  </div>
                  <div className="bank-card-actions">
                    <Button
                      disabled={pending || accounts.isFetching}
                      onClick={() =>
                        void act(async () => {
                          const latest = await getBankAccount(account.id);
                          if (version === getSessionVersion())
                            setEditor({ account: latest });
                        })
                      }
                    >
                      Edit
                    </Button>
                    {!account.default && (
                      <Button
                        disabled={pending || accounts.isFetching}
                        onClick={() =>
                          void act(async () => {
                            await setDefaultBankAccount(account.id);
                            if (version !== getSessionVersion()) return;
                            setNotice('Default bank account updated.');
                            if (filtered) setPage(1);
                            await refresh();
                          })
                        }
                      >
                        Make Default
                      </Button>
                    )}
                    <Button
                      disabled={
                        account.default || pending || accounts.isFetching
                      }
                      title={
                        account.default
                          ? 'Make another account default before deleting this one.'
                          : undefined
                      }
                      onClick={() => {
                        setError('');
                        setTarget(account);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            count={data?.count ?? 0}
            visibleCount={data?.results.length ?? 0}
            hasNext={!!data?.next}
            pending={accounts.isFetching || pending}
            onPageChange={setPage}
          />
        </div>
      )}
      {pending && !target && (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Working…
        </p>
      )}
      {editor && (
        <AccountEditor
          account={editor.account}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            setNotice('Bank account saved.');
            if (filtered) setPage(1);
            await refresh();
          }}
        />
      )}
      {target && (
        <ConfirmationDialog
          title="Delete bank account?"
          description={`Remove ${target.name}, account ${masked(target.account_number)}? This action cannot be undone.`}
          confirmLabel="Delete account"
          pending={pending}
          error={error}
          onCancel={() => {
            if (!lock.current) {
              setTarget(null);
              setError('');
            }
          }}
          onConfirm={() =>
            void act(async () => {
              if (target.default) return;
              await deleteBankAccount(target.id);
              if (version !== getSessionVersion()) return;
              setTarget(null);
              setNotice('Bank account deleted.');
              if (data?.results.length === 1 && page > 1) setPage(page - 1);
              await refresh();
            })
          }
        />
      )}
    </section>
  );
}
