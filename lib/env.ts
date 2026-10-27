import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/*
 * Every server secret, validated once at startup (instrumentation.ts) before
 * any request is served (CLAUDE.md §7.5, §10.1). Values are never logged.
 * Reading one of these in the browser throws (t3-env), so keys can't leak
 * into a client bundle.
 *
 *  - A malformed key always stops the server.
 *  - A missing key turns off just its job, which then uses its written
 *    fallback (hints, browser speech). Set ANOMALY_REQUIRE_KEYS=1 on the demo
 *    deployment and a missing key stops the server too.
 */

const strict = process.env.ANOMALY_REQUIRE_KEYS === "1";

/** Required in strict mode, optional otherwise. */
function key<T extends z.ZodType>(schema: T) {
  return strict ? schema : schema.optional();
}

export const env = createEnv({
  server: {
    // Ask Ano answers (lib/ai/askAno.ts).
    GROQ_API_KEY: key(z.string().regex(/^gsk_\w{20,}$/, "should start with gsk_")),
    GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
    // Ano's voice (lib/ai/voice.ts).
    ELEVENLABS_API_KEY: key(z.string().min(20)),
    ELEVENLABS_VOICE_ID: z.string().regex(/^\w{16,32}$/).default("21m00Tcm4TlvDq8ikWAM"),
    ELEVENLABS_MODEL: z.string().min(1).default("eleven_flash_v2_5"),
    // Shared rate limits and caches (lib/ai/limits.ts). Without them the
    // limits live in this server's memory.
    UPSTASH_REDIS_REST_URL: key(z.url()),
    UPSTASH_REDIS_REST_TOKEN: key(z.string().min(20)),
    // Eval grading only (tests/ask-ano.eval.ts), never at runtime.
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().regex(/^AIza[\w-]{30,}$/, "should start with AIza").optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
    // Proposed jobs, not wired up yet (GAUNTLET_LOG.md "AI jobs"): checked so
    // a pasted key with the wrong shape is caught early.
    CEREBRAS_API_KEY: z.string().regex(/^csk-\w{20,}$/, "should start with csk-").optional(),
    MISTRAL_API_KEY: z.string().min(20).optional(),
    OPENROUTER_API_KEY: z.string().regex(/^sk-or-/, "should start with sk-or-").optional(),
    // Ask Ano's global daily cap, kept below the provider's free quota.
    ASK_ANO_DAILY_CAP: z.coerce.number().int().min(0).max(100_000).default(300),
  },
  client: {},
  runtimeEnv: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    ELEVENLABS_MODEL: process.env.ELEVENLABS_MODEL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ASK_ANO_DAILY_CAP: process.env.ASK_ANO_DAILY_CAP,
  },
  emptyStringAsUndefined: true,
});

/** Names (never values) of the keys whose jobs are switched off. */
export function missingKeys(): string[] {
  const jobs: [string, unknown][] = [
    ["GROQ_API_KEY", env.GROQ_API_KEY],
    ["ELEVENLABS_API_KEY", env.ELEVENLABS_API_KEY],
    ["UPSTASH_REDIS_REST_URL", env.UPSTASH_REDIS_REST_URL],
    ["UPSTASH_REDIS_REST_TOKEN", env.UPSTASH_REDIS_REST_TOKEN],
  ];
  return jobs.filter(([, value]) => !value).map(([name]) => name);
}
