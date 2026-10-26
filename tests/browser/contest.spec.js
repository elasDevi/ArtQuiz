import { test, expect } from "@playwright/test";
test("mobile system themes, bilingual worksheet, submission and teacher validation", async ({
  page,
  browser,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Arta de a privi");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(18, 17, 15)",
  );
  await page.screenshot({ path: "/tmp/prado-mobile-dark.png", fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(245, 241, 233)",
  );
  await page.screenshot({
    path: "/tmp/prado-mobile-light.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#language").click();
  await expect(page.locator("h1")).toContainText("The art of looking");
  await page.locator("#language").click();
  await page.locator("#group").fill("Grupa 2");
  await page.locator("#members").fill("Ana și Maria");
  await page.locator("#code").fill("BROWSER-" + Date.now());
  await page.locator("#join-form button").click();
  for (let i = 0; i < 12; i++) {
    await expect(page.locator(".question-top .eyebrow")).toHaveText(
      `EXERCIȚIUL ${String(i + 1).padStart(2, "0")} / 12`,
    );
    for (const field of await page.locator("[data-field]").all())
      await field.fill(
        "Observație artistică argumentată, cu detalii din pictură.",
      );
    if (i === 8) await page.locator("[data-emotion]").first().check();
    if (i === 1) {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.screenshot({
        path: "/tmp/prado-question-dark.png",
        fullPage: true,
      });
      expect(
        await page.locator(".question-image").evaluate((i) => i.naturalWidth),
      ).toBeGreaterThan(0);
    }
    await page.locator("#next").click();
  }
  await page.locator("#final-submit").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("h1")).toContainText("Arta rămâne");
  await page.reload();
  await expect(page.locator("h1")).toContainText("Arta rămâne");
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
  });
  const admin = await ctx.newPage();
  admin.on("pageerror", (e) => errors.push(e.message));
  await admin.goto("http://127.0.0.1:3499/admin");
  await admin.locator("#password").fill("Browser-test-password-2026!");
  await admin.locator("#login-form button").click();
  await expect(admin.locator(".stats")).toBeVisible();
  await admin.locator("[data-entry]").first().click();
  for (const input of await admin.locator("[data-score]").all())
    await input.fill(await input.getAttribute("max"));
  for (const input of await admin.locator("[data-reason]").all())
    await input.fill("Răspuns verificat de profesoară conform baremului.");
  await admin.locator("#validated").check();
  await admin.locator("#scores-form button[type=submit]").click();
  await expect(admin.locator(".notice.success")).toContainText("validat");
  await admin.screenshot({ path: "/tmp/prado-admin-dark.png", fullPage: true });
  await admin.locator("[data-tab=settings]").click();
  await admin.locator("#toggle-contest").click();
  await admin.locator("#confirm-ok").click();
  await expect(admin.locator("#toggle-contest")).toContainText("Deschide");
  await admin.locator("[data-tab=ranking]").click();
  await admin.locator("#announce").click();
  await admin.locator("#confirm-ok").click();
  await expect(admin.locator(".winner")).toContainText("Grupa 2");
  expect(errors).toEqual([]);
  await ctx.close();
});

