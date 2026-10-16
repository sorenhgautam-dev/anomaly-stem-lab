import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, type LanguageModel } from "ai";

/*
 * Every free AI provider we can use for Ask Ano, tried in order. A provider is
 * only used when its key is set in .env.local; keys never leave the server.
 * Groq first (fast), Gemini second (CLAUDE.md §7.3), then any extra free
 * providers the team has keys for. Models are overridable because free-tier
 * model names change often.
 */

interface Provider {
  id: string;
  model: () => LanguageModel;
  /** Extra provider options (Gemini safety settings). */
  options?: Parameters<typeof generateText>[0]["providerOptions"];
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

const GEMINI_SAFETY = {
  google: {
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  },
};

/** The providers that have keys, in fallback order. */
export function availableProviders(): Provider[] {
  const providers: Provider[] = [];

  const groqKey = env("GROQ_API_KEY");
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    providers.push({ id: "groq", model: () => groq(env("GROQ_MODEL") ?? "llama-3.3-70b-versatile") });
  }

  const geminiKey = env("GOOGLE_GENERATIVE_AI_API_KEY");
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    providers.push({
      id: "gemini",
      model: () => google(env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite"),
      options: GEMINI_SAFETY,
    });
  }

  const cerebrasKey = env("CEREBRAS_API_KEY");
  if (cerebrasKey) {
    const cerebras = createOpenAICompatible({
      name: "cerebras",
      baseURL: "https://api.cerebras.ai/v1",
      apiKey: cerebrasKey,
    });
    providers.push({ id: "cerebras", model: () => cerebras.chatModel(env("CEREBRAS_MODEL") ?? "gpt-oss-120b") });
  }

  const mistralKey = env("MISTRAL_API_KEY");
  if (mistralKey) {
    const mistral = createOpenAICompatible({
      name: "mistral",
      baseURL: "https://api.mistral.ai/v1",
      apiKey: mistralKey,
    });
    providers.push({ id: "mistral", model: () => mistral.chatModel(env("MISTRAL_MODEL") ?? "mistral-small-latest") });
  }

  // OpenRouter's free model ids rotate, so it's only used with an explicit model.
  const openRouterKey = env("OPENROUTER_API_KEY");
  const openRouterModel = env("OPENROUTER_MODEL");
  if (openRouterKey && openRouterModel) {
    const openRouter = createOpenAICompatible({
      name: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
    });
    providers.push({ id: "openrouter", model: () => openRouter.chatModel(openRouterModel) });
  }

  return providers;
}

/**
 * Ask each provider in turn until one answers. Returns null when none is
 * configured or all of them fail; the caller then shows a written hint.
 */
export async function askProviders(
  system: string,
  prompt: string,
): Promise<{ text: string; provider: string } | null> {
  for (const provider of availableProviders()) {
    try {
      const { text } = await generateText({
        model: provider.model(),
        system,
        prompt,
        maxOutputTokens: 400,
        temperature: 0.4,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(9000),
        providerOptions: provider.options,
      });
      const trimmed = text.trim();
      if (trimmed) return { text: trimmed, provider: provider.id };
    } catch {
      // Try the next provider. Errors aren't logged: they can echo the question.
    }
  }
  return null;
}
