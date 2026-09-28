import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 75 },
    },
  },
});
