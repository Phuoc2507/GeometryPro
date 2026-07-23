import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'api/_lib/kernel/**/*.test.ts',
      'api/_lib/__tests__/**/*.test.js',
      'api/_lib/advance/__tests__/**/*.test.js',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'research/vsgeo-bench/**/*.test.ts',
      'research/vsgeo-bench/**/*.test.tsx',
    ],
    environment: 'node',
  },
});
