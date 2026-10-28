import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/*
 * "Guess with the room" (CLAUDE.md §D): a host opens a room for one
 * experiment and gets a 4-letter code; phones join with it and tap one
 * guess each; the host reveals, and every phone shows what the simulator
 * says really happens. A room keeps only the experiment id, its phase and
 * a count per option, for three hours. Voters are random tokens made by
 * their browser, so nobody can vote twice and nothing personal is stored.
 *
 * Upstash Redis when its keys are set (shared by every server instance);
 * otherwise this server's memory, which only works on a single server
 * (local `next start`), so on Vercel without Redis live mode is off.
 */

export type Phase = "guessing" | "revealed";

export interface Room {
  experimentId: string;
  phase: Phase;
  /** Guesses per option, in the experiment's option order. */
  counts: number[];
}

export interface LiveStore {
  create(experimentId: string, options: number): Promise<{ code: string; hostKey: string }>;
  read(code: string): Promise<Room | null>;
  /** Count one guess; false if the room is gone, revealed, or this voter already guessed. */
  vote(code: string, option: number, voter: string): Promise<boolean>;
  reveal(code: string, hostKey: string): Promise<boolean>;
}

export const TTL_SECONDS = 3 * 3600;
/** Letters that can't be misread (no I, O). */
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE = /^[A-HJ-NP-Z]{4}$/;

export function newCode(pick: (n: number) => number = randomInt): string {
  return Array.from({ length: 4 }, () => LETTERS[pick(LETTERS.length)]).join("");
}

interface Meta {
  experimentId: string;
  phase: Phase;
  hostKey: string;
  options: number;
}

/** This server's memory: rooms expire after TTL_SECONDS; bounded so it can't grow without limit. */
export function memoryLive(now: () => number = Date.now): LiveStore {
  const rooms = new Map<string, Meta & { counts: number[]; voters: Set<string>; expiresAt: number }>();
  const MAX_ROOMS = 500;
  const live = (code: string) => {
    const room = rooms.get(code);
    if (room && room.expiresAt <= now()) rooms.delete(code);
    return rooms.get(code) ?? null;
  };
  return {
    async create(experimentId, options) {
      let code = newCode();
      while (live(code)) code = newCode();
      const hostKey = randomUUID();
      rooms.set(code, { experimentId, phase: "guessing", hostKey, options, counts: Array(options).fill(0), voters: new Set(), expiresAt: now() + TTL_SECONDS * 1000 });
      if (rooms.size > MAX_ROOMS) rooms.delete(rooms.keys().next().value as string);
      return { code, hostKey };
    },
    async read(code) {
      const room = live(code);
      return room ? { experimentId: room.experimentId, phase: room.phase, counts: [...room.counts] } : null;
    },
    async vote(code, option, voter) {
      const room = live(code);
      if (!room || room.phase !== "guessing" || option < 0 || option >= room.options || room.voters.has(voter)) return false;
      room.voters.add(voter);
      room.counts[option]++;
      return true;
    },
    async reveal(code, hostKey) {
      const room = live(code);
      if (!room || room.hostKey !== hostKey) return false;
      room.phase = "revealed";
      return true;
    },
  };
}

/** Upstash Redis: one JSON meta key, one hash of counts and one set of voter tokens per room. */
export function redisLive(r: Redis): LiveStore {
  const key = (code: string, part = "") => `anomaly:live:${code}${part}`;
  const meta = async (code: string) => (await r.get<Meta>(key(code))) ?? null;
  return {
    async create(experimentId, options) {
      for (;;) {
        const code = newCode();
        const hostKey = randomUUID();
        const ok = await r.set(key(code), { experimentId, phase: "guessing", hostKey, options } satisfies Meta, { nx: true, ex: TTL_SECONDS });
        if (ok) return { code, hostKey };
      }
    },
    async read(code) {
      const m = await meta(code);
      if (!m) return null;
      const votes = (await r.hgetall<Record<string, number>>(key(code, ":votes"))) ?? {};
      return { experimentId: m.experimentId, phase: m.phase, counts: Array.from({ length: m.options }, (_, i) => Number(votes[i] ?? 0)) };
    },
    async vote(code, option, voter) {
      const m = await meta(code);
      if (!m || m.phase !== "guessing" || option < 0 || option >= m.options) return false;
      const fresh = await r.sadd(key(code, ":voters"), voter);
      if (!fresh) return false;
      await r.hincrby(key(code, ":votes"), String(option), 1);
      await Promise.all([r.expire(key(code, ":voters"), TTL_SECONDS), r.expire(key(code, ":votes"), TTL_SECONDS)]);
      return true;
    },
    async reveal(code, hostKey) {
      const m = await meta(code);
      if (!m || m.hostKey !== hostKey) return false;
      await r.set(key(code), { ...m, phase: "revealed" }, { keepTtl: true });
      return true;
    },
  };
}

let store: LiveStore | null | undefined;

/**
 * Whether live mode can work here: Redis is set, or this is one local server.
 * Pages ask this to hide "Guess together" and show a kind note on /join and
 * /teacher instead of a room that can never open (Vercel without Redis).
 */
export function liveAvailable(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) || !process.env.VERCEL;
}

/** The live store, or null when live mode can't work here (Vercel without Redis). */
export function liveStore(): LiveStore | null {
  if (store === undefined) {
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) store = redisLive(new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }));
    else store = liveAvailable() ? memoryLive() : null;
  }
  return store;
}
