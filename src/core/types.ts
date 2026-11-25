/**
 * The frozen contracts between Simutown's modules.
 *
 *   art (sprites, defs)  ->  world (Town)  ->  scene (FrameState at time t)  ->  render (pixels)
 *
 * Every module depends on these types and on nothing inside another module's folder.
 * Changes here are additive only: add optional fields, never rename or remove.
 */
import type { Slot } from './palette';
import type { Sprite } from './sprite';
import type { Surface } from './surface';

/** Tile size in pixels. The world is a grid of TILE x TILE squares. */
export const TILE = 16;
/** Native frame size. It scales x4 to 1920x1080 and x8 to 4K. */
export const FRAME_W = 480;
export const FRAME_H = 270;
/** Default frame rate for playback and export. */
export const FPS = 30;
/** Characters are CHAR_W x CHAR_H sprites anchored at the feet: [8, 24]. */
export const CHAR_W = 16;
export const CHAR_H = 24;

export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Anim {
  frames: Sprite[];
  fps: number;
}

// ---------------------------------------------------------------------------------------
// Art definitions
// ---------------------------------------------------------------------------------------

export type FringeSide =
  | 'n' | 'e' | 's' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'
  | 'in-ne' | 'in-nw' | 'in-se' | 'in-sw';

/** A ground material. Every sprite here is exactly TILE x TILE with anchor [0, 0]. */
export interface TerrainDef {
  id: string;
  /** Interchangeable looks; the renderer picks one per tile from a hash of (tx, ty). */
  variants: Sprite[];
  /** Optional animation (water). When present it replaces `variants`. */
  anim?: Anim;
  /**
   * Optional animated variants: several interchangeable animations. When present they
   * replace `variants` and `anim`; the renderer picks one per tile from the same hash and
   * starts each tile at its own phase, so a pond shimmers without a visible grid.
   */
  anims?: Anim[];
  /** Blocks walking (water, hedges). Default false. */
  solid?: boolean;
  /** Higher-priority terrain draws its fringe over lower-priority neighbours. */
  priority: number;
  /**
   * Soft edges. `fringe.n` is drawn ON the neighbouring tile to the north of this terrain
   * (so it shows this terrain creeping in from that tile's south edge), and so on.
   * Corner keys are for outer corners (the neighbour touches this terrain only diagonally).
   *
   * Inner corners round off concave bends. A tile that would receive two adjacent edge
   * fringes at once, say both `n` and `e` (it lies north of this terrain and also east of
   * it), gets the single `in-ne` sprite instead of that pair when one is defined. This is
   * what lets a pond or a path corner look round instead of square. Without the inner
   * key the renderer falls back to drawing the two edges.
   *
   * Any side may be an array of interchangeable sprites; the renderer picks one per tile
   * from a hash of (tx, ty), which hides the 16-pixel repeat along a long edge.
   */
  fringe?: Partial<Record<FringeSide, Sprite | Sprite[]>>;
}

/** A light source attached to a prop. Offsets are pixels from the prop's anchor point. */
export interface LightDef {
  dx: number;
  dy: number;
  /** Glow radius in pixels. */
  radius: number;
  /** Glow colour. Default 'ochre.2'. */
  slot?: Slot;
  /** 0..1 amount of flicker. Default 0. */
  flicker?: number;
  /**
   * Whether the light pools on the ground below it. Default true. Set false for a light
   * that should only glow around its source, such as an upstairs window.
   */
  ground?: boolean;
}

/**
 * Anything placed on the map: a tree, a lamp, a bench, a whole building.
 *
 * Placement: a prop sits on an origin tile (tx, ty), the bottom-left tile of its footprint.
 * Its sprite anchor lands on the bottom-left corner of that tile: world pixel
 * (tx * TILE, (ty + 1) * TILE). So a 16x32 lamp uses anchor [0, 32] and rises one tile
 * above its origin tile. Props are depth-sorted with actors by that base line.
 */
export interface PropDef {
  id: string;
  sprite: Sprite;
  /** Optional animation. When present it replaces `sprite`; frames share its size and anchor. */
  anim?: Anim;
  /**
   * Pixels that glow: lit windows, a lamp's glass. Same size and anchor as `sprite`.
   * The renderer draws this after darkening the frame for the time of day, so it stays bright.
   * It is only drawn when lights are on (dusk and night).
   */
  emissive?: Sprite;
  /** Solid tiles, w wide and h deep, growing right and up from the origin tile. Default none. */
  footprint?: { w: number; h: number };
  lights?: LightDef[];
  /**
   * Named walkable spots in tiles relative to the origin tile (dy is negative going up,
   * positive going down the screen). A cafe's `door` is the tile an actor stands on to
   * enter, usually { dx: n, dy: 1 }, one tile below the facade. Towns expose them as
   * "<propId>.<place>".
   */
  places?: Record<string, { dx: number; dy: number }>;
  /**
   * Named seats, for props people sit on. Each is where the sitter's feet go, in pixels
   * from the prop's anchor point (x to the right, y down the screen), and the way they
   * face (default 'down'). A sitter with y greater than 0 is drawn in front of the prop.
   * Scenes use them through `actor.sitOn(prop, seat)`.
   */
  seats?: Record<string, { x: number; y: number; dir?: Dir }>;
  /** Drawn on the ground under every actor (rugs, flower beds, road markings). */
  flat?: boolean;
  /**
   * Height in pixels of what casts the shadow. Default: derived from the sprite and the
   * footprint. Set it when the guess is wrong (a building whose sprite is mostly roof
   * depth), or to 0 for no cast shadow.
   */
  castHeight?: number;
}

