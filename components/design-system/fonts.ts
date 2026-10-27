import { Anton, Bricolage_Grotesque } from "next/font/google";

/*
 * The two bold alternatives to Archivo (DESIGN.md §4), loaded only by the
 * /design-system font comparison. Both OFL-1.1.
 */

export const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400", display: "swap" });

export const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["wdth", "opsz"], display: "swap" });
