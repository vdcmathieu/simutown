/**
 * The Atlas: a live catalogue of the built-in art registry, with the ids scene authors
 * type. It walks `art` at runtime, so whatever the registry holds is what it shows;
 * a new character, prop, tile, emote or glyph appears without touching this file.
 */
import { art, interiorProps, interiorTerrain } from '../src/art';
import { compileTheme, daylight, lutRgb, type Slot } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import type { CharacterDef, Dir, PropDef, TerrainDef } from '../src/core/types';
import { h } from './dom';

const lut = compileTheme(daylight);
const DIRS: Dir[] = ['down', 'left', 'right', 'up'];
/** Frame rates when a character does not set its own (the CharacterDef defaults). */
const WALK_FPS = 8;
const IDLE_FPS = 2;

interface Anim {
  canvas: HTMLCanvasElement;
  frames: Sprite[];
  fps: number;
  shown: number;
  flipX?: boolean;
  bg?: Slot;
  overlay?: Sprite[];
}

let anims: Anim[] = [];

/** Draw sprites (anchor-aligned, later ones on top) into a fresh canvas the size of the first. */
function paint(canvas: HTMLCanvasElement, layers: Sprite[], bg?: Slot, flipX = false): void {
  const s = layers[0]!;
  const surf = new Surface(s.w, s.h);
  if (bg) surf.clear([...lutRgb(lut, bg), 255]);
  for (const l of layers) surf.blit(l, flipX ? s.w - s.ax : s.ax, s.ay, lut, { flipX });
  canvas.width = s.w;
  canvas.height = s.h;
  canvas.getContext('2d')?.putImageData(new ImageData(surf.data as Uint8ClampedArray<ArrayBuffer>, s.w, s.h), 0, 0);
}

/** A pixelated canvas for a sprite, scaled by a whole number in CSS. */
function spriteCanvas(layers: Sprite[], scale: number, label: string, bg?: Slot): HTMLCanvasElement {
  const c = h('canvas', { class: 'px', role: 'img', 'aria-label': label });
  paint(c, layers, bg);
  c.style.width = `${layers[0]!.w * scale}px`;
  c.style.height = `${layers[0]!.h * scale}px`;
  return c;
}

/** A canvas that cycles through frames. */
function animCanvas(frames: Sprite[], fps: number, scale: number, label: string, opts: { bg?: Slot; overlay?: Sprite[] } = {}): HTMLCanvasElement {
  const c = spriteCanvas(opts.overlay ? [frames[0]!, opts.overlay[0]!] : [frames[0]!], scale, label, opts.bg);
  if (frames.length > 1) anims.push({ canvas: c, frames, fps, shown: 0, ...opts });
  return c;
}

/** The id, as code, copied on click. */
function idTag(id: string): HTMLElement {
  const b = h('button', { class: 'id', type: 'button', title: 'Copy id' }, id);
  b.addEventListener('click', () => {
    void navigator.clipboard?.writeText(id).then(() => {
      b.classList.add('copied');
      setTimeout(() => b.classList.remove('copied'), 900);
    });
  });
  return b;
}

