import { Svg, TONE, TONE_SOLID, type IconProps } from "./Svg";

/*
 * ANOMALY's icons (DESIGN.md §5.1): solid geometric shapes on a 24 px grid,
 * each with the one round bite that marks the family (see Svg). Most bites
 * come out of the top-right corner of the main shape; the arrows carry it
 * as a nock in the tail, the flag as a swallowtail, the house as its door,
 * the restart arrow as the gap in its ring. No outline-only glyphs.
 * Shapes with holes skip the softening stroke so the holes keep their size.
 */

const HOLE = { stroke: "none", fillRule: "evenodd" } as const;

/** A circle as a closed path, so it can be a hole in an even-odd shape. */
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

/** The family's bite, at a corner of the main shape. */
const bite = (x: number, y: number, r = 3) => [x, y, r] as const;

const ARROW = "M3.2 9.6H12.4V4.2L21.2 12L12.4 19.8V14.4H3.2A2.4 2.4 0 0 0 3.2 9.6Z";

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={ARROW} />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={ARROW} transform="matrix(-1 0 0 1 24 0)" />
    </Svg>
  );
}

export function IconArrowUpRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d={ARROW} transform="rotate(-45 12 12)" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg notch={bite(5.2, 3.2, 3.4)} {...props}>
      <path d="M5.2 3.2L21 12L5.2 20.8Z" />
    </Svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Svg notch={bite(19.4, 4, 3.4)} {...props}>
      <path d="M4.6 4H10V20H4.6Z M14 4H19.4V20H14Z" />
    </Svg>
  );
}

export function IconRewind(props: IconProps) {
  return (
    <Svg notch={bite(21.2, 4.4, 3.4)} {...props}>
      <path d="M11 4.4L2.6 12L11 19.6Z M21.2 4.4L12.8 12L21.2 19.6Z" />
    </Svg>
  );
}

export function IconStep(props: IconProps) {
  return (
    <Svg notch={bite(21, 4.4, 3)} {...props}>
      <path d="M3 4.4L14 12L3 19.6Z" />
      <path className={TONE} d="M16 4.4H21V19.6H16Z" />
    </Svg>
  );
}

const SPEAKER = "M2.8 8.6H7L13 3.8V20.2L7 15.4H2.8Z";
const SPEAKER_BITE = bite(13.2, 3.4, 3);

export function IconSpeaker(props: IconProps) {
  return (
    <Svg notch={SPEAKER_BITE} {...props}>
      <path d={SPEAKER} />
      <path className={TONE_SOLID} d="M16.6 7.71A5.6 5.6 0 0 1 16.6 16.29L15.31 14.76A3.6 3.6 0 0 0 15.31 9.24Z M19.04 4.8A9.4 9.4 0 0 1 19.04 19.2L17.76 17.67A7.4 7.4 0 0 0 17.76 6.33Z" />
    </Svg>
  );
}

export function IconSpeakerOff(props: IconProps) {
  return (
    <Svg notch={SPEAKER_BITE} {...props}>
      <path d={SPEAKER} />
      <g className={TONE}>
        <rect x={15.2} y={10.9} width={7.6} height={2.2} rx={1.1} transform="rotate(45 19 12)" />
        <rect x={15.2} y={10.9} width={7.6} height={2.2} rx={1.1} transform="rotate(-45 19 12)" />
      </g>
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg notch={bite(19.8, 4.2, 3)} {...props}>
      <rect x={2.8} y={10} width={18.4} height={4} rx={2} transform="rotate(45 12 12)" />
      <rect x={2.8} y={10} width={18.4} height={4} rx={2} transform="rotate(-45 12 12)" />
    </Svg>
  );
}

/** The "wrong" mark: the same cross as Close, named for what it means. */
export const IconCross = IconClose;

export function IconCheck(props: IconProps) {
  return (
    <Svg notch={bite(21.4, 3.4, 3.6)} {...props}>
      <path d="M2.8 12.6L6 9.4L9.4 12.8L18 4.2L21.2 7.4L9.4 19.2Z" />
    </Svg>
  );
}

export function IconFlask(props: IconProps) {
  return (
    <Svg notch={bite(18, 12.6, 2.6)} {...props}>
      <path d="M8.2 2.6H15.8V5H14.8V9.2L20.4 17.8C21.3 19.3 20.3 21.4 18.5 21.4H5.5C3.7 21.4 2.7 19.3 3.6 17.8L9.2 9.2V5H8.2Z" />
      <path className={TONE} d="M5.3 15.4H18.7L20.4 17.8C21.3 19.3 20.3 21.4 18.5 21.4H5.5C3.7 21.4 2.7 19.3 3.6 17.8Z" />
    </Svg>
  );
}

