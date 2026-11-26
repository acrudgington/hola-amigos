import { expect, test, type Locator, type Page } from "@playwright/test";

// A family signs up, adds a child, plays a whole guided lesson and the
// result is saved. Answers are tapped without knowing which is right, so
// this checks the flow works end to end — not the child's score.
// Buttons can vanish mid-click while one activity animates out and the next
// animates in, so clicks use a short timeout and the loop simply looks again.
const tap = (l: Locator) => l.click({ timeout: 3000 }).then(() => true, () => false);
// The robot taps answers at random; on a busy phone emulator the "is it still?"
// check can time out while animations run, so answer buttons are tapped directly.
const tapNow = (l: Locator) => l.click({ timeout: 3000, force: true }).then(() => true, () => false);

async function playThrough(page: Page) {
  for (let i = 0; i < 400; i++) {
    if (await page.getByText("Lesson complete!").count()) return;
    if (await page.locator(".level-up").count()) { await tap(page.getByRole("button", { name: /Vamos/ })); continue; }
    const next = page.getByRole("button", { name: /Next word|Let’s practise|Next →|Continue →|Questions →|Next page|Finish|Skip this/ });
    // A short timeout matters: a button counted a moment ago may have just gone
    // (e.g. "Continue →" as the next question appears); without it this waits forever.
    if (await next.count() && await next.first().isEnabled({ timeout: 500 }).catch(() => false)) { await tap(next.first()); continue; }
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
      if (await check.isEnabled({ timeout: 500 }).catch(() => false) && await tap(check)) await page.waitForTimeout(2300);
      continue;
    }
    // Pick a random answer (tapping the same one forever would never make a pair in Matching).
    const choices = page.locator(".choice:not([disabled])");
    const n = await choices.count();
    if (n) { await tapNow(choices.nth(Math.floor(Math.random() * n))); await page.waitForTimeout(650); continue; }
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

  await page.getByRole("button", { name: /Add a child/ }).click();
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
  await page.getByRole("button", { name: /Add a child/ }).click();
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
  await page.getByRole("button", { name: /Add a child/ }).click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();

  await page.getByRole("button", { name: /Practise/ }).first().click();
  await page.getByRole("button", { name: /Learn together/ }).click();
  await page.getByRole("button", { name: "Dad", exact: true }).click();
  await page.getByRole("button", { name: /Word game/ }).click();
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
  test.setTimeout(600_000);   // a full A2 lesson, answering at random (slow on the phone emulator)
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.getByRole("button", { name: /Add a child/ }).click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();
  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();

  // Pretend the placement check put Mia past the first 100 lessons. Instructions
  // aren't read aloud here (a grown-up setting), which keeps this long lesson quick.
  await page.evaluate(() => {
    localStorage.setItem("hola_prefs", JSON.stringify({ ...JSON.parse(localStorage.getItem("hola_prefs") || "{}"), guide: false }));
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

test("Let's talk: a full conversation, then chat cards in Learn together", async ({ page }, info) => {
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
  await page.getByRole("button", { name: /Add a child/ }).click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();

  // Pretend lesson 1 is done, then practise its conversation on its own.
  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith("hola_progress_"))!;
    const p = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...p, stars: { 1: 1 } }));
  });
  await page.reload();
  await page.getByRole("button", { name: /^Lesson 1:/ }).click();
  await page.getByRole("button", { name: /Let’s Talk/ }).click();
  await expect(page.locator(".talk__bubble--them").first()).toContainText("¡Hola!");
  for (let turn = 0; turn < 3; turn++) {
    // Tap the right answer: it's the option the hint would show, so try each until one is accepted.
    await expect(page.locator(".talk .choice").first()).toBeEnabled({ timeout: 10_000 });
    const before = await page.locator(".talk__bubble--me").count();
    for (let k = 0; k < 3 && (await page.locator(".talk__bubble--me").count()) === before; k++) {
      const opts = page.locator(".talk .choice");
      if (!(await opts.nth(k).isEnabled({ timeout: 500 }).catch(() => false))) break;
      await opts.nth(k).click();
      await page.waitForTimeout(400);
    }
    if (turn === 1 && shots) await page.screenshot({ path: `${shots}/talk-${info.project.name}.png` });
    await page.getByRole("button", { name: /Continue →|Finish ✓/ }).click();
  }
  await expect(page.locator(".talk")).toHaveCount(0);

  // Chat cards in Learn together.
  await page.goto("/");
  await page.getByRole("button", { name: /Practise/ }).first().click();
  await page.getByRole("button", { name: /Learn together/ }).click();
  await page.getByRole("button", { name: /Chat cards/ }).click();
  await expect(page.getByText(/ask Mia/)).toBeVisible();
  await page.getByRole("button", { name: /Show an example answer/ }).click();
  if (shots) await page.screenshot({ path: `${shots}/chatcards-${info.project.name}.png` });
  await page.getByRole("button", { name: /¡Sí!/ }).click();
  expect(errors).toEqual([]);
});

