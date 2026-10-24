import type { Page } from '@playwright/test';
import type { Controls } from './controls';

export const recordPages = {
  wallets: {
    noun: 'transactions',
    total: 9,
    id: 'REF-WITHDRAWAL-1007',
    excludedId: 'REF-EARNING-1008',
    statusFilter: 'Transaction status',
    status: 'Pending',
    secondFilter: 'Transaction type',
    secondOption: 'Withdrawal',
    detail: 'transaction',
    filename: 'wallet-transactions.csv',
  },
  enrollments: {
    noun: 'enrollments',
    total: 6,
    id: 'ENR-1002',
    excludedId: 'ENR-1006',
    statusFilter: 'Enrollment status',
    status: 'Completed',
    secondFilter: 'Filter by course',
    secondOption: 'UI/UX Design: From idea to experience',
    detail: 'enrollment',
    filename: 'sample-enrollments.csv',
  },
} as const;
export function recordConfig(kind: string) {
  if (kind !== 'wallets' && kind !== 'enrollments')
    throw new Error(`Unknown records page: ${kind}`);
  return recordPages[kind];
}

export class PreviewPages {
  readonly page: Page;
  readonly controls: Controls;
  constructor(page: Page, controls: Controls) {
    this.page = page;
    this.controls = controls;
  }
  get dialog() {
    return this.page.getByRole('dialog');
  }
  async filterRecords(kind: string) {
    const config = recordConfig(kind);
    await this.controls.choose(config.statusFilter, config.status);
    await this.controls.choose(config.secondFilter, config.secondOption);
  }
  async exportRecords(kind: string) {
    const pending = this.page.waitForEvent('download');
    await this.page
      .getByRole('button', { name: `Export ${recordConfig(kind).noun}` })
      .click();
    return pending;
  }
}
