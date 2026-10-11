import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CloseIcon,
  SearchIcon,
  WalletIcon,
} from '../../components/icons/AdminIcons';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { isAdmin } from '../../lib/permissions';
import { useCurrentUser } from '../../state/profile';

type Transaction = {
  id: string;
  description: string;
  date: string;
  type: 'Earning' | 'Withdrawal' | 'Refund';
  status: 'Completed' | 'Pending';
  amount: number;
};
const transactions: Transaction[] = [
  {
    id: 'TXN-1008',
    description: 'UI/UX Design: From idea to experience',
    date: '2026-10-10',
    type: 'Earning',
    status: 'Completed',
    amount: 89,
  },
  {
    id: 'TXN-1007',
    description: 'Payout to bank account •••• 4821',
    date: '2026-10-09',
    type: 'Withdrawal',
    status: 'Pending',
    amount: -250,
  },
  {
    id: 'TXN-1006',
    description: 'The complete modern web developer',
    date: '2026-10-08',
    type: 'Earning',
    status: 'Completed',
    amount: 129,
  },
  {
    id: 'TXN-1005',
    description: 'Data science with Python: The essentials',
    date: '2026-10-07',
    type: 'Earning',
    status: 'Completed',
    amount: 99,
  },
  {
    id: 'TXN-1004',
    description: 'UI/UX Design: From idea to experience',
    date: '2026-10-06',
    type: 'Refund',
    status: 'Completed',
    amount: -89,
  },
  {
    id: 'TXN-1003',
    description: 'Payout to bank account •••• 4821',
    date: '2026-10-05',
    type: 'Withdrawal',
    status: 'Completed',
    amount: -500,
  },
  {
    id: 'TXN-1002',
    description: 'Brand identity: Make your mark',
    date: '2026-10-04',
    type: 'Earning',
    status: 'Completed',
    amount: 69,
  },
  {
    id: 'TXN-1001',
    description: 'Build a business from the ground up',
    date: '2026-10-03',
    type: 'Earning',
    status: 'Completed',
    amount: 109,
  },
];
const money = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    amount,
  );
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
const secondary =
  'rounded-lg border border-[#e5e3ef] bg-white px-4 py-3 text-xs font-semibold text-[#665582] hover:bg-[#f5f1fa]';

