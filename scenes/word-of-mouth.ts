/**
 * Word of mouth: how news spreads through a small town.
 *
 * Ana decides to throw a party and tells two friends. Each of them tells whoever they meet
 * next, around the square and in the park, until all ten neighbours know. Everyone who
 * knows gets a number, in the order they heard, and the caption keeps the score, so the
 * viewer can count at every step: 1, 2, 3, 4, 6, 7, 8, 10.
 *
 * The idea echoes the party-invitation experiment of Park et al. (2023), "Generative
 * Agents"; the townsfolk, the staging and the wording are our own, and nothing here is
 * simulated: the script decides who tells whom.
 */
import { scene } from '../src';
import type { ActorHandle, Dir } from '../src';
import { willowSquare } from '../src/towns';

/** The wide shot: the bakery on the left, the market on the right, the town hall above. */
const WIDE: [number, number] = [20, 9];
/** The same shot tilted down: the square at the top, Mill Lane, and the park with its pond. */
const PARKWARDS: [number, number] = [20, 19];
/** The front of the cafe, close. */
const CAFE: [number, number] = [15, 8];
/** The north shore of the pond, close. */
const POND: [number, number] = [27, 22];
/** The south side of the fountain, close. */
const FOUNTAIN: [number, number] = [23, 14];
const NEWS = 'Party on Saturday!';

