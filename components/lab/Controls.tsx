"use client";

import { cn } from "@/lib/cn";
import { useLab } from "@/lib/store";

/*
 * The "one thing to change" for chemistry and robot experiments: sliders,
 * toggles and choices bound to the build's settings.
 */
export function Controls() {
  const def = useLab((s) => s.def);
  const build = useLab((s) => s.build);
  const edit = useLab((s) => s.edit);
  const phase = useLab((s) => s.phase);
  if (!def?.controls?.length || !build) return null;
  const disabled = phase === "running";

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      {def.controls.map((control) => {
        const value = build.settings[control.id];
        if (control.type === "slider") {
          const v = typeof value === "number" ? value : control.initial;
          return (
            <label key={control.id} className="flex min-w-48 flex-col gap-2">
              <span className="flex items-baseline justify-between gap-4">
                <span className="type-label text-pearl/55">{control.label}</span>
                <span className="font-mono text-sm text-pearl">
                  {v} {control.unit}
                </span>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={v}
                disabled={disabled}
                onChange={(e) => edit({ op: "set", setting: control.id, value: Number(e.target.value) })}
                className="h-1 cursor-pointer appearance-none rounded-full bg-pearl/15 accent-lilac disabled:opacity-40"
              />
            </label>
          );
        }
        if (control.type === "toggle") {
          const on = value === true;
          return (
            <div key={control.id} className="flex flex-col gap-2" role="group" aria-label={control.label}>
              <span className="type-label text-pearl/55">{control.label}</span>
              <div className="flex gap-1 rounded-full bg-pearl/8 p-1">
                {[
                  { v: false, label: control.offLabel },
                  { v: true, label: control.onLabel },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on === o.v}
                    onClick={() => edit({ op: "set", setting: control.id, value: o.v })}
                    className={cn(
                      "rounded-full px-4 py-2 text-[14px] transition-colors duration-200 ease-lab",
                      on === o.v ? "bg-pearl text-void" : "text-pearl/70 hover:text-pearl",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={control.id} className="flex flex-col gap-2" role="group" aria-label={control.label}>
            <span className="type-label text-pearl/55">{control.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {control.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={value === o.value}
                  onClick={() => edit({ op: "set", setting: control.id, value: o.value })}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[14px] transition-colors duration-200 ease-lab",
                    value === o.value ? "bg-pearl text-void" : "glass text-pearl/80 hover:bg-pearl/12",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
