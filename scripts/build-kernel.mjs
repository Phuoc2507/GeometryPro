// scripts/build-kernel.mjs
// Bundle the TypeScript geometry kernel into a single self-contained ESM .js so the plain
// .js API routes (analyze-geometry.js, etc.) can `import { run } from './_lib/kernel-dist/index.mjs'`.
// Runs on both `node server.js` (dev) and Vercel serverless (prod).
import { build } from 'esbuild';

await build({
  entryPoints: ['api/_lib/kernel/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'api/_lib/kernel-dist/index.mjs',
  // `import type { GeometryData }` from src/ is type-only (erased); no runtime dep on the frontend.
  // zod is bundled in so the artifact is self-contained.
  logLevel: 'info',
});

console.log('[build-kernel] wrote api/_lib/kernel-dist/index.mjs');
