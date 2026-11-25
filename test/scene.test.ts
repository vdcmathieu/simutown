import { describe, expect, it } from 'vitest';
import { blank } from '../src/core/sprite';
import type { ArtRegistry, CharacterDef, Dir, FrameState } from '../src/core/types';
import { type ActorHandle, scene, type SceneBuilder, timing } from '../src/scene';
import { cameraFor } from '../src/render/camera';
import { defineTown, isWalkable, tileAt, tileCenter } from '../src/world';

const sp = blank(16, 16);
const ch = blank(16, 24, [8, 24]);
const dirs = (): Record<Dir, typeof ch[]> => ({ down: [ch], up: [ch], left: [ch], right: [ch] });
const person = (id: string, poses?: string[]): CharacterDef => ({
  id,
  name: id,
  idle: dirs(),
  walk: dirs(),
  ...(poses ? { poses: Object.fromEntries(poses.map((p) => [p, dirs()])) } : {}),
});

const art: ArtRegistry = {
  terrain: {
    grass: { id: 'grass', variants: [sp], priority: 2 },
    cobble: { id: 'cobble', variants: [sp], priority: 1 },
    water: { id: 'water', variants: [sp], priority: 3, solid: true },
  },
  props: {
    lamp: { id: 'lamp', sprite: sp, footprint: { w: 1, h: 1 } },
    house: { id: 'house', sprite: sp, footprint: { w: 3, h: 2 }, places: { door: { dx: 1, dy: 1 } } },
    bench: {
      id: 'bench',
      sprite: sp,
      footprint: { w: 2, h: 1 },
      places: { left: { dx: 0, dy: 1 }, right: { dx: 1, dy: 1 } },
      seats: { left: { x: 8, y: 2 }, right: { x: 24, y: 2 } },
    },
    // Seats but no places: sitters come from the nearest free tile beside it.
    stool: { id: 'stool', sprite: sp, footprint: { w: 1, h: 1 }, seats: { top: { x: 8, y: -4, dir: 'left' } } },
  },
  characters: { ana: person('ana', ['wave', 'sit', 'talk', 'carry']), ben: person('ben'), cy: person('cy', ['sit', 'talk']) },
  emotes: { surprise: sp, heart: sp },
  font: { height: 8, glyphs: {} },
};

// 20 x 12 tiles = 320 x 192 px, smaller than the 480 x 270 view.
const town = defineTown(
  {
    name: 'Testville',
    terrain: `
      gggggggggggggggggggg
      gggggggggggggggggggg
      gggggggggggggggggggg
      gggggggggggggggggggg
      gggggggg~~~ggggggggg
      cccccccc~~~ccccccccc
      gggggggg~~~ggggggggg
      gggggggggggggggggggg
      gggggggggggggggggggg
      gggggggggggggggggggg
      ggggggggggggggggg~~~
      ggggggggggggggggg~g~
    `,
    legend: { g: 'grass', c: 'cobble', '~': 'water' },
    props: [
      { kind: 'house', at: [2, 3], id: 'cafe' },
      { kind: 'lamp', at: [14, 4] },
    ],
    places: { west: [1, 5], east: [18, 5], plaza: [10, 8], pocket: [18, 11] },
  },
  art,
);

// 60 x 40 tiles = 960 x 640 px, larger than the view.
const big = defineTown({ name: 'Big', terrain: Array(40).fill('g'.repeat(60)).join('\n'), legend: { g: 'grass' } }, art);

const make = (script: (s: SceneBuilder) => void, t = town) => scene({ title: 'T', town: t, art }, script);
const actor = (f: FrameState, id: string) => f.actors.find((a) => a.id === id);
const center = (tx: number, ty: number) => tileCenter(tx, ty);

describe('scene basics', () => {
  it('defaults: noon, camera centred, no fade, duration from the script', () => {
    const sc = make((s) => {
      s.actor('ana', { at: 'west' });
      s.wait(2);
    });
    expect(sc.duration).toBe(2);
    expect([sc.fps, sc.width, sc.height]).toEqual([30, 480, 270]);
    const f = sc.frame(0);
    expect(f.timeOfDay).toBe(12);
    expect(f.fade).toBe(0);
    expect(f.camera).toEqual({ x: 160, y: 96, zoom: 1 });
    expect(actor(f, 'ana')).toEqual({ id: 'ana', character: 'ana', ...center(1, 5), dir: 'down', pose: 'idle', animTime: 0 });
  });

  it('clamps t outside [0, duration] and treats NaN as 0', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      a.walkTo([5, 5]);
    });
    expect(sc.frame(-3)).toEqual(sc.frame(0));
    expect(sc.frame(99)).toEqual(sc.frame(sc.duration));
    expect(sc.frame(Number.NaN)).toEqual(sc.frame(0));
    expect(sc.frame(99).t).toBe(sc.duration);
  });
});

