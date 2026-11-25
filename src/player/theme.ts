/**
 * UI colours from the palette. Nothing here hard-codes a colour: the player and the
 * gallery read the theme at runtime and expose it as CSS custom properties, so the
 * interface follows the palette whenever the palette changes.
 */
import { rgb, SLOTS, type Theme } from '../core/palette';

const hex = (theme: Theme, slot: (typeof SLOTS)[number]) =>
  `#${rgb(theme, slot)
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;

/**
 * CSS custom properties for a theme:
 * - every slot as `--st-<ramp>-<n>`, e.g. `--st-steel-0`, `--st-skin-a-1`;
 * - the UI roles: `--st-paper` (background), `--st-paper-2` (a step darker),
 *   `--st-rule` (hairlines), `--st-ink` (text), `--st-muted` (secondary text),
 *   `--st-accent` (the active state, used sparingly).
 */
export function themeVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const slot of SLOTS) vars[`--st-${slot.replace(/\./g, '-')}`] = hex(theme, slot);
  vars['--st-paper'] = hex(theme, 'cream.2');
  vars['--st-paper-2'] = hex(theme, 'cream.1');
  vars['--st-rule'] = hex(theme, 'cream.0');
  vars['--st-ink'] = hex(theme, 'steel.0');
  vars['--st-muted'] = hex(theme, 'steel.3');
  vars['--st-accent'] = hex(theme, 'ochre.1');
  return vars;
}

/** Set `themeVars(theme)` on an element's inline style. */
export function applyThemeVars(el: HTMLElement, theme: Theme): void {
  for (const [k, v] of Object.entries(themeVars(theme))) el.style.setProperty(k, v);
}
