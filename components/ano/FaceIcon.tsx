import type { AnoExpression } from "./types";

/*
 * Ano's face as a small flat icon (DESIGN.md §6): the dark visor with the
 * glowing apricot eyes and mouth of one expression, matching the faces his
 * 3D visor shows (face.ts). Used to pick an expression.
 */

const FACES: Record<AnoExpression, React.ReactNode> = {
  happy: (
    <>
      <path d="M17 17a5 5 0 0 1 10 0M37 17a5 5 0 0 1 10 0" />
      <path d="M26 23q6 5 12 0" />
    </>
  ),
  curious: (
    <>
      <circle cx="22" cy="15" r="3.4" className="fill-apricot-300 stroke-none" />
      <circle cx="42" cy="14" r="4.4" className="fill-apricot-300 stroke-none" />
      <circle cx="32" cy="24" r="2.2" />
    </>
  ),
  thinking: (
    <>
      <circle cx="24" cy="13" r="3" className="fill-apricot-300 stroke-none" />
      <circle cx="44" cy="13" r="3" className="fill-apricot-300 stroke-none" />
      <path d="M28 24h10" />
    </>
  ),
  surprised: (
    <>
      <circle cx="22" cy="15" r="4.6" className="fill-apricot-300 stroke-none" />
      <circle cx="42" cy="15" r="4.6" className="fill-apricot-300 stroke-none" />
      <ellipse cx="32" cy="25" rx="3" ry="3.6" />
    </>
  ),
  celebrating: (
    <>
      <path d="M17 18l5-6 5 6M37 18l5-6 5 6" />
      <path d="M25 22q7 7 14 0z" className="fill-apricot-300" />
    </>
  ),
};

export function FaceIcon({ expression, className }: { expression: AnoExpression; className?: string }) {
  return (
    <svg viewBox="0 0 64 34" aria-hidden className={className}>
      <rect x="1" y="1" width="62" height="32" rx="16" className="fill-ink-900" />
      <g fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-apricot-300">
        {FACES[expression]}
      </g>
    </svg>
  );
}
