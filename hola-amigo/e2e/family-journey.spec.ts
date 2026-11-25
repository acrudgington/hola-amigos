import { expect, test, type Locator, type Page } from "@playwright/test";

// A family signs up, adds a child, plays a whole guided lesson and the
// result is saved. Answers are tapped without knowing which is right, so
// this checks the flow works end to end — not the child's score.
// Buttons can vanish mid-click while one activity animates out and the next
// animates in, so clicks use a short timeout and the loop simply looks again.
const tap = (l: Locator) => l.click({ timeout: 3000 }).then(() => true, () => false);

async function playThrough(page: Page) {
  for (let i = 0; i < 400; i++) {
    if (await page.getByText("Lesson complete!").count()) return;
    if (await page.locator(".level-up").count()) { await tap(page.getByRole("button", { name: /Vamos/ })); continue; }
    const next = page.getByRole("button", { name: /Next word|Let’s practise|Next →|Continue →|Questions →|Next page|Finish|Skip this/ });
    if (await next.count() && await next.first().isEnabled().catch(() => false)) { await tap(next.first()); continue; }
    const chip = page.locator(".drag-chip:not(.drag-float)").first();
    if (await chip.count()) {
      const target = page.locator(".drop-target:not(.is-done)").first();
      await chip.dragTo(target, { timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(650);
      continue;
    }
    const tile = page.locator(".chips .chip").first();
    if (await tile.count()) {
      await tap(tile);
      const check = page.getByRole("button", { name: "Check ✓" });
      if (await check.isEnabled().catch(() => false) && await tap(check)) await page.waitForTimeout(2300);
      continue;
    }
    // Pick a random answer (tapping the same one forever would never make a pair in Matching).
    const choices = page.locator(".choice:not([disabled])");
    const n = await choices.count();
    if (n) { await tap(choices.nth(Math.floor(Math.random() * n))); await page.waitForTimeout(650); continue; }
    const learnt = page.getByRole("button", { name: /I’ve learnt/ });
    if (await learnt.count()) { await tap(learnt); continue; }
    await page.waitForTimeout(250);
  }
  throw new Error("Lesson never finished");
}

test("sign up → add a child → play lesson 1 → progress is saved", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();

  await page.locator(".profile-tile--add").click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();   // placement offer for a new learner

  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();
  await page.locator(".next-card").click();
  await playThrough(page);
  await expect(page.getByText("Lesson complete!")).toBeVisible();

  await page.getByRole("button", { name: "Back to the map" }).click();
  await page.reload();
  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();

  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith("hola_progress_"))!;
    return JSON.parse(localStorage.getItem(key)!);
  });
  expect(saved.stars["1"]).toBeGreaterThanOrEqual(1);
  expect(Object.keys(saved.wordMemory).length).toBeGreaterThanOrEqual(8);
  expect(saved.events.some((e: { type: string }) => e.type === "lesson")).toBe(true);
  expect(errors).toEqual([]);
});

test("Ask Sol finds and speaks words", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`ask+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.locator(".profile-tile--add").click();
  await page.getByLabel("Child’s name").fill("Leo");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();   // placement offer for a new learner

  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: /Search words and lessons/ }).fill("dog");
  await expect(page.locator(".palette__item").filter({ hasText: "El perro" })).toBeVisible();
});

test("learn together → the weekly report shows it", async ({ page }, info) => {
  const shots = process.env.SHOTS;
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.locator(".profile-tile--add").click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();

  await page.getByRole("button", { name: /Practise/ }).first().click();
  await page.getByRole("button", { name: /Learn together/ }).click();
  await page.getByRole("button", { name: "Dad", exact: true }).click();
  await page.getByRole("button", { name: /Let’s play/ }).click();
  for (let i = 0; i < 8; i++) {
    await expect(page.getByText(i % 2 === 0 ? /Mia’s turn/ : /Dad’s turn/)).toBeVisible();
    await page.getByRole("button", { name: /Check/ }).click();
    if (i === 0 && shots) await page.screenshot({ path: `${shots}/together-${info.project.name}.png` });
    await page.getByRole("button", { name: i === 3 ? "Not yet" : /¡Sí!/ }).click();
  }
  await expect(page.getByText("¡Qué equipo!").first()).toBeVisible();
  await expect(page.getByText(/7/).first()).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  // The grown-up dashboard's weekly report counts the session.
  await page.locator(".avatar-btn:visible").first().click();
  await page.getByRole("button", { name: /Grown-up dashboard/ }).click();
  await expect(page.getByText("This week", { exact: true })).toBeVisible();
  await expect(page.locator(".week-chip", { hasText: "learn together" })).toContainText("1");
  await expect(page.getByRole("link", { name: /Email me this report/ })).toHaveAttribute("href", /^mailto:sam/);
  if (shots) await page.locator(".week-card").screenshot({ path: `${shots}/week-${info.project.name}.png` });
  expect(errors).toEqual([]);
});

test("an A2 lesson (101) plays from start to finish", async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.locator(".profile-tile--add").click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();
  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();

  // Pretend the placement check put Mia past the first 100 lessons.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith("hola_progress_"))!;
    const p = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...p, placedUpTo: 100, placementOffered: true }));
  });
  await page.reload();
  await expect(page.getByText(/LESSON 101/)).toBeVisible();
  await page.locator(".next-card").click();
  await playThrough(page);
  await expect(page.getByText("Lesson complete!")).toBeVisible();
  expect(errors).toEqual([]);
});
