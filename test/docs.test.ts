/**
 * The documentation runs: every sample it shows from examples/ is that file, every link
 * resolves, and every scene in examples/ builds and renders without a warning.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { townsfolk } from '../src/art';
import { Surface } from '../src/core/surface';
import { assertScene } from '../src/player/scene-info';
import { createRenderer } from '../src/render';
import { checkDocs, ROOT } from '../tools/docs-check';
// Static imports, so that `pnpm typecheck` checks the examples too: tsconfig covers test/,
// and the compiler follows imports. A new file in examples/ must be added here.
import * as clinic from '../examples/art/clinic';
import * as gravel from '../examples/art/gravel';
import * as hayBale from '../examples/art/hay-bale';
import * as lena from '../examples/art/lena';
import * as stoneLantern from '../examples/art/stone-lantern';
import * as goodMorning from '../examples/good-morning';
import * as haggle from '../examples/haggle';
import * as market from '../examples/market';
import * as newArt from '../examples/new-art';

const EXAMPLES: Record<string, object> = {
  'art/clinic.ts': clinic,
  'art/gravel.ts': gravel,
  'art/hay-bale.ts': hayBale,
  'art/lena.ts': lena,
  'art/stone-lantern.ts': stoneLantern,
  'good-morning.ts': goodMorning,
  'haggle.ts': haggle,
  'market.ts': market,
  'new-art.ts': newArt,
};

function tsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? tsFiles(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [],
  );
}

describe('docs', () => {
  it('shows samples that match the files, and links that resolve', () => {
    expect(checkDocs()).toEqual([]);
  });

  it('lists the whole cast in the authoring guide', () => {
    const guide = readFileSync(join(ROOT, 'docs/authoring.md'), 'utf8');
    for (const p of townsfolk) expect(guide).toContain(`| \`${p.id}\` | ${p.name} | ${p.role} | ${p.description} |`);
  });

  it('imports every file in examples/', () => {
    const files = tsFiles(join(ROOT, 'examples')).map((f) => relative(join(ROOT, 'examples'), f).replaceAll('\\', '/'));
    expect(Object.keys(EXAMPLES).sort()).toEqual(files.sort());
  });

  it.each(Object.entries(EXAMPLES))('examples/%s builds and renders', (file, mod) => {
    // a module without a default export is a town or a piece of art, not a scene
    const value = (mod as { default?: unknown }).default;
    if (value === undefined) return;
    const scene = assertScene(value, `examples/${file}`);
    expect(scene.duration).toBeGreaterThan(1);
    const warnings: string[] = [];
    const renderer = createRenderer(scene.town, { warn: (m) => warnings.push(m) });
    const out = new Surface(scene.width, scene.height);
    for (const t of [0, scene.duration / 2, scene.duration]) renderer.render(scene.frame(t), out);
    expect(warnings).toEqual([]);
  });
});
