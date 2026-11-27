/**
 * Interior art: what a room is made of. Floors, walls and the dark outside of a room are
 * terrain; furniture, windows, lamps, rugs and doormats are props.
 *
 * A room is an ASCII map: a rectangle of wall and floor in a field of `ink`. The back
 * wall is two rows, `wall-<look>` over `wall-<look>-base`; the ink draws the wooden cap
 * around the room's edge. Wall pieces (windows, pictures, the clock, shelves, the menu
 * board, the wall lamp) have no footprint and stand on the base row of the wall. See
 * "Interiors" in docs/STYLE.md and "A room" in docs/making-art.md.
 */
import type { PropDef, TerrainDef } from '../../core/types';
import { civicProps } from './civic';
import { interiorTerrain as grounds } from './grounds';
import { homeProps } from './home';
import { livingProps } from './living';
import { shellProps } from './shell';
import { shopProps } from './shops';

/** The grounds of a room: floors, wall faces, and the ink outside the walls. */
export const interiorTerrain: Record<string, TerrainDef> = grounds;

/** What stands in a room: furniture, windows, lamps, rugs, doormats. */
export const interiorProps: Record<string, PropDef> = { ...shellProps, ...homeProps, ...livingProps, ...shopProps, ...civicProps };
