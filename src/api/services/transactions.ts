import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type TransactionUser = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string | null;
};

export type Transaction = {
  id: string;
  user: TransactionUser | string;
  wallet: string;
  amount: number | string;
  status: 'success' | 'rejected' | 'pending' | 'failed';
  transaction_type: 'credit' | 'debit';
  description: string;
  tx_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TransactionFilters = {
  status?: Transaction['status'];
  transaction_type?: Transaction['transaction_type'];
  wallet?: string;
  tx_id?: string;
  amount_min?: number;
  amount_max?: number;
  created_at_after?: string;
  created_at_before?: string;
  search?: string;
  ordering?: 'created_at' | '-created_at' | 'amount' | '-amount';
};

export type TransactionPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transaction[];
};

export type TransactionWalletOption = {
  id: string;
  user: TransactionUser;
};

export async function listTransactionWalletOptions(signal?: AbortSignal) {
  return (
    await api.get<TransactionWalletOption[]>(ENDPOINTS.WALLET.OPTIONS, {
      signal,
    })
  ).data;
}

export async function listTransactions(
  filters: TransactionFilters,
  page: number,
  signal?: AbortSignal,
) {
  return (
    await api.get<TransactionPage>(ENDPOINTS.TRANSACTION.LIST, {
      params: { ...filters, page },
      signal,
    })
  ).data;
}
