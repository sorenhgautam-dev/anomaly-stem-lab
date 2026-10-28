import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askerFor } from "@/lib/ai/asker";
import { limits } from "@/lib/ai/limits";
import { getExperiment } from "@/lib/content";
import { liveStore } from "@/lib/live";

/*
 * Open a "Guess with the room" room for one experiment (lib/live.ts). Answers
 * { code, hostKey }; the host keeps the key to reveal. 503 when live mode
 * can't run on this server, 429 when one network opens too many rooms.
 */

const body = z.object({ experimentId: z.string().regex(/^[a-z0-9-]{1,64}$/) });
const OPEN_BUDGET = { name: "live:open", limit: 30, windowSeconds: 3600 };

export async function POST(request: NextRequest) {
  const store = liveStore();
  if (!store) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  const def = parsed.success ? getExperiment(parsed.data.experimentId) : undefined;
  if (!def || def.prediction.type !== "choice") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const take = await limits().take(OPEN_BUDGET, askerFor(request).ip);
  if (!take.ok) return NextResponse.json({ error: "busy" }, { status: 429 });
  try {
    return NextResponse.json(await store.create(def.id, def.prediction.options.length), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
