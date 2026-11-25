import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { daylight } from '../src/core/palette';
import { tinyScene } from '../src/fixtures/tiny';
import { advance, fitScale, formatTime, frameIndex } from '../src/player/clock';
import { assertScene, describeScene } from '../src/player/scene-info';
import { themeVars } from '../src/player/theme';

const ROOT = resolve(import.meta.dirname, '..');

describe('player clock', () => {
  it('advances, loops and stops at the end', () => {
    expect(advance(1, 0.5, 2, 8, false)).toEqual({ t: 2, ended: false });
    expect(advance(7.9, 0.2, 1, 8, true).t).toBeCloseTo(0.1);
    expect(advance(7.9, 0.2, 1, 8, false)).toEqual({ t: 8, ended: true });
  });

  it('maps time to the same frames as export', () => {
    expect(frameIndex(0, 30, 8)).toBe(0);
    expect(frameIndex(1 / 30, 30, 8)).toBe(1);
    expect(frameIndex(8, 30, 8)).toBe(239);
  });

  it('scales by whole device pixels', () => {
    expect(fitScale(1000, 1000, 480, 270)).toMatchObject({ k: 2, cssW: 960, exact: true });
    expect(fitScale(1000, 300, 480, 270)).toMatchObject({ k: 1, cssH: 270 });
    expect(fitScale(800, 600, 480, 270, 2)).toMatchObject({ k: 3, cssW: 720, exact: true });
    // a phone: one device pixel per art pixel would be a postage stamp, so fill instead
    expect(fitScale(343, 400, 480, 270, 2)).toMatchObject({ cssW: 343, exact: false });
  });

  it('formats time', () => {
    expect(formatTime(4.25)).toBe('0:04.2');
    expect(formatTime(75)).toBe('1:15.0');
  });
});

describe('scene info', () => {
  it('accepts the fixture and finds its cast', () => {
    const info = describeScene(assertScene(tinyScene, 'tiny'));
    expect(info.cast).toEqual(['ana']);
    expect(info.frames).toBe(240);
  });

  it('uses the declared cast when the scene has one, without sampling', () => {
    let calls = 0;
    const scene = { ...tinyScene, cast: ['ben', 'ana'], frame: (t: number) => (calls++, tinyScene.frame(t)) };
    expect(describeScene(scene).cast).toEqual(['ben', 'ana']);
    expect(calls).toBe(0);
  });

  it('lists every problem with a broken scene', () => {
    expect(() => assertScene(undefined, 'x.ts')).toThrow(/no default export/);
    expect(() => assertScene({ title: '' }, 'x.ts')).toThrow(/title[\s\S]*duration[\s\S]*frame/);
  });
});

describe('theme vars', () => {
  it('exposes every slot and the UI roles from the theme, not from hard-coded colours', () => {
    const v = themeVars(daylight);
    expect(v['--st-steel-0']).toBe(daylight.colors['steel.0'].toLowerCase());
    expect(v['--st-paper']).toBe(daylight.colors['cream.2'].toLowerCase());
    expect(v['--st-skin-a-1']).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// --- Import boundary: the browser code must never reach Node --------------------------------

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;
const NODE_BUILTINS = new Set(['fs', 'path', 'os', 'url', 'util', 'child_process', 'stream', 'zlib', 'crypto', 'buffer', 'process']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|html)$/.test(f) ? [p] : [];
  });
}

function resolveTs(from: string, spec: string): string | undefined {
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, join(base, 'index.ts')]) {
    try {
      if (statSync(c).isFile()) return c;
    } catch {}
  }
  return undefined;
}

/** Every import reachable from `entry`, following relative imports. */
function reachable(entries: string[]): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    const specs = [...readFileSync(f, 'utf8').matchAll(IMPORT)].map((m) => m[1] ?? m[2] ?? m[3]!);
    seen.set(f, specs);
    for (const s of specs) {
      if (s.startsWith('.')) {
        const r = resolveTs(f, s);
        if (r) stack.push(r);
      }
    }
  }
  return seen;
}

describe('browser code imports nothing from Node', () => {
  const graph = reachable([...files(join(ROOT, 'src/player')), ...files(join(ROOT, 'web'))].filter((f) => f.endsWith('.ts')));

  it('has found the player and the gallery', () => {
    expect([...graph.keys()].some((f) => f.endsWith('src/player/index.ts'))).toBe(true);
    expect([...graph.keys()].some((f) => f.endsWith('web/main.ts'))).toBe(true);
  });

  for (const [file, specs] of graph) {
    it(file.slice(ROOT.length + 1), () => {
      for (const s of specs) {
        expect(s.startsWith('node:') || NODE_BUILTINS.has(s), `${s} is a Node module`).toBe(false);
        expect(/(^|\/)src\/node(\/|$)|(^|\/)node\//.test(s) && s.startsWith('.'), `${s} reaches src/node`).toBe(false);
        expect(/(^|\/)cli\//.test(s) && s.startsWith('.'), `${s} reaches src/cli`).toBe(false);
      }
    });
  }
});
