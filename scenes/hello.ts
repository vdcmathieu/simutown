/**
 * Hello, Willow Square: a twenty-second welcome tour, and the README's hero.
 *
 * Establish: dawn turns to morning as the camera drifts along the High Street to the square.
 * Show: the town gets going, and Ana walks out of the cafe to say hello.
 * Conclude: the whole square at work, and what Simutown is for.
 *
 * The script is written as parallel tracks inside `s.together`: one for the camera, one
 * for the light, one per person. `after(seconds, ...)` delays a track.
 */
import { scene } from '../src';
import { willowSquare } from '../src/towns';

/** The wide shot of the square: the town hall's clock at the top, the willow and the market below. */
const WIDE: [number, number] = [23, 9];

export default scene({ title: 'Hello, Willow Square', town: willowSquare, timeOfDay: 5.2 }, (s) => {
  /** A track that starts `delay` seconds into the surrounding `together`. */
  const after = (delay: number, fn: () => void) =>
    s.sequence(() => {
      s.wait(delay);
      fn();
    });

  const bo = s.actor('bo', { at: 'bakery.door', hidden: true });
  const ana = s.actor('ana', { at: 'cafe.door', hidden: true });
  const zara = s.actor('zara', { at: 'shop.door', hidden: true });
  const tomas = s.actor('tomas', { at: 'market.greens.vendor' });
  const raj = s.actor('raj', { at: [38, 10], facing: 'left' });
  // waiting just below the frame, on Mill Lane
  const mira = s.actor('mira', { at: [23, 19], facing: 'up' });
  const otto = s.actor('otto', { at: [32, 19], facing: 'up' });
  const kofi = s.actor('kofi', { at: [15, 19], facing: 'up' });
  const lin = s.actor('lin', { at: [16, 19], facing: 'up' });
  const yuki = s.actor('yuki', { at: [14, 19], facing: 'up' });

  // --- Establish, then show: one continuous morning ---------------------------------------
  s.camera.cut([16, 9], { zoom: 1 });
  s.together(() => {
    // the camera: drift east to the square, then cut in on Ana as she crosses it
    s.sequence(() => {
      s.camera.pan(WIDE, { duration: 5.2 });
      s.camera.cut(ana, { zoom: 2 });
      s.camera.follow(ana);
    });
    // the light: the lamps go out at dawn, then full morning
    s.sequence(() => {
      s.timeOfDay(6.8, { duration: 3 });
      s.timeOfDay(8.5, { duration: 2.5 });
    });
    s.fadeIn(0.8);
    s.sequence(() => {
      s.wait(0.9);
      s.caption('Morning in Willow Square.', { hold: 4.3 });
    });

    // the baker is up first, with a tray for the cafe
    after(0.7, () => {
      bo.exit('bakery');
      bo.walkTo([11, 10]);
      bo.pose('carry', { hold: 1.2 });
      bo.enter('cafe');
    });
    after(1.0, () => {
      mira.walkTo('market.fruit.vendor');
      mira.face('down');
    });
    after(1.4, () => otto.sitOn('market.bench', 'right', { speed: 1.8 }));
    after(2.0, () => raj.walkTo('library.door'));

    // Ana comes out of the cafe, stops in the middle of the square and says hello
    after(2.6, () => {
      ana.exit('cafe');
      ana.walkTo([23, 10]);
      ana.walkTo('square');
      ana.face('down');
      ana.pose('wave', { hold: 1 });
      ana.say('Hello! Welcome to Willow Square.');
      ana.emote('heart', { hold: 1 });
    });
    // behind her, the school run reaches the fountain
    after(7.6, () => {
      kofi.walkTo('fountain.west', { speed: 3.5 });
      s.wander(kofi, { around: 'fountain.west', radius: 2, speed: 2.5 });
    });
    after(7.9, () => {
      lin.walkTo([20, 15], { speed: 3.5 });
      s.wander(lin, { around: 'fountain.west', radius: 2, speed: 2.5 });
    });
    after(8.2, () => yuki.walkTo('willow.shade'));
    after(8.5, () => raj.walkTo('shop.door'));
    after(11.6, () => zara.exit('shop'));
  });

  // --- Conclude: the square at work -------------------------------------------------------
  s.camera.cut(WIDE, { zoom: 1 });
  s.together(() => {
    s.sequence(() => {
      s.caption('Everyone here follows a script.', { hold: 3.4 });
      s.caption('Write a scene. Simutown films it.', { hold: 3.4 });
    });
    s.sequence(() => {
      ana.walkTo('market.fruit.front');
      ana.face('up');
      mira.say('Fresh plums!', { hold: 1.4 });
    });
    s.sequence(() => {
      zara.walkTo('market.greens.front');
      zara.face('up');
      tomas.pose('wave', { hold: 1 });
    });
    s.sequence(() => {
      bo.exit('cafe');
      bo.enter('bakery');
    });
    raj.walkTo('townhall.door-right');
    after(0.5, () => yuki.sitOn('square.bench', 'right'));
  });
  s.fadeOut(0.8);
});
