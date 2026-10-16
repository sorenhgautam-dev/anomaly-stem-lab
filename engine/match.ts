import type { Prediction, PredictionSpec } from "./types";

/** Does a prediction match a result? Choices must be equal; sliders within tolerance. */
export function matches(spec: PredictionSpec, prediction: Prediction, result: Prediction): boolean {
  if (prediction.type === "choice" && result.type === "choice") {
    return prediction.value === result.value;
  }
  if (prediction.type === "slider" && result.type === "slider" && spec.type === "slider") {
    return Math.abs(prediction.value - result.value) <= spec.tolerance;
  }
  return false;
}
