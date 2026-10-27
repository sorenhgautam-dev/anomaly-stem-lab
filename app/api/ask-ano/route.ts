import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askAno } from "@/lib/ai/askAno";
import { askerFor, withSession } from "@/lib/ai/asker";

/*
 * Ask Ano's route (CLAUDE.md §7.3, §7.5). It only validates the small request
 * body and hands it to lib/ai/askAno.ts, the one module for this job. Every
 * reply is 200 with something Ano can say: an answer, a cached answer, or the
 * next written hint (over a limit, no key, or a failed call).
 */

const body = z.object({
  experimentId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  experimentTitle: z.string().min(1).max(80),
  level: z.enum(["easy", "medium", "advanced"]),
  faultCode: z.string().max(64).nullable(),
  verdict: z.enum(["correct", "wrong"]).nullable(),
  focus: z.string().regex(/^[a-z0-9-]{1,64}$/).nullable(),
  hintStep: z.number().int().min(0).max(3),
  readings: z
    .record(z.string().regex(/^[a-zA-Z0-9.-]{1,40}$/), z.number().finite())
    .refine((r) => Object.keys(r).length <= 16, "too many readings"),
  question: z.string().trim().min(2).max(300),
});

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const who = askerFor(request);
  const reply = await askAno(parsed.data, who);
  return withSession(NextResponse.json(reply), who);
}