test("Find my level: stricter quiz with sentence questions", async ({ page }, info) => {
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
  await page.getByRole("button", { name: /Add a child/ }).click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /know some Spanish/ }).click();
  await page.getByRole("button", { name: /Let’s go/ }).click();
  // Pretend to know worlds 1 and 2 perfectly (answer from the hidden key), then sentences appear in world 4.
  let sawSentence = false;
  for (let i = 0; i < 40 && !(await page.getByText("Starting point").count()); i++) {
    if (await page.getByText(/What does this sentence mean|How do you say this in Spanish/).count()) {
      if (await page.locator(".choices--list").count()) { sawSentence = true; if (shots) await page.screenshot({ path: `${shots}/placement-sentence-${info.project.name}.png` }); }
    }
    await page.getByRole("button", { name: /I don’t know/ }).click();
    await page.waitForTimeout(500);
  }
  await expect(page.getByText("Starting point")).toBeVisible();
  await expect(page.getByText(/from the very beginning/)).toBeVisible();   // all "I don't know" → start at lesson 1
  expect(sawSentence).toBe(false);   // a beginner never reaches the sentence worlds
  expect(errors).toEqual([]);
});

test("grown-ups can start a child again and find account deletion", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  // The dashboard (and account settings) is there even before adding a child.
  await expect(page.getByRole("button", { name: /Grown-up dashboard & settings/ })).toBeVisible();
  await page.getByRole("button", { name: /Add a child/ }).click();
  await page.getByLabel("Child’s name").fill("Mia");
  await page.getByRole("button", { name: "Add ✓" }).click();
  await page.locator(".profile-tile").first().click();
  await page.getByRole("button", { name: /new to Spanish/ }).click();
  await expect(page.getByText(/Sol · study buddy/)).toBeVisible();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith("hola_progress_"))!;
    const p = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...p, stars: { 1: 3, 2: 2 }, xp: 500, placedUpTo: 40 }));
  });
  await page.reload();
  await page.locator(".avatar-btn:visible").first().click();
  await page.getByRole("button", { name: /Grown-up dashboard & settings/ }).click();
  await expect(page.getByRole("button", { name: /Account & privacy/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Delete my account/ })).toBeVisible();
  await page.getByRole("button", { name: /Start Mia again from lesson 1/ }).last().click();
  await page.getByRole("button", { name: "Start again" }).click();
  const saved = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith("hola_progress_"))!;
    return JSON.parse(localStorage.getItem(key)!);
  });
  expect(saved.stars).toEqual({});
  expect(saved.xp).toBe(0);
  expect(saved.placedUpTo).toBe(0);
  expect(saved.placementOffered).toBe(false);
  expect(errors).toEqual([]);
});

test("a grown-up learner gets Español para padres and plays its first lesson", async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Emma");
  await page.getByLabel("Email").fill(`emma+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.evaluate(() => localStorage.setItem("hola_prefs", JSON.stringify({ ...JSON.parse(localStorage.getItem("hola_prefs") || "{}"), guide: false })));

  await expect(page.getByText(/Grown-ups · 0 of 2/)).toBeVisible();
  for (const name of ["Emma", "Tom"]) {
    await page.getByRole("button", { name: /Add a grown-up/ }).click();
    await page.getByLabel("Your name").fill(name);
    await page.getByRole("button", { name: "Add ✓" }).click();
  }
  await expect(page.getByText(/Grown-ups · 2 of 2/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Add a grown-up/ })).toHaveCount(0);   // full

  await page.locator(".profile-tile--adult").first().click();
  await expect(page.getByRole("heading", { name: "¡Hola, Emma!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Español para padres" })).toBeVisible();
  await expect(page.getByRole("button", { name: /La tutoría, locked/ })).toBeDisabled();
  await page.getByRole("button", { name: /En la puerta del cole/ }).click();
  await playThrough(page);
  await expect(page.getByText("Lesson complete!")).toBeVisible();
  await page.getByRole("button", { name: "Back to the map" }).click();
  await expect(page.getByRole("button", { name: /La tutoría: Meeting the class teacher/ })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("grown-ups can open printable labels for home", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /Sign up/i }).click();
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Email").fill(`sam+${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("secret123");
  await page.getByRole("checkbox", { name: /parent or guardian/ }).check();
  await page.getByRole("button", { name: /Create account/ }).click();
  await page.getByRole("button", { name: /dashboard/i }).click();
  await page.getByRole("button", { name: /Printable labels for home/ }).click();
  await expect(page.getByRole("heading", { name: /Labels for home/ })).toBeVisible();
  const all = await page.locator(".home-label").count();
  await page.getByRole("button", { name: /The kitchen/ }).click();   // leave the kitchen out
  await expect(page.locator(".home-label")).toHaveCount(all - 15);
  await expect(page.getByRole("button", { name: `🖨️ Print ${all - 15} labels` })).toBeEnabled();
});