function TransactionDialog({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="transaction-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[min(480px,calc(100%-32px))] overflow-auto rounded-2xl border border-[#e7e3ef] bg-white p-6 text-[#202134] shadow-xl backdrop:bg-[#20203280]"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="transaction-title" className="text-xl font-bold">
          Transaction details
        </h2>
        <button onClick={onClose} aria-label="Close dialog">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <p className="mb-2 text-3xl font-bold">{money(transaction.amount)}</p>
      <p className="mb-6 text-sm leading-6 text-[#74798b]">
        {transaction.description}
      </p>
      <dl className="grid grid-cols-2 gap-5 text-sm">
        {[
          ['Reference', transaction.id],
          ['Date', dateLabel(transaction.date)],
          ['Type', transaction.type],
          ['Status', transaction.status],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="mb-1 text-xs text-[#858697]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="my-6 rounded-lg bg-[#f5f1fa] p-3 text-xs text-[#7e708f]">
        Sample transaction · Static preview
      </p>
      <button onClick={onClose} className={`${secondary} w-full`}>
        Close
      </button>
    </dialog>
  );
}

export default function WalletsPage() {
  const { data: user } = useCurrentUser();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const allowed =
    isAdmin(user ?? null) ||
    user?.role?.some(
      (role) =>
        role
          .trim()
          .toLowerCase()
          .replace(/^role_/, '') === 'instructor',
    );
  if (!allowed) return <Navigate to="/" replace />;
  const filtered = transactions.filter(
    (t) =>
      (!type || t.type === type) &&
      (!status || t.status === status) &&
      `${t.description} ${t.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const earnings = transactions
    .filter((t) => t.type === 'Earning')
    .reduce((sum, t) => sum + t.amount, 0);
  const pending = -transactions
    .filter((t) => t.status === 'Pending')
    .reduce((sum, t) => sum + t.amount, 0);
  const openingBalance = 2800;
  const balance =
    openingBalance + transactions.reduce((sum, t) => sum + t.amount, 0);
  const exportCsv = () => {
    const rows = [
      ['Reference', 'Date', 'Description', 'Type', 'Status', 'Amount (USD)'],
      ...filtered.map((t) => [
        t.id,
        t.date,
        t.description,
        t.type,
        t.status,
        String(t.amount),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
      )
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-wallet-transactions.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
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
        <button className={secondary} onClick={exportCsv}>
          ↓ Export transactions
        </button>
      </header>
      <div className="mb-6 grid gap-5 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-[#e5dff4] bg-[#eee9f8] p-7 lg:col-span-2">
          <WalletIcon
            aria-hidden="true"
            className="absolute right-7 top-8 size-24 -rotate-12 text-[#d2c3eb]"
          />
          <div className="relative">
            <p className="text-xs font-semibold text-[#7563b5]">
              AVAILABLE BALANCE
            </p>
            <p className="my-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {money(balance)}{' '}
              <span className="text-sm font-medium text-[#756a8b]">USD</span>
            </p>
            <p className="text-xs leading-6 text-[#756a8b]">
              After {money(pending)} reserved for a pending payout.
            </p>
            <div className="mt-7 inline-flex rounded-full bg-white/70 px-3 py-2 text-xs text-[#7563b5]">
              Sample wallet · Static preview
            </div>
          </div>
        </div>
        <aside className="rounded-2xl border border-[#e9e9f0] bg-white p-6">
          <p className="text-xs font-semibold text-[#858697]">PAYOUT ACCOUNT</p>
          <div className="my-5 flex items-center gap-3">
            <span className="rounded-xl bg-[#f3effb] p-3 text-[#8b6ccb]">
              <WalletIcon className="size-6" />
            </span>
            <div>
              <h2 className="text-sm font-bold">Bank transfer</h2>
              <p className="mt-1 text-xs text-[#858697]">
                Account ending in 4821
              </p>
            </div>
          </div>
          <div className="border-t border-[#f0f0f5] pt-4">
            <span className="rounded-md bg-[#fcf5df] px-2 py-1 text-xs text-[#94712e]">
              1 pending payout
            </span>
            <p className="mt-3 text-xs leading-6 text-[#858697]">
              {money(pending)} requested on October 9, 2026. This is a sample
              payout account.
            </p>
          </div>
        </aside>
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          ['Period earnings', money(earnings), '5 course sales'],
          [
            'Completed payouts',
            money(500),
            'Transferred to your sample account',
          ],
          ['Refunds', money(89), '1 refunded course purchase'],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-xl border border-[#e9e9f0] bg-white p-5"
          >
            <p className="text-xs text-[#77798a]">{label}</p>
            <strong className="my-2 block text-2xl font-bold">{value}</strong>
            <p className="text-xs text-[#858697]">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Transaction history</h2>
        <span className="text-xs text-[#7b738c]">
          October 3–10, 2026 · Opening balance {money(openingBalance)}
        </span>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-0 basis-full sm:flex-1">
          <SearchIcon
            aria-hidden="true"
            className="absolute left-3 top-3.5 size-4 text-[#9595a5]"
          />
          <Input
            className="pl-10!"
            aria-label="Search transactions"
            placeholder="Search description or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="min-w-36 flex-1 sm:max-w-44"
          label="Transaction type"
          value={type}
          onChange={setType}
          options={[
            { value: '', label: 'All types' },
            ...['Earning', 'Withdrawal', 'Refund'].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
        <Select
          className="min-w-36 flex-1 sm:max-w-44"
          label="Transaction status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All statuses' },
            ...['Completed', 'Pending'].map((value) => ({
              value,
              label: value,
            })),
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#e6e7ef] bg-white">
        <table className="w-full min-w-[740px] text-left text-xs">
          <caption className="sr-only">
            Sample wallet transaction history in USD
          </caption>
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
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-b border-[#f0f0f5] last:border-0 hover:bg-[#fcfbff]"
              >
                <td className="max-w-72 px-5 py-4">
                  <p className="font-semibold leading-5">{t.description}</p>
                  <p className="mt-1 text-[10px] text-[#9595a5]">{t.id}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[#74798b]">
                  {dateLabel(t.date)}
                </td>
                <td className="px-5 py-4 text-[#74798b]">{t.type}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-md px-2 py-1 ${t.status === 'Completed' ? 'bg-[#edf7f1] text-[#39876a]' : 'bg-[#fcf5df] text-[#94712e]'}`}
                  >
                    {t.status}
                  </span>
                </td>
                <td
                  className={`whitespace-nowrap px-5 py-4 font-bold ${t.amount > 0 ? 'text-[#39876a]' : 'text-[#55566a]'}`}
                >
                  {t.amount > 0 ? '+' : '−'}
                  {money(Math.abs(t.amount))}
                </td>
                <td className="px-5 py-4">
                  <button
                    className="font-semibold text-[#8062bc]"
                    aria-label={`View transaction ${t.id}`}
                    onClick={() => setSelected(t)}
                  >
                    View ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="p-10 text-center">
            <WalletIcon className="mx-auto mb-3 size-9 text-[#a595ca]" />
            <h3 className="font-bold">No transactions found</h3>
            <p className="my-3 text-sm text-[#78798b]">
              Try another search or adjust your filters.
            </p>
            <button
              className={secondary}
              onClick={() => {
                setSearch('');
                setType('');
                setStatus('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <p role="status" className="mt-5 text-center text-xs text-[#858697]">
        Showing {filtered.length} of {transactions.length} transactions · Sample
        data only
      </p>
      {selected && (
        <TransactionDialog
          transaction={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
