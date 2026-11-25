#!/usr/bin/env node
/**
 * The `simutown` command: checks the Node version, then runs `main.ts` with the real
 * process. In this repository `pnpm simutown` runs this file through tsx.
 */

// Node 22.18 and 23.6 are the first to run a .ts scene file as it is (type stripping).
const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18) || (major === 23 && minor < 6)) {
  console.error(`simutown needs Node 22.18 or later, and this is Node ${process.versions.node}. Install a newer Node from https://nodejs.org/.`);
  process.exit(1);
}

// Imported only now, so that an older Node gets the message above instead of a syntax or import error.
const { run } = await import('./main');
const tty = process.stderr.isTTY;
process.exitCode = await run(process.argv.slice(2), {
  out: (s) => console.log(s),
  err: (s) => console.error(s),
  status: (s) => {
    if (tty) process.stderr.write(`\r\x1b[2K${s}`);
  },
});

export {};
