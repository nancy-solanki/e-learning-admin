import { expect, type Page } from '@playwright/test';
import type { Controls } from './controls';

export type CurriculumKind = 'sections' | 'lectures';
export function curriculumKind(value: string): CurriculumKind {
  if (value !== 'sections' && value !== 'lectures')
    throw new Error(`Unknown curriculum: ${value}`);
  return value;
}
export const recordPages = {
  wallets: {
    noun: 'transactions',
    total: 8,
    id: 'TXN-1007',
    excludedId: 'TXN-1008',
    statusFilter: 'Transaction status',
    status: 'Pending',
    secondFilter: 'Transaction type',
    secondOption: 'Withdrawal',
    detail: 'transaction',
    filename: 'sample-wallet-transactions.csv',
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
  card(title: string) {
    return this.page.locator('article').filter({
      has: this.page.getByRole('heading', { name: title, exact: true }),
    });
  }
  noun(kind: CurriculumKind) {
    return kind === 'sections' ? 'section' : 'lecture';
  }

  async openCurriculumEditor(kind: CurriculumKind, title?: string) {
    const noun = this.noun(kind);
    if (title)
      await this.card(title)
        .getByRole('button', { name: `Edit ${noun}` })
        .click();
    else
      await this.page
        .getByRole('button', { name: `＋ Add ${noun}`, exact: true })
        .click();
  }
  async createCurriculum(kind: CurriculumKind) {
    const noun = this.noun(kind);
    await this.dialog.getByLabel('Title').fill(`E2E ${noun}`);
    await this.dialog.getByLabel('Description').fill('Practice with examples');
    if (kind === 'lectures') {
      await this.dialog.getByLabel('Duration (minutes)').fill('25');
      await this.dialog.getByLabel('Status').selectOption('Approved');
    }
    await this.dialog
      .getByRole('button', { name: `Add ${noun}`, exact: true })
      .click();
  }
  async editCurriculum(kind: CurriculumKind) {
    const noun = this.noun(kind);
    await this.openCurriculumEditor(kind, `E2E ${noun}`);
    await expect(this.dialog.getByLabel('Description')).toHaveValue(
      'Practice with examples',
    );
    await this.dialog.getByLabel('Title').fill(`Updated ${noun}`);
    await this.dialog.getByRole('button', { name: 'Save changes' }).click();
  }
  async cancelCurriculumEdit(kind: CurriculumKind) {
    await this.openCurriculumEditor(kind, `Updated ${this.noun(kind)}`);
    await this.dialog.getByLabel('Title').fill('Unsaved change');
    await this.dialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
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
