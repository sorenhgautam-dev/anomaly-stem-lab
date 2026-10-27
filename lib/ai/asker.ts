import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Asker } from "./askAno";

/*
 * Who is calling an AI route, for the limits: an anonymous random session
 * cookie and a one-way hash of the IP. No accounts, nothing personal stored
 * (CLAUDE.md §2 rule 9).
 */

const COOKIE = "ano_sid";

export function askerFor(request: NextRequest): Asker {
  const sid = request.cookies.get(COOKIE)?.value ?? randomUUID();
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const ip = createHash("sha256").update(`anomaly|${raw}`).digest("hex").slice(0, 32);
  return { sid, ip };
}

export function withSession<T extends NextResponse>(res: T, who: Asker): T {
  res.cookies.set({ name: COOKIE, value: who.sid, httpOnly: true, sameSite: "lax", path: "/", maxAge: 6 * 3600 });
  return res;
}
