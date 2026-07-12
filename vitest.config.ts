import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // Pure engine tests run in Node, no DOM needed initially
    include: ['engine/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/node_modules/**'],
    },
    globals: true,
  },
});
