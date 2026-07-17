import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api/_lib/kernel/**/*.test.ts', 'api/_lib/__tests__/**/*.test.js'],
    environment: 'node',
  },
});