function item(id: string, figure: Node | Node[], notes: (string | false | undefined)[], extra = ''): HTMLElement {
  return h('article', { class: `item ${extra}`, 'data-id': id.toLowerCase() },
    h('div', { class: 'figure' }, figure),
    h('div', { class: 'caption' }, idTag(id), h('p', { class: 'notes' }, notes.filter(Boolean).join(' · '))),
  );
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// --- sections ----------------------------------------------------------------------------

function characterItem(def: CharacterDef): HTMLElement {
  const strip = (label: string, set: Record<Dir, Sprite[]>, fps: number) =>
    h('div', { class: 'strip' },
      h('span', { class: 'strip-label' }, label),
      DIRS.map((d) =>
        h('figure', {}, animCanvas(set[d], fps, 3, `${def.id} ${label} ${d}`), h('figcaption', {}, d)),
      ),
    );
  const poses = Object.entries(def.poses ?? {});
  return item(
    def.id,
    [strip('walk', def.walk, def.walkFps ?? WALK_FPS), strip('idle', def.idle, def.idleFps ?? IDLE_FPS), ...poses.map(([k, set]) => strip(k, set, def.walkFps ?? WALK_FPS))],
    [def.name, `${def.walk.down.length}-frame walk`, poses.length ? `poses: ${poses.map(([k]) => k).join(', ')}` : 'no extra poses'],
    'wide',
  );
}

function propItem(def: PropDef): HTMLElement {
  const frames = def.anim?.frames ?? [def.sprite];
  const fps = def.anim?.fps ?? 1;
  const scale = def.sprite.w > 48 || def.sprite.h > 64 ? 2 : 3;
  const figs: Node[] = [h('figure', {}, animCanvas(frames, fps, scale, def.id), h('figcaption', {}, 'day'))];
  if (def.emissive) {
    figs.push(h('figure', { class: 'lit' },
      animCanvas(frames, fps, scale, `${def.id} lit`, { bg: 'steel.1', overlay: [def.emissive] }),
      h('figcaption', {}, 'lit')));
  }
  const fp = def.footprint ? `footprint ${def.footprint.w}×${def.footprint.h}` : 'walk-through';
  const places = Object.keys(def.places ?? {});
  return item(def.id, figs, [
    `${def.sprite.w}×${def.sprite.h}`,
    fp,
    def.lights?.length ? plural(def.lights.length, 'light') : undefined,
    places.length ? `places: ${places.join(', ')}` : undefined,
    def.flat && 'flat',
    def.anim && `${def.anim.frames.length} frames`,
  ]);
}

function terrainItem(def: TerrainDef): HTMLElement {
  const frames = def.anim?.frames ?? def.variants;
  // A 3x3 patch: varied tiles side by side show whether the tile really tiles.
  const surf = new Surface(48, 48);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
    const tile = def.anim ? frames[0]! : frames[(x * 7 + y * 3) % frames.length]!;
    surf.blit(tile, x * 16, y * 16, lut);
  }
  const c = h('canvas', { class: 'px', role: 'img', 'aria-label': `${def.id} tiled` });
  c.width = 48;
  c.height = 48;
  c.getContext('2d')?.putImageData(new ImageData(surf.data as Uint8ClampedArray<ArrayBuffer>, 48, 48), 0, 0);
  c.style.width = c.style.height = '144px';
  const fringe = Object.keys(def.fringe ?? {});
  return item(def.id, h('figure', {}, c), [
    def.anim ? `${def.anim.frames.length}-frame animation` : plural(def.variants.length, 'variant'),
    `priority ${def.priority}`,
    def.solid ? 'solid' : 'walkable',
    fringe.length ? `fringe ${fringe.join(' ')}` : 'no fringe',
  ]);
}

function emoteItem(id: string, s: Sprite): HTMLElement {
  return item(id, h('figure', {}, spriteCanvas([s], 4, id)), [`${s.w}×${s.h}`]);
}

function fontBlock(): HTMLElement | null {
  const glyphs = Object.entries(art.font.glyphs);
  if (glyphs.length === 0) return null;
  const grid = h('div', { class: 'glyphs' },
    glyphs.map(([ch, g]) =>
      h('figure', { class: 'glyph', 'data-id': ch.toLowerCase() }, spriteCanvas([g.sprite], 4, `glyph ${ch}`), h('figcaption', {}, ch === ' ' ? 'space' : ch)),
    ),
  );
  return h('div', {}, h('p', { class: 'notes' }, `${glyphs.length} glyphs, line height ${art.font.height} px`), grid);
}

function section(id: string, title: string, count: number, body: Node | null, empty: string, lede: string): HTMLElement {
  return h('section', { class: 'atlas-section', id: `atlas-${id}` },
    h('header', {},
      h('h2', {}, title, h('span', { class: 'count' }, String(count))),
      h('p', { class: 'lede' }, lede),
    ),
    count ? body : h('p', { class: 'empty-note' }, empty),
  );
}

