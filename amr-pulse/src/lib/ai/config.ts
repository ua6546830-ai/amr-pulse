export type AiProvider = "openai-compatible" | "anthropic" | "none";

export interface AiConfig {
  configured: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  apiKey: string;
  maxRequestsPerHour: number;
  reason: string | null;
}

const DEFAULT_BASE_URLS: Record<Exclude<AiProvider, "none">, string> = {
  "openai-compatible": "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
};

function parseProvider(raw: string | undefined): AiProvider {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "anthropic") return "anthropic";
  if (value === "openai" || value === "openai-compatible" || value === "compatible") return "openai-compatible";
  return "none";
}

export function getAiConfig(): AiConfig {
  const provider = parseProvider(process.env.AI_PROVIDER);
  const apiKey = (process.env.AI_API_KEY ?? "").trim();
  const model = (process.env.AI_MODEL ?? "").trim();
  const rawBase = (process.env.AI_BASE_URL ?? "").trim();
  const parsedRate = Number.parseInt(process.env.AI_REQUESTS_PER_HOUR ?? "30", 10);

  let reason: string | null = null;
  if (provider === "none") reason = "AI_PROVIDER is not set to a supported value (openai-compatible or anthropic).";
  else if (!apiKey) reason = "AI_API_KEY is not set.";
  else if (!model) reason = "AI_MODEL is not set.";

  return {
    configured: reason === null,
    provider,
    model,
    baseUrl: (rawBase || (provider === "none" ? "" : DEFAULT_BASE_URLS[provider])).replace(/\/$/, ""),
    apiKey,
    maxRequestsPerHour: Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 30,
    reason,
  };
}

export function isAiConfigured(): boolean {
  return getAiConfig().configured;
}

export function aiStatusForUi() {
  const config = getAiConfig();
  return {
    configured: config.configured,
    provider: config.provider,
    model: config.model,
    reason: config.reason,
  };
}
