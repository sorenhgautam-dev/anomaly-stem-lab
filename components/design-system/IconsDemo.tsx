import * as Icons from "@/components/icons/icons";
import { Section } from "./Section";

/* Our own icon set (DESIGN.md §5.1), in one tone and with the apricot second tone. */

const SET = Object.entries(Icons).filter(([name]) => name.startsWith("Icon") && name !== "IconCross");

export function IconsDemo() {
  return (
    <Section id="icons" title="Icons" note="Solid shapes with one round bite, drawn on a 24 px grid in components/icons. Shown at 16 and 24 px, with the apricot second tone and on ink.">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
        {SET.map(([name, Icon]) => (
          <li key={name} className="flex flex-col items-center gap-3 rounded-tile border-[1.5px] border-ink-900/10 bg-white px-3 py-4 text-ink-900">
            <span className="flex items-center gap-3">
              <Icon className="size-4" />
              <Icon className="size-6" />
              <Icon className="size-6 [--icon-tone:var(--color-apricot-500)]" />
              <span className="grid size-9 place-items-center rounded-full bg-ink-900 text-white">
                <Icon className="size-[18px]" />
              </span>
            </span>
            <span className="text-[12px] text-ink-500">{name.slice(4)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
