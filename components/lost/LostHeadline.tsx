"use client";

import { HeadlineWithAno } from "@/components/explore/HeadlineWithAno";
import { useShrug } from "./ShruggingAno";

/*
 * The 404's headline (DESIGN.md §7.8): "LOST · IN SPACE." with Ano shrugging
 * in the gap and his bubble hanging from him.
 */
export function LostHeadline() {
  return <HeadlineWithAno left="Lost" right="in space." line="Hmm, this page isn’t on any of my maps. Maybe it floated off. Let’s head back to the lab." expression="curious" action={useShrug()} />;
}
