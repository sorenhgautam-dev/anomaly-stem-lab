import { z } from "zod";
import citationsJson from "@/content/citations.json";

/*
 * Every fact ANOMALY states about cancer comes from one of four trusted
 * sources (CLAUDE.md §4), confirmed by opening the page and recorded in
 * content/citations.json with the exact sentence that supports it. Content
 * names the citation ids behind its facts; lib/content.ts fails the build if
 * one is missing, so no claim ships without its source.
 */

export const TRUSTED = {
  "World Health Organization": "who.int",
  "National Cancer Institute": "cancer.gov",
  "Cancer Research UK": "cancerresearchuk.org",
  "American Cancer Society": "cancer.org",
} as const;

export type SourceName = keyof typeof TRUSTED;

const citationSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    claim: z.string().min(1),
    source: z.enum(Object.keys(TRUSTED) as [SourceName, ...SourceName[]]),
    url: z.url(),
    quote: z.string().min(10),
    checked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    usedIn: z.array(z.string()),
  })
  .superRefine((c, ctx) => {
    const host = new URL(c.url).hostname.replace(/^www\./, "");
    const want = TRUSTED[c.source];
    if (host !== want && !host.endsWith(`.${want}`)) ctx.addIssue({ code: "custom", message: `${c.id}: ${c.url} isn't on ${want}` });
  });

export type Citation = z.infer<typeof citationSchema>;

export const CITATIONS: Citation[] = z
  .array(citationSchema)
  .superRefine((all, ctx) => {
    const seen = new Set<string>();
    for (const c of all) {
      if (seen.has(c.id)) ctx.addIssue({ code: "custom", message: `duplicate citation id ${c.id}` });
      seen.add(c.id);
    }
  })
  .parse(citationsJson);

const BY_ID = new Map(CITATIONS.map((c) => [c.id, c]));

export function citation(id: string): Citation | undefined {
  return BY_ID.get(id);
}

/** Throws (failing the build) when content names a citation that isn't recorded. */
export function assertCited(owner: string, ids: readonly string[] | undefined): void {
  for (const id of ids ?? []) {
    if (!BY_ID.has(id)) throw new Error(`${owner} cites "${id}", which isn't in content/citations.json`);
  }
}

/** The citations behind a list of ids, in order, without repeats. */
export function citationsFor(ids: readonly string[]): Citation[] {
  return [...new Set(ids)].map((id) => BY_ID.get(id)).filter((c): c is Citation => !!c);
}
