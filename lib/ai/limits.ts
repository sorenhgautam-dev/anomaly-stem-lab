import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/*
 * Server-side limits and answer caches for the AI routes (CLAUDE.md §10.1).
 * The counter on the Ask Ano button is only for display; these are the real
 * limits. Upstash Redis when its keys are set (shared across server
 * instances), otherwise this server's memory, with the same budgets.
 */

export interface Budget {
  /** Key prefix, e.g. "ask:sid". */
  name: string;
  limit: number;
  windowSeconds: number;
}

export const ASK_BUDGETS = {
  /** About 5 questions per session (CLAUDE.md §7.3). */
  session: { name: "ask:sid", limit: 5, windowSeconds: 6 * 3600 },
  ip: { name: "ask:ip", limit: 20, windowSeconds: 3600 },
  /** Below the provider's free daily quota. */
  global: { name: "ask:day", limit: env.ASK_ANO_DAILY_CAP, windowSeconds: 86_400 },
} satisfies Record<string, Budget>;

export const VOICE_BUDGETS = {
  session: { name: "voice:sid", limit: 20, windowSeconds: 6 * 3600 },
  ip: { name: "voice:ip", limit: 60, windowSeconds: 3600 },
  global: { name: "voice:day", limit: 300, windowSeconds: 86_400 },
} satisfies Record<string, Budget>;

export interface LimitStore {
  /** Count one use; ok is false once the budget is spent. */
  take(budget: Budget, key: string): Promise<{ ok: boolean; remaining: number }>;
  /** Uses left, without counting one. */
  remaining(budget: Budget, key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

/** Fixed windows and a small LRU cache in memory. Bounded, so it can't grow without limit. */
export function memoryStore(now: () => number = Date.now): LimitStore {
  const windows = new Map<string, { count: number; resetAt: number }>();
  const cache = new Map<string, { value: string; expiresAt: number }>();
  const MAX_KEYS = 10_000;
  const MAX_CACHE = 500;

  const windowFor = (budget: Budget, key: string) => {
    const id = `${budget.name}:${key}`;
    const t = now();
    let w = windows.get(id);
    if (!w || w.resetAt <= t) {
      w = { count: 0, resetAt: t + budget.windowSeconds * 1000 };
      windows.delete(id);
      windows.set(id, w);
      if (windows.size > MAX_KEYS) windows.delete(windows.keys().next().value as string);
    }
    return w;
  };

  return {
    async take(budget, key) {
      const w = windowFor(budget, key);
      if (w.count >= budget.limit) return { ok: false, remaining: 0 };
      w.count++;
      return { ok: true, remaining: budget.limit - w.count };
    },
    async remaining(budget, key) {
      return Math.max(0, budget.limit - windowFor(budget, key).count);
    },
    async get(key) {
      const hit = cache.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= now()) {
        cache.delete(key);
        return null;
      }
      cache.delete(key);
      cache.set(key, hit);
      return hit.value;
    },
    async set(key, value, ttlSeconds) {
      cache.delete(key);
      cache.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
      if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
    },
  };
}

function upstashStore(redis: Redis): LimitStore {
  const limiters = new Map<string, Ratelimit>();
  const limiter = (budget: Budget) => {
    let l = limiters.get(budget.name);
    if (!l) {
      l = new Ratelimit({ redis, prefix: `anomaly:${budget.name}`, limiter: Ratelimit.fixedWindow(budget.limit, `${budget.windowSeconds} s`) });
      limiters.set(budget.name, l);
    }
    return l;
  };
  return {
    async take(budget, key) {
      const r = await limiter(budget).limit(key);
      return { ok: r.success, remaining: Math.max(0, r.remaining) };
    },
    async remaining(budget, key) {
      const r = await limiter(budget).getRemaining(key);
      return Math.max(0, r.remaining);
    },
    async get(key) {
      return (await redis.get<string>(`anomaly:cache:${key}`)) ?? null;
    },
    async set(key, value, ttlSeconds) {
      await redis.set(`anomaly:cache:${key}`, value, { ex: ttlSeconds });
    },
  };
}

let shared: LimitStore | null = null;

/** The store every AI route uses. */
export function limits(): LimitStore {
  if (!shared) {
    shared =
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? upstashStore(new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }))
        : memoryStore();
  }
  return shared;
}
