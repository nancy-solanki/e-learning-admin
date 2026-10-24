import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type WalletAccount = {
  type: 'bank_transfer';
  bank_name: string;
  account_last4: string;
};

export type WalletOverview = {
  currency: string;
  as_of: string;
  history_started_at: string;
  history_complete: boolean;
  opening_balance: string | null;
  period: { start: string; end: string; timezone: 'UTC' };
  summary: {
    available_balance: string;
    period_earnings: string;
    completed_payouts: string;
    refunds: string;
    earning_count: number;
    completed_payout_count: number;
    refund_count: number;
    pending_payout_amount: string;
    pending_payout_count: number;
    latest_pending_payout_at: string | null;
  };
  payout_account: WalletAccount | null;
};

export type WalletTransactionType =
  'earning' | 'withdrawal' | 'refund' | 'adjustment';
export type WalletTransactionStatus =
  'completed' | 'pending' | 'failed' | 'cancelled';

export type WalletTransaction = {
  id: string;
  reference: string;
  description: string;
  date: string;
  completed_at: string | null;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  amount: string;
  account_last4: string;
};

export type WalletTransactionPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: WalletTransaction[];
};

export type WalletRange = { start: string; end: string };
export type WalletHistoryFilters = WalletRange & {
  page: number;
  search?: string;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
};

export async function getWalletOverview(
  range: WalletRange,
  signal?: AbortSignal,
) {
  return (
    await api.get<WalletOverview>(ENDPOINTS.WALLET.OVERVIEW, {
      params: range,
      signal,
    })
  ).data;
}

export async function listWalletTransactions(
  filters: WalletHistoryFilters,
  signal?: AbortSignal,
) {
  return (
    await api.get<WalletTransactionPage>(ENDPOINTS.WALLET.TRANSACTIONS, {
      params: filters,
      signal,
    })
  ).data;
}

export async function getWalletTransaction(id: string, signal?: AbortSignal) {
  return (
    await api.get<WalletTransaction>(ENDPOINTS.WALLET.TRANSACTION_DETAIL(id), {
      signal,
    })
  ).data;
}

export async function exportWalletTransactions(
  filters: Omit<WalletHistoryFilters, 'page'>,
) {
  return (
    await api.get<Blob>(ENDPOINTS.WALLET.TRANSACTION_EXPORT, {
      params: filters,
      responseType: 'blob',
    })
  ).data;
}
