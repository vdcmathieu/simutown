import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli/main';

const dir = mkdtempSync(join(tmpdir(), 'simutown-cli-'));

async function cli(...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, { out: (s) => out.push(s), err: (s) => err.push(s), cwd: dir });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('simutown CLI', () => {
  it('prints help', async () => {
    const r = await cli('--help');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/render <scene>/);
    expect(r.out).toMatch(/still/);
  });

  it('lists the scenes in scenes/', async () => {
    const r = await cli('list');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/tiny\s+Tiny\s+\(8s\)/);
  });

  it('describes a scene by name', async () => {
    const r = await cli('info', 'tiny');
    expect(r.code).toBe(0);
    expect(r.out).toContain('30x17 tiles');
    expect(r.out).toMatch(/cast\s+ana/);
  });

  it('renders a still', async () => {
    const r = await cli('still', 'tiny', '-t', '4', '-o', 'still.png', '--scale', '1');
    expect(r.code).toBe(0);
    expect(existsSync(join(dir, 'still.png'))).toBe(true);
  });

  it('explains unknown commands, scenes and bad numbers', async () => {
    expect((await cli('dance')).err).toMatch(/Unknown command "dance"/);
    expect((await cli('info', 'nope')).err).toMatch(/Scenes in scenes\/: .*tiny/);
    expect((await cli('still', 'tiny', '-t', 'soon')).err).toMatch(/expects a number/);
    expect((await cli('render', 'tiny', '--bogus')).code).toBe(1);
  });

  it('rejects a file whose default export is not a Scene', async () => {
    const bad = join(dir, 'bad.ts');
    writeFileSync(bad, 'export default { title: "Oops", duration: -1 };\n');
    const r = await cli('info', bad);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/not a valid Scene/);
    expect(r.err).toMatch(/duration/);
    expect(r.err).toMatch(/frame\(t\)/);
  });
});
