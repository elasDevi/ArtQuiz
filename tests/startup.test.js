import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
test("An occupied port fails startup without a misleading ready message", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prado-port-")),
    blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  try {
    const child = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(blocker.address().port),
        DATA_DIR: dir,
        ADMIN_PASSWORD: "Startup-test-password-2026!",
        ADMIN_PASSWORD_HASH: "",
      },
      stdio: "pipe",
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (s) => (stdout += s));
    child.stderr.on("data", (s) => (stderr += s));
    const code = await new Promise((resolve, reject) => {
      child.once("exit", resolve);
      child.once("error", reject);
    });
    assert.equal(code, 1);
    assert.match(stderr, /EADDRINUSE/);
    assert.ok(!stdout.includes("Prado listening"));
  } finally {
    await new Promise((resolve) => blocker.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
