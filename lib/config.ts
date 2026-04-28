/**
 * Centralized runtime config with startup validation.
 * Import this instead of process.env directly so missing vars fail fast
 * with a clear error rather than a cryptic runtime crash.
 */

function get(key: string): string | undefined {
  return process.env[key] || undefined;
}

function require_(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required environment variable: ${key}`);
  return v;
}

export const config = {
  // ── LLM (one of these must be set) ────────────────────────────────────────
  anthropicApiKey: get("ANTHROPIC_API_KEY"),
  ollamaUrl: get("OLLAMA_URL"),
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2",

  // ── Job APIs (all optional — free sources still work without any) ──────────
  adzunaAppId: get("ADZUNA_APP_ID"),
  adzunaAppKey: get("ADZUNA_APP_KEY"),
  adzunaCountry: process.env.ADZUNA_COUNTRY ?? "us",
  rapidApiKey: get("RAPIDAPI_KEY"),

  // ── Derived flags ─────────────────────────────────────────────────────────
  get useOllama() {
    return !!this.ollamaUrl;
  },
  get hasLlm() {
    return !!(this.ollamaUrl || this.anthropicApiKey);
  },
  get hasAdzuna() {
    return !!(this.adzunaAppId && this.adzunaAppKey);
  },
  get hasJSearch() {
    return !!this.rapidApiKey;
  },
} as const;

// Warn at server startup if no LLM is configured
if (typeof window === "undefined" && !config.hasLlm) {
  console.warn(
    "\n⚠️  No LLM configured.\n" +
      "   Set ANTHROPIC_API_KEY=sk-ant-... (paid)\n" +
      "   or OLLAMA_URL=http://localhost:11434 (free, local)\n" +
      "   in .env.local and restart the server.\n"
  );
}

/** Throws at runtime if no LLM is configured — call this inside API routes. */
export function assertLlm(): void {
  if (!config.hasLlm) {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or OLLAMA_URL in .env.local."
    );
  }
}
