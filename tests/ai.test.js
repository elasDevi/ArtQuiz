import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("AI provider contract: proposals are unvalidated, invalid ranges rejected, validated results protected", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prado-ai-")),
    port = 3700 + Math.floor(Math.random() * 300);
  const child = spawn(
    process.execPath,
    ["--import", "./tests/fixtures/ai-provider.js", "server.js"],
    {
      env: {
        ...process.env,
        PORT: String(port),
        DATA_DIR: dir,
        ADMIN_PASSWORD: "AI-test-password-2026!",
        AI_API_KEY: "test-only-fake-key",
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
    await req("/api/admin/login", "POST", {
      password: "AI-test-password-2026!",
    });
    const c = (await req("/api/admin")).content;
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
    assert.ok(
      !(await (await fetch(`http://127.0.0.1:${port}/app.js`)).text()).includes(
        "test-only-fake-key",
      ),
    );
  } finally {
    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
    rmSync(dir, { recursive: true, force: true });
  }
});
