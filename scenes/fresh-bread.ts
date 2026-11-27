/**
 * Fresh bread: a loaf's day, from the bakery to the supper table, and what rooms are for.
 *
 * Establish: early morning on the High Street; Lin walks to the bakery and goes in.
 * Show: inside, Bo leaves his oven for the counter and sells her a loaf; she leaves, and
 * we see her come out on the street. In the evening, her parents wait at the table by the
 * fire, and she comes home with the bread.
 * Conclude: behind every door in Willow Square there is a room.
 *
 * Every cut follows someone through a door: the camera goes in when Lin does, and out when
 * she does. Indoors is shot at zoom 2, the whole room in frame.
 */
import { scene } from 'simutown';
import { willowSquare } from 'simutown/towns';

/** The High Street in front of the bakery, close. */
const BAKERY_FRONT: [number, number] = [8, 8];

export default scene({ title: 'Fresh bread', town: willowSquare, timeOfDay: 7.5 }, (s) => {
  /** Going through a door is a 0.3 s fade on both sides: cut in the middle of it. */
  const cutMidDoor = (cut: () => void) =>
    s.sequence(() => {
      s.wait(0.15);
      cut();
    });

  const lin = s.actor('lin', { at: [1, 10], facing: 'right' });
  const bo = s.actor('bo', { at: 'bakery:oven.front', facing: 'up' });
  // her parents are home all along, out of sight until the evening
  const raj = s.actor('raj', { at: 'red-house:hearth' });
  const noor = s.actor('noor', { at: 'red-house:kitchen.front' });

  // --- Morning, outside: Lin goes to the bakery ------------------------------------------
  s.camera.cut(BAKERY_FRONT, { zoom: 2 });
  s.together(() => {
    s.fadeIn(0.8);
    s.caption('Early morning on the High Street.', { hold: 2.6 });
    lin.walkTo('bakery.door');
    raj.sitOn('red-house:chair');
    noor.sitOn('red-house:chair-3');
  });

  // --- Inside the bakery: the camera goes in with her -------------------------------------
  // cut halfway through the door: she fades out on the street and in on the doormat
  s.together(() => {
    lin.enter('bakery');
    cutMidDoor(() => s.camera.inside('bakery'));
  });
  bo.face('down');
  bo.say('Morning, Lin! Up early?');
  s.together(() => {
    bo.walkTo('bakery:counter.behind');
    lin.walkTo('bakery:customer');
  });
  lin.say('A big loaf for supper, please!');
  bo.pose('carry', { hold: 0.8 });
  s.together(() => {
    bo.say('Still warm from the oven!');
    s.sequence(() => {
      s.wait(1.2);
      lin.emote('heart');
    });
  });
  s.together(() => {
    lin.walkTo('bakery:door');
    s.sequence(() => {
      s.wait(0.4);
      bo.pose('wave', { hold: 1 });
    });
  });

  // --- Back outside as she comes out --------------------------------------------------------
  s.together(() => {
    lin.exit('bakery');
    cutMidDoor(() => s.camera.outside());
  });
  s.together(() => {
    lin.walkTo([11, 10]);
    s.sequence(() => {
      s.wait(1.4);
      s.fadeOut(0.6);
    });
  });

  // --- Evening, the red house: supper ------------------------------------------------------
  s.timeOfDay(20);
  lin.teleport('red-house.door');
  s.camera.inside('red-house');
  s.together(() => {
    s.fadeIn(0.6);
    // held well past the fade, so it is read over the whole room
    s.caption('That evening.', { hold: 3 });
    // she comes in as the room fades in, and crosses to the end of the table
    s.sequence(() => {
      lin.enter('red-house');
      lin.walkTo([9, 7]);
      lin.face('left');
    });
    s.sequence(() => {
      s.wait(0.5);
      noor.say("There you are! Supper's ready.");
    });
  });
  // in profile, turned to her parents, so we see her face as she speaks
  lin.pose('carry', { hold: 0.6 });
  lin.say('And I brought the bread!');
  s.together(() => {
    raj.emote('happy');
    lin.sitOn('red-house:chair-2');
    s.sequence(() => {
      s.wait(1.6);
      s.caption('Behind every door in Willow Square, a room.', { hold: 4 });
    });
  });
  s.fadeOut(0.8);
});
