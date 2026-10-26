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
