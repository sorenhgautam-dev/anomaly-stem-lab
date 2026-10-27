import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { askerFor, withSession } from "@/lib/ai/asker";
import { anoVoice, MAX_VOICE_CHARS } from "@/lib/ai/voice";

/*
 * Ano's voice for Ask Ano answers (CLAUDE.md §7.4). Returns MP3 audio, or
 * { fallback: "speech" } so the browser speaks the line itself. Never an
 * error the student can see.
 */

const body = z.object({ text: z.string().trim().min(1).max(MAX_VOICE_CHARS) });

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const who = askerFor(request);
  const audio = await anoVoice(parsed.data.text, who);
  if (!audio) return withSession(NextResponse.json({ fallback: "speech" }), who);
  return withSession(
    new NextResponse(new Blob([audio as BlobPart], { type: "audio/mpeg" }), {
      headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=86400" },
    }),
    who,
  );
}