describe('walking', () => {
  it('walks at constant speed, with dir, pose and animTime, and arrives', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [2, 5] });
      a.walkTo([7, 5]);
    });
    expect(sc.duration).toBeCloseTo(5 / timing.WALK_SPEED);
    const mid = actor(sc.frame(1), 'ana')!;
    expect(mid).toMatchObject({ x: center(2, 5).x + 40, y: center(2, 5).y, dir: 'right', pose: 'walk', animTime: 1 });
    const end = actor(sc.frame(2), 'ana')!;
    expect(end).toMatchObject({ ...center(7, 5), dir: 'right', pose: 'idle', animTime: 0 });
  });

  it('follows a path around water and turns along it', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [7, 5] });
      a.walkTo([11, 5], { speed: 4 });
    });
    // Around the 3-wide, 3-tall pond: 4 steps across + 2 * 2 steps around = 8 steps.
    expect(sc.duration).toBeCloseTo(8 / 4);
    const seen = new Set<string>();
    for (let t = 0; t <= sc.duration; t += 1 / 30) {
      const a = actor(sc.frame(t), 'ana')!;
      const tile = tileAt(a.x, a.y);
      expect(isWalkable(town, tile.tx, tile.ty)).toBe(true);
      seen.add(a.dir);
    }
    expect(seen.has('right')).toBe(true);
    expect(seen.has('up') || seen.has('down')).toBe(true);
    expect(actor(sc.frame(sc.duration), 'ana')).toMatchObject(center(11, 5));
  });

  it('walks to another actor: stops on a free tile beside them, facing them', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [1, 8] });
      s.actor('ben', { at: [6, 8] });
      a.walkTo(s.actor('cy', { at: [12, 9] }));
    });
    const f = sc.frame(sc.duration);
    const a = actor(f, 'ana')!;
    expect(a).toMatchObject({ ...center(11, 9), dir: 'right', pose: 'idle' });
  });

  it('a second walk inside together interrupts the first from where the actor is', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [0, 8] });
      s.together(() => {
        a.walkTo([10, 8]);
        s.sequence(() => {
          s.wait(1);
          a.walkTo([2, 9]);
        });
      });
    });
    const at1 = actor(sc.frame(1), 'ana')!;
    expect(at1.x).toBe(center(0, 8).x + 40);
    const after = actor(sc.frame(1.2), 'ana')!;
    expect(after.x).toBeLessThan(at1.x);
    expect(actor(sc.frame(sc.duration), 'ana')).toMatchObject(center(2, 9));
  });

  it('teleports, faces, hides and shows', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west', facing: 'left' });
      const b = s.actor('ben', { at: 'plaza' });
      s.wait(1);
      a.teleport('east');
      a.face(b);
      s.wait(1);
      a.hide();
      s.wait(1);
      a.show();
      a.face('up');
      s.wait(1);
    });
    expect(actor(sc.frame(0.5), 'ana')).toMatchObject({ ...center(1, 5), dir: 'left' });
    expect(actor(sc.frame(1.5), 'ana')).toMatchObject({ ...center(18, 5), dir: 'left' });
    expect(actor(sc.frame(2.5), 'ana')).toBeUndefined();
    expect(actor(sc.frame(3.5), 'ana')).toMatchObject({ ...center(18, 5), dir: 'up' });
  });

  it('enters and exits through a door', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [3, 5] });
      a.enter('cafe');
      s.wait(1);
      a.exit('cafe');
    });
    // cafe door is at [3, 4]: one step up, then a 0.3 s fade.
    const walk = 1 / timing.WALK_SPEED;
    expect(sc.duration).toBeCloseTo(walk + timing.DOOR_FADE + 1 + timing.DOOR_FADE);
    expect(actor(sc.frame(walk + 0.15), 'ana')).toMatchObject({ ...center(3, 4), dir: 'up' });
    expect(actor(sc.frame(walk + 0.15), 'ana')!.opacity).toBeCloseTo(0.5);
    expect(actor(sc.frame(walk + 0.5), 'ana')).toBeUndefined();
    const out = walk + timing.DOOR_FADE + 1;
    expect(actor(sc.frame(out + 0.15), 'ana')).toMatchObject({ ...center(3, 4), dir: 'down' });
    expect(actor(sc.frame(out + 0.15), 'ana')!.opacity).toBeCloseTo(0.5);
    expect(actor(sc.frame(sc.duration), 'ana')!.opacity).toBeUndefined();
  });

  it('hidden actors can come out of a building later', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'cafe.door', hidden: true });
      s.wait(1);
      a.exit('cafe');
    });
    expect(sc.frame(0.5).actors).toEqual([]);
    expect(actor(sc.frame(sc.duration), 'ana')).toBeDefined();
  });

  it('plays poses and returns to idle', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      a.pose('wave', { hold: 2 });
      s.wait(1);
    });
    expect(actor(sc.frame(0.5), 'ana')).toMatchObject({ pose: 'wave', animTime: 0.5 });
    expect(actor(sc.frame(2.5), 'ana')).toMatchObject({ pose: 'idle', animTime: 0.5 });
  });
});

