/**
 * JS copies of the colour tokens in app/globals.css (DESIGN.md §3), for
 * places CSS can't reach: WebGL materials, canvas drawing. Keep in sync.
 */
export const PALETTE = {
  white: "#FFFFFF",
  cream: { 50: "#FFFBF6", 100: "#FEF4E8", 200: "#FBE7D2", 300: "#F6D3B0" },
  ink: { 900: "#121212", 700: "#3A3631", 500: "#6E665D", 300: "#A79E93" },
  apricot: { 100: "#FFEBD6", 200: "#FFD9B3", 300: "#FFBE85", 400: "#FF9E4F", 500: "#FF7A1F", 600: "#F05D00", 700: "#C24A00" },
  flame: { 200: "#FFC9D4", 300: "#FF9DB0", 400: "#FF6B8B", 500: "#FF3D6E" },
  volt: { 100: "#E4EAFF", 300: "#9DB4FF", 400: "#6B8CFF", 500: "#3D63FF", 600: "#2A47E0" },
  grape: { 300: "#C3B1FF", 400: "#9B7BFF", 500: "#7A52FF" },
  verify: { 100: "#DDF8EA", 500: "#16B364", 700: "#0B7A44" },
  anomaly: { 100: "#FFE3E0", 500: "#F2392C", 700: "#B4231A" },
} as const;

/**
 * The labs' own colour worlds (DESIGN.md §8, the owner's palettes), cool and
 * distinct from the warm site. Each lab uses only its own set.
 */
export const LAB = {
  chemistry: { wall: "#097770", floor: "#065A55", bench: "#E0CDBE", gold: "#EDCA82", sage: "#A9C0A6" },
  robotics: { wall: "#1A1B1F", deep: "#0F1012", bench: "#F4F4F2", trim: "#16171A", gold: "#D4A537", teal: "#1FA7A0", stage: "#141518", stage2: "#1E2024" },
  /** Prevention Lab: a sunny day (DESIGN.md §3.2). */
  prevention: { wall: "#EDCA82", sky: "#F3DEAE", floor: "#D9B467", bench: "#E0CDBE", sage: "#A9C0A6", teal: "#097770" },
} as const;

/** Confetti in two brand colours only (DESIGN.md §0, §7.5). */
export const CONFETTI = [PALETTE.verify[500], PALETTE.apricot[400]] as const;
