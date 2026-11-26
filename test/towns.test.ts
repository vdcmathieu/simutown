import { describe, expect, it } from 'vitest';
import { art, townsfolk } from '../src/art';
import { willowSquare, willowSquareHomes } from '../src/towns';
import { describeTown, fmtTile, isWalkable, reachable } from '../src/world';

describe('Willow Square', () => {
  const town = willowSquare;

  it('is about 44 x 30 tiles, larger than one frame', () => {
    expect([town.w, town.h]).toEqual([44, 30]);
    expect(town.terrain).toHaveLength(town.w * town.h);
  });

  it('has the buildings and the landmarks of the brief', () => {
    const ids = town.props.map((p) => p.id);
    for (const id of ['townhall', 'cafe', 'bakery', 'shop', 'library', 'school', 'post-office', 'fountain', 'willow', 'park.bench', 'market.fruit']) {
      expect(ids, id).toContain(id);
    }
    const kinds = town.props.map((p) => p.kind);
    expect(kinds.filter((k) => k === 'lamp').length).toBeGreaterThanOrEqual(12);
    expect(kinds.filter((k) => k === 'bench').length).toBeGreaterThanOrEqual(4);
    expect(kinds.filter((k) => k.startsWith('hedge')).length).toBeGreaterThan(20);
    expect(new Set(town.terrain)).toEqual(new Set(['grass', 'meadow', 'tall-grass', 'cobble', 'dirt', 'soil', 'sand', 'water', 'plank-v']));
  });

  it('names the places a scene needs', () => {
    for (const name of ['square', 'cafe.door', 'fountain.south', 'park.bench.left', 'pond.north', 'bridge.west', 'bridge.east', 'garden', 'market', 'playground']) {
      expect(town.places[name], name).toBeDefined();
    }
  });

  it('gives every townsperson a home with a door', () => {
    for (const person of townsfolk) {
      const home = willowSquareHomes[person.id];
      expect(home, `${person.id} has a home`).toBeDefined();
      expect(town.places[`${person.id}.home`], `${person.id}.home`).toEqual(town.places[`${home}.door`]);
    }
  });

  it('every named place is walkable and reachable on foot from the square', () => {
    const from = town.places.square!;
    const seen = reachable(town, from);
    const lost = Object.entries(town.places)
      .filter(([, p]) => !isWalkable(town, p.tx, p.ty) || !seen.has(p.ty * town.w + p.tx))
      .map(([name, p]) => `${name} ${fmtTile(p)}`);
    expect(lost).toEqual([]);
  });

  it('leaves no walkable pocket cut off from the square, south of the High Street', () => {
    // The strip behind the High Street's buildings (rows 0-8) is a backdrop of trees, closed on purpose.
    const seen = reachable(town, town.places.square!);
    const pockets: string[] = [];
    for (let ty = 9; ty < town.h; ty++) {
      for (let tx = 0; tx < town.w; tx++) {
        if (isWalkable(town, tx, ty) && !seen.has(ty * town.w + tx)) pockets.push(fmtTile({ tx, ty }));
      }
    }
    expect(pockets).toEqual([]);
  });

  it('keeps water away from paving and dirt, and uses only known art', () => {
    const at = (tx: number, ty: number) => town.terrain[ty * town.w + tx];
    const clashes: string[] = [];
    for (let ty = 0; ty < town.h; ty++) {
      for (let tx = 0; tx < town.w; tx++) {
        if (at(tx, ty) !== 'water') continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = at(tx + dx, ty + dy);
          if (n === 'cobble' || n === 'dirt') clashes.push(`${fmtTile({ tx, ty })} water next to ${n}`);
        }
      }
    }
    expect(clashes).toEqual([]);
    for (const p of town.props) expect(art.props[p.kind], p.kind).toBeDefined();
  });

  it('grows every plant on ground that suits it: no flowers on the paving, no lilies on the lawn', () => {
    const waterPlants = /^(lily|lotus|reeds|water-rocks)/;
    const crops = /^(cabbages|sprouts|pumpkins)/;
    const misplaced: string[] = [];
    for (const p of town.props) {
      // ground cover is what has no footprint: flowers, tufts, leaves, crops, water plants, stepping stones
      if (art.props[p.kind]!.footprint) continue;
      const ground = town.terrain[p.ty * town.w + p.tx]!;
      const suits = waterPlants.test(p.kind) ? ground === 'water' : crops.test(p.kind) ? ground === 'soil' : ['grass', 'meadow', 'tall-grass', 'soil'].includes(ground);
      if (!suits) misplaced.push(`${p.id} (${p.kind}) at ${fmtTile(p)} on ${ground}`);
    }
    expect(misplaced).toEqual([]);
  });

  it('describes itself as a text map', () => {
    const text = describeTown(town);
    expect(text).toContain('Willow Square: 44 x 30 tiles');
    expect(text).toContain('ana.home');
  });
});