describe('timing', () => {
  it('runs calls in sequence by default; together takes the longest; sequence sums', () => {
    const marks: number[] = [];
    const sc = make((s) => {
      s.wait(1);
      marks.push(s.now);
      s.together(() => {
        s.wait(2);
        marks.push(s.now);
        s.wait(3);
        s.sequence(() => {
          s.wait(1);
          s.wait(1.5);
          marks.push(s.now);
        });
      });
      marks.push(s.now);
      s.sequence(() => s.wait(0.5));
    });
    expect(marks).toEqual([1, 1, 3.5, 4]);
    expect(sc.duration).toBe(4.5);
  });

  it('nests together inside sequence inside together', () => {
    const sc = make((s) => {
      s.together(() => {
        s.wait(1);
        s.sequence(() => {
          s.together(() => {
            s.wait(2);
            s.wait(0.5);
          });
          s.wait(1);
        });
      });
    });
    expect(sc.duration).toBe(3);
  });
});

describe('bubbles and emotes', () => {
  it('reveals text like a typewriter and holds it long enough to read', () => {
    const text = 'Party on Friday at the cafe!'; // 28 characters
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      a.say(text);
    });
    const type = text.length / 30;
    expect(sc.duration).toBeCloseTo(type + Math.max(1.2, text.length / 15));
    expect(sc.frame(0).bubbles).toEqual([{ actor: 'ana', text, kind: 'say', reveal: 0 }]);
    expect(sc.frame(type / 2).bubbles[0]!.reveal).toBeCloseTo(0.5);
    expect(sc.frame(type + 0.1).bubbles[0]!.reveal).toBe(1);
    expect(sc.frame(sc.duration).bubbles).toEqual([]);
  });

  it('uses a hold option, bubble kinds and replaces a running bubble', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      const b = s.actor('ben', { at: 'east' });
      s.together(() => {
        a.think('hmm', { hold: 3 });
        b.shout('HEY', { hold: 1 });
      });
      a.say('ok', { hold: 0.5 });
    });
    expect(sc.duration).toBeCloseTo(0.1 + 3 + 2 / 30 + 0.5);
    const f = sc.frame(0.5);
    expect(f.bubbles.map((b) => [b.actor, b.kind])).toEqual([['ana', 'think'], ['ben', 'shout']]);
    expect(sc.frame(2).bubbles.map((b) => b.kind)).toEqual(['think']);
  });

  it('shows emotes for their hold', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      a.emote('surprise');
      s.wait(1);
    });
    expect(sc.duration).toBeCloseTo(timing.EMOTE_HOLD + 1);
    expect(actor(sc.frame(0.5), 'ana')!.emote).toBe('surprise');
    expect(actor(sc.frame(1.5), 'ana')!.emote).toBeUndefined();
  });
});

describe('overlays', () => {
  it('titles fade in, hold and fade out', () => {
    const sc = make((s) => s.title('Word of mouth', 'How news travels'));
    expect(sc.duration).toBeCloseTo(2.5);
    expect(sc.frame(0.25).title).toEqual({ text: 'Word of mouth', subtitle: 'How news travels', opacity: 0.5 });
    expect(sc.frame(1).title!.opacity).toBe(1);
    expect(sc.frame(2.25).title!.opacity).toBeCloseTo(0.5);
  });

  it('captions stay until replaced or cleared, or for their hold', () => {
    const sc = make((s) => {
      s.caption('one');
      s.wait(1);
      s.caption('two');
      s.wait(1);
      s.clearCaption();
      s.wait(1);
      s.caption('three', { hold: 1 });
      s.wait(1);
    });
    expect(sc.frame(0.1).caption!.opacity).toBeCloseTo(0.4);
    expect(sc.frame(0.5).caption).toEqual({ text: 'one', opacity: 1 });
    expect(sc.frame(1.05).caption).toEqual({ text: 'two', opacity: 1 });
    expect(sc.frame(2.1).caption!.opacity).toBeCloseTo(0.6);
    expect(sc.frame(2.5).caption).toBeUndefined();
    expect(sc.frame(3.5).caption!.text).toBe('three');
    expect(sc.frame(4.5).caption).toBeUndefined();
  });

  it('labels, links and rings', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      const b = s.actor('ben', { at: 'east' });
      s.label(a, 'knows');
      s.label('plaza', 'the plaza');
      s.link(a, b);
      s.ring(b, { hold: 1, slot: 'ochre.2' });
      s.unlabel(a);
      s.wait(1);
    });
    expect(sc.duration).toBeCloseTo(1.5 + 1.4 + 1);
    const f = sc.frame(0.3);
    expect(f.annotations).toEqual([
      { kind: 'label', actor: 'ana', text: 'knows', opacity: 1 },
      { kind: 'label', at: center(10, 8), text: 'the plaza', opacity: 1 },
      { kind: 'link', from: 'ana', to: 'ben', progress: 0.5 },
    ]);
    expect(sc.frame(1.7).annotations).toContainEqual({ kind: 'ring', actor: 'ben', progress: expect.closeTo(0.5), slot: 'ochre.2' });
    expect(sc.frame(3).annotations!.map((a) => a.kind)).toEqual(['label', 'label']);
    expect(sc.frame(3.5).annotations).toEqual([{ kind: 'label', at: center(10, 8), text: 'the plaza', opacity: 1 }]);
  });

  it('focus ramps in and out', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      s.focus(a);
      s.wait(1);
      s.unfocus({ duration: 1 });
    });
    expect(sc.frame(0.2).focus).toEqual({ actors: ['ana'], amount: 0.5 });
    expect(sc.frame(1).focus!.amount).toBe(1);
    expect(sc.frame(1.9).focus!.amount).toBeCloseTo(0.5);
    expect(sc.frame(2.4).focus).toBeUndefined();
  });

  it('fades in from ink and out to ink; animates the hour', () => {
    const sc = make((s) => {
      s.fadeIn();
      s.timeOfDay(18, { duration: 2 });
      s.fadeOut(1);
    });
    expect(sc.frame(0).fade).toBe(1);
    expect(sc.frame(0.3).fade).toBeCloseTo(0.5);
    expect(sc.frame(1).fade).toBe(0);
    expect(sc.frame(1.6).timeOfDay).toBeCloseTo(15);
    expect(sc.frame(3.1).fade).toBeCloseTo(0.5);
    expect(sc.frame(sc.duration)).toMatchObject({ fade: 1, timeOfDay: 18 });
  });
});

