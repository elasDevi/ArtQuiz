// Test-only provider adapter, never loaded by the application in normal startup.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const gemini =
    url ===
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  if (!gemini && url !== "https://api.openai.com/v1/chat/completions")
    return realFetch(url, options);
  const request = JSON.parse(options.body),
    payload = JSON.parse(request.messages[1].content);
  if (
    options.headers.Authorization !==
    `Bearer ${gemini ? "test-only-fake-google-key" : "test-only-fake-key"}`
  )
    throw Error("Wrong provider credentials");
  if (request.model !== (gemini ? "gemini-2.5-flash-lite" : "gpt-4.1-mini"))
    throw Error("Wrong provider model");
  if (request.response_format?.type !== "json_object")
    throw Error("JSON output format required");
  if (JSON.stringify(payload.answers).includes("QUOTA_FIXTURE"))
    return new Response(
      JSON.stringify({ error: { message: "Quota exceeded" } }),
      { status: 429, headers: { "content-type": "application/json" } },
    );
  if (
    !payload.questions.every(
      (q) => typeof q.correctAnswer === "string" && q.correctAnswer,
    )
  )
    throw Error("Missing configured reference answer");
  if (JSON.stringify(payload.answers).includes("DELAY_FIXTURE"))
    await new Promise((resolve) => setTimeout(resolve, 500));
  const invalid = JSON.stringify(payload.answers).includes("INVALID_FIXTURE");
  const scores = payload.questions.map((q) => ({
    id: q.id,
    score: invalid ? 999 : q.points,
    reason: "Fixture: criteriu demonstrat prin răspuns.",
  }));
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ scores }) } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};
