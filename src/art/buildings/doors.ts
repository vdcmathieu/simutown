/**
 * Doors. One tile wide and a tile and a half tall, frame included, so a townsperson fits.
 * Each is drawn in the red (brick) ramp and repainted; the last row is the stone threshold.
 */
import type { Slot } from '../../core/palette';
import { recolor, sprite, type Sprite } from '../../core/sprite';
import { litFrom, type Part, WARM } from './canvas';

/** `plain` is a plank door, `panelled` the approved door, `double` two leaves in one frame (32 wide), `shop` a door with glass. */
export type DoorStyle = 'plain' | 'panelled' | 'double' | 'shop';
/** Door paint. `wood` is varnished wood; the others are strong colours. */
export type Paint = 'red' | 'wood' | 'blue' | 'teal' | 'plum' | 'green';

/** Every door style and paint, for menus and error messages. */
export const DOOR_STYLES: readonly DoorStyle[] = ['plain', 'panelled', 'double', 'shop'];
export const PAINTS: readonly Paint[] = ['red', 'wood', 'blue', 'teal', 'plum', 'green'];

/** Every door is this tall. Single doors are 16 wide, the double door 32. */
export const DOOR_H = 24;

// The approved door: two inset panels (shade on the top and left of a panel, light on the
// bottom and right) and a brass knob.
const PANELLED = `
  ..uuuuuuuuuuuu..
  .uuzzzzzzzzzzuu.
  uuzyyyyyyyyyyxuu
  uzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uzyyyyyyyyyqqyxu
  uzyyyyyyyyyqpyxu
  uzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uxxxxxxxxxxxxxxu
  4444444444444444
`;

// A plank door: three upright boards held by two ledges. For sheds, farms and back doors.
const PLAIN = `
  ..uuuuuuuuuuuu..
  .uuzzzzzzzzzzuu.
  uuzyyyxyyyxyyxuu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzzzzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uzxxxxxxxxxxxyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxqqyxu
  uzyyyyxyyyxqpyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzzzzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uzxxxxxxxxxxxyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uzyyyyxyyyxyyyxu
  uxxxxxxxxxxxxxxu
  4444444444444444
`;

// A shop door: glass above, one panel below. The glass lights up at dusk.
const SHOP = `
  ..uuuuuuuuuuuu..
  .uuzzzzzzzzzzuu.
  uuzyyyyyyyyyyxuu
  uzyxxxxxxxxxxyxu
  uzyx88888888zyxu
  uzyx9ff99999zyxu
  uzyx9f999999zyxu
  uzyx99999999zyxu
  uzyx99999999zyxu
  uzyx99999999zyxu
  uzyx99999999zyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyqqyxu
  uzyyyyyyyyyqpyxu
  uzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uxxxxxxxxxxxxxxu
  4444444444444444
`;

// A double door: two panelled leaves in one frame, 32 wide, knobs meeting in the middle.
const DOUBLE = `
  ..uuuuuuuuuuuuuuuuuuuuuuuuuuuu..
  .uuzzzzzzzzzzzzuuzzzzzzzzzzzzuu.
  uuzyyyyyyyyyyyxuuzyyyyyyyyyyyxuu
  uzyyyyyyyyyyyyxuuzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxuuzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxuuzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxuuzyyyyyyyyyyyyxu
  uzyyyyyyyyyqqyxuuzyqqyyyyyyyyyxu
  uzyyyyyyyyyqpyxuuzyqpyyyyyyyyyxu
  uzyyyyyyyyyyyyxuuzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxuuzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxuuzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxuuzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxuuzyyyyyyyyyyyyxu
  uxxxxxxxxxxxxxxuuxxxxxxxxxxxxxxu
  44444444444444444444444444444444
`;

const ART: Record<DoorStyle, string> = { plain: PLAIN, panelled: PANELLED, double: DOUBLE, shop: SHOP };

// Shade, base and light of each paint. Two-slot ramps have no third tone to borrow, so
// their light is their base.
const RAMPS: Record<Paint, readonly [Slot, Slot, Slot]> = {
  red: ['brick.0', 'brick.1', 'brick.2'],
  wood: ['wood.0', 'wood.1', 'wood.2'],
  blue: ['sky.0', 'sky.1', 'sky.2'],
  teal: ['teal.0', 'teal.1', 'teal.1'],
  plum: ['plum.0', 'plum.1', 'plum.1'],
  green: ['moss.0', 'moss.1', 'moss.2'],
};

function repaint(s: Sprite, paint: Paint): Sprite {
  if (paint === 'red') return s;
  const [shade, base, light] = RAMPS[paint];
  return recolor(s, { 'brick.0': shade, 'brick.1': base, 'brick.2': light });
}

/** Width in pixels of a door style: 32 for the double door, 16 for the others. */
export const doorWidth = (style: DoorStyle): number => (style === 'double' ? 32 : 16);

/** A door in a style and a paint. Only the shop door has glass, and so a lit look. */
export function door(style: DoorStyle = 'panelled', paint: Paint = 'red'): Part {
  const art = ART[style];
  // On a blue door the glass must not be repainted with the door: parse the glass apart.
  const body = repaint(sprite(art.replace(/[89f]/g, 'y')), paint);
  if (style !== 'shop') return { day: body };
  const glass = sprite(art.replace(/[^\s89f]/g, '.'));
  const px = body.px.map((v, i) => glass.px[i] || v);
  return { day: { ...body, px }, lit: litFrom(art, WARM) };
}