describe('camera', () => {
  it('centres a town smaller than the view, whatever the target', () => {
    const sc = make((s) => s.camera.cut([0, 0]));
    expect(sc.frame(0).camera).toEqual({ x: 160, y: 96, zoom: 1 });
  });

  it('clamps the view inside a town larger than the view', () => {
    const sc = make((s) => {
      s.camera.cut([0, 0]);
      s.wait(1);
      s.camera.cut([59, 39], { zoom: 2 });
      s.wait(1);
      s.camera.cut([30, 20]);
    }, big);
    expect(sc.frame(0.5).camera).toEqual({ x: 240, y: 135, zoom: 1 });
    // At zoom 2 the view is 240 x 135: centre 572 puts its rounded top at 505 and bottom at 640.
    expect(sc.frame(1.5).camera).toEqual({ x: 960 - 120, y: 572, zoom: 2 });
    expect(sc.frame(2).camera).toEqual({ x: 30 * 16 + 8, y: 20 * 16, zoom: 2 });
  });

  it('pans with ease-in-out and zooms halfway', () => {
    const sc = make((s) => {
      s.camera.cut([20, 20]);
      s.camera.pan([40, 20], { duration: 2, zoom: 2 });
    }, big);
    const x0 = 20 * 16 + 8;
    const x1 = 40 * 16 + 8;
    expect(sc.frame(0).camera).toEqual({ x: x0, y: 320, zoom: 1 });
    expect(sc.frame(0.5).camera.x).toBeCloseTo(x0 + (x1 - x0) * 0.15625, -1);
    expect(sc.frame(0.9).camera.zoom).toBe(1);
    expect(sc.frame(1).camera).toEqual({ x: (x0 + x1) / 2, y: 320, zoom: 2 });
    expect(sc.frame(2).camera).toEqual({ x: x1, y: 320, zoom: 2 });
  });

  it('follows an actor until the next camera call', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [20, 20] });
      s.camera.follow(a);
      a.walkTo([30, 20], { speed: 5 });
      s.camera.follow(null);
      a.walkTo([35, 20], { speed: 5 });
    }, big);
    expect(sc.frame(1).camera).toEqual({ x: 25 * 16 + 8, y: 20 * 16, zoom: 1 });
    expect(sc.frame(2).camera.x).toBe(30 * 16 + 8);
    expect(sc.frame(3).camera.x).toBe(30 * 16 + 8);
  });

  it('cuts to an actor where they are at that moment', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [20, 20] });
      s.camera.cut(a, { zoom: 3 });
      a.walkTo([30, 20]);
    }, big);
    expect(sc.frame(sc.duration).camera).toEqual({ x: 20 * 16 + 8, y: 320, zoom: 3 });
  });
});

describe('wander', () => {
  const wanderScene = (seed = 1) =>
    scene({ title: 'W', town, art, seed }, (s) => {
      const a = s.actor('ana', { at: 'plaza' });
      const b = s.actor('ben', { at: 'west' });
      s.wander(a, { around: 'plaza', radius: 2 });
      s.wait(10);
      b.walkTo(a);
      a.say('hi');
    });

  it('strolls near the place, deterministically, and stops at the next instruction', () => {
    const sc = wanderScene();
    let moved = false;
    for (let t = 0; t <= 10; t += 0.1) {
      const a = actor(sc.frame(t), 'ana')!;
      const tile = tileAt(a.x, a.y);
      expect(Math.abs(tile.tx - 10)).toBeLessThanOrEqual(2);
      expect(Math.abs(tile.ty - 8)).toBeLessThanOrEqual(2);
      if (a.pose === 'walk') moved = true;
    }
    expect(moved).toBe(true);
    expect(JSON.stringify(wanderScene().frame(7.3))).toBe(JSON.stringify(sc.frame(7.3)));
    const other = wanderScene(2);
    const differs = [2, 4, 6, 8].some((t) => JSON.stringify(other.frame(t)) !== JSON.stringify(sc.frame(t)));
    expect(differs).toBe(true);
    // After the wander stops, ana stays put while ben walks over to her.
    const later = sc.frame(sc.duration);
    const a = actor(later, 'ana')!;
    expect(a.pose).toBe('idle');
    const b = actor(later, 'ben')!;
    const [ta, tb] = [tileAt(a.x, a.y), tileAt(b.x, b.y)];
    expect(Math.abs(ta.tx - tb.tx) + Math.abs(ta.ty - tb.ty)).toBe(1);
  });
});

