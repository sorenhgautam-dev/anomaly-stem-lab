import { interactionGroups } from "@react-three/rapier";

/** Rapier collision groups: who can hit whom. */
const G_FLOATING = 0;
const G_CURSOR = 1;
const G_BALL = 2;
const G_FLOOR = 3;

export const GROUPS = {
  floating: interactionGroups(G_FLOATING, [G_FLOATING, G_CURSOR, G_FLOOR]),
  cursor: interactionGroups(G_CURSOR, [G_FLOATING]),
  // The hero balls ignore the cursor and the floating objects so nothing can
  // spoil the experiment.
  ball: interactionGroups(G_BALL, [G_BALL, G_FLOOR]),
  floor: interactionGroups(G_FLOOR, [G_FLOATING, G_BALL]),
};
