/**
 * Node-only export: films, stills and PNG files. The package entry `simutown/node`.
 *
 *   import { renderStill, renderVideo } from 'simutown/node';
 *   await renderVideo(myScene, 'out/scene.mp4');
 */
export * from './video';
export { encodePNG, writePNG } from './png';