describe('determinism', () => {
  it('frame(t) is identical across repeated and out-of-order calls', () => {
    const build = () =>
      make((s) => {
        const a = s.actor('ana', { at: 'west' });
        const b = s.actor('ben', { at: 'east' });
        s.wander(b, { around: 'east', seed: 'x' });
        s.camera.follow(a);
        a.walkTo('plaza');
        a.say('Hello there');
        s.wait(3);
      });
    const sc = build();
    const times = Array.from({ length: 60 }, (_, i) => (i * 7.3) % sc.duration);
    const first = times.map((t) => JSON.stringify(sc.frame(t)));
    const reversed = [...times].reverse().map((t) => JSON.stringify(sc.frame(t))).reverse();
    expect(reversed).toEqual(first);
    const again = build();
    expect(times.map((t) => JSON.stringify(again.frame(t)))).toEqual(first);
  });
});

describe('errors an author can act on', () => {
  const err = (script: (s: SceneBuilder) => void) => () => make(script);

  it('unknown character, place, prop, pose, emote, direction', () => {
    expect(err((s) => s.actor('anna', { at: 'west' }))).toThrow(/Unknown character "anna". Did you mean "ana"\? Valid characters: ana, ben, cy\./);
    expect(err((s) => s.actor('ana', { at: 'wset' }))).toThrow(/Unknown place "wset". Did you mean "west"\? Valid places: cafe.door, east, plaza, pocket, west\./);
    expect(err((s) => s.actor('ana', { at: 'west' }).walkTo('cafe.dor'))).toThrow(/Did you mean "cafe.door"/);
    expect(err((s) => s.actor('ana', { at: 'west' }).enter('caffe'))).toThrow(/Unknown prop "caffe". Did you mean "cafe"\? Valid props: cafe, lamp\./);
    expect(err((s) => s.actor('ana', { at: 'west' }).enter('lamp'))).toThrow(/prop "lamp" has no door place. Props with a door: cafe\./);
    expect(err((s) => s.actor('ana', { at: 'west' }).pose('wav'))).toThrow(/Unknown pose "wav". Did you mean "wave"\? Valid poses: carry, sit, talk, wave\. \(for character "ana"\)/);
    expect(err((s) => s.actor('ben', { at: 'west' }).pose('wave'))).toThrow(/There are no poses/);
    expect(err((s) => s.actor('ana', { at: 'west' }).emote('suprise'))).toThrow(/Unknown emote "suprise". Did you mean "surprise"\? Valid emotes: heart, surprise\./);
    expect(err((s) => s.actor('ana', { at: 'west' }).face('north' as Dir))).toThrow(/Unknown direction "north"/);
  });

  it('actor ids passed as strings get a hint', () => {
    expect(
      err((s) => {
        s.actor('ben', { at: 'east' });
        s.actor('ana', { at: 'west' }).walkTo('ben');
      }),
    ).toThrow(/"ben" is an actor: pass its handle/);
  });

  it('unreachable targets say which tiles block them', () => {
    expect(err((s) => s.actor('ana', { at: 'west' }).walkTo('pocket'))).toThrow(
      /ana cannot walk from \[1, 5\] to \[18, 11\]\. The target \[18, 11\] is in an enclosed area of 1 tile\(s\), walled in by: .*\[18, 10\] water \(solid terrain\)/,
    );
    expect(err((s) => s.actor('ana', { at: 'west' }).walkTo([9, 5]))).toThrow(/\[9, 5\] is not walkable: water \(solid terrain\)/);
    expect(err((s) => s.actor('ana', { at: 'west' }).walkTo([3, 3]))).toThrow(/\[3, 3\] is not walkable: prop cafe/);
    expect(err((s) => s.actor('ana', { at: [40, 2] }))).toThrow(/tile \[40,2\] is not a tile of the 20x12 map/);
  });

  it('duplicate actors, bad handles, bad numbers, out-of-order moves', () => {
    expect(
      err((s) => {
        s.actor('ana', { at: 'west' });
        s.actor('ana', { at: 'east' });
      }),
    ).toThrow(/already an actor "ana". Give the second one an id/);
    expect(err((s) => s.link({} as ActorHandle, {} as ActorHandle))).toThrow(/expected an actor handle returned by s.actor\(\)/);
    expect(err((s) => s.wait(-1))).toThrow(/s.wait must be a number of seconds >= 0/);
    expect(err((s) => s.camera.cut('plaza', { zoom: 1.5 }))).toThrow(/zoom must be a whole number from 1 to 16/);
    expect(err((s) => s.camera.pan('plaza', { zoom: 17 }))).toThrow(/from 1 to 16, got 17/);
    expect(err((s) => s.timeOfDay(25))).toThrow(/between 0 and 24/);
    expect(
      err((s) => {
        const a = s.actor('ana', { at: 'west' });
        s.together(() => {
          s.sequence(() => {
            s.wait(2);
            a.walkTo('plaza');
          });
          a.walkTo('east');
        });
      }),
    ).toThrow(/ana already has a move starting at 2.00s.*in time order/);
  });
});

