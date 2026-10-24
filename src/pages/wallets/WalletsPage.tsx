import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiErrorMessage } from '../../api/errors';
import {
  exportWalletTransactions,
  getWalletOverview,
  getWalletTransaction,
  listWalletTransactions,
  type WalletHistoryFilters,
  type WalletRange,
  type WalletTransaction,
  type WalletTransactionStatus,
  type WalletTransactionType,
} from '../../api/services/wallet';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field, Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatMoney } from '../../lib/money';
import { isAdmin } from '../../lib/permissions';
import { useCurrentUser } from '../../state/profile';
import './wallets.css';

const transactionTypes: WalletTransactionType[] = [
  'earning',
  'withdrawal',
  'refund',
  'adjustment',
];
const transactionStatuses: WalletTransactionStatus[] = [
  'completed',
  'pending',
  'failed',
  'cancelled',
];
const pageSize = 20;

function utcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initialRange(): WalletRange {
  const end = utcDate(new Date());
  return { start: `${end.slice(0, 8)}01`, end };
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && utcDate(date) === value;
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function titleCase(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function errorStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function pageError(error: unknown, fallback: string) {
  switch (errorStatus(error)) {
    case 400:
      return apiErrorMessage(error, 'Check the selected dates and filters.');
    case 401:
      return 'Your session has expired. Sign in again to continue.';
    case 403:
      return 'You do not have access to this wallet.';
    default:
      return apiErrorMessage(error, fallback);
  }
}

function signedAmount(amount: string, currency: string) {
  const absolute = amount.startsWith('-') ? amount.slice(1) : amount;
  const formatted = formatMoney(absolute, currency);
  if (amount.startsWith('-')) return `−${formatted}`;
  return /[1-9]/.test(absolute) ? `+${formatted}` : formatted;
}

function isPositiveAmount(amount: string) {
  return !amount.startsWith('-') && /[1-9]/.test(amount);
}

function statusClass(status: WalletTransactionStatus) {
  return `wallet-status wallet-status-${status}`;
}

function SummaryCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#e9e9f0] bg-white p-5">
      <p className="text-xs text-[#77798a]">{title}</p>
      <strong className="my-2 block text-2xl font-bold">{value}</strong>
      <p className="text-xs text-[#858697]">{detail}</p>
    </div>
  );
}

