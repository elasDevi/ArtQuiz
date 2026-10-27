import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listGeminiModels,
  geminiRequest,
  geminiText,
  GeminiError,
} from "../gemini.js";
test("Gemini discovers paginated text models without putting credentials in the URL", async () => {
  const urls = [];
  const models = await listGeminiModels(
    "private-test-key",
    async (url, options) => {
      assert.equal(options.headers["x-goog-api-key"], "private-test-key");
      assert.ok(!url.includes("private-test-key"));
      urls.push(url);
      const page = new URL(url).searchParams.get("pageToken");
      return new Response(
        JSON.stringify(
          page
            ? {
                models: [
                  {
                    name: "models/gemini-text-b",
                    displayName: "B",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/gemini-text-a",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/test-tts",
                    supportedGenerationMethods: ["generateContent"],
                  },
                ],
              }
            : {
                models: [
                  {
                    name: "models/gemini-text-a",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/embed-a",
                    supportedGenerationMethods: ["embedContent"],
                  },
                ],
                nextPageToken: "next-page",
              },
        ),
        { headers: { "content-type": "application/json" } },
      );
    },
  );
  assert.deepEqual(
    models.map((m) => m.id),
    ["gemini-text-a", "gemini-text-b"],
  );
  assert.equal(urls.length, 2);
  assert.equal(new URL(urls[1]).searchParams.get("pageToken"), "next-page");
});
test("Gemini native requests preserve grading data, protect endpoint paths, and skip reasoning parts", () => {
  const { url, options } = geminiRequest(
    { model: "models/gemini-text-a", key: "private-test-key" },
    "Grade using the rubric",
    { answers: { 1: { artist: "Velázquez" } } },
  );
  assert.equal(
    url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-text-a:generateContent",
  );
  assert.ok(!url.includes("private-test-key"));
  assert.equal(options.headers["x-goog-api-key"], "private-test-key");
  const body = JSON.parse(options.body);
  assert.equal(body.systemInstruction.parts[0].text, "Grade using the rubric");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(
    JSON.parse(body.contents[0].parts[0].text).answers[1].artist,
    "Velázquez",
  );
  assert.throws(() => geminiRequest({ model: "../evil", key: "key" }, "", {}));
  assert.equal(
    geminiText({
      candidates: [
        {
          content: {
            parts: [
              { thought: true, text: "internal reasoning" },
              { text: '{"scores":' },
              { text: "[]}" },
            ],
          },
        },
      ],
    }),
    '{"scores":[]}',
  );
  assert.throws(() => geminiText({ candidates: [] }));
});
test("Gemini discovery preserves an authentication or quota status without echoing provider error content", async () => {
  for (const status of [403, 429])
    await assert.rejects(
      listGeminiModels(
        "secret-test-key",
        async () =>
          new Response(
            JSON.stringify({ error: { message: "secret-test-key" } }),
            { status },
          ),
      ),
      (error) =>
        error instanceof GeminiError &&
        error.status === status &&
        !error.message.includes("secret-test-key"),
    );
});