export function IconBolt(props: IconProps) {
  return (
    <Svg notch={bite(20, 9.6, 2.6)} {...props}>
      <path d="M14.2 2.2L4.4 13.8H11.2L9.6 21.8L19.8 9.8H13Z" />
    </Svg>
  );
}

export function IconRobot(props: IconProps) {
  return (
    <Svg notch={bite(20.4, 7.2, 3)} {...props}>
      <path {...HOLE} d={`M6.6 7.4H17.4A2.8 2.8 0 0 1 20.2 10.2V17.4A2.8 2.8 0 0 1 17.4 20.2H6.6A2.8 2.8 0 0 1 3.8 17.4V10.2A2.8 2.8 0 0 1 6.6 7.4Z${circle(9.2, 13.6, 1.7)}${circle(14.8, 13.6, 1.7)}`} />
      <path d="M11.3 4.4H12.7V7H11.3Z M1.8 11.6H3V15.6H1.8Z M21 11.6H22.2V15.6H21Z" />
      <path className={TONE} d={circle(12, 3.4, 1.3)} />
    </Svg>
  );
}

/** The experiment map: a route from a start dot to a pin. */
export function IconMap(props: IconProps) {
  return (
    <Svg {...props}>
      <path fill="none" strokeWidth={2.6} d="M5.2 18.8C10 18.8 9.6 15.4 15.6 15.6" />
      <path d={circle(5.2, 18.8, 2.4)} />
      <path {...HOLE} className={TONE_SOLID} d={`M16.5 16.4C14 13.4 11.6 11 11.6 7.8A4.9 4.9 0 0 1 21.4 7.8C21.4 11 19 13.4 16.5 16.4Z${circle(16.5, 7.8, 1.8)}`} />
    </Svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <Svg notch={bite(21.6, 4.8, 3)} {...props}>
      <path d="M2.6 5.4C5.6 4.2 8.6 4.4 11 6.2V20.2C8.6 18.6 5.6 18.4 2.6 19.4Z" />
      <path className={TONE} d="M21.4 5.4C18.4 4.2 15.4 4.4 13 6.2V20.2C15.4 18.6 18.4 18.4 21.4 19.4Z" />
    </Svg>
  );
}

export function IconHint(props: IconProps) {
  return (
    <Svg notch={bite(17.6, 4.4, 2.8)} {...props}>
      <path d="M8.7 14.92A6.6 6.6 0 1 1 15.3 14.92L14.8 17H9.2Z" />
      <path className={TONE} d="M9.4 18.6H14.6V19.6A2 2 0 0 1 12.6 21.6H11.4A2 2 0 0 1 9.4 19.6Z" />
    </Svg>
  );
}

