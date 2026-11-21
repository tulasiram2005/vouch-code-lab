import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { handle } from "../server/api.mjs";
import {
  grade,
  certificate,
  passwordHash,
  passwordMatches,
  jsonBody,
} from "../server/security.mjs";
const origin = "https://vouch.example";
function request(path, method = "GET", body, headers = {}) {
  return new Request(origin + "/api" + path, {
    method,
    headers: {
      ...(body && { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function call(path, method, body, headers) {
  const response = await handle(request(path, method, body, headers), {
    ip: "test-local",
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
test("five-probe bands treat time independently of score", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((x) => grade(x, 5)),
    ["Shaky", "Shaky", "Partial", "Partial", "Solid", "Solid"],
  );
});
test("certificate derivation is stable and keyed", () => {
  assert.match(certificate("key", "id"), /^VCH(?:-[0-9A-F]{4}){4}$/);
  assert.equal(certificate("key", "id"), certificate("key", "id"));
  assert.notEqual(certificate("key", "id"), certificate("other", "id"));
});
test("password verification uses a per-account salt", async () => {
  const first = await passwordHash("a password for Vouch");
  assert.notEqual(first, await passwordHash("a password for Vouch"));
  assert.ok(await passwordMatches("a password for Vouch", first));
  assert.equal(await passwordMatches("incorrect", first), false);
});
test("JSON body limit and non-object payloads", async () => {
  await assert.rejects(
    jsonBody(request("/attempts", "POST", { x: "x".repeat(17000) })),
    { status: 413 },
  );
  await assert.rejects(jsonBody(request("/attempts", "POST", [])), {
    status: 400,
  });
});
test("liveness and cross-site writes can be checked before opening a database", async () => {
  assert.equal((await call("/healthz")).status, 200);
  assert.equal(
    (
      await call(
        "/cohorts",
        "POST",
        {},
        { origin: "https://elsewhere.example" },
      )
    ).status,
    403,
  );
});
test(
  "real PostgreSQL transactions, ownership, replay safety, privacy and deletion",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const schema = "vouch_test_" + randomUUID().replaceAll("-", "");
    const base = new pg.Client({
      connectionString: process.env.TEST_DATABASE_URL,
    });
    await base.connect();
    await base.query("CREATE SCHEMA " + schema);
    t.after(async () => {
      await base.query("DROP SCHEMA " + schema + " CASCADE");
      await base.end();
    });
    const testUrl = new URL(process.env.TEST_DATABASE_URL);
    testUrl.searchParams.set("options", "-c search_path=" + schema);
    process.env.DATABASE_URL = testUrl.href;
    delete process.env.NETLIFY_DB_URL;
    await base.query("SET search_path TO " + schema);
    await base.query(
      await readFile(
        new URL(
          "../netlify/database/migrations/20261121133000_vouch.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal((await call("/readyz")).status, 200);
    const account = {
      email: "teacher@example.test",
      password: "correct sample password",
    };
    const owner = await call("/instructor/register", "POST", account);
    assert.equal(owner.status, 200);
    assert.equal(
      (
        await call("/instructor/login", "POST", {
          ...account,
          password: "wrong sample password",
        })
      ).status,
      401,
    );
    const login = await call("/instructor/login", "POST", account);
    assert.equal(login.status, 200);
    const ownerAuth = { cookie: login.cookie };
    const cohort = await call(
      "/cohorts",
      "POST",
      { name: "Signals", problem: "count-positives" },
      ownerAuth,
    );
    assert.equal(cohort.status, 201);
    assert.equal(
      (await call("/cohorts", "GET", undefined, ownerAuth)).data.cohorts.length,
      1,
    );
    assert.equal((await call("/cohorts/" + cohort.data.id)).status, 401);
    const other = await call("/instructor/register", "POST", {
      ...account,
      email: "teacher2@example.test",
    });
    assert.equal(
      (
        await call("/cohorts/" + cohort.data.id, "GET", undefined, {
          cookie: other.cookie,
        })
      ).status,
      404,
    );
    const payload = {
      problem: "count-positives",
      codeHash: "a".repeat(64),
      displayName: "Learner",
      cohortCode: cohort.data.joinCode,
      probes: [
        { kind: "predict", expected: "3" },
        { kind: "breaker", expected: "[0]" },
      ],
    };
    const attempt = await call("/attempts", "POST", payload);
    assert.equal(attempt.status, 201);
    const path = "/attempts/" + attempt.data.id,
      auth = { authorization: "Bearer " + attempt.data.token };
    assert.equal(
      (await call(path + "/finalize", "POST", undefined, auth)).status,
      409,
    );
    const answers = await Promise.all(
      [0, 1].map(() =>
        call(path + "/answers/0", "PUT", { answer: "3", elapsedMs: 55 }, auth),
      ),
    );
    assert.deepEqual(
      answers.map((x) => x.data.correct),
      [true, true],
    );
    assert.equal(
      (
        await call(
          path + "/answers/0",
          "PUT",
          { answer: "4", elapsedMs: 0 },
          auth,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          path + "/answers/1",
          "PUT",
          { answer: "[]", elapsedMs: 80 },
          auth,
        )
      ).data.correct,
      false,
    );
    const [left, right] = await Promise.all(
      [0, 1].map(() => call(path + "/finalize", "POST", undefined, auth)),
    );
    assert.equal(left.data.code, right.data.code);
    assert.equal(left.data.score, 1);
    const verify = await call("/verify/" + left.data.code);
    assert.equal(verify.data.outcomes.length, 2);
    assert.ok(!JSON.stringify(verify.data).includes("Learner"));
    assert.equal(
      (await call("/cohorts/" + cohort.data.id, "GET", undefined, ownerAuth))
        .data.attempts[0].elapsedMs,
      135,
    );
    assert.equal((await call(path, "DELETE")).status, 401);
    assert.equal((await call(path, "DELETE", undefined, auth)).status, 200);
    assert.equal((await call("/verify/" + left.data.code)).status, 404);
    assert.equal(
      (await call("/instructor/logout", "POST", undefined, ownerAuth)).status,
      200,
    );
    assert.equal(
      (await call("/cohorts", "GET", undefined, ownerAuth)).status,
      401,
    );
  },
);