export default scene({ title: 'Word of mouth', town: willowSquare, timeOfDay: 10 }, (s) => {
  /** A track that starts `delay` seconds into the surrounding `together`. */
  const after = (delay: number, fn: () => void) =>
    s.sequence(() => {
      s.wait(delay);
      fn();
    });

  // all ten are out of doors and inside the opening shots, so the viewer meets everyone once
  const ana = s.actor('ana', { at: 'cafe.door', facing: 'down' });
  const bo = s.actor('bo', { at: [13, 10], facing: 'right' });
  const mira = s.actor('mira', { at: 'noticeboard.front', facing: 'up' });
  const raj = s.actor('raj', { at: 'bakery.door', facing: 'up' });
  const zara = s.actor('zara', { at: 'market.greens.front', facing: 'up' });
  const tomas = s.actor('tomas', { at: 'market.greens.vendor' });
  const otto = s.actor('otto', { at: 'square.bench.left' });
  const yuki = s.actor('yuki', { at: 'park.bench.right' });
  const kofi = s.actor('kofi', { at: [24, 22], facing: 'right' });
  const lin = s.actor('lin', { at: [24, 24], facing: 'up' });

  /** Everyone who knows, in the order they heard. A person's number is their place in it. */
  const knows: ActorHandle[] = [];
  const numberOf = (who: ActorHandle) => String(knows.indexOf(who) + 1);
  /** Show or hide people's numbers. A label stays on screen when its actor leaves the frame, so hide the ones the camera leaves behind. */
  const show = (who: ActorHandle[]) => who.forEach((a) => s.label(a, numberOf(a)));
  const hide = (who: ActorHandle[]) => who.forEach((a) => s.unlabel(a));
  /** The score, as the caption shows it. */
  const score = () => `${knows.length} of 10 ${knows.length === 1 ? 'knows' : 'know'}.`;
  /** These people now know: give each the next number and a ring to mark the moment, and update the score. */
  const learn = (who: ActorHandle[], caption?: string) =>
    s.together(() => {
      for (const a of who) {
        knows.push(a);
        s.label(a, numberOf(a));
        s.ring(a);
      }
      s.caption(caption ?? score());
    });
  /** `teller` passes the news on: a line, a dotted link to each listener, then their numbers. */
  const tell = (teller: ActorHandle, listeners: ActorHandle[], line = NEWS, caption?: string) =>
    s.together(() => {
      teller.say(line);
      after(0.5, () => s.together(() => listeners.forEach((l) => s.link(teller, l))));
      after(1.4, () => learn(listeners, caption));
    });
  /** Dim everything but the people who know, for a look at the score. */
  const count = (hold: number) => {
    s.focus(knows);
    s.wait(hold);
    s.unfocus();
  };

  // --- Establish: ten neighbours, seven around the square and three in the park ----------------
  s.camera.cut(WIDE, { zoom: 1 });
  s.together(() => {
    s.title('Word of mouth', 'How news spreads in a small town');
    otto.sitOn('square.bench', 'left');
    yuki.sitOn('park.bench', 'right');
    // the children play on the open grass west of the pond, clear of the trees
    s.wander(kofi, { around: [24, 23], radius: 1 });
    s.wander(lin, { around: [24, 23], radius: 1 });
  });
  s.caption('Ten neighbours. One piece of news.');
  s.wait(1.2);
  s.camera.pan(PARKWARDS, { duration: 1.8 });
  s.wait(1.2);

  // --- Ana has an idea: 1 of 10 ------------------------------------------------------------------
  s.camera.cut(CAFE, { zoom: 2 });
  s.together(() => {
    ana.think("I'll throw a party!");
    ana.emote('idea', { hold: 1.6 });
    after(1.0, () => learn([ana]));
  });

  // --- She tells two friends: 3 of 10 --------------------------------------------------------------
  ana.walkTo([14, 10]);
  ana.face(bo);
  s.together(() => {
    tell(ana, [bo], `Bo! ${NEWS}`);
    after(1.0, () => bo.emote('surprise', { hold: 1 }));
    // Mira has read the notices and comes over for a coffee, just in time
    s.sequence(() => {
      mira.walkTo([19, 10], { speed: 3.2 });
      mira.walkTo([15, 10], { speed: 3.2 });
    });
  });
  ana.face(mira);
  mira.face(ana);
  s.together(() => {
    tell(ana, [mira], `Mira! ${NEWS}`, 'Ana told two friends. 3 of 10 know.');
    after(1.0, () => mira.emote('happy', { hold: 1 }));
  });
  count(1.8);

  // --- Each of them passes it on: 6 of 10 ----------------------------------------------------------
  s.camera.cut(WIDE, { zoom: 1 });
  s.caption('Each of them passes it on.');
  s.together(() => {
    // Ana goes back to work
    s.sequence(() => {
      ana.walkTo('cafe.door');
      ana.face('down');
    });
    // the postman has left the bakery's letters and stops by the baker
    s.sequence(() => {
      raj.walkTo(bo, { speed: 3 });
      bo.face(raj);
      tell(bo, [raj], `Raj! ${NEWS}`);
    });
    // Mira returns to her stall, and Zara comes over from the greens next door
    s.sequence(() => {
      mira.walkTo('market.fruit.vendor', { speed: 3.5 });
      mira.face('down');
      tomas.face(mira);
    });
    after(2.6, () => {
      zara.walkTo('market.fruit.front');
      zara.face('up');
    });
  });
  tell(mira, [zara, tomas]);
  count(2);

  // --- The postman carries it further: 7 of 10 -------------------------------------------------------
  s.caption('The postman carries it on his round.');
  s.together(() => {
    s.sequence(() => {
      // round Bo on the verge, then down the west side of the square to the bench under the willow
      raj.walkTo([12, 11], { speed: 3 });
      raj.walkTo([14, 11], { speed: 3 });
      raj.walkTo([14, 15], { speed: 3 });
      raj.walkTo(otto, { speed: 3 });
      otto.face(raj);
      tell(raj, [otto], `Otto! ${NEWS}`);
    });
    // the camera goes with him, and leaves the others' numbers behind
    after(1.0, () => {
      hide([ana, bo, mira, zara, tomas]);
      s.camera.cut(raj, { zoom: 2 });
      s.camera.follow(raj);
    });
  });
  s.wait(0.5);

  // --- ...all the way to the park: 10 of 10 ----------------------------------------------------------
  s.together(() => {
    s.sequence(() => {
      raj.walkTo('square.gate', { speed: 3.4 });
      show([raj]);
      raj.walkTo('park.gate', { speed: 3.6 });
      // along the top of the park and round the bench, to stand at Yuki's side
      raj.walkTo([29, 20], { speed: 3.6 });
      raj.walkTo([29, 21], { speed: 3.6 });
      raj.face(yuki);
      yuki.face(raj);
      tell(raj, [yuki], `Yuki! ${NEWS}`);
      yuki.face('down');
      s.together(() => {
        yuki.shout('Kofi! Lin! A party!');
        after(0.3, () => {
          kofi.walkTo([27, 22], { speed: 3.5 });
          kofi.face('right');
          kofi.emote('happy');
        });
        after(0.4, () => {
          lin.walkTo([26, 22], { speed: 3.5 });
          lin.face('right');
          lin.emote('note');
        });
        after(0.6, () =>
          s.together(() => {
            s.link(yuki, kofi);
            s.link(yuki, lin);
          }),
        );
        after(2.0, () => learn([kofi, lin], '10 of 10. The whole town knows.'));
      });
    });
    // cut ahead of him, to the three who have not heard yet
    after(1.8, () => {
      hide([otto, raj]);
      s.camera.cut(POND, { zoom: 2 });
      s.caption('Three in the park have not heard yet.');
    });
  });
  s.wait(1.8);

  // --- Saturday: everyone is there -------------------------------------------------------------------
  const party: [ActorHandle, [number, number], Dir][] = [
    [ana, [23, 15], 'down'],
    [bo, [21, 15], 'right'],
    [mira, [25, 15], 'left'],
    [raj, [19, 15], 'right'],
    [otto, [18, 16], 'right'],
    [yuki, [20, 14], 'right'],
    // behind the flower cart
    [tomas, [26, 14], 'left'],
    [zara, [27, 14], 'left'],
  ];
  s.clearCaption();
  s.together(() => {
    s.title('Saturday', 'at the fountain');
    // behind the title card: evening falls and everyone takes their place
    after(1.0, () => {
      hide(knows);
      s.timeOfDay(19);
      s.camera.cut(WIDE, { zoom: 1 });
      for (const [who, tile, dir] of party) {
        who.teleport(tile);
        who.face(dir);
      }
      kofi.teleport([24, 19]);
      lin.teleport([23, 19]);
    });
  });
  s.together(() => {
    s.timeOfDay(19.35, { duration: 7.5 });
    // the children come running, last as always
    after(0.4, () => {
      kofi.walkTo([24, 16], { speed: 3.5 });
      kofi.face('up');
    });
    after(0.7, () => {
      lin.walkTo([20, 16], { speed: 3.5 });
      lin.face('right');
    });
    // move in and count them: a ring for each, in the order they heard
    after(2.4, () => {
      s.camera.cut(FOUNTAIN, { zoom: 2 });
      show(knows);
      s.caption('Ana told two friends. Word of mouth did the rest.');
      s.together(() => knows.forEach((who, i) => after(0.3 + i * 0.25, () => s.ring(who, { hold: 3.2 - i * 0.25 }))));
    });
    after(5.4, () => {
      ana.say('You all came!');
    });
    after(5.8, () =>
      s.together(() => {
        bo.emote('heart');
        mira.emote('note');
        raj.emote('happy');
        zara.emote('heart');
        tomas.emote('note');
        otto.emote('happy');
        yuki.emote('heart');
        kofi.emote('note');
        lin.emote('heart');
      }),
    );
  });
  s.wait(0.4);
  s.fadeOut(1);
});
