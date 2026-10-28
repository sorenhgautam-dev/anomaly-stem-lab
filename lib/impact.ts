import "server-only";
import { Redis } from "@upstash/redis";
import { getExperiment } from "@/lib/content";
import { env } from "@/lib/env";
import { limits, type Budget } from "@/lib/ai/limits";

/*
 * The live impact counter: how many tricky ideas students have busted, across
 * everyone. One Upstash Redis number, only ever raised by a real bust (a
 * correct run after a diagnosed wrong one). It is never seeded, never
 * estimated and never kept in memory: without Redis there is no number to
 * show, and the landing page says so kindly. Nothing personal is stored.
 */

const KEY = "anomaly:impact:busted";

/**
 * One browser can bust each idea once, so a day's honest maximum is the size
 * of the catalogue. Per hashed IP, so a classroom on one network still fits.
 */
export const IMPACT_BUDGET: Budget = { name: "impact:ip", limit: 120, windowSeconds: 86_400 };

let redis: Redis | null | undefined;

function client(): Redis | null {
  if (redis === undefined) {
    redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }) : null;
  }
  return redis;
}

export interface ImpactStore {
  read(): Promise<number | null>;
  add(): Promise<number | null>;
}

/** Redis when it's set up, else a store that always answers "no number". */
export function impactStore(r: Redis | null = client()): ImpactStore {
  return {
    async read() {
      if (!r) return null;
      try {
        const n = await r.get<number | string>(KEY);
        const value = Number(n ?? 0);
        return Number.isFinite(value) && value >= 0 ? value : null;
      } catch {
        return null;
      }
    },
    async add() {
      if (!r) return null;
      try {
        return await r.incr(KEY);
      } catch {
        return null;
      }
    },
  };
}

/** A bust is only counted for an idea the experiment can really diagnose. */
export function isRealBust(experimentId: string, misconceptionId: string): boolean {
  return getExperiment(experimentId)?.misconceptions.includes(misconceptionId) ?? false;
}

export async function countBust(experimentId: string, misconceptionId: string, ip: string, store: ImpactStore = impactStore()): Promise<number | null> {
  if (!isRealBust(experimentId, misconceptionId)) return store.read();
  const take = await limits().take(IMPACT_BUDGET, ip);
  if (!take.ok) return store.read();
  return store.add();
}
