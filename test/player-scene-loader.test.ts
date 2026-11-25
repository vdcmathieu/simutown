import { describe, expect, it } from 'vitest';
import { tinyScene } from '../src/fixtures/tiny';
import { loadSceneEntries } from '../web/scene-loader';

describe('gallery scene loading', () => {
  it('lists a scene that throws at import time with its error, and still loads the others', async () => {
    const entries = await loadSceneEntries({
      '../scenes/broken.ts': async () => {
        throw new Error('unknown place "cafe.dor". Places: cafe.door, plaza');
      },
      '../scenes/tiny.ts': async () => ({ default: tinyScene }),
      '../scenes/empty.ts': async () => ({}),
    });
    expect(entries.map((e) => e.name)).toEqual(['broken', 'empty', 'tiny']);
    expect(entries[0]!.error).toMatch(/unknown place "cafe\.dor"/);
    expect(entries[1]!.error).toMatch(/no default export/);
    expect(entries[2]!.scene).toBe(tinyScene);
  });
});
