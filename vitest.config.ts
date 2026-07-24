import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['api/_lib/kernel/**/*.test.ts', 'api/_lib/__tests__/**/*.test.js', 'api/_lib/advance/__tests__/**/*.test.js', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
});
