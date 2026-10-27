import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our gradient and type utilities (app/globals.css) aren't colours or font
// sizes, so tell tailwind-merge which group each belongs to; otherwise
// cn("bg-white", "bg-chem") would treat the gradient as a background colour.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "bg-image": [{ bg: ["ribbon", "chem", "robo", "level-easy", "level-medium", "level-advanced", "win", "glitch", "sunrise"] }],
      shadow: [{ shadow: ["warm-sm", "warm", "warm-lg"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
