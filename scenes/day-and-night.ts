/**
 * Day and night: one day in Willow Square as a time-lapse, from five in the morning to
 * ten at night. It shows off the lighting: dawn, long morning shadows, flat noon, the
 * golden hour, lamps and windows at dusk, and the lamp-lit night.
 *
 * The camera is locked off on the square, like a real time-lapse, with two closer looks:
 * lunch on the bench under the willow, and the last neighbour walking home under the lamps.
 *
 * The clock runs at about an hour a second while people move at their own pace, so the
 * script is a set of parallel tracks on one timeline: `at(seconds, ...)` starts a track at
 * that moment of the day block.
 */
import { scene } from '../src';
import { willowSquare, willowSquareHomes } from '../src/towns';

/** The locked-off shot: the bakery on the left, the market on the right, the town hall above. */
const WIDE: [number, number] = [21, 9];
/** The closer shot: the bench under the willow, with the fountain beside it. */
const BENCH: [number, number] = [18, 14];

export default scene({ title: 'Day and night', town: willowSquare, timeOfDay: 5 }, (s) => {
  /** A track that starts `t` seconds into the surrounding `together`. */
  const at = (t: number, fn: () => void) =>
    s.sequence(() => {
      s.wait(t);
      fn();
    });

  const bo = s.actor('bo', { at: 'bakery.door', hidden: true });
  const emil = s.actor('emil', { at: 'library.door', hidden: true });
  // everyone else starts just outside the frame and walks in when their day begins
  const ana = s.actor('ana', { at: [5, 10], facing: 'right' });
  const raj = s.actor('raj', { at: [4, 10], facing: 'right' });
  const tomas = s.actor('tomas', { at: [38, 10], facing: 'left' });
  const zara = s.actor('zara', { at: [37, 11], facing: 'left' });
  const mira = s.actor('mira', { at: [23, 19], facing: 'up' });
  const otto = s.actor('otto', { at: [16, 19], facing: 'up' });
  const kofi = s.actor('kofi', { at: [24, 19], facing: 'up' });
  const lin = s.actor('lin', { at: [25, 19], facing: 'up' });

  s.camera.cut(WIDE, { zoom: 1 });

  // --- The day: 5 am to 8 pm in twenty-one seconds ---------------------------------------------
  s.together(() => {
    s.fadeIn(0.8);

    // the clock
    s.sequence(() => {
      s.timeOfDay(7, { duration: 3 }); // dawn: the lamps go out at half past six
      s.timeOfDay(10.5, { duration: 5 }); // morning
      s.timeOfDay(13.5, { duration: 5.4 }); // a long lunch
      s.timeOfDay(17, { duration: 2.6 }); // afternoon
      s.timeOfDay(20.5, { duration: 5 }); // lamps on at half past five, golden hour, dusk, night
    });

    // the narration
    s.sequence(() => {
      s.wait(0.6);
      s.caption('5 am. The baker is up before the sun.', { hold: 2.6 });
      s.caption('7 am. Off to work.', { hold: 4.6 });
      s.wait(1.8);
      s.caption('Noon. Lunch on the benches.', { hold: 4 });
      s.wait(0.6);
      s.caption('3 pm. School is out.', { hold: 1.6 });
      s.caption('5 pm. Closing time.', { hold: 1.4 });
      s.caption('Dusk. Lamps and windows come on.', { hold: 3.4 });
    });

    // the camera: locked off, with a closer look at lunch
    at(11.2, () => s.camera.cut(BENCH, { zoom: 2 }));
    at(13.6, () => s.camera.cut(WIDE, { zoom: 1 }));

    // Bo, the baker: first out, sets down the morning's crates, takes rolls to the cafe at noon
    at(0.5, () => {
      bo.exit('bakery');
      bo.walkTo([9, 10]);
      bo.pose('carry', { hold: 0.8 });
      bo.enter('bakery');
    });
    at(8.4, () => {
      bo.exit('bakery');
      bo.walkTo([11, 10]);
      bo.pose('carry', { hold: 0.8 });
      bo.enter('cafe');
      s.wait(1.6);
      bo.exit('cafe');
      bo.enter('bakery');
    });

    // Ana opens the cafe, has lunch with Otto, and goes back in
    at(2.8, () => ana.enter('cafe'));
    at(7.4, () => {
      ana.exit('cafe');
      ana.walkTo([14, 15], { speed: 3.5 });
      ana.sitOn('square.bench', 'right', { speed: 3.5 });
    });
    at(11.5, () => ana.say('Lovely day, Otto.'));
    at(12.4, () => otto.emote('happy'));
    at(13.8, () => {
      ana.walkTo([14, 15], { speed: 3.5 });
      ana.enter('cafe', { speed: 3.5 });
    });

    // Otto takes his bench for the day
    at(4.2, () => otto.sitOn('square.bench', 'left', { speed: 1.8 }));
    at(15.2, () => otto.emote('zzz', { hold: 1.6 }));
    at(19.2, () => otto.emote('zzz', { hold: 1.6 }));

    // the market: Mira and Tomas set up, Zara shops, lunch on the other bench
    at(3.0, () => {
      mira.walkTo('market.fruit.vendor', { speed: 3.5 });
      mira.face('down');
    });
    at(3.8, () => {
      tomas.walkTo('market.greens.vendor');
      tomas.face('down');
    });
    at(5.5, () => {
      zara.walkTo('market.fruit.front', { speed: 3 });
      zara.face('up');
    });
    at(7.4, () => mira.sitOn('market.bench', 'left', { speed: 4 }));
    at(9.2, () => zara.sitOn('market.bench', 'right', { speed: 3 }));
    at(10.4, () => zara.emote('heart', { hold: 0.8 }));
    at(13.4, () => {
      mira.walkTo('market.fruit.vendor', { speed: 3.5 });
      mira.face('down');
      // closing time: pack up and walk home
      s.wait(0.2);
      mira.walkTo([23, 19], { speed: 3.5 });
      mira.hide();
    });
    at(13.5, () => {
      zara.walkTo('market.greens.front');
      zara.face('up');
      s.wait(1.6);
      zara.walkTo([37, 14], { speed: 3 });
      zara.hide();
    });
    at(17.0, () => {
      tomas.walkTo([38, 10]);
      tomas.hide();
    });

    // Raj's round: the hall, the library, and on down the High Street
    at(4.6, () => {
      raj.walkTo('townhall.door', { speed: 3 });
      raj.face('up');
      s.wait(0.8);
      raj.walkTo('library.door', { speed: 3 });
      raj.face('up');
      s.wait(0.6);
      raj.walkTo([38, 10], { speed: 3 });
      raj.hide();
    });

    // Emil spends the day at the library
    at(5.0, () => {
      emil.teleport([24, 19]);
      emil.show();
      emil.enter('library', { speed: 3 });
    });
    at(16.0, () => {
      emil.exit('library');
      emil.walkTo([24, 19], { speed: 3.4 });
      emil.hide();
    });

    // after school, the children have the fountain to themselves
    at(14.2, () => {
      kofi.walkTo('fountain.east', { speed: 4 });
      s.wander(kofi, { around: 'fountain.east', radius: 2, speed: 2.5 });
    });
    at(14.4, () => {
      lin.walkTo([24, 16], { speed: 4 });
      s.wander(lin, { around: 'square.south', radius: 2, speed: 2.5 });
    });
    at(17.6, () => {
      kofi.walkTo([24, 19], { speed: 4 });
      kofi.hide();
    });
    at(17.9, () => {
      lin.walkTo([25, 19], { speed: 4 });
      lin.hide();
    });
  });

  // --- The night: the last one home ---------------------------------------------------------------
  s.camera.cut(otto, { zoom: 2 });
  s.camera.follow(otto);
  s.caption('Night. One neighbour is still out.');
  s.together(() => {
    s.timeOfDay(22.5, { duration: 7 });
    s.sequence(() => {
      otto.emote('zzz', { hold: 1.3 });
      otto.emote('surprise', { hold: 0.7 });
      otto.enter(willowSquareHomes.otto!, { speed: 2.2 });
    });
  });
  s.wait(0.5);
  s.camera.cut(WIDE, { zoom: 1 });
  s.caption('Good night, Willow Square.');
  s.wait(2.2);
  s.fadeOut(1);
});
