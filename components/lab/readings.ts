/*
 * Friendly labels and units for simulator readings shown in the inspector.
 * Keys follow the stage models' documented reading names; anything unknown
 * is shown with a tidied-up key and no unit.
 */

const KNOWN: Record<string, { label: string; unit: string; digits?: number }> = {
  // Cancer labs (teaching-model values, never real doses or times).
  "cancer.end": { label: "Cancer cells at the end", unit: "%", digits: 0 },
  "hair.min": { label: "Hair cells at their lowest", unit: "%", digits: 0 },
  "hair.end": { label: "Hair cells at the end", unit: "%", digits: 0 },
  "slow.min": { label: "Slow cells at their lowest", unit: "%", digits: 0 },
  "cells.start": { label: "Cells at the start", unit: "", digits: 0 },
  "cells.end": { label: "Cells at the end", unit: "", digits: 0 },
  "normal.end": { label: "Normal cells at the end", unit: "", digits: 0 },
  "cancer.count": { label: "Cancer cells at the end", unit: "", digits: 0 },
  "uv.share": { label: "UV getting through", unit: "%", digits: 0 },
  "damage.end": { label: "Damage points", unit: "", digits: 0 },
  "normal.room": { label: "Room in the dish", unit: "", digits: 0 },
  "spread.end": { label: "Cells that crossed over", unit: "", digits: 0 },
  "one.healthy": { label: "One beam: most on healthy", unit: "%", digits: 0 },
  "angles.target": { label: "Spread plan: tumour dose", unit: "%", digits: 0 },
  "angles.healthy": { label: "Spread plan: most on healthy", unit: "%", digits: 0 },
  "slide.target": { label: "Sliding beam: tumour dose", unit: "%", digits: 0 },
  "side.healthy": { label: "One side: most on healthy", unit: "%", digits: 0 },
  "changes.inherited": { label: "Changes from birth", unit: "", digits: 0 },
  "changes.life": { label: "Changes during life", unit: "", digits: 0 },
  "share.life": { label: "Share from life", unit: "%", digits: 0 },
  "scale.start": { label: "Scale before", unit: "g", digits: 2 },
  "scale.end": { label: "Scale after", unit: "g", digits: 2 },
  "co2.made": { label: "Gas made", unit: "g", digits: 2 },
  "co2.escaped": { label: "Gas that got out", unit: "g", digits: 2 },
  "bag.volume": { label: "Gas in the bag", unit: "mL", digits: 0 },
  "sugar.grams": { label: "Sugar", unit: "g", digits: 1 },
  "sugar.dissolved": { label: "Dissolved", unit: "%", digits: 0 },
  "temp.start": { label: "Start temperature", unit: "°C", digits: 1 },
  "temp.end": { label: "End temperature", unit: "°C", digits: 1 },
  "temp.duringMelt": { label: "While melting", unit: "°C", digits: 1 },
  "melt.fraction": { label: "Melted", unit: "%", digits: 0 },
  "particles.speedRatio": { label: "Particle speed", unit: "×", digits: 2 },
  "particles.sizeRatio": { label: "Particle size", unit: "×", digits: 2 },
  "particles.countRatio": { label: "Particle count", unit: "×", digits: 2 },
  "balloon.volumeRatio": { label: "Balloon volume", unit: "×", digits: 2 },
  "cold.finish": { label: "Cold tablet done at", unit: "s", digits: 0 },
  "hot.finish": { label: "Hot tablet done at", unit: "s", digits: 0 },
  ph: { label: "pH", unit: "", digits: 2 },
  "base.ml": { label: "Base added", unit: "mL", digits: 1 },
  "equivalence.ml": { label: "Neutral point", unit: "mL", digits: 1 },
  "oxygen.used": { label: "Oxygen used up", unit: "g", digits: 2 },
  "volume.start": { label: "Volume before", unit: "mL", digits: 0 },
  "volume.end": { label: "Volume after", unit: "mL", digits: 0 },
  "pressure.start": { label: "Pressure before", unit: "kPa", digits: 0 },
  "pressure.end": { label: "Pressure after", unit: "kPa", digits: 0 },
  "pressure.ratio": { label: "Pressure change", unit: "×", digits: 2 },
  "catalyst.start": { label: "Catalyst before", unit: "g", digits: 2 },
  "catalyst.end": { label: "Catalyst after", unit: "g", digits: 2 },
  "o2.ml": { label: "Oxygen made", unit: "mL", digits: 0 },
  "no2.fraction": { label: "How brown (NO₂)", unit: "%", digits: 0 },
  "color.start": { label: "Brownness before", unit: "%", digits: 0 },
  "color.end": { label: "Brownness after", unit: "%", digits: 0 },
  "robot.turn": { label: "Turned", unit: "°", digits: 0 },
  "robot.distance": { label: "Distance", unit: "cm", digits: 0 },
  "driver.torque": { label: "Motor turning force", unit: "×", digits: 2 },
  "driver.rpm": { label: "Motor gear", unit: "rpm", digits: 0 },
  "driven.rpm": { label: "Output gear", unit: "rpm", digits: 0 },
  "driven.torque": { label: "Output turning force", unit: "×", digits: 2 },
  "gear.ratio": { label: "Gear ratio", unit: ":1", digits: 2 },
  "pwm.duty": { label: "Duty cycle", unit: "%", digits: 0 },
  "motor.avgVoltage": { label: "Average voltage", unit: "V", digits: 2 },
  "motor.rpm": { label: "Motor speed", unit: "rpm", digits: 0 },
  "motor.speedFraction": { label: "Of full speed", unit: "%", digits: 0 },
  "motor.ripple": { label: "Speed wobble", unit: "%", digits: 0 },
  "pwm.frequency": { label: "Switches per second", unit: "Hz", digits: 0 },
};

const PERCENT_FROM_FRACTION = new Set([
  "uv.share",
  "share.life",
  "sugar.dissolved",
  "melt.fraction",
  "no2.fraction",
  "color.start",
  "color.end",
  "motor.speedFraction",
  "motor.ripple",
]);

export function readingLabel(key: string, value: number): { label: string | null; text: string } {
  const known = KNOWN[key];
  if (!known) return { label: null, text: "" };
  const v = PERCENT_FROM_FRACTION.has(key) ? value * 100 : value;
  const digits = known.digits ?? 2;
  return { label: known.label, text: `${v.toFixed(digits)}${known.unit ? ` ${known.unit}` : ""}`.replace(" ×", "×") };
}
