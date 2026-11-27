// examples/bakery-room.ts - a lane with a bakery you can go into: the smallest town with a room.
import { defineTown, scene } from 'simutown';

// The inside of the bakery: 12 x 7 tiles, two rows of back wall and five of floor, in a ring of ink.
const bakeryRoom = defineTown({
  name: 'Bakery',
  indoor: true,
  terrain: `
    ##############
    #WWWWWWWWWWWW#
    #BBBBBBBBBBBB#
    #............#
    #............#
    #............#
    #............#
    #............#
    ##############
  `,
  legend: { '#': 'ink', W: 'wall-plaster', B: 'wall-brick-base', '.': 'floor-stone' },
  props: [
    { kind: 'bread-rack', at: [1, 3] },
    { kind: 'window-wide', at: [5, 2] },
    { kind: 'wall-lamp', at: [8, 2] },
    { kind: 'oven', at: [10, 3], id: 'oven' },
    { kind: 'bakery-counter', at: [6, 5], id: 'counter' },
    { kind: 'doormat', at: [4, 7] },
  ],
  places: { door: [4, 7], customer: [7, 7] },
});

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
  ],
  places: { west: [2, 8] },
  interiors: { bakery: bakeryRoom },
});

export default scene({ title: 'A loaf, please', town: lane, timeOfDay: 9 }, (s) => {
  const ana = s.actor('ana', { at: 'west', facing: 'right' });
  const bo = s.actor('bo', { at: 'bakery:counter.behind' }); // inside from the start

  s.camera.cut('bakery.door', { zoom: 2 });
  s.fadeIn();
  ana.walkTo('bakery.door');
  s.camera.inside('bakery'); // the camera goes in as she does, the whole room at zoom 2
  ana.enter('bakery');
  ana.walkTo('bakery:customer');
  ana.say('A loaf, please!');
  bo.say('Fresh from the oven.');
  ana.exit('bakery'); // back to the room's door, then out onto the lane
  s.camera.cut('bakery.door', { zoom: 2 });
  ana.walkTo('west');
  s.fadeOut();
});
