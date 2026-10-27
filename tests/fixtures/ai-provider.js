// Test-only Google/OpenAI transport. Never loaded during normal application startup.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const parsed = new URL(String(url)),
    google = parsed.hostname === "generativelanguage.googleapis.com";
  if (!google && String(url) !== "https://api.openai.com/v1/chat/completions")
    return realFetch(url, options);
  if (
    google &&
    options.headers["x-goog-api-key"] !== "test-only-fake-google-key"
  )
    throw Error("Wrong Google credentials");
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  if (google && parsed.pathname === "/v1beta/models")
    return json({
      models: [
        {
          name: "models/gemini-test-current",
          displayName: "Test current text model",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/gemini-test-alternate",
          displayName: "Test alternative text model",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/gemini-test-image",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/embedding-test",
          supportedGenerationMethods: ["embedContent"],
        },
      ],
    });
  const request = JSON.parse(options.body);
  if (
    google &&
    parsed.pathname === "/v1beta/models/gemini-2.5-flash-lite:generateContent"
  )
    return json({ error: { code: 404, status: "NOT_FOUND" } }, 404);
  if (
    google &&
    ![
      "/v1beta/models/gemini-test-current:generateContent",
      "/v1beta/models/gemini-test-alternate:generateContent",
    ].includes(parsed.pathname)
  )
    throw Error("Unexpected Google model");
  if (!google && options.headers.Authorization !== "Bearer test-only-fake-key")
    throw Error("Wrong OpenAI credentials");
  if (
    google
      ? request.generationConfig?.responseMimeType !== "application/json"
      : request.response_format?.type !== "json_object"
  )
    throw Error("JSON output format required");
  const payload = JSON.parse(
    google ? request.contents[0].parts[0].text : request.messages[1].content,
  );
  if (JSON.stringify(payload.answers).includes("QUOTA_FIXTURE"))
    return json({ error: { message: "Quota exceeded" } }, 429);
  if (
    !payload.questions.every(
      (q) => typeof q.correctAnswer === "string" && q.correctAnswer,
    )
  )
    throw Error("Missing reference answer");
  if (JSON.stringify(payload.answers).includes("DELAY_FIXTURE"))
    await new Promise((resolve) => setTimeout(resolve, 500));
  const invalid = JSON.stringify(payload.answers).includes("INVALID_FIXTURE");
  const scores = payload.questions.map((q) => ({
    id: q.id,
    score: invalid ? 999 : q.points,
    reason: "Fixture: criteriu demonstrat prin răspuns.",
  }));
  return json(
    google
      ? {
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ scores }) }] } },
          ],
        }
      : { choices: [{ message: { content: JSON.stringify({ scores }) } }] },
  );
};
