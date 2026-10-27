import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const shellAvailable = spawnSync("bash", ["--version"]).status === 0;
test(
  "Oracle installer syntax and dry checks validate hostnames without privileged actions",
  { skip: !shellAvailable },
  () => {
    const syntax = spawnSync("bash", ["-n", "deploy-oracle.sh"], {
      encoding: "utf8",
    });
    assert.equal(syntax.status, 0, syntax.stderr);
    for (const domain of [
      "prado.example.ro",
      "museum.example.com",
      "a-b.example.org",
    ]) {
      const p = spawnSync("bash", ["deploy-oracle.sh", "--check", domain], {
        encoding: "utf8",
      });
      assert.equal(p.status, 0, p.stderr);
      assert.match(p.stdout, /Nu s-au instalat/);
    }
    for (const domain of [
      "https://example.com",
      "example.com/path",
      "example.com:443",
      "127.0.0.1",
      "bad;touch /tmp/test",
      "-bad.example.com",
      "a..example.com",
      "example.com.",
      "localhost",
    ]) {
      const p = spawnSync("bash", ["deploy-oracle.sh", "--check", domain], {
        encoding: "utf8",
      });
      assert.notEqual(p.status, 0, domain);
    }
  },
);
