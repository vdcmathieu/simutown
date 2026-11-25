/**
 * The Scenes view: every module in scenes/*.ts, each playable in the player.
 * New files in scenes/ appear here on their own (import.meta.glob).
 */
import type { Scene } from '../src/core/types';
import { assertScene, describeScene, mount, type Player } from '../src/player';
import { h } from './dom';

/** One entry of scenes/: a valid scene, or the error explaining why it is not. */
export type SceneEntry = { name: string; file: string } & ({ scene: Scene; error?: undefined } | { scene?: undefined; error: string });

const modules = import.meta.glob<{ default?: unknown }>('../scenes/*.ts', { eager: true });

/** All scenes in scenes/, sorted by file name. */
export const sceneEntries: SceneEntry[] = Object.entries(modules)
  .map(([path, mod]): SceneEntry => {
    const file = path.replace(/^\.\.\//, '');
    const name = file.replace(/^scenes\//, '').replace(/\.ts$/, '');
    try {
      return { name, file, scene: assertScene(mod.default, file) };
    } catch (e) {
      return { name, file, error: (e as Error).message };
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const secs = (s: number) => `${Number(s.toFixed(1))} s`;

/** Render the Scenes view for `selected` into `main`. Returns a cleanup function. */
export function scenesView(main: HTMLElement, selected: string | undefined): () => void {
  const current = sceneEntries.find((e) => e.name === selected) ?? sceneEntries.find((e) => e.scene);
  let player: Player | undefined;

  const index = h('ol', { class: 'scene-index' },
    sceneEntries.map((e, i) =>
      h('li', {},
        h('a', { href: `#/scenes/${e.name}`, class: e === current ? 'active' : '', 'aria-current': e === current ? 'page' : undefined },
          h('span', { class: 'num' }, String(i + 1).padStart(2, '0')),
          h('span', { class: 'title' }, e.scene?.title ?? e.name),
          h('span', { class: 'meta' }, e.scene ? secs(e.scene.duration) : 'error'),
        ),
      ),
    ),
  );

  let body: HTMLElement;
  if (!current) {
    body = h('div', { class: 'empty' },
      h('p', {}, 'No scenes yet.'),
      h('p', { class: 'muted' }, 'Add a file to scenes/ that default-exports a Scene and it will appear here.'),
    );
  } else if (!current.scene) {
    body = h('div', { class: 'scene-error' }, h('h2', {}, current.file), h('pre', {}, current.error));
  } else {
    const info = describeScene(current.scene);
    const stage = h('div', { class: 'scene-player' });
    body = h('div', {},
      stage,
      h('header', { class: 'scene-head' },
        h('h1', {}, info.title),
        h('p', { class: 'file' }, current.file),
      ),
      h('dl', { class: 'facts' },
        fact('Length', `${secs(info.duration)} · ${info.frames} frames at ${info.fps} fps`),
        fact('Town', `${info.town.name}, ${info.town.w} × ${info.town.h} tiles, ${info.town.props} props`),
        fact('Cast', info.cast.map((c) => c.id).join(', ') || 'nobody'),
        fact('Render', h('code', {}, `pnpm simutown render ${current.file}`)),
        fact('Embed', h('code', {}, `<iframe src="${embedUrl(current.name)}"></iframe>`)),
      ),
    );
    player = mount(stage, current.scene, { autoplay: true });
  }

  const others = sceneEntries.filter((e) => e.error && e !== current);
  main.replaceChildren(
    h('div', { class: 'scenes' },
      h('section', { class: 'scene-main' }, body),
      h('aside', { class: 'scene-aside' },
        h('h2', { class: 'kicker' }, `Scenes · ${sceneEntries.length}`),
        index,
        others.length ? h('p', { class: 'muted small' }, `${others.length} file(s) in scenes/ failed to load; select one to see why.`) : null,
      ),
    ),
  );
  return () => player?.destroy();
}

function fact(label: string, value: string | Node): HTMLElement[] {
  return [h('dt', {}, label), h('dd', {}, value)];
}

function embedUrl(name: string): string {
  const u = new URL(location.href);
  u.hash = '';
  u.search = `?embed=${encodeURIComponent(name)}`;
  return u.toString();
}

/** The bare player for iframes and slides: `?embed=<name>[&autoplay=0][&controls=0]`. */
export function embedView(root: HTMLElement, name: string, params: URLSearchParams): void {
  document.body.classList.add('embed');
  const entry = sceneEntries.find((e) => e.name === name);
  if (!entry?.scene) {
    root.replaceChildren(h('pre', { class: 'embed-error' },
      entry?.error ?? `No scene "${name}". Scenes: ${sceneEntries.map((e) => e.name).join(', ') || 'none'}.`));
    return;
  }
  mount(root, entry.scene, {
    autoplay: params.get('autoplay') !== '0',
    controls: params.get('controls') !== '0',
    loop: params.get('loop') !== '0',
  });
}
