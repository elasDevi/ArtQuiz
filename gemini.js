// Native Gemini API. Credentials travel in a header, never in URLs or client responses.
export const modelId = (value) =>
  typeof value === "string" ? value.replace(/^models\//, "") : "";
export const validModelId = (value) =>
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value);
export class GeminiError extends Error {
  constructor(status) {
    super(`Gemini HTTP ${status}`);
    this.status = status;
  }
}
export async function listGeminiModels(key, fetcher = fetch) {
  const models = new Map();
  let token = "";
  for (let page = 0; page < 10; page++) {
    const url = new URL(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
    url.searchParams.set("pageSize", "100");
    if (token) url.searchParams.set("pageToken", token);
    const response = await fetcher(url.toString(), {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new GeminiError(response.status);
    const body = await response.json();
    for (const model of body.models || []) {
      const id = modelId(model.name);
      if (
        validModelId(id) &&
        id.startsWith("gemini-") &&
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent") &&
        !/(embedding|tts|image|audio|veo|imagen|robotic|deep-research)/i.test(
          id,
        )
      )
        models.set(id, {
          id,
          name: typeof model.displayName === "string" ? model.displayName : id,
        });
    }
    token = body.nextPageToken;
    if (!token)
      return [...models.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  throw Error(
    "Google a returnat prea multe pagini de modele. Încearcă din nou.",
  );
}
export function geminiRequest(ai, system, payload) {
  const id = modelId(ai.model);
  if (!validModelId(id))
    throw Error("Selectează un model Gemini valid din configurare.");
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`,
    options: {
      method: "POST",
      signal: AbortSignal.timeout(90000),
      headers: { "x-goog-api-key": ai.key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          { role: "user", parts: [{ text: JSON.stringify(payload) }] },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 16384,
        },
      }),
    },
  };
}
export function geminiText(body) {
  const parts = body.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts))
    throw Error("Gemini nu a returnat o evaluare text.");
  return parts
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}
