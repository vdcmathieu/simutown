// examples/haggle.ts - the worked example of docs/authoring.md: the first number anchors a deal.
import { scene } from '../src';
import { market } from './market';

export default scene({ title: 'First offer', town: market, timeOfDay: 10 }, (s) => {
  // Cast: Zara keeps the fruit stall, Idris comes to buy. Kofi and Lin play in the background.
  const zara = s.actor('zara', { at: 'fruit-stall.vendor', facing: 'down' });
  const idris = s.actor('idris', { at: 'south', facing: 'up' });
  const kofi = s.actor('kofi', { at: 'corner' });
  const lin = s.actor('lin', { at: [6, 7] });
  s.wander(kofi, { around: 'corner', radius: 2 });
  s.wander(lin, { around: [6, 7], radius: 2, seed: 2 });

  // Beat 1: the question.
  s.title('First offer', 'How the first number anchors a deal');

  // Beat 2: the set-up, wide, then closer as Idris arrives.
  s.camera.cut('fruit-stall.front', { zoom: 1 });
  s.fadeIn();
  s.caption('Idris wants a basket of apples.');
  idris.walkTo('fruit-stall.front');
  s.camera.pan('fruit-stall.front', { zoom: 2 });

  // Beat 3: Zara names a number first.
  s.caption('Zara speaks first.');
  zara.say('Ten coins for the basket.');
  s.label(zara, 'anchor: 10');
  idris.think('Ten? I would have said five.');

  // Beat 4: the haggle, one line each.
  idris.say('Seven?');
  zara.say('Nine, and it is yours.');
  idris.say('Eight.');
  s.together(() => {
    zara.say('Deal!');
    zara.emote('happy');
    s.link(idris, zara);
  });
  s.unlabel(zara);

  // Beat 5: the point, said plainly, with the numbers on screen.
  s.focus([zara, idris]);
  s.caption('Five felt fair to Idris. They settled at eight, close to the first number said.', { hold: 4 });
  s.unfocus();

  // Beat 6: a second take, where Idris speaks first. A fade covers the jump back.
  s.fadeOut();
  idris.teleport('south');
  idris.face('up');
  s.camera.cut('fruit-stall.front', { zoom: 2 });
  s.fadeIn();
  s.caption('Same stall, same apples. This time Idris speaks first.');
  idris.walkTo('fruit-stall.front');
  idris.say('Four coins for the basket?');
  s.label(idris, 'anchor: 4');
  zara.think('Four? I hoped for ten.');
  zara.say('Six.');
  idris.say('Five.');
  s.together(() => {
    zara.say('Fine, five.');
    idris.emote('happy');
    s.link(zara, idris);
  });
  s.unlabel(idris);

  // Beat 7: the takeaway, then out.
  s.camera.pan('fruit-stall.front', { zoom: 1 });
  s.caption('Whoever names the first number pulls the deal towards it.', { hold: 4 });
  s.fadeOut();
});
