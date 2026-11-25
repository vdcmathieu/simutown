/**
 * Render every text overlay on top of the fixture frame, to review the font and the UI by eye.
 *
 *   pnpm tsx tools/ui-preview.ts [--scale 3]
 *
 * Writes:
 *   out/ui-overlays.png  the fixture frame with bubbles near edges and in the middle,
 *                        a two-line caption, labels and every emote
 *   out/ui-title.png     a title card
 *   out/ui-text.png      the whole character set and real sentences, on light and dark
 */
import { compileTheme, dusk, lutRgb, type Slot } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { FRAME_H, FRAME_W } from '../src/core/types';
import { emotes, font } from '../src/art/ui';
import { tinyScene } from '../src/fixtures/tiny';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { drawBubble, drawCaption, drawEmote, drawLabel, drawText, drawTitle } from '../src/ui';

const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args[si + 1]) : 3;
const lut = compileTheme(dusk);
const fill = (s: Surface, slot: Slot) => s.clear([...lutRgb(lut, slot), 255]);

/** The fixture frame (dusk), or a flat bright ground to check overlays on a sunny scene. */
function base(light: boolean): Surface {
  const frame = new Surface(FRAME_W, FRAME_H);
  if (!light) createRenderer(tinyScene.town).render(tinyScene.frame(4), frame);
  else {
    fill(frame, 'moss.3');
    frame.rect(0, 128, FRAME_W, 32, [...lutRgb(lut, 'cream.1'), 255]);
  }
  return frame;
}

function overlays(light = false): Surface {
  const frame = base(light);
  // Bubbles: in the middle, against each edge, and one half typed out.
  drawBubble(frame, lut, { x: 248, y: 128, text: 'Hello, Simutown! Bonjour à tous.', kind: 'say', reveal: 1 });
  drawBubble(frame, lut, { x: 6, y: 60, text: 'I am right at the left edge of the frame.', kind: 'say', reveal: 1 });
  drawBubble(frame, lut, { x: 476, y: 70, text: "Je pense, donc… j'ai faim.", kind: 'think', reveal: 1 });
  drawBubble(frame, lut, { x: 150, y: 10, text: 'Top edge!', kind: 'shout', reveal: 1 });
  drawBubble(frame, lut, { x: 330, y: 205, text: 'Où est la boulangerie ? Ich weiß es nicht.', kind: 'think', reveal: 1 });
  drawBubble(frame, lut, { x: 90, y: 215, text: 'WATCH OUT! The cart is coming through!', kind: 'shout', reveal: 1 });
  drawBubble(frame, lut, { x: 420, y: 160, text: 'Typing this out slowly, letter by letter.', kind: 'say', reveal: 0.45 });
  // Labels and emotes.
  drawLabel(frame, lut, 'Ana', 248, 92, 1);
  drawLabel(frame, lut, 'lamp-west', 104, 108, 1);
  drawLabel(frame, lut, 'faded label', 330, 100, 0.5);
  drawLabel(frame, lut, 'edge', 2, 240, 1);
  Object.keys(emotes).forEach((name, i) => drawEmote(frame, lut, name, 150 + i * 18, 236));
  drawCaption(frame, lut, "A tiny town, for testing. Ana walks to the middle of the road, says hello and waves at the lamplighter, who is late again.", 1);
  return frame;
}

function title(): Surface {
  const frame = new Surface(FRAME_W, FRAME_H);
  createRenderer(tinyScene.town).render(tinyScene.frame(4), frame);
  drawTitle(frame, lut, 'Le bouche-à-oreille', 'How a rumour travels through a small town, one conversation at a time.', 1);
  return frame;
}

const SAMPLES = [
  'Portez ce vieux whisky au juge blond qui fume.',
  "L'œuvre de Zoé : « Où êtes-vous ? » – déjà fini… Ça m'a coûté 12 € à Noël.",
  'The quick brown fox jumps over the lazy dog (and 0123456789).',
  'Zwölf Boxkämpfer jagen Viktor quer über den großen Sylter Deich.',
  'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ àâäçéèêëîïôöùûüÿœæß ñ Ñ',
  '“Curly” ‘quotes’ • bullet ← → ↑ ↓ ♥ 25° a·b — em dash',
  'Unknown glyphs fall back: ✓ 漢 → ✓ 漢',
];

function textSheet(): Surface {
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
  const extra = Object.keys(font.glyphs).filter((c) => c.charCodeAt(0) > 126 && c !== ' ').join('');
  const s = new Surface(FRAME_W, 230);
  fill(s, 'cream.2');
  let y = 4;
  for (const line of [ascii.slice(0, 48), ascii.slice(48), extra]) {
    drawText(s, lut, line, 6, y, { maxWidth: FRAME_W - 12 });
    y += font.height * Math.ceil(1 + line.length / 80);
  }
  y += 4;
  for (const line of SAMPLES) {
    drawText(s, lut, line, 6, y);
    y += font.height;
  }
  // The same text on dark, in cream, centred and right-aligned, and wrapped.
  s.rect(0, y + 2, FRAME_W, s.h - y - 2, [...lutRgb(lut, 'steel.1'), 255]);
  y += 6;
  drawText(s, lut, SAMPLES[1]!, FRAME_W / 2, y, { slot: 'cream.2', align: 'center' });
  drawText(s, lut, 'Right aligned, at half opacity.', FRAME_W - 6, y + 12, { slot: 'cream.2', align: 'right', opacity: 0.5 });
  drawText(s, lut, SAMPLES[2]! + ' ' + SAMPLES[0]!, 6, y + 26, { slot: 'cream.1', maxWidth: 200 });
  return s;
}

writePNG('out/ui-overlays.png', overlays().scaled(scale));
writePNG('out/ui-overlays-light.png', overlays(true).scaled(scale));
writePNG('out/ui-title.png', title().scaled(scale));
writePNG('out/ui-text.png', textSheet().scaled(scale));
console.log('out/ui-overlays.png, out/ui-title.png, out/ui-text.png');