describe('a longer scene with three actors', () => {
  const sc = make((s) => {
    const ana = s.actor('ana', { at: 'cafe.door', hidden: true });
    const ben = s.actor('ben', { at: 'plaza', facing: 'left' });
    const cy = s.actor('cy', { at: 'east' });
    s.fadeIn();
    s.title('Word of mouth', 'How news travels');
    s.wander(cy, { around: 'east', radius: 2 });
    s.camera.cut('cafe.door', { zoom: 2 });
    ana.exit('cafe');
    s.caption('Ana has news.');
    s.camera.follow(ana);
    ana.walkTo(ben);
    ana.say('Party at the cafe on Friday!');
    s.together(() => {
      ben.emote('surprise');
      s.link(ana, ben);
      s.camera.pan('plaza', { duration: 2, zoom: 1 });
    });
    s.label(ben, 'knows');
    ben.walkTo(cy);
    ben.shout('Party on Friday!');
    s.together(() => {
      s.link(ben, cy);
      cy.emote('heart');
      ana.enter('cafe');
    });
    s.label(cy, 'knows');
    s.focus([ana, ben, cy]);
    s.clearCaption();
    s.wait(1);
    s.fadeOut();
  });

  it('runs end to end with everyone on walkable tiles', () => {
    expect(sc.duration).toBeGreaterThan(15);
    for (let i = 0; i <= sc.duration * 30; i++) {
      const f = sc.frame(i / 30);
      for (const a of f.actors) {
        const tile = tileAt(a.x, a.y);
        expect(isWalkable(town, tile.tx, tile.ty)).toBe(true);
        expect(Number.isInteger(a.x) && Number.isInteger(a.y)).toBe(true);
      }
      expect(Number.isInteger(f.camera.x) && Number.isInteger(f.camera.y)).toBe(true);
    }
  });

  it('ends with ana inside, ben next to cy, both labelled, faded out', () => {
    const f = sc.frame(sc.duration);
    expect(actor(f, 'ana')).toBeUndefined();
    const b = actor(f, 'ben')!;
    const c = actor(f, 'cy')!;
    const [tb, tc] = [tileAt(b.x, b.y), tileAt(c.x, c.y)];
    expect(Math.abs(tb.tx - tc.tx) + Math.abs(tb.ty - tc.ty)).toBe(1);
    expect(f.annotations!.filter((a) => a.kind === 'label').map((a) => (a as { actor: string }).actor)).toEqual(['ben', 'cy']);
    expect(f.fade).toBe(1);
    expect(f.caption).toBeUndefined();
    expect(f.focus).toEqual({ actors: ['ana', 'ben', 'cy'], amount: 1 });
  });
});

