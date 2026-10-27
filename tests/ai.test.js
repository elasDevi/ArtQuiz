import { availablePort } from "./ports.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
for (const provider of ["openai", "gemini"]) {
  test(`${provider} provider: configured rubric, partial answers, conflicts and quota protection`, async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "prado-ai-")),
      port = await availablePort();
    const child = spawn(
      process.execPath,
      ["--import", "./tests/fixtures/ai-provider.js", "server.js"],
      {
        env: {
          ...process.env,
          PORT: String(port),
          DATA_DIR: dir,
          ADMIN_PASSWORD: "AI-test-password-2026!",
          AI_PROVIDER: provider,
          AI_API_KEY: provider === "openai" ? "test-only-fake-key" : "",
          GEMINI_API_KEY:
            provider === "gemini" ? "test-only-fake-google-key" : "",
          AI_MODEL: "gpt-4.1-mini",
          GEMINI_MODEL: "gemini-2.5-flash-lite",
        },
        stdio: "pipe",
      },
    );
    try {
      await new Promise((resolve, reject) => {
        child.stdout.on("data", (s) => {
          if (s.toString().includes("listening")) resolve();
        });
        child.on("exit", (c) => reject(Error("Server exit " + c)));
        setTimeout(() => reject(Error("Timeout")), 5000).unref();
      });
      let cookie = "",
        csrf = "";
      async function req(url, method = "GET", body, expected = 200) {
        const r = await fetch(`http://127.0.0.1:${port}` + url, {
          method,
          headers: {
            cookie,
            "x-csrf-token": csrf,
            "content-type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (r.headers.get("set-cookie"))
          cookie = r.headers.get("set-cookie").split(";")[0];
        const d = await r.json();
        assert.equal(r.status, expected, JSON.stringify(d));
        if (d.csrf) csrf = d.csrf;
        return d;
      }
      await req("/api/session");
      await req("/api/admin/ai/models", "GET", undefined, 401);
      await req("/api/admin/login", "POST", {
        username: "profesor",
        password: "AI-test-password-2026!",
      });
      const metadata = await req("/api/admin");
      assert.equal(metadata.aiProvider, provider);
      assert.equal(metadata.aiConfigured, true);
      assert.ok(!JSON.stringify(metadata).includes("test-only-fake"));
      const c = metadata.content;
      async function submit(code, text) {
        const e = await req("/api/join", "POST", {
          group: code,
          members: "Ana și Mihai",
          code,
        });
        const answers = Object.fromEntries(
          c.questions.map((q) => [
            q.id,
            {
              ...Object.fromEntries(q.fields.map((f) => [f.key, text])),
              ...(q.emotions ? { emotions: ["fear"] } : {}),
            },
          ]),
        );
        await req("/api/submit", "POST", { answers, revision: 0 });
        return e.id;
      }
      const id = await submit("AI-VALID-ENTRY", "Interpretare argumentată");
      if (provider === "gemini") {
        const unavailable = await req(
          `/api/admin/entries/${id}/ai`,
          "POST",
          {},
          502,
        );
        assert.match(unavailable.error, /Încarcă modele/);
        const listed = await req("/api/admin/ai/models");
        assert.equal(listed.freeTierVerified, false);
        assert.deepEqual(
          listed.models.map((m) => m.id),
          ["gemini-test-alternate", "gemini-test-current"],
        );
        await req(
          "/api/admin/ai/model",
          "PUT",
          { model: "gemini-unknown-model" },
          400,
        );
        await req("/api/admin/ai/model", "PUT", {
          model: "models/gemini-test-current",
        });
        assert.equal((await req("/api/admin")).aiModel, "gemini-test-current");
      }
      await req(`/api/admin/entries/${id}/ai`, "POST", {});
      const e = (await req("/api/admin")).entries.find((e) => e.id === id);
      assert.equal(e.validated, 0);
      assert.equal(
        e.scores.reduce((n, s) => n + s.score, 0),
        90,
      );
      assert.ok(e.scores.every((s) => s.reason));
      await req(`/api/admin/entries/${id}/scores`, "PUT", {
        scores: e.scores,
        validated: true,
        revision: e.revision,
      });
      await req(`/api/admin/entries/${id}/ai`, "POST", {}, 409);
      const bad = await submit("AI-INVALID-ENTRY", "INVALID_FIXTURE");
      await req(`/api/admin/entries/${bad}/ai`, "POST", {}, 502);
      assert.equal(
        (await req("/api/admin")).entries.find((e) => e.id === bad).scores,
        null,
      );
      // An in-flight AI result must not overwrite an updated rubric.
      const delayed = await submit("AI-DELAYED-ENTRY", "DELAY_FIXTURE");
      const pending = req(`/api/admin/entries/${delayed}/ai`, "POST", {}, 409);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const current = await req("/api/admin");
      await req("/api/admin/rubric", "PUT", {
        bonusPoints: current.content.bonusPoints + 1,
        revision: current.rubricRevision,
        questions: current.content.questions.map(
          ({ id, points, correctAnswer, rubric }) => ({
            id,
            points: id === 1 ? points - 1 : points,
            correctAnswer,
            rubric: rubric + " Actualizat.",
          }),
        ),
      });
      await pending;
      assert.equal(
        (await req("/api/admin")).entries.find((e) => e.id === delayed).scores,
        null,
      );
      await req(`/api/admin/entries/${delayed}/ai`, "POST", {});
      const reevaluated = (await req("/api/admin")).entries.find(
        (e) => e.id === delayed,
      );
      assert.equal(reevaluated.scores.find((s) => s.id === 1).score, 4);
      assert.equal(
        reevaluated.scores.reduce((n, s) => n + s.score, 0),
        89,
      );
      await req(`/api/admin/entries/${delayed}/scores`, "PUT", {
        scores: reevaluated.scores,
        validated: true,
        revision: reevaluated.revision,
      });
      assert.equal(
        (await req("/api/admin")).ranking.find(
          (r) => r.group === "AI-DELAYED-ENTRY",
        ).total,
        100,
      );
      const partial = await req("/api/join", "POST", {
        group: "Echipa cu răspunsuri lipsă",
        members: "Ana și Maria",
        code: "AI-PARTIAL-ENTRY",
      });
      await req("/api/submit", "POST", {
        answers: { 1: { artist: "Diego Velázquez" } },
        revision: 0,
      });
      await req(`/api/admin/entries/${partial.id}/ai`, "POST", {});
      const assessed = (await req("/api/admin")).entries.find(
        (e) => e.id === partial.id,
      );
      assert.equal(assessed.scores.find((s) => s.id === 1).score, 4);
      assert.ok(
        assessed.scores
          .filter((s) => s.id !== 1)
          .every((s) => s.score === 0 && s.reason.includes("necompletat")),
      );
      await req(`/api/admin/entries/${partial.id}/scores`, "PUT", {
        scores: assessed.scores,
        validated: true,
        revision: assessed.revision,
      });
      assert.equal(
        (await req("/api/admin")).ranking.find(
          (r) => r.group === "Echipa cu răspunsuri lipsă",
        ).total,
        15,
      );
      const quota = await submit("AI-QUOTA-ENTRY", "QUOTA_FIXTURE");
      const beforeQuota = (await req("/api/admin")).entries.find(
        (e) => e.id === quota,
      );
      const manualScores = c.questions.map((q) => ({
        id: q.id,
        score: 0,
        reason: "Evaluare manuală păstrată.",
      }));
      await req(`/api/admin/entries/${quota}/scores`, "PUT", {
        scores: manualScores,
        validated: false,
        revision: beforeQuota.revision,
      });
      const quotaResponse = await req(
        `/api/admin/entries/${quota}/ai`,
        "POST",
        {},
        429,
      );
      assert.match(quotaResponse.error, /cota/);
      assert.deepEqual(
        (await req("/api/admin")).entries.find((e) => e.id === quota).scores,
        manualScores,
      );
      if (provider === "gemini") {
        const before = (await req("/api/admin")).entries.map((e) => ({
          id: e.id,
          scores: e.scores,
          validated: e.validated,
        }));
        await req("/api/admin/ai/model", "PUT", {
          model: "gemini-test-alternate",
        });
        const after = await req("/api/admin");
        assert.equal(after.aiModel, "gemini-test-alternate");
        assert.deepEqual(
          after.entries.map((e) => ({
            id: e.id,
            scores: e.scores,
            validated: e.validated,
          })),
          before,
        );
      }
      assert.ok(
        !(
          await (await fetch(`http://127.0.0.1:${port}/app.js`)).text()
        ).includes("test-only-fake-key"),
      );
    } finally {
      await new Promise((resolve) => {
        child.once("exit", resolve);
        child.kill();
      });
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
