import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';

export type BankDraft = {
  name: string;
  ifsc_code: string;
  account_number: string;
};
export type BankAccount = BankDraft & {
  id: string;
  user: string;
  default: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};
export type BankFilters = {
  page: number;
  search?: string;
  default?: boolean;
  ordering?: 'name' | '-name' | 'created_at' | '-created_at';
};
export type BankPage = {
  count: number;
  next: string | null;
  previous: string | null;
  results: BankAccount[];
};
export async function listBankAccounts(
  filters: BankFilters,
  signal?: AbortSignal,
) {
  return (
    await api.get<BankPage>(ENDPOINTS.BANK.LIST, { params: filters, signal })
  ).data;
}
export async function getBankAccount(id: string) {
  return (await api.get<BankAccount>(ENDPOINTS.BANK.DETAIL(id))).data;
}
export async function createBankAccount(data: BankDraft) {
  return (await api.post<BankAccount>(ENDPOINTS.BANK.LIST, data)).data;
}
export async function updateBankAccount(id: string, data: Partial<BankDraft>) {
  return (await api.patch<BankAccount>(ENDPOINTS.BANK.DETAIL(id), data)).data;
}
export async function setDefaultBankAccount(id: string) {
  return (
    await api.patch<{ message: string }>(ENDPOINTS.BANK.DETAIL(id), {
      default: true,
    })
  ).data;
}
export async function deleteBankAccount(id: string) {
  await api.delete(ENDPOINTS.BANK.DETAIL(id));
}
