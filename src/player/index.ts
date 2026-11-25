/**
 * The browser player: mount a Scene into any element.
 *
 *   import { mount } from 'simutown/src/player';
 *   const player = mount(document.querySelector('#stage')!, myScene, { autoplay: true });
 *   player.seek(3); player.pause(); player.destroy();
 *
 * Frames come only from `scene.frame(t)` and the renderer; the wall clock (from
 * requestAnimationFrame) only decides *which* t to show. The canvas is FRAME_W x FRAME_H
 * and is scaled by whole device pixels with `image-rendering: pixelated`.
 *
 * The player fills the width of its target. Give the target a height (a slide, an iframe,
 * fullscreen) and the picture fits inside it, letterboxed, with the controls below.
 */
import { daylight, type Theme } from '../core/palette';
import { Surface } from '../core/surface';
import type { Renderer, Scene } from '../core/types';
import { rendererFor } from '../render';
import { advance, fitScale, formatTime, frameIndex } from './clock';
import { applyThemeVars } from './theme';

export { assertScene, describeScene, type SceneInfo } from './scene-info';
export { applyThemeVars, themeVars } from './theme';

export interface PlayerOpts {
  /** Show the control bar. Default true. */
  controls?: boolean;
  /** Start playing at once. Default false. */
  autoplay?: boolean;
  /** Start again at the end. Default true. */
  loop?: boolean;
  /** Playback speed: 0.5, 1 or 2 from the controls, any positive number here. Default 1. */
  speed?: number;
  /** Start time in seconds. Default 0. */
  start?: number;
  /** Listen for space, arrows, f and l while the player has focus. Default true. */
  keyboard?: boolean;
  /** The palette, for both the picture and the controls. Default the built-in theme. */
  theme?: Theme;
  /** Use this renderer instead of creating one for the scene's town. */
  renderer?: Renderer;
  /** Called whenever the shown time changes. */
  onTime?: (t: number) => void;
}

/** A mounted player. */
export interface Player {
  play(): void;
  pause(): void;
  /** Jump to `t` seconds (clamped to the scene). */
  seek(t: number): void;
  /** Stop everything and remove the player from the page. */
  destroy(): void;
  /** Current time in seconds. */
  readonly time: number;
  readonly playing: boolean;
  setSpeed(speed: number): void;
  setLoop(loop: boolean): void;
}

const SPEEDS = [0.5, 1, 2];
const STYLE_ID = 'simutown-player-style';

const CSS = `
.st-player{--st-bar:2.5rem;display:grid;grid-template-rows:minmax(0,1fr) auto;width:100%;height:100%;
  color:var(--st-ink);font:13px/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  outline:none;-webkit-tap-highlight-color:transparent}
.st-player:focus-visible .st-stage{box-shadow:0 0 0 2px var(--st-accent)}
.st-stage{position:relative;width:100%;aspect-ratio:var(--st-aspect);align-self:stretch;min-height:0;overflow:hidden;
  background:var(--st-paper-2);cursor:pointer}
.st-canvas{position:absolute;image-rendering:pixelated;image-rendering:crisp-edges}
.st-error{position:absolute;inset:0;display:none;padding:1rem;white-space:pre-wrap;overflow:auto;
  font:12px/1.5 ui-monospace,"SF Mono",Menlo,monospace;color:var(--st-ink);background:var(--st-paper)}
.st-error.on{display:block}
.st-bar{display:flex;align-items:center;gap:.25rem;height:var(--st-bar);padding:0 .25rem;
  font-variant-numeric:tabular-nums}
.st-btn{display:inline-grid;place-items:center;min-width:2rem;height:2rem;padding:0 .4rem;border:0;border-radius:2px;
  background:none;color:var(--st-muted);font:inherit;letter-spacing:.02em;cursor:pointer}
.st-btn:hover{color:var(--st-ink)}
.st-btn:focus-visible{outline:1px solid var(--st-ink);outline-offset:-1px}
.st-btn[aria-pressed="true"],.st-btn.st-on{color:var(--st-accent)}
.st-btn svg{width:14px;height:14px;fill:currentColor;shape-rendering:crispEdges}
.st-time{min-width:7.5em;text-align:center;color:var(--st-muted);white-space:nowrap}
.st-time b{font-weight:500;color:var(--st-ink)}
.st-scrub{flex:1;min-width:3rem;height:2rem;margin:0 .35rem;background:none;-webkit-appearance:none;appearance:none;cursor:pointer}
.st-scrub::-webkit-slider-runnable-track{height:2px;background:linear-gradient(to right,var(--st-ink) var(--st-p,0%),var(--st-rule) var(--st-p,0%))}
.st-scrub::-moz-range-track{height:2px;background:var(--st-rule)}
.st-scrub::-moz-range-progress{height:2px;background:var(--st-ink)}
.st-scrub::-webkit-slider-thumb{-webkit-appearance:none;width:10px;height:10px;margin-top:-4px;border:0;border-radius:0;background:var(--st-ink)}
.st-scrub::-moz-range-thumb{width:10px;height:10px;border:0;border-radius:0;background:var(--st-ink)}
.st-scrub:focus-visible{outline:1px solid var(--st-ink)}
.st-player:fullscreen{background:var(--st-paper);height:100%}
.st-player:fullscreen .st-stage{aspect-ratio:auto}
@media (max-width:420px){.st-speed,.st-loop{display:none}.st-time{min-width:0}}
`;

