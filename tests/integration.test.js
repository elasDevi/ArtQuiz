import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
const dir = mkdtempSync(path.join(tmpdir(), "prado-test-")),
  port = 3100 + Math.floor(Math.random() * 500),
  base = `http://127.0.0.1:${port}`;
let child;
function start() {
  child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dir,
      ADMIN_PASSWORD: "Test-password-2026!",
    },
    stdio: "pipe",
  });
  return new Promise((resolve, reject) => {
    child.stdout.on("data", (s) => {
      if (s.toString().includes("listening")) resolve();
    });
    child.stderr.on("data", (s) => console.error(s.toString()));
    child.on("exit", (code) => {
      if (code) reject(Error("Server exited " + code));
    });
    setTimeout(() => reject(Error("Startup timed out")), 5000).unref();
  });
}
async function stop() {
  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
  });
}
function client() {
  let cookie = "",
    csrf = "";
  return {
    async req(url, method = "GET", body, expected = 200) {
      const r = await fetch(base + url, {
        method,
        headers: {
          cookie,
          "content-type": "application/json",
          "x-csrf-token": csrf,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      assert.equal(r.status, expected, await r.clone().text());
      const data = await r.json();
      if (data.csrf) csrf = data.csrf;
      return data;
    },
    async binary(url) {
      const r = await fetch(base + url, { headers: { cookie } });
      assert.equal(r.status, 200);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}
before(start);
after(async () => {
  await stop();
  rmSync(dir, { recursive: true, force: true });
});
test("Full persistent contest lifecycle, authorization, concurrency, validation and exports", async () => {
  const student = client(),
    teacher = client(),
    stranger = client();
  await stranger.req("/api/admin", "GET", undefined, 401);
  await stranger.req(
    "/api/join",
    "POST",
    { group: "Grupa 1", code: "STOLEN" },
    403,
  );
  const publicData = await student.req("/api/content");
  assert.equal(publicData.content.questions.length, 12);
  assert.equal(
    publicData.content.questions.reduce((n, q) => n + q.points, 0),
    100,
  );
  assert.ok(publicData.content.questions.every((q) => !q.rubric));
  await student.req("/api/session");
  await teacher.req("/api/session");
  await teacher.req("/api/admin/login", "POST", { password: "wrong" }, 401);
  await teacher.req("/api/admin/login", "POST", {
    password: "Test-password-2026!",
  });
  const joined = await student.req("/api/join", "POST", {
    group: "Grupa 1",
    code: "TEST-UNIQUE-2026",
  });
  const draft = await teacher.req("/api/admin");
  assert.equal(draft.entries.length, 1);
  assert.equal(draft.entries[0].code, undefined);
  await student.req("/api/submit", "POST", { revision: 0 }, 400);
  const answers = Object.fromEntries(
    publicData.content.questions.map((q) => [
      q.id,
      {
        ...Object.fromEntries(
          q.fields.map((f) => [
            f.key,
            "Un răspuns argumentat / An argued answer",
          ]),
        ),
        ...(q.emotions ? { emotions: ["fear", "unease"] } : {}),
      },
    ]),
  );
  await student.req("/api/progress", "PUT", { answers, revision: 0 });
  await student.req("/api/progress", "PUT", { answers, revision: 0 }, 409);
  await stop();
  await start();
  const recovered = await student.req("/api/progress");
  assert.deepEqual(recovered.answers, answers);
  assert.equal(recovered.revision, 1);
  const resume = client();
  await resume.req("/api/session");
  assert.equal(
    (
      await resume.req("/api/join", "POST", {
        group: "Grupa 1",
        code: "test-unique-2026",
      })
    ).id,
    joined.id,
  );
  assert.equal((await teacher.req("/api/admin")).entries.length, 1);
  await student.req("/api/submit", "POST", { revision: 1 });
  await student.req("/api/submit", "POST", { revision: 1 }, 409);
  await student.req("/api/progress", "PUT", { answers, revision: 1 }, 409);
  await teacher.req("/api/admin/winner", "POST", { group: "Grupa 1" }, 409);
  await teacher.req(`/api/admin/entries/${joined.id}/ai`, "POST", {}, 503);
  const d = await teacher.req("/api/admin"),
    e = d.entries[0];
  const scores = d.content.questions.map((q) => ({
    id: q.id,
    score: q.points,
    reason: "Verificat pe baza baremului.",
  }));
  await teacher.req(
    `/api/admin/entries/${e.id}/scores`,
    "PUT",
    {
      scores: scores.map((s, i) => (i === 0 ? { ...s, score: 500 } : s)),
      validated: true,
      revision: e.revision,
    },
    400,
  );
  await teacher.req(`/api/admin/entries/${e.id}/scores`, "PUT", {
    scores,
    validated: true,
    revision: e.revision,
  });
  await teacher.req(
    `/api/admin/entries/${e.id}/scores`,
    "PUT",
    { scores, validated: true, revision: e.revision },
    409,
  );
  await teacher.req("/api/admin/contest", "POST", { open: false });
  await teacher.req("/api/admin/winner", "POST", { group: "Grupa 1" });
  const end = await teacher.req("/api/admin");
  assert.equal(end.winner.group, "Grupa 1");
  assert.equal(end.ranking[0].total, 100);
  const xlsx = await teacher.binary("/api/admin/export.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsx);
  assert.equal(wb.getWorksheet("Raspunsuri").rowCount, 2);
  assert.ok(wb.getWorksheet("Clasament"));
  const pdf = await teacher.binary("/api/admin/export.pdf");
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  const qr = await teacher.binary("/api/admin/qr");
  assert.equal(qr.subarray(1, 4).toString(), "PNG");
  const fresh = client();
  await fresh.req("/api/session");
  await fresh.req(
    "/api/join",
    "POST",
    { group: "Grupa 1", code: "NEW-CODE-1" },
    409,
  );
  assert.ok(end.audit.some((a) => a.action === "scores_validated"));
});
