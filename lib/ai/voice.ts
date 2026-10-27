import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { limits, VOICE_BUDGETS, type LimitStore } from "./limits";
import type { Asker } from "./askAno";

/*
 * Ano's voice for Ask Ano answers (CLAUDE.md §7.4): one provider, ElevenLabs,
 * behind the same limits and cache as Ask Ano. Audio is cached by its text, so
 * a repeated answer is free. Null means "use the browser's speechSynthesis":
 * no key, a limit, a timeout or any provider error. Voice output only; the
 * microphone is never touched.
 */

const CACHE_SECONDS = 30 * 86_400;
export const MAX_VOICE_CHARS = 600;

export type Synthesize = (text: string) => Promise<ArrayBuffer | null>;

/** The ElevenLabs text-to-speech call, or null when ELEVENLABS_API_KEY isn't set. */
function elevenLabs(): Synthesize | null {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  return async (text) => {
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;
      return await res.arrayBuffer();
    } catch {
      return null;
    }
  };
}

export async function anoVoice(
  text: string,
  who: Asker,
  deps: { store: LimitStore; synthesize: Synthesize | null } = { store: limits(), synthesize: elevenLabs() },
): Promise<Uint8Array | null> {
  const { store, synthesize } = deps;
  const key = `voice:${createHash("sha256").update(`${env.ELEVENLABS_VOICE_ID}|${text}`).digest("hex")}`;
  const cached = await store.get(key);
  if (cached) return Uint8Array.from(Buffer.from(cached, "base64"));
  if (!synthesize) return null;

  for (const budget of [VOICE_BUDGETS.session, VOICE_BUDGETS.ip, VOICE_BUDGETS.global]) {
    const id = budget === VOICE_BUDGETS.session ? who.sid : budget === VOICE_BUDGETS.ip ? who.ip : "all";
    if (!(await store.take(budget, id)).ok) return null;
  }
  const audio = await synthesize(text);
  if (!audio || audio.byteLength === 0) return null;
  const bytes = new Uint8Array(audio);
  await store.set(key, Buffer.from(bytes).toString("base64"), CACHE_SECONDS);
  return bytes;
}
