import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { invocationDir, projectRoot, run } from '../src/cli/main';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), 'simutown-cli-'));

/** Run the CLI in `cwd`, with this repository as the project unless `root` says otherwise. */
async function cliIn(cwd: string, root: string, ...argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, { out: (s) => out.push(s), err: (s) => err.push(s), cwd, root });
  return { code, out: out.join('\n'), err: err.join('\n') };
}
const cli = (...argv: string[]) => cliIn(dir, REPO, ...argv);

describe('simutown CLI', () => {
  it('prints help', async () => {
    const r = await cli('--help');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/render <scene>/);
    expect(r.out).toMatch(/still/);
    expect(r.out).toMatch(/new +<name>/);
    expect(r.out).toMatch(/--beats/);
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

  it('prints the beats of a scene, in time order, with who and what', async () => {
    const r = await cli('info', join(REPO, 'examples/good-morning.ts'), '--beats');
    expect(r.code).toBe(0);
    const lines = r.out.split('\n');
    const beats = lines.slice(lines.indexOf('Beats') + 1);
    expect(beats).toContain('    0.00s            ana  appears at west');
    expect(beats).toContain('    0.00s -   0.60s       fade in');
    expect(beats).toContain('    0.60s -   5.00s  ana  walks to bo');
    expect(beats).toContain('    5.00s -   6.77s  ana  says "Good morning, Bo!"');
    expect(beats.at(-1)).toMatch(/^ +11\.67s - +12\.27s +fade out$/);
    const starts = beats.map((l) => Number.parseFloat(l));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it('says when a scene has no beats to show', async () => {
    const r = await cli('info', 'tiny', '--beats');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/No beats: this scene was not built with scene\(\)/);
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

describe('where a command runs (regression)', () => {
  it('uses INIT_CWD only when it is the folder the user was in below the script folder', () => {
    const root = mkdtempSync(join(tmpdir(), 'simutown-cwd-'));
    const sub = join(root, 'scenes');
    mkdirSync(sub);
    // `pnpm simutown` from scenes/: pnpm runs the script in the root and reports scenes/ in INIT_CWD
    expect(invocationDir({ INIT_CWD: sub }, root)).toBe(sub);
    // a script that does `cd examples && simutown ...`: INIT_CWD is the root, the command is below it
    expect(invocationDir({ INIT_CWD: root }, sub)).toBe(sub);
    // an INIT_CWD from somewhere unrelated is ignored
    expect(invocationDir({ INIT_CWD: tmpdir() }, sub)).toBe(sub);
    expect(invocationDir({}, sub)).toBe(sub);
  });
});

describe('simutown new, by kind of project (regression)', () => {
  const projectWith = (pkg: string | undefined) => {
    const project = mkdtempSync(join(tmpdir(), 'simutown-kind-'));
    if (pkg !== undefined) writeFileSync(join(project, 'package.json'), pkg);
    return project;
  };

  it('writes .ts only where Node reads .ts as an ES module, and .mts everywhere else', async () => {
    const esm = projectWith('{ "type": "module" }');
    expect((await cliIn(esm, esm, 'new', 'one')).code).toBe(0);
    expect(existsSync(join(esm, 'one.ts'))).toBe(true);

    for (const pkg of ['{ "type": "commonjs" }', '{}', undefined]) {
      const project = projectWith(pkg);
      const r = await cliIn(project, project, 'new', 'one');
      expect(r.code).toBe(0);
      expect(existsSync(join(project, 'one.mts'))).toBe(true);
      expect(existsSync(join(project, 'one.ts'))).toBe(false);
      expect(r.out).toMatch(/one\.mts/);
    }
  });

  it('refuses a name already taken under either extension', async () => {
    const project = projectWith('{ "type": "module" }');
    writeFileSync(join(project, 'one.mts'), 'export default 1;\n');
    const r = await cliIn(project, project, 'new', 'one');
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/already exists/);
  });
});

describe('simutown new', () => {
  it('writes a starter scene to the current folder of a project without scenes/, and it builds and renders', async () => {
    const project = mkdtempSync(join(tmpdir(), 'simutown-new-'));
    const r = await cliIn(project, project, 'new', 'market-day');
    expect(r.code).toBe(0);
    const file = join(project, 'market-day.mts');
    expect(readFileSync(file, 'utf8')).toMatch(/import \{ scene, willowSquare \} from 'simutown';/);
    expect(readFileSync(file, 'utf8')).toMatch(/title: 'Market day'/);

    const info = await cliIn(project, project, 'info', 'market-day', '--beats');
    expect(info.err).toBe('');
    expect(info.out).toMatch(/^Market day/);
    expect(info.out).toMatch(/ana +says "Good morning, Bo!"/);
    const still = await cliIn(project, project, 'still', 'market-day', '--scale', '1');
    expect(still.code).toBe(0);
    expect(existsSync(join(project, 'out'))).toBe(true);
  });

  it('writes into scenes/ when the project has one, and never over a file', async () => {
    const project = mkdtempSync(join(tmpdir(), 'simutown-new-'));
    mkdirSync(join(project, 'scenes'));
    writeFileSync(join(project, 'package.json'), '{}\n');
    const sub = join(project, 'notes');
    mkdirSync(sub);
    expect(projectRoot(sub)).toBe(project);
    expect((await cliIn(sub, projectRoot(sub), 'new', 'two-friends')).code).toBe(0);
    expect(existsSync(join(project, 'scenes/two-friends.mts'))).toBe(true);
    const again = await cliIn(sub, project, 'new', 'two-friends');
    expect(again.code).toBe(1);
    expect(again.err).toMatch(/already exists/);
    const list = await cliIn(sub, project, 'list');
    expect(list.out).toMatch(/two-friends\s+Two friends/);
  });

  it('rejects a name that is not lowercase words and dashes', async () => {
    const r = await cli('new', 'My Scene');
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/lowercase words joined by dashes/);
  });
});