/** Render the Atlas into `main`. Returns a cleanup function. */
export function atlasView(main: HTMLElement): () => void {
  anims = [];
  const chars = Object.values(art.characters);
  // the room kit gets a section of its own, so the town's props and grounds stay together
  const indoorProps = Object.values(art.props).filter((p) => interiorProps[p.id]);
  const indoorTerrain = Object.values(art.terrain).filter((t) => interiorTerrain[t.id]);
  const props = Object.values(art.props).filter((p) => !interiorProps[p.id]);
  const terrain = Object.values(art.terrain).filter((t) => !interiorTerrain[t.id]);
  const emotes = Object.entries(art.emotes);
  const glyphCount = Object.keys(art.font.glyphs).length;

  const groups = [
    { id: 'characters', title: 'Characters', n: chars.length },
    { id: 'props', title: 'Props', n: props.length },
    { id: 'terrain', title: 'Terrain', n: terrain.length },
    { id: 'interiors', title: 'Interiors', n: indoorProps.length + indoorTerrain.length },
    { id: 'emotes', title: 'Emotes', n: emotes.length },
    { id: 'font', title: 'Font', n: glyphCount },
  ];

  const filter = h('input', { type: 'search', class: 'filter', placeholder: 'Filter by id', 'aria-label': 'Filter by id' });
  const toc = h('nav', { class: 'toc', 'aria-label': 'Atlas sections' },
    groups.map((g) => h('a', { href: `#/atlas/${g.id}` }, g.title, h('span', { class: 'count' }, String(g.n)))));

  const page = h('div', { class: 'atlas' },
    h('header', { class: 'atlas-head' },
      h('h1', {}, 'Atlas'),
      h('p', { class: 'lede' }, 'Everything the built-in registry can draw, by the id a scene uses. Click an id to copy it.'),
    ),
    h('div', { class: 'atlas-tools' }, toc, filter),
    section('characters', 'Characters', chars.length, h('div', { class: 'items' }, chars.map(characterItem)),
      'No characters yet.', 'Walk cycles in four directions, standing frames and any extra poses. Use the id in s.actor(id).'),
    section('props', 'Props', props.length, h('div', { class: 'items' }, props.map(propItem)),
      'No props yet.', 'Placed on the map by kind. Props that glow are shown again with their lights on.'),
    section('terrain', 'Terrain', terrain.length, h('div', { class: 'items' }, terrain.map(terrainItem)),
      'No terrain yet.', 'Ground tiles, shown as a 3 × 3 patch so seams are visible.'),
    section('interiors', 'Interiors', indoorProps.length + indoorTerrain.length,
      h('div', { class: 'items' }, [...indoorTerrain.map(terrainItem), ...indoorProps.map(propItem)]),
      'No interior art yet.', 'The room kit: floors, the two rows of the back wall, the ink outside, and the furniture.'),
    section('emotes', 'Emotes', emotes.length, h('div', { class: 'items' }, emotes.map(([id, s]) => emoteItem(id, s))),
      'No emotes yet. They will appear here as soon as the registry has some.', 'Drawn above a head with actor.emote(id).'),
    section('font', 'Font', glyphCount, fontBlock(),
      'No glyphs yet. Bubbles, captions and labels use this font once it exists.', 'The bitmap font for bubbles, captions and labels.'),
  );

  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    for (const el of page.querySelectorAll<HTMLElement>('[data-id]')) el.hidden = q !== '' && !el.dataset.id!.includes(q);
  });

  main.replaceChildren(page);

  // One clock for every animated cell; only redraw a canvas when its frame changes.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  const tick = (now: number) => {
    for (const a of anims) {
      const i = Math.floor((now / 1000) * a.fps) % a.frames.length;
      if (i === a.shown) continue;
      a.shown = i;
      paint(a.canvas, a.overlay ? [a.frames[i]!, a.overlay[0]!] : [a.frames[i]!], a.bg, a.flipX);
    }
    raf = requestAnimationFrame(tick);
  };
  if (!still && anims.length) raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** Scroll to a section after the view is drawn. */
export function scrollToSection(id: string | undefined): void {
  if (id) document.getElementById(`atlas-${id}`)?.scrollIntoView({ block: 'start' });
}
