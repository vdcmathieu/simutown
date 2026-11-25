/**
 * Word of mouth: how news spreads through a small town.
 *
 * Ana decides to throw a party and tells two friends. Each of them tells whoever they meet
 * next, around the square and in the park, until all ten neighbours know. Everyone who
 * knows gets a number, in the order they heard, so the viewer can count at every step:
 * 1, 3, 6, 7, 8, 10.
 *
 * The idea echoes the party-invitation experiment of Park et al. (2023), "Generative
 * Agents"; the townsfolk, the staging and the wording are our own, and nothing here is
 * simulated: the script decides who tells whom.
 */
import { scene } from '../src';
import type { ActorHandle, Dir } from '../src';
import { willowSquare } from '../src/towns';

/** The wide shot: the bakery on the left, the market on the right, the town hall above. */
const WIDE: [number, number] = [21, 9];
const NEWS = 'Party on Saturday!';

export default scene({ title: 'Word of mouth', town: willowSquare, timeOfDay: 10 }, (s) => {
  /** A track that starts `delay` seconds into the surrounding `together`. */
  const after = (delay: number, fn: () => void) =>
    s.sequence(() => {
      s.wait(delay);
      fn();
    });

  const ana = s.actor('ana', { at: 'cafe.door', hidden: true });
  const bo = s.actor('bo', { at: [11, 10], facing: 'right' });
  const mira = s.actor('mira', { at: 'noticeboard.front', facing: 'up' });
  const raj = s.actor('raj', { at: 'cottage.door', facing: 'up' });
  const zara = s.actor('zara', { at: 'shop.door', facing: 'down' });
  const tomas = s.actor('tomas', { at: 'market.greens.vendor' });
  const otto = s.actor('otto', { at: 'square.bench.left' });
  const yuki = s.actor('yuki', { at: 'park.bench.left' });
  const kofi = s.actor('kofi', { at: [24, 25], facing: 'left' });
  const lin = s.actor('lin', { at: [24, 23], facing: 'left' });

  /** Everyone who knows, in the order they heard. A person's number is their place in it. */
  const knows: ActorHandle[] = [];
  const numberOf = (who: ActorHandle) => String(knows.indexOf(who) + 1);
  /** Show or hide people's numbers. A label stays on screen when its actor leaves the frame, so hide the ones the camera leaves behind. */
  const show = (who: ActorHandle[]) => who.forEach((a) => s.label(a, numberOf(a)));
  const hide = (who: ActorHandle[]) => who.forEach((a) => s.unlabel(a));
  /** These people now know: give each the next number, and a ring to mark the moment. */
  const learn = (who: ActorHandle[]) =>
    s.together(() => {
      for (const a of who) {
        knows.push(a);
        s.label(a, numberOf(a));
        s.ring(a);
      }
    });
  /** `teller` passes the news on: a line, a dotted link to each listener, then their numbers. */
  const tell = (teller: ActorHandle, listeners: ActorHandle[], line = NEWS) =>
    s.together(() => {
      teller.say(line);
      after(0.5, () => s.together(() => listeners.forEach((l) => s.link(teller, l))));
      after(1.4, () => learn(listeners));
    });
  /** Dim everything but the people who know, and say how many they are. */
  const count = (text: string, hold: number) => {
    s.caption(text);
    s.focus(knows);
    s.wait(hold);
    s.unfocus();
  };

  // --- Establish: ten neighbours ---------------------------------------------------------------
  s.camera.cut(WIDE, { zoom: 1 });
  s.together(() => {
    s.title('Word of mouth', 'How news spreads in a small town');
    otto.sitOn('square.bench', 'left');
    yuki.sitOn('park.bench', 'left');
    s.wander(kofi, { around: [23, 25], radius: 1 });
    s.wander(lin, { around: [23, 23], radius: 1 });
  });
  s.caption('Ten neighbours. One piece of news.', { hold: 3 });

  // --- Ana has an idea: 1 of 10 ------------------------------------------------------------------
  s.camera.cut([13, 8], { zoom: 2 });
  ana.exit('cafe');
  s.together(() => {
    ana.think("I'll throw a party!");
    ana.emote('idea', { hold: 1.6 });
    after(1.0, () => {
      s.caption('1 of 10 knows.');
      learn([ana]);
    });
    // Mira has read the notices and comes over for a coffee
    after(0.2, () => mira.walkTo([15, 10], { speed: 3 }));
  });

  // --- She tells two friends: 3 of 10 --------------------------------------------------------------
  ana.walkTo(bo);
  bo.face(ana);
  s.together(() => {
    tell(ana, [bo], `Bo! ${NEWS}`);
    after(1.0, () => bo.emote('surprise', { hold: 1 }));
    after(1.4, () => mira.walkTo(ana));
  });
  ana.face(mira);
  s.together(() => {
    tell(ana, [mira], `Mira! ${NEWS}`);
    after(1.0, () => mira.emote('happy', { hold: 1 }));
  });
  count('Ana told two friends. 3 of 10 know.', 1.8);

  // --- Each of them passes it on: 6 of 10 ----------------------------------------------------------
  s.camera.cut(WIDE, { zoom: 1 });
  s.caption('Each of them passes it on.');
  s.together(() => {
    // Ana goes back to work
    s.sequence(() => {
      ana.walkTo('cafe.door');
      ana.face('down');
    });
    // the postman reaches the bakery, and Bo tells him
    s.sequence(() => {
      raj.walkTo(bo, { speed: 3 });
      bo.face(raj);
      tell(bo, [raj], `Raj! ${NEWS}`);
    });
    // Mira returns to her stall, where Zara is waiting and Tomas sells next door
    after(0.3, () => {
      zara.walkTo('market.fruit.front', { speed: 3 });
      zara.face('up');
    });
    s.sequence(() => {
      mira.walkTo('market.fruit.vendor', { speed: 3.5 });
      mira.face('down');
      tomas.face(mira);
      tell(mira, [zara, tomas]);
    });
  });
  count('6 of 10 know.', 2);

  // --- The postman carries it further: 7 of 10 -------------------------------------------------------
  s.caption('The postman carries it on his round.');
  s.together(() => {
    s.sequence(() => {
      raj.walkTo([14, 10], { speed: 3 });
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
  s.caption('7 of 10.');
  s.wait(0.5);

  // --- ...all the way to the park: 10 of 10 ----------------------------------------------------------
  s.together(() => {
    s.sequence(() => {
      raj.walkTo('square.gate', { speed: 3.4 });
      show([raj]);
      raj.walkTo('park.gate', { speed: 3.4 });
      raj.walkTo(yuki, { speed: 3.4 });
      yuki.face(raj);
      tell(raj, [yuki]);
      s.caption('8 of 10.');
      yuki.face('down');
      s.together(() => {
        yuki.shout('Kofi! Lin! A party!');
        after(0.3, () => {
          kofi.walkTo([28, 22], { speed: 3.5 });
          kofi.face(yuki);
          kofi.emote('happy');
        });
        after(0.4, () => {
          lin.walkTo([29, 22], { speed: 3.5 });
          lin.face(yuki);
          lin.emote('note');
        });
        after(0.6, () =>
          s.together(() => {
            s.link(yuki, kofi);
            s.link(yuki, lin);
          }),
        );
        after(2.0, () => {
          s.caption('10 of 10. The whole town knows.');
          learn([kofi, lin]);
        });
      });
    });
    // cut ahead of him, to the three who have not heard yet
    after(1.4, () => {
      hide([otto, raj]);
      s.camera.cut([27, 22], { zoom: 2 });
      s.caption('Three in the park have not heard yet.');
    });
  });
  s.wait(1.2);

  // --- Saturday: everyone is there -------------------------------------------------------------------
  const party: [ActorHandle, [number, number], Dir][] = [
    [ana, [23, 15], 'down'],
    [bo, [21, 15], 'right'],
    [mira, [25, 15], 'left'],
    [raj, [19, 15], 'right'],
    [zara, [26, 16], 'left'],
    [tomas, [25, 13], 'left'],
    [otto, [18, 16], 'right'],
    [yuki, [21, 13], 'right'],
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
      s.camera.cut([23, 14], { zoom: 2 });
      show(knows);
      s.caption('Ana told two friends. All ten came.');
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
