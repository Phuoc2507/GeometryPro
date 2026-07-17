import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api/_lib/kernel/**/*.test.ts'],
    environment: 'node',
  },
});
