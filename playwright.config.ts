import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const previewPort = process.env.PLAYWRIGHT_PORT ?? '4173';

const generatedTests = defineBddConfig({
  features: 'tests/e2e/features/**/*.feature',
  steps: ['tests/e2e/steps/**/*.ts', 'tests/e2e/fixtures/test.ts'],
  outputDir: '.features-gen',
  missingSteps: 'fail-on-gen',
});

export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'mobile', use: devices['Pixel 7'] },
  ].flatMap(({ name, use }) => [
    { name: `bdd-${name}`, testDir: generatedTests, use },
    { name: `regression-${name}`, testDir: './tests/e2e/specs', use },
  ]),
  webServer: {
    command: `yarn build && yarn preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: false,
    env: { VITE_API_ROOT_URL: '' },
  },
});