describe('regressions from review', () => {
  it('a wander stops at once when the actor gets a later instruction', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: [12, 8] });
      s.wander(a, { around: [12, 8], radius: 3, speed: 0.2 });
      s.wait(3);
      a.say('stop', { hold: 5 });
    });
    const at = (t: number) => actor(sc.frame(t), 'ana')!;
    expect(at(6).pose).toBe('idle');
    expect([at(6).x, at(6).y]).toEqual([at(3).x, at(3).y]);
    expect([at(9).x, at(9).y]).toEqual([at(3).x, at(3).y]);
  });

  it('ramps start from the value at their start in scene time, not call order', () => {
    const sc = make((s) => {
      s.together(() => {
        s.sequence(() => {
          s.wait(2);
          s.timeOfDay(0, { duration: 2 });
        });
        s.timeOfDay(20, { duration: 1 });
      });
    });
    expect(sc.frame(1.99).timeOfDay).toBeCloseTo(20);
    expect(sc.frame(2).timeOfDay).toBeCloseTo(20);
    expect(sc.frame(3).timeOfDay).toBeCloseTo(10);
    expect(sc.frame(4).timeOfDay).toBe(0);
  });

  it('the bubble shown is the latest in scene time, and it cuts off the earlier one', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      s.together(() => {
        s.sequence(() => {
          s.wait(1);
          a.say('later', { hold: 2 });
        });
        a.say('earlier', { hold: 5 });
      });
    });
    expect(sc.frame(0.5).bubbles.map((b) => b.text)).toEqual(['earlier']);
    expect(sc.frame(1.5).bubbles.map((b) => b.text)).toEqual(['later']);
    expect(sc.frame(4).bubbles).toEqual([]);
  });

  it('a redirected walk never steps back to the tile centre behind the actor', () => {
    // At 0.85 s Ana is 2 px past the centre of tile [2, 8], heading east, when she is sent further east.
    const sc = make((s) => {
      const a = s.actor('ana', { at: [0, 8] });
      s.together(() => {
        a.walkTo([10, 8]);
        s.sequence(() => {
          s.wait(0.85);
          a.walkTo([12, 8]);
        });
      });
    });
    expect(actor(sc.frame(0.85), 'ana')!.x).toBe(center(2, 8).x + 2);
    let prev = -Infinity;
    for (let t = 0; t <= sc.duration; t += 1 / 60) {
      const x = actor(sc.frame(t), 'ana')!.x;
      expect(x).toBeGreaterThanOrEqual(prev);
      prev = x;
    }
    expect(actor(sc.frame(sc.duration), 'ana')!.x).toBe(center(12, 8).x);
  });

  it('frames are copies: changing one never changes the next', () => {
    const sc = make((s) => {
      const a = s.actor('ana', { at: 'west' });
      s.label('plaza', 'here');
      s.focus(a);
      s.wait(1);
    });
    const f = sc.frame(1);
    f.focus!.actors.length = 0;
    (f.annotations![0] as { at: { x: number } }).at.x = -1;
    const g = sc.frame(1);
    expect(g.focus!.actors).toEqual(['ana']);
    expect(g.annotations![0]).toMatchObject({ at: center(10, 8) });
  });

  it('the rounded view the renderer draws stays inside the town at every zoom', () => {
    const targets: [number, number][] = [[0, 0], [59, 39], [0, 39], [59, 0], [30, 20], [7, 33], [52, 3]];
    for (let zoom = 1; zoom <= 16; zoom++) {
      const sc = make((s) => {
        for (const tile of targets) {
          s.camera.cut(tile, { zoom });
          s.wait(1);
        }
      }, big);
      for (let i = 0; i < targets.length; i++) {
        const cam = cameraFor(sc.frame(i + 0.5).camera, sc.width, sc.height);
        expect(cam.x0).toBeGreaterThanOrEqual(0);
        expect(cam.y0).toBeGreaterThanOrEqual(0);
        expect(cam.x0 + cam.w).toBeLessThanOrEqual(960);
        expect(cam.y0 + cam.h).toBeLessThanOrEqual(640);
      }
    }
  });

  it('thousands of camera calls neither overflow the stack nor slow frames down', () => {
    const sc = make((s) => {
      // Only the first cut sets the zoom; every later one carries it forward.
      for (let i = 0; i < 5000; i++) {
        s.camera.cut([i % 60, 20], i === 0 ? { zoom: 2 } : {});
        s.wait(0.01);
      }
      s.camera.pan([30, 20], { duration: 1 });
    }, big);
    expect(() => sc.frame(49)).not.toThrow();
    expect(sc.frame(sc.duration).camera).toEqual({ x: 30 * 16 + 8, y: 320, zoom: 2 });
  });
});

