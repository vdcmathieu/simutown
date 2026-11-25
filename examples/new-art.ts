// examples/new-art.ts - the art of docs/making-art.md in one scene, from day into dusk.
// Importing the art files registers Lena, the clinic, the hay bale, the stone lantern and gravel.
import './art/lena';
import './art/clinic';
import './art/hay-bale';
import './art/stone-lantern';
import './art/gravel';
import { defineTown, scene } from 'simutown';

const yard = defineTown({
  name: 'Clinic Yard',
  terrain: `
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    ggggggggggg:::gggggggggggggggg
    ggggggggggg::::::::::::ggggggg
    ggggggggggg::::::::::::ggggggg
    gggggggggggggggggggggg::gggggg
    gggggggggggggggggggggg::gggggg
    cccccccccccccccccccccccccccccc
    cccccccccccccccccccccccccccccc
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
  `,
  legend: { g: 'grass', ':': 'gravel', c: 'cobble' },
  props: [
    { kind: 'clinic', at: [10, 6] },
    { kind: 'stone-lantern', at: [17, 7] },
    { kind: 'hay-bale', at: [19, 7] },
    { kind: 'tree', at: [26, 8] },
    { kind: 'flowers-blue', at: [22, 5] },
  ],
  places: { road: [24, 13] },
});

export default scene({ title: 'A new neighbour', town: yard, timeOfDay: 17 }, (s) => {
  const lena = s.actor('lena', { at: 'clinic.door', hidden: true });

  s.camera.cut([16, 7], { zoom: 2 });
  s.fadeIn();
  s.caption('Lena runs the new clinic.');
  s.wait(1);
  lena.exit('clinic');
  s.together(() => {
    s.timeOfDay(19.5, { duration: 4 });
    lena.walkTo('stone-lantern.front');
  });
  lena.face('up');
  lena.think('Time to light the lantern.');
  s.wait(1);
  s.fadeOut();
});
