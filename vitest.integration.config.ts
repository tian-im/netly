import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests.
 *
 * - Uses 'node' environment (no jsdom) — server actions run in Node.
 * - Runs only *.integration.test.ts files.
 * - Points DATABASE_URL at an isolated test SQLite file so integration
 *   tests never touch the development database.
 * - Single thread (maxWorkers=1 / singleFork) to avoid write conflicts on
 *   the shared SQLite file across test suites.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: 'file:./test.db',
      NODE_ENV: 'test',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/app/actions.ts'],
      exclude: [],
      all: true,
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
