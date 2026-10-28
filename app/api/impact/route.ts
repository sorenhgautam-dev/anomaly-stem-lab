import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askerFor } from "@/lib/ai/asker";
import { countBust, impactStore } from "@/lib/impact";

/*
 * The live count of busted ideas (lib/impact.ts). GET reads it, POST adds one
 * real bust. Both always answer 200 with { count }, where count is null when
 * the counter can't be reached: the page then shows its friendly fallback.
 */

const body = z.object({
  experimentId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  misconceptionId: z.string().regex(/^[a-z0-9-]{1,64}$/),
});

// The CDN may share a read for half a minute: the number stays real, just not to the second.
const SHARED = { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" };

export async function GET() {
  return NextResponse.json({ count: await impactStore().read() }, { headers: SHARED });
}

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const count = await countBust(parsed.data.experimentId, parsed.data.misconceptionId, askerFor(request).ip);
  return NextResponse.json({ count }, { headers: { "cache-control": "no-store" } });
}