// Small pixel icons, drawn on a 7x7 grid so they stay crisp.
const icon = (d: string) => `<svg viewBox="0 0 7 7" aria-hidden="true"><path d="${d}"/></svg>`;
const ICONS = {
  play: icon('M1 0h1v7H1zM2 1h1v5H2zM3 2h1v3H3zM4 3h1v1H4z'),
  pause: icon('M1 0h2v7H1zM4 0h2v7H4z'),
  loop: icon('M1 1h5v1H1zM1 2h1v2H1zM5 5H0v1h6zM5 3h1v2H5zM4 0h1v3H4zM2 4h1v3H2z'),
  full: icon('M0 0h3v1H1v2H0zM4 0h3v3H6V1H4zM0 4h1v2h2v1H0zM6 4h1v3H4V6h2z'),
};

function injectStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/** Mount a player for `scene` inside `target`. */
export function mount(target: HTMLElement, scene: Scene, opts: PlayerOpts = {}): Player {
  injectStyle();
  const theme = opts.theme ?? daylight;
  const renderer = opts.renderer ?? rendererFor(scene, { theme });
  const { width: W, height: H, duration, fps } = scene;

  // --- DOM -------------------------------------------------------------------------------
  const root = el('div', 'st-player', { tabindex: '0', role: 'region', 'aria-label': `Scene: ${scene.title}` });
  applyThemeVars(root, theme);
  root.style.setProperty('--st-aspect', `${W} / ${H}`);
  const stage = el('div', 'st-stage');
  const canvas = el('canvas', 'st-canvas', { width: String(W), height: String(H), 'aria-hidden': 'true' });
  const errorBox = el('pre', 'st-error');
  stage.append(canvas, errorBox);
  root.append(stage);

  const bar = el('div', 'st-bar');
  const playBtn = el('button', 'st-btn st-play', { type: 'button', 'aria-label': 'Play' });
  const scrub = el('input', 'st-scrub', {
    type: 'range', min: '0', max: String(duration), step: String(1 / fps), value: '0', 'aria-label': 'Time',
  });
  const time = el('span', 'st-time');
  const speedBtn = el('button', 'st-btn st-speed', { type: 'button', 'aria-label': 'Playback speed' });
  const loopBtn = el('button', 'st-btn st-loop', { type: 'button', 'aria-label': 'Loop' });
  loopBtn.innerHTML = ICONS.loop;
  const fullBtn = el('button', 'st-btn st-full', { type: 'button', 'aria-label': 'Fullscreen' });
  fullBtn.innerHTML = ICONS.full;
  bar.append(playBtn, scrub, time, speedBtn, loopBtn, fullBtn);
  if (opts.controls !== false) root.append(bar);
  target.append(root);

  const ctx = canvas.getContext('2d');
  const surface = new Surface(W, H);
  const image = ctx ? new ImageData(surface.data as Uint8ClampedArray<ArrayBuffer>, W, H) : null;

  // --- State -----------------------------------------------------------------------------
  let t = Math.min(Math.max(0, opts.start ?? 0), duration);
  let playing = false;
  let loop = opts.loop ?? true;
  let speed = opts.speed ?? 1;
  let shown = -1;
  let raf = 0;
  let last = 0;
  let failed = false;

  function draw(force = false): void {
    const i = frameIndex(t, fps, duration);
    if (i !== shown || force) {
      shown = i;
      try {
        renderer.render(scene.frame(i / fps), surface);
        if (ctx && image) ctx.putImageData(image, 0, 0);
      } catch (e) {
        failed = true;
        pause();
        errorBox.textContent = `This scene failed at t=${(i / fps).toFixed(2)}s:\n\n${e instanceof Error ? e.stack ?? e.message : String(e)}`;
        errorBox.classList.add('on');
      }
    }
    const p = duration > 0 ? (100 * t) / duration : 0;
    scrub.value = String(t);
    scrub.style.setProperty('--st-p', `${p}%`);
    time.innerHTML = `<b>${formatTime(t)}</b> / ${formatTime(duration)}`;
    opts.onTime?.(t);
  }

  function syncButtons(): void {
    playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    speedBtn.textContent = `${speed}\u00d7`;
    speedBtn.classList.toggle('st-on', speed !== 1);
    loopBtn.setAttribute('aria-pressed', String(loop));
  }

  function tick(now: number): void {
    if (!playing) return;
    const dt = last ? Math.min(0.25, (now - last) / 1000) : 0; // a hidden tab must not jump
    last = now;
    const next = advance(t, dt, speed, duration, loop);
    t = next.t;
    draw();
    if (next.ended) pause();
    else raf = requestAnimationFrame(tick);
  }

  function play(): void {
    if (playing || failed) return;
    if (t >= duration) t = 0;
    playing = true;
    last = 0;
    raf = requestAnimationFrame(tick);
    syncButtons();
  }

  function pause(): void {
    playing = false;
    cancelAnimationFrame(raf);
    syncButtons();
  }

  function seek(s: number): void {
    t = Math.min(Math.max(0, Number.isFinite(s) ? s : 0), duration);
    draw();
  }

  function fit(): void {
    const box = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const f = fitScale(box.width, box.height, W, H, dpr);
    const left = Math.round(((box.width - f.cssW) / 2) * dpr) / dpr;
    const top = Math.round(((box.height - f.cssH) / 2) * dpr) / dpr;
    Object.assign(canvas.style, { width: `${f.cssW}px`, height: `${f.cssH}px`, left: `${left}px`, top: `${top}px` });
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement === root) void document.exitFullscreen();
    else void root.requestFullscreen?.();
  }

  // --- Events ----------------------------------------------------------------------------
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  const onDpr = () => fit();
  window.addEventListener('resize', onDpr);
  document.addEventListener('fullscreenchange', onDpr);

  playBtn.addEventListener('click', () => (playing ? pause() : play()));
  stage.addEventListener('click', () => {
    root.focus({ preventScroll: true });
    playing ? pause() : play();
  });
  let wasPlaying = false;
  scrub.addEventListener('pointerdown', () => {
    wasPlaying = playing;
    pause();
  });
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  scrub.addEventListener('change', () => {
    if (wasPlaying) play();
    wasPlaying = false;
  });
  speedBtn.addEventListener('click', () => {
    const i = SPEEDS.indexOf(speed);
    speed = SPEEDS[(i + 1) % SPEEDS.length]!;
    syncButtons();
  });
  loopBtn.addEventListener('click', () => {
    loop = !loop;
    syncButtons();
  });
  fullBtn.addEventListener('click', toggleFullscreen);

  root.addEventListener('keydown', (e) => {
    if (opts.keyboard === false || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return;
    const step = e.shiftKey ? 1 / fps : 1;
    switch (e.key) {
      case ' ':
      case 'k':
        playing ? pause() : play();
        break;
      case 'ArrowLeft':
        seek(t - step);
        break;
      case 'ArrowRight':
        seek(t + step);
        break;
      case ',':
        pause();
        seek(t - 1 / fps);
        break;
      case '.':
        pause();
        seek(t + 1 / fps);
        break;
      case 'Home':
        seek(0);
        break;
      case 'End':
        seek(duration);
        break;
      case 'f':
        toggleFullscreen();
        break;
      case 'l':
        loop = !loop;
        syncButtons();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  syncButtons();
  fit();
  draw(true);
  if (opts.autoplay) play();

  return {
    play,
    pause,
    seek,
    destroy() {
      pause();
      ro.disconnect();
      window.removeEventListener('resize', onDpr);
      document.removeEventListener('fullscreenchange', onDpr);
      if (document.fullscreenElement === root) void document.exitFullscreen();
      root.remove();
    },
    get time() {
      return t;
    },
    get playing() {
      return playing;
    },
    setSpeed(s: number) {
      if (!(s > 0)) throw new Error(`speed must be positive, got ${s}`);
      speed = s;
      syncButtons();
    },
    setLoop(l: boolean) {
      loop = l;
      syncButtons();
    },
  };
}
