// examples/art/clinic.ts - a new building from a spec.
import { art, makeBuilding } from 'simutown';

export const clinic = makeBuilding({
  id: 'clinic',
  width: 6,
  wall: 'brick',
  roof: { form: 'hip', color: 'red' },
  door: { at: 2.5, style: 'panelled', paint: 'teal', lantern: 'left', step: true },
  windows: [{ at: 4.5, shutters: 'teal', lit: 'curtains' }],
  sign: { icon: 'bell', at: 1 },
});

art.props.clinic = clinic;
