import { test } from "node:test";
import assert from "node:assert/strict";
import { getAIConfig } from "../ai-config.js";
test("Gemini selection is explicit or inferred, credentials stay with their provider, models can be configured", () => {
  assert.equal(getAIConfig({}).provider, "openai");
  const gemini = getAIConfig({
    GEMINI_API_KEY: "google-test-key",
    AI_API_KEY: "openai-test-key",
  });
  assert.equal(gemini.provider, "gemini");
  assert.equal(gemini.key, "google-test-key");
  assert.equal(
    new URL(gemini.endpoint).host,
    "generativelanguage.googleapis.com",
  );
  const openai = getAIConfig({
    AI_PROVIDER: "openai",
    GEMINI_API_KEY: "google-test-key",
  });
  assert.equal(openai.provider, "openai");
  assert.equal(openai.key, undefined);
  const missing = getAIConfig({
    AI_PROVIDER: "gemini",
    AI_API_KEY: "openai-test-key",
  });
  assert.equal(missing.key, undefined);
  assert.equal(missing.keyName, "GEMINI_API_KEY");
  assert.equal(
    getAIConfig({ AI_PROVIDER: "gemini", GEMINI_MODEL: "custom-text-model" })
      .model,
    "custom-text-model",
  );
  assert.equal(getAIConfig({ AI_PROVIDER: "unsupported" }).supported, false);
});