describe('sitting and gestures', () => {
  // 12 x 8 tiles. Bench at [5, 4] (covers [5, 4] and [6, 4]), its places left [5, 5] and right [6, 5].
  // Its seats are at pixels (88, 82) and (104, 82). A stool at [9, 2] has a seat but no places.
  const park = defineTown(
    {
      name: 'Park',
      terrain: Array(8).fill('g'.repeat(12)).join('\n'),
      legend: { g: 'grass' },
      props: [
        { kind: 'bench', at: [5, 4] },
        { kind: 'stool', at: [9, 2] },
        { kind: 'lamp', at: [2, 1] },
      ],
    },
    art,
  );
  const inPark = (script: (s: SceneBuilder) => void) => make(script, park);

  it('walks to the seat place, slides onto the seat pixel and sits', () => {
    const sc = inPark((s) => s.actor('ana', { at: [1, 5] }).sitOn('bench', 'left'));
    const walk = 4 / timing.WALK_SPEED;
    expect(sc.duration).toBeCloseTo(walk + timing.SIT_MOVE);
    expect(actor(sc.frame(1), 'ana')).toMatchObject({ pose: 'walk', dir: 'right' });
    expect(actor(sc.frame(walk), 'ana')).toMatchObject(center(5, 5));
    expect(actor(sc.frame(sc.duration), 'ana')).toMatchObject({ x: 88, y: 82, dir: 'down', pose: 'sit', animTime: 0 });
  });

  it('stays seated through talk, then steps back to its tile on the next move and carries on', () => {
    const sc = inPark((s) => {
      const ana = s.actor('ana', { at: [1, 5] });
      ana.sitOn('bench');
      ana.say('Nice day.');
      ana.walkTo([1, 5]);
    });
    const seated = 4 / timing.WALK_SPEED + timing.SIT_MOVE;
    const said = seated + 'Nice day.'.length / 30 + timing.MIN_HOLD;
    expect(actor(sc.frame(seated + 0.2), 'ana')).toMatchObject({ x: 88, y: 82, pose: 'sit' });
    expect(sc.frame(seated + 0.2).bubbles).toHaveLength(1);
    expect(actor(sc.frame(said + timing.SIT_MOVE), 'ana')).toMatchObject(center(5, 5));
    expect(sc.duration).toBeCloseTo(said + timing.SIT_MOVE + 4 / timing.WALK_SPEED);
    expect(actor(sc.frame(sc.duration), 'ana')).toMatchObject({ ...center(1, 5), pose: 'idle' });
  });

  it('holds the seat for `hold` seconds; two people share a bench', () => {
    const sc = inPark((s) => {
      const ana = s.actor('ana', { at: [1, 5] });
      const cy = s.actor('cy', { at: [10, 5] });
      s.together(() => {
        ana.sitOn('bench', 'left', { hold: 2 });
        cy.sitOn('bench', 'right');
      });
      cy.say('Did you hear?');
    });
    const seated = 4 / timing.WALK_SPEED + timing.SIT_MOVE;
    expect(sc.frame(seated + 2).actors.map((a) => [a.id, a.x, a.y, a.pose])).toEqual([
      ['ana', 88, 82, 'sit'],
      ['cy', 104, 82, 'sit'],
    ]);
  });

  it('uses the first seat by default, and the nearest free tile when the prop has no places', () => {
    const sc = inPark((s) => {
      const cy = s.actor('cy', { at: [10, 6] });
      const ana = s.actor('ana', { at: [1, 2] });
      s.together(() => {
        cy.sitOn('bench');
        ana.sitOn('stool');
      });
    });
    const f = sc.frame(sc.duration);
    expect(actor(f, 'cy')).toMatchObject({ x: 88, y: 82 });
    expect(actor(f, 'ana')).toMatchObject({ x: 152, y: 44, dir: 'left', pose: 'sit' });
    expect(actor(sc.frame(7 / timing.WALK_SPEED), 'ana')).toMatchObject(center(8, 2));
  });

  it('a seat can be taken again once its sitter has left', () => {
    const sc = inPark((s) => {
      const ana = s.actor('ana', { at: [1, 5] });
      const cy = s.actor('cy', { at: [10, 5] });
      ana.sitOn('bench', 'left');
      ana.walkTo([1, 6]);
      cy.sitOn('bench', 'left');
    });
    expect(actor(sc.frame(sc.duration), 'cy')).toMatchObject({ x: 88, y: 82, pose: 'sit' });
  });

  it('say plays the talk pose while the text types out, unless gesture is false', () => {
    const text = 'Hello there, friend'; // 19 characters
    const sc = inPark((s) => {
      const ana = s.actor('ana', { at: [1, 5] });
      const ben = s.actor('ben', { at: [3, 5] });
      ana.say(text);
      ana.say(text, { gesture: false });
      ben.say(text);
    });
    const typing = text.length / 30;
    const one = typing + Math.max(timing.MIN_HOLD, text.length / 15);
    expect(actor(sc.frame(0.2), 'ana')).toMatchObject({ pose: 'talk', animTime: 0.2 });
    expect(actor(sc.frame(typing + 0.1), 'ana')!.pose).toBe('idle');
    expect(actor(sc.frame(one + 0.2), 'ana')!.pose).toBe('idle');
    expect(actor(sc.frame(2 * one + 0.2), 'ben')!.pose).toBe('idle');
  });

  it('pose accepts every pose the character has', () => {
    for (const name of ['talk', 'wave', 'carry', 'sit']) {
      const sc = inPark((s) => s.actor('ana', { at: [1, 5] }).pose(name, { hold: 2 }));
      expect(actor(sc.frame(1), 'ana')).toMatchObject({ pose: name, animTime: 1 });
      expect(actor(sc.frame(2), 'ana')!.pose).toBe('idle');
    }
  });

  it('frames stay pure with sitting in the script', () => {
    const sc = inPark((s) => {
      const ana = s.actor('ana', { at: [1, 5] });
      const cy = s.actor('cy', { at: [10, 5] });
      s.together(() => {
        ana.sitOn('bench', 'left');
        cy.sitOn('bench', 'right');
      });
      ana.say('So?');
      cy.say('So what?');
      s.together(() => {
        ana.walkTo([0, 0]);
        cy.walkTo([11, 7]);
      });
    });
    const times = Array.from({ length: 50 }, (_, i) => (i * 3.7) % sc.duration);
    const first = times.map((t) => JSON.stringify(sc.frame(t)));
    expect([...times].reverse().map((t) => JSON.stringify(sc.frame(t))).reverse()).toEqual(first);
  });

  it('errors say what is valid', () => {
    const err = (script: (s: SceneBuilder) => void) => () => inPark(script);
    expect(err((s) => s.actor('ana', { at: [1, 5] }).sitOn('bnech'))).toThrow(/Unknown prop "bnech". Did you mean "bench"\? Valid props: bench, lamp, stool/);
    expect(err((s) => s.actor('ana', { at: [1, 5] }).sitOn('lamp'))).toThrow(/prop "lamp" has no seats. Props with seats: bench, stool\./);
    expect(err((s) => s.actor('ana', { at: [1, 5] }).sitOn('bench', 'middle'))).toThrow(/Unknown seat "middle".*Valid seats: left, right\. \(on prop "bench"\)/);
    expect(err((s) => s.actor('ben', { at: [1, 5] }).sitOn('bench'))).toThrow(/ben cannot sit: character "ben" has no "sit" pose\. Its poses: none\./);
    expect(
      err((s) => {
        s.actor('ana', { at: [1, 5] }).sitOn('bench', 'left');
        s.actor('cy', { at: [10, 5] }).sitOn('bench', 'left');
      }),
    ).toThrow(/Seat "bench.left" is taken: ana sits there from 1.60s, and cy would sit there at .*s\. Free seats on bench: right\./);
  });
});
