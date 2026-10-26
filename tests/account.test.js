import { availablePort } from "./ports.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
test("Default profesor account, password updates, session revocation and restart persistence", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prado-account-")),
    port = await availablePort(),
    base = `http://127.0.0.1:${port}`;
  let child;
  async function start(password = "") {
    child = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        DATA_DIR: dir,
        ADMIN_PASSWORD: password,
        ADMIN_PASSWORD_HASH: "",
        AI_API_KEY: "",
      },
      stdio: "pipe",
    });
    await new Promise((resolve, reject) => {
      child.stdout.on("data", (s) => {
        if (s.toString().includes("listening")) resolve();
      });
      child.once("exit", (c) => reject(Error("Server exit " + c)));
      setTimeout(() => reject(Error("Timeout")), 5000).unref();
    });
  }
  const stop = () =>
    new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill();
    });
  function client() {
    let cookie = "",
      csrf = "";
    return {
      async req(url, method = "GET", body, status = 200) {
        const r = await fetch(base + url, {
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
        assert.equal(r.status, status, JSON.stringify(d));
        if (d.csrf) csrf = d.csrf;
        return d;
      },
    };
  }
  await start();
  try {
    const teacher = client(),
      other = client(),
      student = client();
    assert.equal((await teacher.req("/api/session")).needsSetup, false);
    await other.req("/api/session");
    await student.req("/api/session");
    await student.req("/api/join", "POST", {
      group: "Elevii cu sesiune păstrată",
      members: "Ana și Ion",
      code: "ACCOUNT-STUDENT-2026",
    });
    await student.req(
      "/api/admin/password",
      "POST",
      {
        currentPassword: "Madridtoledo2026",
        newPassword: "Never-write-this-value",
        confirmPassword: "Never-write-this-value",
      },
      401,
    );
    await teacher.req(
      "/api/admin/login",
      "POST",
      { username: "altprofesor", password: "Madridtoledo2026" },
      401,
    );
    await teacher.req(
      "/api/admin/login",
      "POST",
      { password: "Madridtoledo2026" },
      401,
    );
    await teacher.req("/api/admin/login", "POST", {
      username: "profesor",
      password: "Madridtoledo2026",
    });
    await other.req("/api/admin/login", "POST", {
      username: "profesor",
      password: "Madridtoledo2026",
    });
    assert.equal((await teacher.req("/api/admin")).usesDefaultPassword, true);
    const change = {
      currentPassword: "Madridtoledo2026",
      newPassword: "New-local-test-password-2026!",
      confirmPassword: "New-local-test-password-2026!",
    };
    await teacher.req(
      "/api/admin/password",
      "POST",
      { ...change, currentPassword: "wrong" },
      401,
    );
    await teacher.req(
      "/api/admin/password",
      "POST",
      { ...change, newPassword: "short", confirmPassword: "short" },
      400,
    );
    await teacher.req(
      "/api/admin/password",
      "POST",
      { ...change, confirmPassword: "Different-confirmation" },
      400,
    );
    await teacher.req(
      "/api/admin/password",
      "POST",
      {
        ...change,
        newPassword: "Madridtoledo2026",
        confirmPassword: "Madridtoledo2026",
      },
      400,
    );
    await teacher.req("/api/admin/password", "POST", change);
    assert.equal((await teacher.req("/api/admin")).usesDefaultPassword, false);
    await other.req("/api/admin", "GET", undefined, 401);
    assert.equal(
      (await student.req("/api/progress")).group,
      "Elevii cu sesiune păstrată",
    );
    const db = new DatabaseSync(path.join(dir, "prado.sqlite"));
    const hash = JSON.parse(
      db.prepare("SELECT value FROM settings WHERE key='adminHash'").get()
        .value,
    );
    assert.match(hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    assert.ok(
      !JSON.stringify(db.prepare("SELECT * FROM audit").all()).includes(
        change.newPassword,
      ),
    );
    db.close();
    await stop();
    await start("A-different-bootstrap-password!");
    const fresh = client();
    await fresh.req("/api/session");
    await fresh.req(
      "/api/admin/login",
      "POST",
      { username: "profesor", password: "Madridtoledo2026" },
      401,
    );
    await fresh.req(
      "/api/admin/login",
      "POST",
      { username: "profesor", password: "A-different-bootstrap-password!" },
      401,
    );
    await fresh.req("/api/admin/login", "POST", {
      username: "profesor",
      password: change.newPassword,
    });
    assert.equal((await fresh.req("/api/admin")).username, "profesor");
    await stop();
    const beforeDB = new DatabaseSync(path.join(dir, "prado.sqlite"));
    const preserved = {
      entries: beforeDB.prepare("SELECT * FROM entries ORDER BY id").all(),
      content: beforeDB
        .prepare("SELECT value FROM settings WHERE key='content'")
        .get(),
    };
    beforeDB.close();
    const reset = spawnSync(process.execPath, ["reset-admin.js"], {
      env: { ...process.env, DATA_DIR: dir },
      encoding: "utf8",
    });
    assert.equal(reset.status, 0, reset.stderr);
    const afterDB = new DatabaseSync(path.join(dir, "prado.sqlite"));
    assert.deepEqual(
      afterDB.prepare("SELECT * FROM entries ORDER BY id").all(),
      preserved.entries,
    );
    assert.deepEqual(
      afterDB.prepare("SELECT value FROM settings WHERE key='content'").get(),
      preserved.content,
    );
    afterDB.close();
    await start("A-different-bootstrap-password!");
    const recovered = client();
    await recovered.req("/api/session");
    await recovered.req(
      "/api/admin/login",
      "POST",
      { username: "profesor", password: change.newPassword },
      401,
    );
    await recovered.req("/api/admin/login", "POST", {
      username: "profesor",
      password: "Madridtoledo2026",
    });
    assert.equal((await recovered.req("/api/admin")).usesDefaultPassword, true);
    assert.equal(
      (await student.req("/api/progress")).group,
      "Elevii cu sesiune păstrată",
    );
  } finally {
    await stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
