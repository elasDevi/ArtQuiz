// Local recovery only: run from the application folder after stopping the server.
// This script never deletes teams, answers, grading criteria, or result records.
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
const filename = path.join(process.env.DATA_DIR || "data", "prado.sqlite");
if (!existsSync(filename)) {
  console.error(
    "Baza de date nu există în directorul selectat. Rulează comanda din folderul aplicației, folosind același DATA_DIR. Nu s-a modificat nimic.",
  );
  process.exit(1);
}
const db = new DatabaseSync(filename);
db.exec("PRAGMA busy_timeout=5000");
try {
  const tables = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((t) => t.name),
  );
  if (!["settings", "sessions", "audit"].every((t) => tables.has(t)))
    throw Error("Bază de date nerecunoscută. Nu s-a modificat nimic.");
  const salt = randomBytes(16).toString("hex");
  const hash =
    salt + ":" + scryptSync("Madridtoledo2026", salt, 64).toString("hex");
  db.exec("BEGIN IMMEDIATE");
  try {
    const set = db.prepare(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    );
    set.run("adminHash", JSON.stringify(hash));
    set.run("adminUsesDefaultPassword", "true");
    db.prepare(
      "DELETE FROM sessions WHERE json_extract(data,'$.admin')=1",
    ).run();
    db.prepare(
      "INSERT INTO audit(at,action,entry_id,detail) VALUES(?,?,?,?)",
    ).run(
      new Date().toISOString(),
      "admin_password_reset",
      null,
      "Local recovery",
    );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log(
    "Parola inițială a contului profesor a fost restabilită. Echipele, răspunsurile și baremul au fost păstrate. Repornește aplicația.",
  );
} catch (e) {
  console.error("Resetarea a eșuat: " + e.message);
  process.exitCode = 1;
} finally {
  db.close();
}
