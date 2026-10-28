type Box = { size: [number, number, number]; at: [number, number, number] };

/*
 * The bench's dimensions, shared by the bench, the set pieces that stand on
 * it and the lights on its front. The worktop's top face is y = 0; the floor
 * is y = -1.28.
 */
export const BENCH = {
  top: { size: [6.4, 0.24, 3.2], at: [0, -0.12, 0.2] } as Box,
  /** The band under the worktop's edge (where the lit strip runs). */
  band: { size: [6.3, 0.1, 3.1], at: [0, -0.29, 0.2] } as Box,
  carcass: { size: [5.6, 0.82, 2.6], at: [0, -0.75, 0.1] } as Box,
  kick: { size: [5.4, 0.12, 2.4], at: [0, -1.22, 0.05] } as Box,
  /** The cabinet's front face, and the doors across it (the status panel is to their right). */
  front: 1.4,
  doorsFrom: -2.72,
  doorsTo: 1.9,
  doorTop: -0.42,
  doorBottom: -1.1,
  /** The back edge of the worktop (set pieces stand just in front of it). */
  back: -1.4,
  /** The worktop's half width. */
  half: 3.2,
};
