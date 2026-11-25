/**
 * A small seeded random generator (mulberry32). Same seed, same sequence, on every machine.
 * Use it for anything that needs variation; never use Math.random in the engine.
 */
export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [0, n). */
  int(n: number): number;
  /** A float in [lo, hi). */
  range(lo: number, hi: number): number;
  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** Hash a string or number into a 32-bit seed (FNV-1a for strings). */
export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Create a generator from a numeric or string seed. */
export function createRng(seed: string | number): Rng {
  let s = hashSeed(seed);
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    range: (lo, hi) => lo + next() * (hi - lo),
    pick: (items) => items[Math.floor(next() * items.length)]!,
  };
}