test("teacher rubric editor live total, persistence, invalidation and custom team duplicate message", async ({
  page,
  browser,
}) => {
  await page.goto("/admin");
  await page.locator("#password").fill("Browser-test-password-2026!");
  await page.locator("#login-form button").click();
  await page.locator("[data-tab=rubric]").click();
  await expect(page.locator("[data-rubric-points]")).toHaveCount(12);
  await expect(page.locator("#rubric-total")).toHaveText("100");
  await expect(page.locator("#rubric-bonus")).toHaveValue("10");
  await expect(page.locator("#rubric-answer-2")).toContainText("Bosch");
  await page.locator("#rubric-bonus").fill("11");
  await expect(page.locator("#rubric-total")).toHaveText("101");
  await expect(page.locator("#save-rubric")).toBeDisabled();
  await page.locator("#rubric-points-1").fill("4");
  await expect(page.locator("#rubric-total")).toHaveText("100");
  await expect(page.locator("#save-rubric")).toBeEnabled();
  await page
    .locator("#rubric-answer-1")
    .fill("Diego Velázquez; acceptă și Goya cu precizarea intrării.");
  await page
    .locator("#rubric-criteria-1")
    .fill("4p pentru identificare corectă; acceptă echivalente.");
  await page.locator("#save-rubric").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("#toast")).toContainText("Barem salvat");
  await page.reload();
  await page.locator("[data-tab=rubric]").click();
  await expect(page.locator("#rubric-points-1")).toHaveValue("4");
  await expect(page.locator("#rubric-bonus")).toHaveValue("11");
  await page.screenshot({
    path: "/tmp/prado-rubric-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("[data-tab=entries]").click();
  await page.locator("[data-entry]").first().click();
  await expect(page.locator("[data-score]").first()).toHaveValue("");
  await expect(page.locator("#validated")).not.toBeChecked();
  await expect(page.locator("#entry-detail")).toContainText("Ana și Maria");
  for (const input of await page.locator("[data-score]").all())
    await input.fill(await input.getAttribute("max"));
  await expect(page.locator("#score-total")).toHaveText("100");
  for (const input of await page.locator("[data-reason]").all())
    await input.fill("Verificat pe baza noului barem.");
  await page.locator("#validated").check();
  await page.locator("#scores-form button[type=submit]").click();
  await expect(page.locator(".notice.success")).toBeVisible();
  await page.locator("[data-tab=ranking]").click();
  await expect(page.locator(".winner")).toHaveCount(0);
  await expect(page.locator("tbody")).toContainText("100 / 100");
  await page.locator("[data-tab=settings]").click();
  await page.locator("#toggle-contest").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("#toggle-contest")).toContainText("Închide");
  const ctx = await browser.newContext();
  const student = await ctx.newPage();
  await student.goto("http://127.0.0.1:3499/");
  await student.locator("#group").fill("  gRuPa  2  ");
  await student.locator("#members").fill("Alți membri");
  await student.locator("#code").fill("OTHER-TEAM-CODE");
  await student.locator("#join-form button").click();
  await expect(student.locator("#join-error")).toContainText("deja folosit");
  await student.locator("#group").fill("Echipa cu nume liber");
  await student.locator("#join-form button").click();
  await expect(student.locator(".question-top")).toBeVisible();
  await ctx.close();
});

test("phone drafts stay local through offline reload and upload only on explicit successful submission", async ({
  page,
  request,
}) => {
  const writes = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && new URL(r.url()).pathname !== "/api/join")
      writes.push(new URL(r.url()).pathname);
  });
  const auth = await (await request.get("/api/session")).json();
  const login = await request.post("/api/admin/login", {
    headers: { "x-csrf-token": auth.csrf },
    data: { username: "profesor", password: "Browser-test-password-2026!" },
  });
  expect(login.ok()).toBeTruthy();
  await page.goto("/");
  await page.locator("#group").fill("Echipa cu ciornă locală");
  await page.locator("#members").fill("Ana și Matei");
  await page.locator("#code").fill("PHONE-LOCAL-DRAFT-2026");
  await page.locator("#join-form button").click();
  await page
    .locator("[data-field]")
    .first()
    .fill("Răspuns păstrat numai pe telefon");
  await expect(page.locator("#save-status")).toContainText(
    "Salvat pe acest dispozitiv",
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const before = await (await request.get("/api/admin")).json();
  const entry = before.entries.find(
    (e) => e.group_name === "Echipa cu ciornă locală",
  );
  expect(entry.answers).toEqual({});
  expect(writes).toEqual([]);
  await page.context().setOffline(true);
  await page.locator("#next").click();
  await page.locator("[data-field]").first().fill("Bosch — completat offline");
  await page.reload();
  await expect(page.locator(".question-top .eyebrow")).toHaveText(
    "EXERCIȚIUL 02 / 12",
  );
  await expect(page.locator("[data-field]").first()).toHaveValue(
    "Bosch — completat offline",
  );
  await page.locator('[data-step="0"]').click();
  await expect(page.locator("[data-field]").first()).toHaveValue(
    "Răspuns păstrat numai pe telefon",
  );
  for (let i = 0; i < 12; i++) {
    await expect(page.locator(".question-top .eyebrow")).toHaveText(
      `EXERCIȚIUL ${String(i + 1).padStart(2, "0")} / 12`,
    );
    for (const field of await page.locator("[data-field]").all())
      await field.fill("Răspuns completat local și argumentat.");
    if (i === 8) await page.locator("[data-emotion]").first().check();
    await page.locator("#next").click();
  }
  await page.locator("#final-submit").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("#toast")).toContainText(
    "Trimiterea nu a fost confirmată",
  );
  expect(
    await page.evaluate(
      (id) => !!localStorage.getItem("prado.draft." + id),
      entry.id,
    ),
  ).toBe(true);
  expect(
    (await (await request.get("/api/admin")).json()).entries.find(
      (e) => e.id === entry.id,
    ).answers,
  ).toEqual({});
  await page.context().setOffline(false);
  // A rejected submit also leaves the entire local draft intact.
  await page.route("**/api/submit", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporary failure" }),
    }),
  );
  await page.locator("#final-submit").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("#toast")).toContainText("Temporary failure");
  expect(
    await page.evaluate(
      (id) => !!localStorage.getItem("prado.draft." + id),
      entry.id,
    ),
  ).toBe(true);
  expect(
    (await (await request.get("/api/admin")).json()).entries.find(
      (e) => e.id === entry.id,
    ).answers,
  ).toEqual({});
  await page.unroute("**/api/submit");
  await page.locator("#final-submit").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("h1")).toContainText("Arta rămâne");
  const end = (await (await request.get("/api/admin")).json()).entries.find(
    (e) => e.id === entry.id,
  );
  expect(end.submitted_at).toBeTruthy();
  expect(Object.keys(end.answers)).toHaveLength(12);
  expect(
    await page.evaluate(
      (id) => localStorage.getItem("prado.draft." + id),
      entry.id,
    ),
  ).toBe(null);
  expect(writes).not.toContain("/api/progress");
  expect(writes.filter((x) => x === "/api/submit")).toHaveLength(2); // rejected request + successful request
});

