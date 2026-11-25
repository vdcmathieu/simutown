/**
 * Regression: a scene built with custom art must be drawn with that art by every output
 * path, not validated against it and then rendered from the built-in registry.
 */
import { describe, expect, it } from 'vitest';
import { art as builtin, defineTown, makeCharacter, renderFrame, scene, Surface } from '../src';

describe('custom art in a scene', () => {
  it('reaches the renderer through the scene', () => {
    const lena = makeCharacter({ id: 'lena', name: 'Lena', skin: 'b', head: 'bob', top: { kind: 'shirt', color: 'red' } });
    const art = { ...builtin, characters: { ...builtin.characters, lena } };
    const town = defineTown({ name: 't', terrain: 'gggggg\ngggggg\ngggggg', legend: { g: 'grass' } }, art);
    const withLena = scene({ title: 'custom', town, art }, (s) => {
      s.actor('lena', { at: [2, 1] });
      s.wait(1);
    });
    const empty = scene({ title: 'empty', town }, (s) => s.wait(1));
    expect(withLena.art).toBe(art);
    const a = renderFrame(withLena, 0.5);
    const b = renderFrame(empty, 0.5);
    expect(a).toBeInstanceOf(Surface);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false); // Lena is on screen
  });
});
