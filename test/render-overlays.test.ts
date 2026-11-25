/**
 * Screen-space overlays: the renderer decides where emotes, labels and bubbles go and
 * `src/ui` draws them. The ui module is replaced by spies here, so these tests hold
 * whatever the real drawing looks like.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Surface } from '../src/core/surface';
import { createRenderer } from '../src/render';
import { labelHeight } from '../src/render/overlays';
import * as ui from '../src/ui';
import { actor, block, frameState, kitArt, kitTown } from '../tools/render-testkit';

vi.mock('../src/ui', () => ({
  drawBubble: vi.fn(),
  drawCaption: vi.fn(),
  drawEmote: vi.fn(),
  drawLabel: vi.fn(),
  drawTitle: vi.fn(),
}));

const art = kitArt();
art.emotes.heart = block('brick.1', 9, 8);
const renderer = createRenderer(kitTown(8, 6), { art, warn: () => {} });
const out = new Surface(96, 64);

beforeEach(() => vi.clearAllMocks());

describe('overlays', () => {
  it('puts a bubble at the top of the speaker’s head, in screen pixels at any zoom', () => {
    const state = frameState(48, 32, {
      actors: [actor('a', 'red', 40, 50)],
      bubbles: [{ actor: 'a', text: 'Hello', kind: 'say', reveal: 0.5 }],
    });
    renderer.render(state, out);
    // the head's top is world (40, 26) and at zoom 1 the view starts at world (0, 0);
    // the tail stops a pixel short so that two clear pixels are left above the hair
    expect(vi.mocked(ui.drawBubble).mock.calls[0]![2]).toEqual({ x: 40, y: 25, text: 'Hello', kind: 'say', reveal: 0.5 });
    renderer.render({ ...state, camera: { x: 48, y: 32, zoom: 2 } }, out);
    // at zoom 2 the view starts at world (24, 16)
    expect(vi.mocked(ui.drawBubble).mock.calls[1]![2]).toMatchObject({ x: 32, y: 19 });
  });

  it('stacks emote, label and bubble upward from the head', () => {
    renderer.render(
      frameState(48, 32, {
        actors: [actor('a', 'red', 40, 50, { emote: 'heart' })],
        bubbles: [{ actor: 'a', text: 'Hi', kind: 'think', reveal: 1 }],
        annotations: [
          { kind: 'label', actor: 'a', text: 'knows', opacity: 0.8 },
          { kind: 'label', at: { x: 10, y: 40 }, text: 'cafe', opacity: 1 },
        ],
      }),
      out,
    );
    expect(vi.mocked(ui.drawEmote).mock.calls[0]!.slice(2)).toEqual(['heart', 40, 25]); // never on the face
    const labels = vi.mocked(ui.drawLabel).mock.calls.map((c) => c.slice(2));
    expect(labels).toEqual([
      ['knows', 40, 15, 0.8], // above the 8-pixel emote and a gap
      ['cafe', 10, 16, 1], // `at` is a spot on the ground: lifted by a character's height
    ]);
    const bubble = vi.mocked(ui.drawBubble).mock.calls[0]![2];
    expect(bubble.x).toBe(40);
    expect(bubble.y).toBe(15 - labelHeight(art.font) - 2); // above the label and a gap
  });

  it('draws caption and title only when visible, and overlays last', () => {
    renderer.render(frameState(48, 32, { caption: { text: 'A town.', opacity: 0.4 }, title: { text: 'Hello', subtitle: 'sub', opacity: 0 } }), out);
    expect(vi.mocked(ui.drawCaption)).toHaveBeenCalledWith(out, expect.anything(), 'A town.', 0.4);
    expect(vi.mocked(ui.drawTitle)).not.toHaveBeenCalled();
    renderer.render(frameState(48, 32, { title: { text: 'Hello', subtitle: 'sub', opacity: 1 } }), out);
    expect(vi.mocked(ui.drawTitle)).toHaveBeenCalledWith(out, expect.anything(), 'Hello', 'sub', 1);
    expect(vi.mocked(ui.drawCaption)).toHaveBeenCalledTimes(1);
  });
});
