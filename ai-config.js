// Server-only provider selection. Keys are never part of the public/admin metadata.
export function getAIConfig(env = process.env) {
  const provider = (
    env.AI_PROVIDER || (env.GEMINI_API_KEY ? "gemini" : "openai")
  )
    .trim()
    .toLowerCase();
  if (provider === "gemini")
    return {
      provider,
      label: "Google Gemini",
      key: env.GEMINI_API_KEY,
      keyName: "GEMINI_API_KEY",
      model: env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      supported: true,
    };
  if (provider === "openai")
    return {
      provider,
      label: "OpenAI",
      key: env.AI_API_KEY,
      keyName: "AI_API_KEY",
      model: env.AI_MODEL || "gpt-4.1-mini",
      endpoint: "https://api.openai.com/v1/chat/completions",
      supported: true,
    };
  return {
    provider,
    label: "AI",
    keyName: "AI_PROVIDER",
    model: "",
    supported: false,
  };
}
