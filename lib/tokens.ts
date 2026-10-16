/**
 * JS copies of the colour tokens in app/globals.css (CLAUDE.md §3.3), for
 * places CSS can't reach: WebGL materials, canvas drawing. Keep in sync.
 */
export const TOKENS = {
  void: "#05060A",
  pearl: "#EDEBFF",
  lilac: "#B8A6FF",
  signal: "#3D7BFF",
  anomaly: "#FF3B5C",
  resolve: "#F2C14E",
} as const;

/** The "bioluminescent lab" ramps (CLAUDE.md §3.3), light → dark. */
export const RAMP = {
  depth: { 700: "#132654", 800: "#0C1A3D", 900: "#071027", 950: "#030712" },
  ion: {
    50: "#EEF3FF",
    100: "#DCE6FF",
    200: "#B9CCFF",
    300: "#93AEFF",
    400: "#6C8CFF",
    500: "#4A6BF5",
    600: "#3450D6",
    700: "#283FAA",
    800: "#1F3180",
    900: "#18265E",
  },
  glow: { 200: "#A6F8E2", 400: "#45F0C3", 600: "#17B892", 800: "#0B6E58" },
  mist: { 100: "#F1F7F7", 200: "#DCEBEA", 400: "#9FB3BC", 600: "#62757F" },
  resolve: { 300: "#FFD27A", 400: "#FFC24B", 600: "#E69A12" },
  anomaly: { 300: "#FF8E83", 400: "#FF5A4E", 600: "#D9342B" },
} as const;
