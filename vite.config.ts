import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Vite watches only its root (web/), so a new file in scenes/ went unnoticed until a
 * restart: the `import.meta.glob` in web/scenes.ts is re-run when the watcher reports
 * an added or removed file, and only files Vite watches are reported.
 */
function watchScenes(): Plugin {
  return {
    name: 'simutown:watch-scenes',
    configureServer(server) {
      server.watcher.add(`${root}scenes`);
    },
  };
}

/**
 * The gallery in web/: `pnpm dev` serves it, `pnpm build:web` writes dist/web.
 * Vitest reads this file too, so its root is set back to the repository.
 * `simutown` and `simutown/<entry>` resolve to the sources, as in tsconfig.json.
 */
export default defineConfig({
  root: 'web',
  base: './',
  plugins: [watchScenes()],
  resolve: {
    alias: [
      { find: /^simutown$/, replacement: `${root}src/index.ts` },
      { find: /^simutown\/([\w-]+)$/, replacement: `${root}src/$1/index.ts` },
    ],
  },
  server: { fs: { allow: [root] } },
  build: { outDir: '../dist/web', emptyOutDir: true },
  test: { root, include: ['test/**/*.test.ts'] },
});
