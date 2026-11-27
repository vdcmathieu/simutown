/**
 * A short scene in the test room: Bo works inside, Ana walks in from the street, they talk,
 * and Ana leaves. Used by the interior tests and to look at the indoor light.
 */
import { scene } from '../../src';
import { roomArt, townWithRoom } from './room';

/** The room scene at an hour of the day (default noon). */
export function roomScene(timeOfDay = 12) {
  return scene({ title: 'In the bakery', town: townWithRoom, art: roomArt, timeOfDay }, (s) => {
    const bo = s.actor('bo', { at: 'bakery:counter', facing: 'left' });
    const ana = s.actor('ana', { at: 'plaza' });
    s.camera.cut('bakery.door', { zoom: 2 });
    ana.walkTo('bakery.door');
    s.camera.inside('bakery');
    ana.enter('bakery');
    ana.walkTo(bo);
    ana.say('Two loaves, please!');
    bo.say('Fresh out of the oven.');
    ana.exit('bakery');
    s.camera.cut('plaza');
    s.wait(0.5);
  });
}

export default roomScene();
