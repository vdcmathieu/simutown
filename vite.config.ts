import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * The gallery in web/: `pnpm dev` serves it, `pnpm build:web` writes dist/web.
 * Vitest reads this file too, so its root is set back to the repository.
 */
export default defineConfig({
  root: 'web',
  base: './',
  server: { fs: { allow: [root] } },
  build: { outDir: '../dist/web', emptyOutDir: true },
  test: { root, include: ['test/**/*.test.ts'] },
});
