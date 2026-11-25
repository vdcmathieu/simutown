/** The scene `simutown new <name>` writes: short, commented, and it renders as it is. */

/** "market-day" -> "Market day". */
export function titleFromName(name: string): string {
  const words = name.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The source of a starter scene called `name`. */
export function starterScene(name: string): string {
  const title = titleFromName(name);
  return `/**
 * ${title}: a starter scene. Replace this line with the one idea the scene shows.
 *
 *   simutown info ${name} --beats    what happens when, and the errors if any
 *   simutown still ${name} -t 6      one frame as a PNG, to look at
 *   simutown render ${name}          the film, out/${name}.mp4
 *
 * The guide: https://github.com/vdcmathieu/simutown/blob/main/docs/authoring.md
 */
import { scene, willowSquare } from 'simutown';

// The town sets the places; describeTown(willowSquare) lists their names.
// timeOfDay is the hour: 9 to 16 is plain daylight, 17 to 18 golden, 21.5 and later night.
export default scene({ title: '${title}', town: willowSquare, timeOfDay: 10 }, (s) => {
  // The cast: townsfolk ids (ana the neighbour, bo the baker, ...), each at a place.
  const ana = s.actor('ana', { at: 'cafe.door', facing: 'down' });
  const bo = s.actor('bo', { at: 'bakery.door', facing: 'down' });

  // Each call starts when the one before it ends. First, set the scene.
  s.camera.cut('square', { zoom: 1 });
  s.fadeIn();
  s.caption('Every morning, Ana buys bread.', { hold: 2.5 });

  // Then the event, one line at a time, closer in. A bubble stays up long enough to read.
  s.camera.pan('bakery.door', { zoom: 2 });
  ana.walkTo(bo);
  ana.say('Good morning, Bo!');
  bo.say('Morning, Ana. Fresh bread today.');
  ana.emote('heart');

  // Hold on the moment, then end.
  s.wait(1);
  s.fadeOut();
});
`;
}
