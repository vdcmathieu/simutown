import type { Sprite } from '../../core/sprite';
import type { BitmapFont } from '../../core/types';

// The bitmap font, speech-bubble pieces and emotes. Empty in the pin.
export const font: BitmapFont = { height: 8, glyphs: {} };
export const emotes: Record<string, Sprite> = {};