/** A gear with a round hole, built from its teeth so the grid stays exact. */
function gear(teeth: number, outer: number, inner: number, hole: number) {
  const step = (Math.PI * 2) / teeth;
  const p = (r: number, a: number) => `${Math.round((12 + r * Math.cos(a)) * 100) / 100} ${Math.round((12 + r * Math.sin(a)) * 100) / 100}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    d += `${i ? "L" : "M"}${p(inner, a - step * 0.3)}L${p(outer, a - step * 0.16)}L${p(outer, a + step * 0.16)}L${p(inner, a + step * 0.3)}`;
  }
  return `${d}Z${circle(12, 12, hole)}`;
}
const GEAR = gear(7, 9.4, 7, 3.4);

export function IconSettings(props: IconProps) {
  return (
    <Svg notch={bite(20.4, 3.6, 3.8)} {...props}>
      <path fillRule="evenodd" d={GEAR} />
    </Svg>
  );
}

export function IconRestart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.4A8.4 8.4 0 1 1 4.1 9.93L7.49 11.16A4.8 4.8 0 1 0 12 8Z" />
      <path d="M12.4 1.8V10.6L6.6 6.2Z" />
    </Svg>
  );
}

export function IconZoom(props: IconProps) {
  return (
    <Svg notch={bite(16.2, 3.4, 3)} {...props}>
      <path {...HOLE} d={`${circle(10.2, 10.2, 7.6)}${circle(10.2, 10.2, 4.2)}`} />
      <path className={TONE} d="M15.4 17.9L17.9 15.4L21.4 18.9A1.77 1.77 0 0 1 18.9 21.4Z" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg notch={bite(21.4, 4, 2.6)} {...props}>
      <path d="M3 4.4H21V7.2H3Z M3 16.8H21V19.6H3Z" />
      <path className={TONE} d="M3 10.6H14.6V13.4H3Z" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg notch={bite(20.2, 10, 2.8)} {...props}>
      <path d="M7 10.6V9A5 5 0 0 1 17 9V10.6H14.4V9A2.4 2.4 0 0 0 9.6 9V10.6Z" />
      <path {...HOLE} d={`M5.8 10.2H18.2A1.8 1.8 0 0 1 20 12V19.6A1.8 1.8 0 0 1 18.2 21.4H5.8A1.8 1.8 0 0 1 4 19.6V12A1.8 1.8 0 0 1 5.8 10.2Z${circle(12, 15.6, 1.9)}`} />
    </Svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.6 11.2L12 3L21.4 11.2V21H15.2V16.2A3.2 3.2 0 0 0 8.8 16.2V21H2.6Z" />
    </Svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <Svg notch={bite(19.2, 4.8, 4)} {...props}>
      <path {...HOLE} d={`${circle(12, 12, 9.4)}${circle(12, 12, 6)}`} />
      <path className={TONE} d={circle(12, 12, 2.4)} />
    </Svg>
  );
}

export function IconScan(props: IconProps) {
  return (
    <Svg notch={bite(21.6, 2.4, 3.6)} {...props}>
      <path d="M3 3H9.4V6.2H6.2V9.4H3Z M21 3H14.6V6.2H17.8V9.4H21Z M21 21H14.6V17.8H17.8V14.6H21Z M3 21H9.4V17.8H6.2V14.6H3Z" />
      <path className={TONE} d={circle(12, 12, 2.6)} />
    </Svg>
  );
}

/** Reset the 3D view: a cube of three faces with open seams, its top in the second tone. */
export function IconCube(props: IconProps) {
  return (
    <Svg notch={bite(21, 7.4, 2.6)} {...props}>
      <path stroke="none" d="M3 8.2L11.3 12.6V22L3 17.6Z M21 8.2L12.7 12.6V22L21 17.6Z" />
      <path className={TONE_SOLID} d="M12 2L20.2 6.4L12 10.8L3.8 6.4Z" />
    </Svg>
  );
}

export function IconBreak(props: IconProps) {
  return (
    <Svg notch={bite(20.6, 2.6, 3.2)} {...props}>
      <path d="M4.4 2.8H11.8L9.4 9L13 12.6L10.2 21.2H4.4Z" />
      <path className={TONE} transform="translate(0.6 -0.5)" d="M14.4 2.8H19.6V21.2H12.8L15.6 12.6L12 9Z" />
    </Svg>
  );
}

export function IconBlocks(props: IconProps) {
  return (
    <Svg notch={bite(16.8, 2.6, 2.6)} {...props}>
      <path d="M2.8 12.6H10.8V20.6H2.8Z M13.2 12.6H21.2V20.6H13.2Z" />
      <path className={TONE} transform="rotate(8 12 6.6)" d="M8 2.6H16V10.6H8Z" />
    </Svg>
  );
}

export function IconMolecule(props: IconProps) {
  return (
    <Svg notch={bite(15.8, 8.4, 2.8)} {...props}>
      <path fill="none" strokeWidth={2.2} d="M12 12L5.8 6.2M12 12L18.6 7.2M12 12L16.8 18.6" />
      <path d={circle(12, 12, 4.4)} />
      <path className={TONE} d={`${circle(5.6, 5.8, 2.3)}${circle(18.6, 7, 2.2)}${circle(17, 18.8, 2)}`} />
    </Svg>
  );
}

export function IconAsk(props: IconProps) {
  return (
    <Svg notch={bite(21.6, 2.8, 3)} {...props}>
      <path {...HOLE} d={`M5 2.8H19A2.6 2.6 0 0 1 21.6 5.4V14.4A2.6 2.6 0 0 1 19 17H12.4L7.6 20.8C7 21.3 6.4 21 6.4 20.3V17H5A2.6 2.6 0 0 1 2.4 14.4V5.4A2.6 2.6 0 0 1 5 2.8Z${circle(7.8, 10, 1.45)}${circle(12, 10, 1.45)}${circle(16.2, 10, 1.45)}`} />
    </Svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 2.4H6V21.6H4Z" />
      <path className={TONE} d="M7.2 3.6H20.4L17 8.6L20.4 13.6H7.2Z" />
    </Svg>
  );
}

export function IconLevels(props: IconProps) {
  return (
    <Svg notch={bite(21.6, 4.4, 3)} {...props}>
      <path d="M2.6 21V15.4H8V10H13.4V4.6H21.4V21Z" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg notch={bite(20.4, 5, 2.8)} {...props}>
      <path {...HOLE} d={`M12 2.2L20.2 5.4V11.4C20.2 16.2 16.8 20.2 12 21.8C7.2 20.2 3.8 16.2 3.8 11.4V5.4Z M10.8 6.6H13.2V13H10.8Z${circle(12, 16.2, 1.4)}`} />
    </Svg>
  );
}
