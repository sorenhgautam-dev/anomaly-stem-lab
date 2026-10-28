import type { Simulate } from "../types";
import { choiceSetting, makeTimeline, RUN_SECONDS } from "../chemistry/common";

/*
 * Stage "cells": normal cells and cells out of control (experiments "Cells
 * out of control" and "Can you catch it?", CLAUDE.md §3.3). A teaching model.
 *
 * Normal cells divide while there's room and stop once the dish is full (they
 * listen to the stop signal). Cancer cells ignore it and keep dividing,
 * piling up. In the contact test a dish of a second person's normal cells
 * touches the cancer dish: nothing passes across, because cancer starts from
 * changes inside a body's own cells and isn't caught.
 *
 * Settings: `scene` ("fill" or "contact"), `dish` ("small" or "big"),
 *   `signal` ("on" or "off": the normal cells' stop signal, for What if?),
 *   `touch` ("short" or "long" contact).
 * Readings:
 *   normal.room        cells the normal dish holds in one layer
 *   normal.end         normal cells at the end
 *   normal.afterFull   cells the normal dish added after it was full
 *   normal.lost        cells the normal dish lost from its fullest
 *   cancer.count       cancer cells at the end
 *   spread.early, spread.end   cancer cells that crossed into the other dish
 * Timeline values: normal, cancer, spread (cells), full (1 once the normal
 *   dish is full), touching (1 while the dishes touch).
 *
 * Wrong models:
 *   cells-never-stop               normal cells keep dividing and pile up
 *   cancer-is-contagious           cancer cells cross over at once, like a cold
 *   cancer-spreads-on-long-contact cells cross over only after a long touch
 */

type Belief = "real" | "cells-never-stop" | "cancer-is-contagious" | "cancer-spreads-on-long-contact";

const ROOM = { small: 60, big: 140 } as const;
const START = 4;
/** Doublings per display second while there's room. */
const RATE = 0.8;

function cellsModel(belief: Belief): Simulate {
  return (def, build) => {
    const scene = choiceSetting(def, build, "scene", ["fill", "contact"], "fill");
    const room = ROOM[choiceSetting(def, build, "dish", ["small", "big"], "small") as keyof typeof ROOM];
    const signalOn = choiceSetting(def, build, "signal", ["on", "off"], "on") === "on";
    const longTouch = choiceSetting(def, build, "touch", ["short", "long"], "short") === "long";
    const listens = signalOn && belief !== "cells-never-stop";

    // Normal cells double while there's room, then stop sharply once the dish is full (a soft minimum of
    // doubling and the room) when they listen to the stop signal; unchecked, they keep doubling.
    const normalAt = (t: number) => {
      const free = START * 2 ** (RATE * t);
      return listens ? free / (1 + (free / room) ** 4) ** 0.25 : free;
    };
    // Cancer cells never listen: they keep doubling and pile up.
    const cancerAt = (t: number) => START * 2 ** (RATE * t);
    const touchFrom = scene === "contact" ? 2 : Infinity;
    const touchTo = scene === "contact" ? (longTouch ? RUN_SECONDS : 6) : Infinity;
    const spreadAt = (t: number) => {
      if (scene !== "contact" || t < touchFrom) return 0;
      const touched = Math.min(t, touchTo) - touchFrom;
      if (belief === "cancer-is-contagious") return Math.round(6 * touched);
      if (belief === "cancer-spreads-on-long-contact") return touched > 5 ? Math.round(3 * (touched - 5)) : 0;
      return 0;
    };
    const fullAt = (() => {
      for (let t = 0; t <= RUN_SECONDS; t += 0.05) if (normalAt(t) >= room * 0.97) return t;
      return Infinity;
    })();
    const timeline = makeTimeline((t) => ({
      normal: normalAt(t),
      cancer: cancerAt(t),
      spread: spreadAt(t),
      full: t >= fullAt ? 1 : 0,
      touching: t >= touchFrom && t < touchTo ? 1 : 0,
    }));
    const peak = Math.max(...timeline.map((f) => f.values.normal));
    const end = normalAt(RUN_SECONDS);
    return {
      readings: {
        "normal.room": room,
        "normal.end": end,
        "normal.afterFull": fullAt === Infinity ? 0 : end - normalAt(fullAt),
        "normal.lost": peak - end,
        "cancer.count": cancerAt(RUN_SECONDS),
        "spread.early": spreadAt(Math.min(RUN_SECONDS, touchFrom + 2)),
        "spread.end": spreadAt(RUN_SECONDS),
      },
      faults: [],
      timeline,
    };
  };
}

export const simulateCells: Simulate = cellsModel("real");

export const cellsWrongModels: Record<string, Simulate> = {
  "cells-never-stop": cellsModel("cells-never-stop"),
  "cancer-is-contagious": cellsModel("cancer-is-contagious"),
  "cancer-spreads-on-long-contact": cellsModel("cancer-spreads-on-long-contact"),
};
