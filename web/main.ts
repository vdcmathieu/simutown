/**
 * The Simutown gallery: two views behind hash routes.
 *   #/scenes/<name>   play a scene from scenes/
 *   #/atlas[/<group>] the built-in art, by id
 * and `?embed=<name>` for a bare player in an iframe.
 */
import { dusk } from '../src/core/palette';
import { applyThemeVars } from '../src/player';
import { atlasView, scrollToSection } from './atlas';
import { h } from './dom';
import { embedView, scenesView } from './scenes';

// Colours come from the palette at runtime, so the site follows it when it changes.
applyThemeVars(document.documentElement, dusk);

const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
const embed = params.get('embed');

if (embed !== null) {
  embedView(app, embed, params);
} else {
  const links = {
    scenes: h('a', { href: '#/scenes' }, 'Scenes'),
    atlas: h('a', { href: '#/atlas' }, 'Atlas'),
  };
  const main = h('main', { id: 'main' });
  app.replaceChildren(
    h('header', { class: 'site-head' },
      h('a', { class: 'wordmark', href: '#/scenes' }, 'Simutown'),
      h('p', { class: 'tagline' }, 'small towns that explain ideas'),
      h('nav', { class: 'site-nav', 'aria-label': 'Views' }, links.scenes, links.atlas),
    ),
    main,
    h('footer', { class: 'site-foot' },
      h('p', {}, 'Every frame is a pure function of time. ', h('code', {}, 'pnpm simutown --help'), ' renders them to video.')),
  );

  let cleanup: (() => void) | undefined;
  let lastView = '';
  const route = () => {
    const [view = 'scenes', arg] = location.hash.replace(/^#\/?/, '').split('/');
    const key = view === 'atlas' ? 'atlas' : 'scenes';
    for (const [k, a] of Object.entries(links)) {
      a.classList.toggle('active', k === key);
      if (k === key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    // Moving between atlas sections only scrolls; anything else redraws the view.
    if (key === 'atlas' && lastView === 'atlas') return scrollToSection(arg);
    cleanup?.();
    cleanup = key === 'atlas' ? atlasView(main) : scenesView(main, arg);
    lastView = key;
    document.title = key === 'atlas' ? 'Atlas · Simutown' : 'Scenes · Simutown';
    if (key === 'atlas') scrollToSection(arg);
    else window.scrollTo(0, 0);
  };
  window.addEventListener('hashchange', route);
  route();
}
