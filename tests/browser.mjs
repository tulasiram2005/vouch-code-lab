// Run against an isolated local server with a migrated, disposable PostgreSQL database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = new URL(process.env.TEST_URL || "http://127.0.0.1:4173");
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname),
  "Browser fixtures require a local test database.",
);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || undefined,
});
const instructor = await browser.newPage();
const learner = await browser.newPage();
const errors = [];
for (const p of [instructor, learner])
  p.on("pageerror", (e) => errors.push(e.message));
const snapshotDir = process.env.SCREENSHOT_DIR;
if (snapshotDir) await mkdir(snapshotDir, { recursive: true });
async function inspect(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]),
    [],
    name + " accessibility findings",
  );
  if (snapshotDir)
    await page.screenshot({
      path: snapshotDir + "/" + name + ".png",
      fullPage: true,
    });
}
try {
  for (const width of [375, 768, 1024, 1440]) {
    await learner.setViewportSize({ width, height: 900 });
    await learner.goto(base.href);
    await learner.locator(".demo .option").nth(1).click();
    assert.match(
      await learner.locator("#demo-feedback").textContent(),
      /^Correct/,
    );
    assert.ok(
      await learner.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Horizontal overflow at " + width,
    );
    if (width === 375 || width === 1440)
      await inspect(learner, "landing-" + width);
  }
  await instructor.goto(new URL("/#/instructor", base).href);
  const id = randomUUID();
  await instructor.locator("#email").fill("test-" + id + "@example.test");
  await instructor.locator("#password").fill(randomUUID());
  await instructor.getByRole("button", { name: "Create account" }).click();
  await instructor.locator("#name").fill("Browser study");
  await instructor.getByRole("button", { name: "Create cohort" }).click();
  const joinCode = await instructor.locator(".bar .file strong").innerText();
  await learner.getByText("Open the library").click();
  assert.equal(await learner.locator(".row").count(), 6);
  await learner.locator(".row").first().click();
  await learner.getByText("Round settings", { exact: true }).click();
  await learner.locator("#cohort").fill(joinCode);
  await learner.locator("#nickname").fill("Practice learner");
  await learner.locator("#test").click();
  await learner.locator("#begin").click({ timeout: 100000 });
  await learner.waitForURL("**/#/round", { timeout: 100000 });
  await inspect(learner, "round");
  for (let i = 0; i < 5; i++) {
    await learner.locator(".answer-list .option").first().click();
    await learner.locator("#submit").click();
    if (i < 4)
      await learner.getByText(i + 2 + " of 5", { exact: true }).waitFor();
    if (i === 1) await learner.reload();
  }
  await learner.waitForURL("**/#/result");
  await learner.locator("#claim").click();
  const certCode = await learner.locator(".cert > code").textContent();
  assert.match(certCode, /^VCH-/);
  await inspect(learner, "certificate");
  await instructor.locator("#refresh").click();
  await instructor.locator("tbody").getByText("Practice learner").waitFor();
  await instructor.locator("tbody").getByText("completed").waitFor();
  await inspect(instructor, "cohort");
  const publicPage = await browser.newPage();
  await publicPage.goto(new URL("/v/" + certCode, base).href);
  assert.equal(
    await publicPage.locator(".cert > code").textContent(),
    certCode,
  );
  await learner.goto(new URL("/#/result", base).href);
  learner.once("dialog", (dialog) => dialog.accept());
  await learner.locator("#erase").click();
  await learner.getByText("Your server record was deleted.").waitFor();
  await publicPage.reload();
  await publicPage
    .getByText("This certificate is unavailable or has expired.")
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: responsive landing, axe checks, registration, cohort, learner round, reload, verification, board, deletion and revocation.",
  );
} finally {
  await browser.close();
}
