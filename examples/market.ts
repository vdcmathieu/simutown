// examples/market.ts - a small market square, used by the worked example in docs/authoring.md.
import { defineTown } from 'simutown';

export const market = defineTown({
  name: 'Market Square',
  terrain: `
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    gggggggggggggggggggggggggggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggcccccccccccccccccccccggggg
    ggggggggggggggcccggggggggggggg
    ggggggggggggggcccggggggggggggg
    ggggggggggggggcccggggggggggggg
    ggggggggggggggcccggggggggggggg
  `,
  legend: { g: 'grass', c: 'cobble' },
  props: [
    { kind: 'house', at: [5, 4] },
    { kind: 'bakery', at: [17, 4] },
    { kind: 'stall', at: [13, 8], id: 'fruit-stall' },
    { kind: 'stall-teal', at: [8, 10], id: 'cloth-stall' },
    { kind: 'barrel', at: [17, 8] },
    { kind: 'crate', at: [12, 8] },
    { kind: 'lamp', at: [4, 12] },
    { kind: 'lamp', at: [24, 12] },
    { kind: 'tree', at: [2, 8] },
    { kind: 'oak', at: [26, 9] },
    { kind: 'bench', at: [20, 12] },
  ],
  places: { south: [15, 16], corner: [22, 10] },
});
