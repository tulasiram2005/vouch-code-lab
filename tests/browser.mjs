// Each CI matrix job uses a disposable local PostgreSQL database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = new URL(process.env.TEST_URL || "http://127.0.0.1:4173");
assert.ok(["127.0.0.1","localhost","[::1]"].includes(base.hostname));
const width = Number(process.env.TEST_WIDTH || 1440);
const theme = process.env.TEST_THEME || "dark";
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
const errors = [], findings = [];
const snapshotDir = process.env.SCREENSHOT_DIR;
if (snapshotDir) await mkdir(snapshotDir, { recursive: true });

async function newVisitor() {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
  const page = await context.newPage();
  await page.addInitScript(t => {
    if (!localStorage.getItem("vouch:theme")) localStorage.setItem("vouch:theme", JSON.stringify(t));
  }, theme);
  page.on("pageerror", error => errors.push(error.message));
  return page;
}

async function inspect(page, screen) {
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).analyze();
  for (const failure of axe.violations) {
    findings.push({screen, rule: failure.id, nodes: failure.nodes.map(n => [n.target,n.failureSummary])});
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 1) findings.push({screen, horizontalOverflow: overflow});
  console.log("Inspected", width, theme, screen, axe.violations.map(x=>x.id).join(",") || "clean");
  if (snapshotDir) await page.screenshot({path: snapshotDir+"/"+screen+"-"+width+"-"+theme+".png"});
}

try {
  const learner = await newVisitor();
  await learner.goto(base.href);
  await learner.locator(".demo .option").nth(1).click();
  assert.match(await learner.locator("#demo-feedback").innerText(), /^Correct/);
  const displayFont = await learner.locator("h1").evaluate(async el => {
    await document.fonts.ready;
    return getComputedStyle(el).fontFamily.includes("Gloock") &&
      Array.from(document.fonts).some(f=>f.family.includes("Gloock") && f.status === "loaded");
  });
  assert.ok(displayFont, "Gloock is loaded and selected");
  await inspect(learner, "landing");
  await learner.getByRole("link",{name:"Open the library"}).click();
  await learner.locator(".row").first().waitFor();
  assert.equal(await learner.locator(".row").count(), 6);
  await inspect(learner, "library");

  const instructor = await newVisitor();
  await instructor.goto(new URL("/#/instructor", base).href);
  await instructor.locator("#email").waitFor();
  await inspect(instructor, "sign-in");
  await instructor.locator("#email").fill("test-"+randomUUID()+"@example.test");
  await instructor.locator("#password").fill(randomUUID());
  await instructor.getByRole("button",{name:"Create account"}).click();
  await instructor.locator("#name").fill("Browser study");
  await inspect(instructor, "cohorts");
  await instructor.getByRole("button",{name:"Create cohort"}).click();
  await instructor.locator("#join-link[href]").waitFor();
  const oldLink = await instructor.locator("#join-link").getAttribute("href");
  await instructor.locator("#rotate-code").click();
  await inspect(instructor, "regenerate-dialog");
  await instructor.locator('#rotate-dialog [value="rotate"]').click();
  await instructor.waitForFunction(old => document.querySelector("#join-link").href !== old, oldLink);
  const joinLink = await instructor.locator("#join-link").getAttribute("href");
  await learner.goto(joinLink);
  const editor = learner.locator(".cm-content");
  await editor.waitFor();
  assert.ok(await learner.locator("#cohort").inputValue());
  assert.ok((await learner.locator("#cases").innerText()).includes("count_positives("));
  await learner.locator("#nickname").fill("Practice learner");
  await inspect(learner, "editor");
  const starter = (await (await learner.request.get(new URL("/problems.json",base).href)).json())[0].starter;
  await editor.fill("def count_positives(values):\n    return -1");
  await learner.locator("#test").click();
  await learner.locator(".case-diff").first().waitFor();
  await inspect(learner, "test-diffs");
  await editor.fill(starter);
  await learner.locator("#test").click();
  await learner.locator("#begin").click({timeout:100000});
  await learner.waitForURL("**/#/round",{timeout:100000});
  await inspect(learner,"round");
  for(let i=0;i<5;i++){
    await learner.keyboard.press(i%2===0?"a":"2");
    await learner.getByRole("button",{name:/Check answer/i}).click();
    if(i<4) await learner.getByText((i+2)+" of 5",{exact:true}).waitFor();
    if(i===1) await learner.reload();
  }
  await learner.waitForURL("**/#/result");
  await learner.locator("#name-mode").selectOption("initials");
  await learner.locator("#public-name").fill("PL");
  await inspect(learner, "result");
  await learner.locator("#claim").click();
  const certCode = await learner.locator(".cert > code").textContent();
  assert.match(certCode,/^VCH-/);
  await learner.locator(".cert").getByText("PL",{exact:true}).waitFor();
  await inspect(learner,"certificate");
  await learner.emulateMedia({media:"print"});
  assert.ok(await learner.locator(".cert").isVisible());
  assert.ok(!(await learner.locator("header").isVisible()));
  assert.ok(!(await learner.locator("#lookup").isVisible()));
  assert.ok((await learner.locator(".cert").innerText()).includes("/v/"+certCode));
  await learner.emulateMedia({media:"screen"});
  await instructor.locator("#refresh").click();
  await instructor.locator("tbody").getByText("completed").waitFor();
  await inspect(instructor,"board");
  const reviewer = await newVisitor();
  await reviewer.goto(new URL("/#/verify",base).href);
  await reviewer.getByRole("link",{name:/Try a sample certificate/}).click();
  await reviewer.getByText("SAMPLE",{exact:true}).waitFor();
  await inspect(reviewer,"sample");
  await reviewer.locator("#code").fill("invalid");
  await reviewer.locator("#lookup button").click();
  await reviewer.getByText("Invalid code format").waitFor();
  await inspect(reviewer,"invalid");
  await reviewer.locator("#code").fill(certCode.toLowerCase().replaceAll("-"," "));
  await reviewer.locator("#lookup button").click();
  await reviewer.locator(".cert").getByText("PL",{exact:true}).waitFor();
  await learner.goto(new URL("/#/result",base).href);
  learner.once("dialog",d=>d.accept());
  await learner.locator("#erase").click();
  await reviewer.goto(new URL("/v/"+certCode,base).href);
  await reviewer.getByRole("heading",{name:"Record revoked"}).waitFor();
  await inspect(reviewer,"revoked");
  assert.deepEqual(errors, []);
} finally {
  console.log("Accessibility and layout findings:",JSON.stringify(findings,null,2));
  await browser.close();
}
assert.deepEqual(findings, []);