function TransactionDetails({
  id,
  userId,
  currency,
  onClose,
}: {
  id: string;
  userId: string;
  currency: string;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['wallet-transaction', userId, id],
    queryFn: ({ signal }) => getWalletTransaction(id, signal),
  });
  const transaction = detail.data;
  return (
    <Drawer
      title="Transaction details"
      description={transaction?.reference ?? 'Transaction'}
      onClose={onClose}
    >
      {detail.isPending ? (
        <p role="status" className="text-sm text-slate-500">
          Loading transaction…
        </p>
      ) : detail.isError ? (
        <div role="alert" className="grid gap-4">
          <p>
            {pageError(detail.error, 'Unable to load transaction details.')}
          </p>
          <Button onClick={() => void detail.refetch()}>Try again</Button>
        </div>
      ) : transaction ? (
        <>
          <p className="mb-2 text-3xl font-bold">
            {signedAmount(transaction.amount, currency)}
          </p>
          <p className="mb-6 text-sm leading-6 text-[#74798b]">
            {transaction.description}
          </p>
          <dl className="grid grid-cols-2 gap-5 text-sm">
            {[
              ['Reference', transaction.reference],
              ['Date', dateTimeLabel(transaction.date)],
              [
                'Completed',
                transaction.completed_at
                  ? dateTimeLabel(transaction.completed_at)
                  : '—',
              ],
              ['Type', titleCase(transaction.type)],
              ['Status', titleCase(transaction.status)],
              ...(transaction.account_last4
                ? [
                    [
                      'Destination account',
                      `Ending in ${transaction.account_last4}`,
                    ],
                  ]
                : []),
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="mb-1 text-xs text-[#858697]">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </Drawer>
  );
}

export default function WalletsPage() {
  const { data: user } = useCurrentUser();
  const isInstructor = Boolean(
    user?.role?.some(
      (role) =>
        role
          .trim()
          .toLowerCase()
          .replace(/^role_/, '') === 'instructor',
    ),
  );
  const allowed = isAdmin(user ?? null) || isInstructor;
  const [range, setRange] = useState<WalletRange>(initialRange);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [type, setType] = useState<WalletTransactionType | ''>('');
  const [status, setStatus] = useState<WalletTransactionStatus | ''>('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WalletTransaction | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const validRange =
    isCalendarDate(range.start) &&
    isCalendarDate(range.end) &&
    range.start <= range.end;
  const rangeError =
    !isCalendarDate(range.start) || !isCalendarDate(range.end)
      ? 'Select a valid start and end date.'
      : range.start > range.end
        ? 'Start date must be on or before the end date.'
        : '';
  const historyFilters = useMemo<WalletHistoryFilters>(
    () => ({
      ...range,
      page,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    }),
    [range, page, debouncedSearch, type, status],
  );
  const overview = useQuery({
    queryKey: ['wallet-overview', user?.id, range.start, range.end],
    queryFn: ({ signal }) => getWalletOverview(range, signal),
    enabled: allowed && validRange,
  });
  const transactions = useQuery({
    queryKey: ['wallet-transactions', user?.id, historyFilters],
    queryFn: ({ signal }) => listWalletTransactions(historyFilters, signal),
    enabled: allowed && validRange,
  });

  if (!allowed) return <Navigate to="/" replace />;

  function changeRange(key: keyof WalletRange, value: string) {
    setRange((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function exportCsv() {
    if (!validRange || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const filters = {
        ...range,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      };
      const blob = await exportWalletTransactions(filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'wallet-transactions.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(pageError(error, 'Unable to export wallet transactions.'));
    } finally {
      setExporting(false);
    }
  }

  const overviewError = overview.error;
  const overviewNotConfigured = errorStatus(overviewError) === 404;
  const overviewForbidden = errorStatus(overviewError) === 403;
  const data = overview.data;
  const currency = data?.currency;
  const result = transactions.data;
  const pageCount = result
    ? Math.max(1, Math.ceil(result.count / pageSize))
    : 0;
  const filtered = Boolean(debouncedSearch || type || status);
  const historyStart = data?.period.start ?? range.start;
  const historyEnd = data?.period.end ?? range.end;

  return (
    <section className="text-[#202134] [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-[#7054d8]">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[1.8px] text-[#7563b5]">
            YOUR KNOWLEDGE. YOUR REWARD.
          </p>
          <h1 className="my-2 font-display text-4xl font-extrabold tracking-tight">
            Wallet<span className="text-[#7961dc]">.</span>
          </h1>
          <p className="text-sm text-[#74798b]">
            Keep track of your earnings, payouts, and every little milestone.
          </p>
        </div>
        <Button
          disabled={!validRange || exporting || overviewNotConfigured}
          onClick={() => void exportCsv()}
          aria-label={
            exporting ? 'Exporting transactions' : 'Export transactions'
          }
        >
          {exporting ? 'Exporting…' : '↓ Export transactions'}
        </Button>
      </header>
      {(rangeError || exportError) && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          {rangeError || exportError}
        </p>
      )}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="Start date" htmlFor="wallet-start">
          <Input
            id="wallet-start"
            type="date"
            required
            value={range.start}
            max={range.end || undefined}
            onChange={(event) => changeRange('start', event.target.value)}
          />
        </Field>
        <Field label="End date" htmlFor="wallet-end">
          <Input
            id="wallet-end"
            type="date"
            required
            value={range.end}
            min={range.start || undefined}
            onChange={(event) => changeRange('end', event.target.value)}
          />
        </Field>
      </div>
      {overview.isPending && validRange ? (
        <div
          role="status"
          aria-label="Loading wallet overview"
          className="mb-6 grid gap-5 lg:grid-cols-3"
        >
          <div className="h-48 animate-pulse rounded-2xl bg-violet-100 lg:col-span-2" />
          <div className="h-48 animate-pulse rounded-2xl bg-white" />
          <span className="sr-only">Loading wallet overview…</span>
        </div>
      ) : overview.isError ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-100 bg-white p-6"
        >
          <h2 className="font-bold">
            {overviewNotConfigured
              ? 'Wallet not configured'
              : overviewForbidden
                ? 'Access denied'
                : 'Unable to load wallet'}
          </h2>
          {!overviewNotConfigured && (
            <>
              <p className="mt-2 text-sm text-slate-600">
                {pageError(
                  overviewError,
                  'Check your connection and try again.',
                )}
              </p>
              <Button className="mt-4" onClick={() => void overview.refetch()}>
                Try again
              </Button>
            </>
          )}
        </div>
      ) : data && currency ? (
        <>
          <div className="mb-6 grid gap-5 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-[#e5dff4] bg-[#eee9f8] p-7 lg:col-span-2">
              <div className="relative">
                <p className="text-xs font-semibold text-[#7563b5]">
                  AVAILABLE BALANCE
                </p>
                <p className="my-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {formatMoney(data.summary.available_balance, currency)}
                </p>
                {data.summary.pending_payout_count > 0 && (
                  <p className="text-xs leading-6 text-[#756a8b]">
                    {formatMoney(data.summary.pending_payout_amount, currency)}{' '}
                    reserved for{' '}
                    {data.summary.pending_payout_count === 1
                      ? 'a pending payout'
                      : `${data.summary.pending_payout_count} pending payouts`}
                    {data.summary.latest_pending_payout_at && (
                      <>
                        {' '}
                        ·{' '}
                        {data.summary.pending_payout_count > 1
                          ? 'Latest request'
                          : 'Requested'}{' '}
                        {dateTimeLabel(data.summary.latest_pending_payout_at)}
                      </>
                    )}
                    .
                  </p>
                )}
              </div>
            </div>
            <aside className="rounded-2xl border border-[#e9e9f0] bg-white p-6">
              <p className="text-xs font-semibold text-[#858697]">
                PAYOUT ACCOUNT
              </p>
              {data.payout_account ? (
                <>
                  <div className="my-5">
                    <h2 className="text-sm font-bold">
                      {data.payout_account.bank_name}
                    </h2>
                    <p className="mt-1 text-xs text-[#858697]">
                      Bank transfer · Account ending in{' '}
                      {data.payout_account.account_last4}
                    </p>
                  </div>
                  <div className="border-t border-[#f0f0f5] pt-4">
                    <p className="text-xs leading-6 text-[#858697]">
                      {data.summary.pending_payout_count > 0
                        ? `${data.summary.pending_payout_count} pending payout${data.summary.pending_payout_count === 1 ? '' : 's'}`
                        : 'No pending payouts'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="my-5 text-sm text-[#858697]">
                  No payout account configured
                </p>
              )}
            </aside>
          </div>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Period earnings"
              value={formatMoney(data.summary.period_earnings, currency)}
              detail={`${data.summary.earning_count} earning transactions`}
            />
            <SummaryCard
              title="Completed payouts"
              value={formatMoney(data.summary.completed_payouts, currency)}
              detail={`${data.summary.completed_payout_count} completed payout${data.summary.completed_payout_count === 1 ? '' : 's'}`}
            />
            <SummaryCard
              title="Refunds"
              value={formatMoney(data.summary.refunds, currency)}
              detail={`${data.summary.refund_count} refund${data.summary.refund_count === 1 ? '' : 's'}`}
            />
          </div>
        </>
      ) : null}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Transaction history</h2>
          <p className="mt-1 text-xs text-[#7b738c]">
            {dateLabel(historyStart)} – {dateLabel(historyEnd)} ·{' '}
            {data?.opening_balance === null ? (
              'Opening balance unavailable'
            ) : (
              <>
                Opening balance:{' '}
                {data && currency
                  ? formatMoney(data.opening_balance, currency)
                  : '—'}
              </>
            )}
          </p>
          {data && !data.history_complete && (
            <p role="status" className="mt-2 text-xs text-amber-700">
              History available from {dateTimeLabel(data.history_started_at)};
              selected-period totals may be incomplete.
            </p>
          )}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-0 basis-full sm:flex-1">
          <Input
            aria-label="Search transactions"
            placeholder="Search description or reference…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          className="min-w-36 flex-1 sm:max-w-44"
          label="Transaction type"
          value={type}
          onChange={(value) => {
            setType(value as WalletTransactionType | '');
            setPage(1);
          }}
          options={[
            { value: '', label: 'All types' },
            ...transactionTypes.map((value) => ({
              value,
              label: titleCase(value),
            })),
          ]}
        />
        <Select
          className="min-w-36 flex-1 sm:max-w-44"
          label="Transaction status"
          value={status}
          onChange={(value) => {
            setStatus(value as WalletTransactionStatus | '');
            setPage(1);
          }}
          options={[
            { value: '', label: 'All statuses' },
            ...transactionStatuses.map((value) => ({
              value,
              label: titleCase(value),
            })),
          ]}
        />
      </div>
      {transactions.isPending && validRange ? (
        <div
          role="status"
          aria-label="Loading transactions"
          className="grid gap-3 rounded-xl border border-[#e6e7ef] bg-white p-5"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded bg-slate-100"
            />
          ))}
          <span className="sr-only">Loading transactions…</span>
        </div>
      ) : transactions.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-100 bg-white p-6"
        >
          <p>{pageError(transactions.error, 'Unable to load transactions.')}</p>
          <Button className="mt-4" onClick={() => void transactions.refetch()}>
            Try again
          </Button>
        </div>
      ) : result?.results.length ? (
        <div className="overflow-x-auto rounded-xl border border-[#e6e7ef] bg-white">
          <table className="w-full min-w-[740px] text-left text-xs">
            <caption className="sr-only">Wallet transaction history</caption>
            <thead className="border-b border-[#e9e9f0] bg-[#faf9fd] text-[#858697]">
              <tr>
                {[
                  'Transaction',
                  'Date',
                  'Type',
                  'Status',
                  'Amount',
                  'Details',
                ].map((label) => (
                  <th scope="col" key={label} className="px-5 py-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.results.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-[#f0f0f5] last:border-0 hover:bg-[#fcfbff]"
                >
                  <td className="max-w-72 px-5 py-4">
                    <p className="font-semibold leading-5">
                      {transaction.description}
                    </p>
                    <p className="mt-1 text-[10px] text-[#9595a5]">
                      {transaction.reference}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#74798b]">
                    {dateTimeLabel(transaction.date)}
                  </td>
                  <td className="px-5 py-4 text-[#74798b]">
                    {titleCase(transaction.type)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={statusClass(transaction.status)}>
                      {titleCase(transaction.status)}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-5 py-4 font-bold ${isPositiveAmount(transaction.amount) ? 'text-[#39876a]' : 'text-[#55566a]'}`}
                  >
                    {currency
                      ? signedAmount(transaction.amount, currency)
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      className="font-semibold text-[#8062bc]"
                      aria-label={`View transaction ${transaction.reference}`}
                      onClick={() => setSelected(transaction)}
                    >
                      View ↗
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e6e7ef] bg-white p-10 text-center">
          <h3 className="font-bold">
            {filtered
              ? 'No matching transactions found'
              : 'No transactions found'}
          </h3>
          <p className="my-3 text-sm text-[#78798b]">
            {filtered
              ? 'Try another search or adjust your filters.'
              : 'Transactions will appear here when available.'}
          </p>
          {filtered && (
            <Button
              onClick={() => {
                setSearch('');
                setType('');
                setStatus('');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-xs text-[#858697]">
          Showing {result?.results.length ?? 0} of {result?.count ?? 0}{' '}
          transactions
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-3">
            <Button
              disabled={!result?.previous || transactions.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-[#74798b]">
              Page {page} of {pageCount}
            </span>
            <Button
              disabled={!result?.next || transactions.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
      {selected && currency && user?.id && (
        <TransactionDetails
          id={selected.id}
          userId={user.id}
          currency={currency}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
