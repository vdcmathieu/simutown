// examples/good-morning.ts - the smallest complete scene: a town, two people, a few lines.
import { defineTown, scene } from '../src';

// A lane between two lawns: a bakery on the north side, a bench and a tree on the south.
const lane = defineTown({
  name: 'Bakery Lane',
  terrain: `
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    cccccccccccccccccccccccccccccc
    cccccccccccccccccccccccccccccc
    cccccccccccccccccccccccccccccc
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
  `,
  legend: { g: 'grass', c: 'cobble' },
  props: [
    { kind: 'bakery', at: [12, 6] },
    { kind: 'lamp', at: [10, 6] },
    { kind: 'bench', at: [16, 10] },
    { kind: 'tree', at: [20, 11] },
  ],
  places: { west: [2, 8], east: [27, 8] },
});

export default scene({ title: 'Good morning', town: lane, timeOfDay: 9 }, (s) => {
  const ana = s.actor('ana', { at: 'west', facing: 'right' });
  const bo = s.actor('bo', { at: 'bakery.door', facing: 'down' });

  s.camera.cut('bakery.door', { zoom: 2 });
  s.fadeIn();
  s.caption('Every morning, Ana passes the bakery.');
  ana.walkTo(bo);
  ana.say('Good morning, Bo!');
  bo.say('Morning, Ana. Fresh bread today.');
  ana.emote('heart');
  s.clearCaption();
  s.wait(0.5);
  s.fadeOut();
});