/**
 * A townsperson. Every sprite is CHAR_W x CHAR_H with anchor [8, 24].
 * `left` may simply be `right` mirrored.
 */
export interface CharacterDef {
  id: string;
  /** Display name, e.g. "Ana". */
  name: string;
  /** Standing frames per direction (one is enough; two gives breathing). */
  idle: Record<Dir, Sprite[]>;
  /** Walk cycle per direction (four frames recommended). */
  walk: Record<Dir, Sprite[]>;
  /** Walk-cycle frames per second. Default 8. */
  walkFps?: number;
  /** Idle frames per second. Default 2. */
  idleFps?: number;
  /** Optional extra poses, e.g. `sit`, `wave`. Scenes refer to them by key. */
  poses?: Record<string, Record<Dir, Sprite[]>>;
  /** Frames per second for extra poses, by pose key. Default 6 for any pose not listed. */
  poseFps?: Record<string, number>;
}

export interface Glyph {
  sprite: Sprite;
  /** Horizontal advance in pixels, including spacing. */
  advance: number;
}

/** A bitmap font. Glyph sprites use a single slot; the text drawer recolours them. */
export interface BitmapFont {
  /** Line height in pixels. */
  height: number;
  glyphs: Record<string, Glyph>;
}

/** Everything a renderer can draw. `src/art` exports the built-in registry. */
export interface ArtRegistry {
  terrain: Record<string, TerrainDef>;
  props: Record<string, PropDef>;
  characters: Record<string, CharacterDef>;
  emotes: Record<string, Sprite>;
  font: BitmapFont;
}

// ---------------------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------------------

export interface PlacedProp {
  /** Key into ArtRegistry.props. */
  kind: string;
  /** Origin tile (bottom-left of the footprint). */
  tx: number;
  ty: number;
  /** Optional instance name; its places are exposed as "<id>.<place>". Defaults to `kind`. */
  id?: string;
}

/** A static map. Pure data: build one with `defineTown` (src/world). */
export interface Town {
  name: string;
  /** Size in tiles. */
  w: number;
  h: number;
  /** Terrain id per tile, row-major, length w * h. */
  terrain: string[];
  props: PlacedProp[];
  /** Named walkable tiles, e.g. "cafe.door", "fountain.south", "plaza". */
  places: Record<string, { tx: number; ty: number }>;
  /** 1 = blocked, per tile, row-major. Derived from solid terrain and prop footprints. */
  solid: Uint8Array;
}

// ---------------------------------------------------------------------------------------
// Scene: what the world looks like at one instant
// ---------------------------------------------------------------------------------------

export interface ActorState {
  id: string;
  /** Key into ArtRegistry.characters. */
  character: string;
  /** Feet position in world pixels. The centre of tile (tx, ty) is (tx*16 + 8, ty*16 + 12). */
  x: number;
  y: number;
  dir: Dir;
  /** 'idle', 'walk', or a key of CharacterDef.poses. */
  pose: string;
  /** Seconds since the current pose started; the renderer picks the frame from it. */
  animTime: number;
  /** Key into ArtRegistry.emotes, drawn above the head. */
  emote?: string;
  /** 0..1, for fading in and out (entering a building). Default 1. */
  opacity?: number;
}

export interface BubbleState {
  /** Id of the speaking actor. */
  actor: string;
  text: string;
  kind: 'say' | 'think' | 'shout';
  /** 0..1 share of the text revealed (typewriter). */
  reveal: number;
}

/** Teaching overlays drawn on top of the world. */
export type Annotation =
  /** A small tag above an actor or at a world position. */
  | { kind: 'label'; actor?: string; at?: { x: number; y: number }; text: string; opacity: number }
  /** A dotted line from one actor to another, e.g. information passing. `progress` 0..1 grows it. */
  | { kind: 'link'; from: string; to: string; progress: number; slot?: Slot }
  /** A ring on the ground around an actor. `progress` 0..1 draws it in. */
  | { kind: 'ring'; actor: string; progress: number; slot?: Slot };

/**
 * The complete description of one frame. A scene is a pure function from time to
 * FrameState, which is what makes playback, scrubbing and export deterministic.
 */
export interface FrameState {
  /** Seconds from the start of the scene. */
  t: number;
  /** World pixel at the centre of the view, and an integer zoom (1 = whole frame, 2 = closer). */
  camera: { x: number; y: number; zoom: number };
  /** Hour of day, 0..24. The renderer derives ambient light and whether lamps are lit. */
  timeOfDay: number;
  actors: ActorState[];
  bubbles: BubbleState[];
  annotations?: Annotation[];
  /** A line of narration at the bottom of the frame. */
  caption?: { text: string; opacity: number };
  /** A full-frame title card. */
  title?: { text: string; subtitle?: string; opacity: number };
  /** Dim everything except these actors. `amount` is 0..1. */
  focus?: { actors: string[]; amount: number };
  /** 0..1 fade to ink, for scene starts and ends. */
  fade?: number;
}

/** A finished scene: metadata plus the frame function. */
export interface Scene {
  title: string;
  town: Town;
  /** Seconds. */
  duration: number;
  fps: number;
  width: number;
  height: number;
  /** Character ids that appear in the scene, when the builder knows them. */
  cast?: string[];
  /** The art the scene was built with. Renderers draw the scene with it; default: the built-in art. */
  art?: ArtRegistry;
  frame(t: number): FrameState;
}

/** Turns FrameStates into pixels. Create one per town with `createRenderer` (src/render). */
export interface Renderer {
  /** Draw `state` into `out` (a FRAME_W x FRAME_H surface), overwriting it. */
  render(state: FrameState, out: Surface): void;
}
