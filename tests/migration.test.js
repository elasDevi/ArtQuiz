import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { initialContent } from "../content.js";
import { createHash } from "node:crypto";
test("Existing databases migrate without losing answers, scores, password or duplicate historical group entries", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prado-migration-")),
    port = 4100 + Math.floor(Math.random() * 100);
  const content = structuredClone(initialContent);
  delete content.bonusPoints;
  content.groups = ["Grupa veche"];
  content.questions.forEach((q) => delete q.correctAnswer);
  content.questions[0].points += 10;
  content.questions[0].rubric = "Barem personalizat păstrat";
  const scores = content.questions.map((q) => ({
    id: q.id,
    score: q.points,
    reason: "Validat anterior",
  }));
  const old = new DatabaseSync(path.join(dir, "prado.sqlite"));
  old.exec(
    "CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE entries(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,group_name TEXT NOT NULL,answers TEXT NOT NULL DEFAULT '{}',submitted_at TEXT,scores TEXT,validated INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0);",
  );
  old
    .prepare("INSERT INTO settings VALUES(?,?)")
    .run("content", JSON.stringify(content));
  old.prepare("INSERT INTO settings VALUES(?,?)").run("open", "true");
  for (const id of ["old1", "old2"])
    old
      .prepare(
        "INSERT INTO entries(id,code,group_name,answers,submitted_at,scores,validated) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        id,
        createHash("sha256")
          .update(id === "old1" ? "OLD-TEAM-ONE" : "OLD-TEAM-TWO")
          .digest("hex"),
        "Grupa veche",
        JSON.stringify({ 1: { artist: "Răspuns vechi" } }),
        "2026-10-26",
        JSON.stringify(scores),
        1,
      );
  old.close();
  const child = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      DATA_DIR: dir,
      PORT: String(port),
      ADMIN_PASSWORD: "Migration-test-password!",
      AI_API_KEY: "",
    },
    stdio: "pipe",
  });
  try {
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (s) => {
        if (s.toString().includes("listening")) resolve();
      });
      child.once("exit", (c) => reject(Error("Server exit " + c)));
      setTimeout(() => reject(Error("Timeout")), 5000).unref();
    });
    let cookie = "",
      csrf = "";
    async function req(url, method = "GET", body) {
      const r = await fetch(`http://127.0.0.1:${port}${url}`, {
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
      assert.equal(r.status, 200, await r.clone().text());
      const d = await r.json();
      if (d.csrf) csrf = d.csrf;
      return d;
    }
    await req("/api/session");
    await req("/api/admin/login", "POST", {
      username: "profesor",
      password: "Migration-test-password!",
    });
    const d = await req("/api/admin");
    assert.equal(d.entries.length, 2);
    assert.equal(d.content.bonusPoints, 0);
    assert.equal(d.content.questions[0].rubric, "Barem personalizat păstrat");
    assert.ok(d.content.questions.every((q) => q.correctAnswer));
    assert.equal(d.entries[0].validated, 1);
    assert.deepEqual(d.entries[0].scores, scores);
    assert.equal(d.ranking[0].total, 100);
    const resumed = await req("/api/join", "POST", {
      mode: "resume",
      group: "Grupa veche",
      code: "OLD-TEAM-TWO",
    });
    assert.equal(resumed.id, "old2");
    assert.equal(resumed.answers[1].artist, "Răspuns vechi");
  } finally {
    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
    rmSync(dir, { recursive: true, force: true });
  }
});