test("incomplete form can be submitted after an explicit warning, or cancelled without uploading", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.locator("#group").fill("Echipa care nu știe tot");
  await page.locator("#members").fill("Ana și Vlad");
  await page.locator("#code").fill("INCOMPLETE-BROWSER-2026");
  await page.locator("#join-form button").click();
  await page.locator("[data-field]").first().fill("Diego Velázquez");
  await page.locator('[data-step="11"]').click();
  await page.locator("#next").click();
  await expect(page.locator("#final-submit")).toBeEnabled();
  await page.locator("#final-submit").click();
  await expect(page.locator("#confirm-copy")).toContainText(
    "11 exerciții incomplete",
  );
  await expect(page.locator("#confirm-copy")).toContainText("0 puncte");
  await expect(page.locator("#confirm-copy")).toContainText(
    "punctele din oficiu se păstrează",
  );
  await page.locator("#confirm-cancel").click();
  await expect(page.locator("#final-submit")).toBeVisible();
  const auth = await (await request.get("/api/session")).json();
  await request.post("/api/admin/login", {
    headers: { "x-csrf-token": auth.csrf },
    data: { username: "profesor", password: "Browser-test-password-2026!" },
  });
  let entry = (await (await request.get("/api/admin")).json()).entries.find(
    (e) => e.group_name === "Echipa care nu știe tot",
  );
  expect(entry.answers).toEqual({});
  expect(entry.submitted_at).toBe(null);
  await page.locator("#final-submit").click();
  await page.locator("#confirm-ok").click();
  await expect(page.locator("h1")).toContainText("Arta rămâne");
  entry = (await (await request.get("/api/admin")).json()).entries.find(
    (e) => e.id === entry.id,
  );
  expect(entry.answers).toEqual({ 1: { artist: "Diego Velázquez" } });
  expect(entry.submitted_at).toBeTruthy();
});

test("teacher signs in as profesor and changes password from the dashboard", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page.locator("#username")).toHaveValue("profesor");
  await expect(page.locator("#setup-token")).toHaveCount(0);
  await page.locator("#password").fill("Browser-test-password-2026!");
  await page.locator("#login-form button").click();
  await page.locator("[data-tab=settings]").click();
  await page.locator("#current-password").fill("Wrong-current-password");
  await page.locator("#new-password").fill("Browser-updated-password-2026!");
  await page
    .locator("#confirm-password")
    .fill("Browser-updated-password-2026!");
  await page.locator("#password-form button").click();
  await expect(page.locator("#password-error")).toContainText(
    "actuală este incorectă",
  );
  await page.locator("#current-password").fill("Browser-test-password-2026!");
  await page.locator("#password-form button").click();
  await expect(page.locator("#toast")).toContainText("Parola a fost schimbată");
  await page.locator("#logout").click();
  await page.locator("#password").fill("Browser-test-password-2026!");
  await page.locator("#login-form button").click();
  await expect(page.locator("#login-error")).toContainText("incorectă");
  await page.locator("#password").fill("Browser-updated-password-2026!");
  await page.locator("#login-form button").click();
  await expect(page.locator(".stats")).toBeVisible();
});
