import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askerFor } from "@/lib/ai/asker";
import { limits } from "@/lib/ai/limits";
import { CODE, liveStore } from "@/lib/live";

/*
 * One room (lib/live.ts). GET reads it: { experimentId, phase, counts }.
 * POST either counts one guess ({ vote, voter }) or, with the host's key,
 * reveals the answer to every phone ({ reveal }). No personal data: the
 * voter is a random token made by the phone's browser.
 */

const NO_STORE = { "cache-control": "no-store" };
const action = z.union([
  z.object({ vote: z.number().int().min(0).max(9), voter: z.string().regex(/^[a-zA-Z0-9-]{8,64}$/) }),
  z.object({ reveal: z.string().min(8).max(64) }),
]);
const VOTE_BUDGET = { name: "live:vote", limit: 600, windowSeconds: 3600 };

async function room(params: Promise<{ code: string }>) {
  const code = (await params).code.toUpperCase();
  return CODE.test(code) ? code : null;
}

export async function GET(_: NextRequest, { params }: RouteContext<"/api/live/[code]">) {
  const store = liveStore();
  const code = await room(params);
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  const found = code ? await store.read(code).catch(() => null) : null;
  if (!found) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });
  return NextResponse.json(found, { headers: NO_STORE });
}

export async function POST(request: NextRequest, { params }: RouteContext<"/api/live/[code]">) {
  const store = liveStore();
  const code = await room(params);
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const parsed = action.safeParse(await request.json().catch(() => null));
  if (!code || !parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    if ("reveal" in parsed.data) return NextResponse.json({ ok: await store.reveal(code, parsed.data.reveal) }, { headers: NO_STORE });
    const take = await limits().take(VOTE_BUDGET, askerFor(request).ip);
    if (!take.ok) return NextResponse.json({ error: "busy" }, { status: 429 });
    return NextResponse.json({ ok: await store.vote(code, parsed.data.vote, parsed.data.voter) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
