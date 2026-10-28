import { useId, type ComponentType, type SVGProps } from "react";

/*
 * The base of our icon set (DESIGN.md §5.1): a 24 px grid, solid shapes in
 * the current text colour, corners softened by a thin round stroke of the
 * same colour. Icons are decorative by default; give one an aria-label and
 * aria-hidden={false} if it ever carries meaning on its own.
 *
 * The signature: one round bite out of the shape, the same size on every
 * icon (radius about 3 on the grid, a 2.5 px cut at 20 px). `notch` places
 * it ([x, y, radius]); icons whose silhouette already carries a cut (the
 * arrow's nock, the flag's swallowtail, the door of the house) skip it.
 *
 * The optional second tone: parts drawn with TONE take `--icon-tone`
 * (apricot-500 on white icon buttons) and fall back to the text colour.
 */

export type IconProps = SVGProps<SVGSVGElement>;
export type Icon = ComponentType<IconProps>;

export const TONE = "fill-[var(--icon-tone,currentColor)] stroke-[var(--icon-tone,currentColor)]";
export const TONE_LINE = "stroke-[var(--icon-tone,currentColor)]";
/** The second tone with no softening stroke, for thin parts whose gaps must stay open (CSS beats the stroke attribute). */
export const TONE_SOLID = "fill-[var(--icon-tone,currentColor)] stroke-none";

export function Svg({ children, notch, ...rest }: IconProps & { notch?: readonly [number, number, number] }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {notch ? (
        <>
          <defs>
            <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
              <rect width={24} height={24} fill="white" stroke="none" />
              <circle cx={notch[0]} cy={notch[1]} r={notch[2]} fill="black" stroke="none" />
            </mask>
          </defs>
          <g mask={`url(#${id})`}>{children}</g>
        </>
      ) : (
        children
      )}
    </svg>
  );
}
