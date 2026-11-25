/**
 * Check that the documentation matches the code it shows.
 *
 *   pnpm tsx tools/docs-check.ts
 *
 * - A ```ts block whose first line is `// examples/<file>.ts` (or `scenes/`, `src/`) must be
 *   that whole file, character for character. The files in examples/ are built and rendered
 *   by test/docs.test.ts, so a sample shown this way is known to run.
 * - With `(excerpt)` on that first line, the rest of the block must appear in the file as
 *   consecutive lines (leading and trailing spaces aside).
 * - Every relative link and image in the Markdown must point at a file that exists.
 *   Paths under docs/media/ are skipped: another branch commits those pictures.
 *
 * `test/docs.test.ts` runs the same checks with `pnpm check`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The Markdown files this check covers. docs/scene-api.md has its own maintainer. */
export function docFiles(root = ROOT): string[] {
  const files = ['README.md', 'AGENTS.md', 'CLAUDE.md'];
  for (const f of readdirSync(join(root, 'docs'))) if (f.endsWith('.md') && f !== 'scene-api.md') files.push(`docs/${f}`);
  const skills = join(root, '.claude/skills');
  if (existsSync(skills)) for (const d of readdirSync(skills)) if (existsSync(join(skills, d, 'SKILL.md'))) files.push(`.claude/skills/${d}/SKILL.md`);
  return files.filter((f) => existsSync(join(root, f)));
}

const MARKER = /^\/\/ ((?:examples|scenes|src)\/[\w./-]+\.ts)\b(.*)$/;

/** Problems with the code blocks of one Markdown file. */
function checkBlocks(root: string, file: string, text: string): string[] {
  const problems: string[] = [];
  const fence = /```ts\n([\s\S]*?)```/g;
  for (const m of text.matchAll(fence)) {
    const body = m[1]!;
    const [first = '', ...rest] = body.split('\n');
    const marker = MARKER.exec(first);
    if (!marker) continue;
    const path = marker[1]!;
    const line = text.slice(0, m.index).split('\n').length;
    const where = `${file}:${line}`;
    if (!existsSync(join(root, path))) {
      problems.push(`${where}: the block shows ${path}, which does not exist`);
      continue;
    }
    const source = readFileSync(join(root, path), 'utf8');
    if (marker[2]!.includes('(excerpt)')) {
      const want = rest.map((l) => l.trim());
      while (want.length > 0 && want[want.length - 1] === '') want.pop();
      const have = source.split('\n').map((l) => l.trim());
      const found = have.some((_, i) => want.every((l, j) => have[i + j] === l));
      if (!found) problems.push(`${where}: the excerpt of ${path} is not in the file (its lines must appear together and in order)`);
    } else if (body.trimEnd() !== source.trimEnd()) {
      const a = body.trimEnd().split('\n');
      const b = source.trimEnd().split('\n');
      const i = a.findIndex((l, k) => l !== b[k]);
      const at = i === -1 ? Math.min(a.length, b.length) : i;
      problems.push(`${where}: the block differs from ${path} at line ${at + 1}: "${a[at] ?? '(end)'}" vs "${b[at] ?? '(end)'}"`);
    }
  }
  return problems;
}

/** Problems with the relative links and images of one Markdown file. */
function checkLinks(root: string, file: string, text: string): string[] {
  const problems: string[] = [];
  // drop code, where brackets are not links
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const links = [...prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g), ...prose.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]!);
  for (const link of links) {
    if (/^[a-z]+:/i.test(link) || link.startsWith('#')) continue;
    const target = resolve(root, dirname(file), link.split('#')[0]!);
    const rel = relative(root, target);
    if (rel.startsWith('docs/media/')) continue;
    if (!existsSync(target)) problems.push(`${file}: broken link to ${link}`);
  }
  return problems;
}

/** Every problem in the documentation. Empty when all is well. */
export function checkDocs(root = ROOT): string[] {
  return docFiles(root).flatMap((file) => {
    const text = readFileSync(join(root, file), 'utf8');
    return [...checkBlocks(root, file, text), ...checkLinks(root, file, text)];
  });
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const problems = checkDocs();
  for (const p of problems) console.error(p);
  console.log(problems.length === 0 ? `docs ok: ${docFiles().join(', ')}` : `${problems.length} problem(s)`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}
