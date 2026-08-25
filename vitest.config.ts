import { defineConfig } from 'vitest/config';

const packages = ['engine', 'domain', 'api', 'web'];

export default defineConfig({
  test: {
    projects: packages.map((name) => ({
      test: {
        name,
        root: `./packages/${name}`,
        environment: 'node',
        include: ['src/**/*.test.ts'],
      },
    })),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/bench.ts'],
      thresholds: {
        'packages/engine/src/**': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        'packages/domain/src/**': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
