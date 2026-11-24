import { randomBytes, randomUUID } from "node:crypto";
import problems from "../public/problems.json" with { type: "json" };
import { database, getSigningKey, transaction } from "./db.mjs";
import {
  certificate,
  fail,
  field,
  grade,
  hash,
  jsonBody,
  keyed,
  limit,
  passwordHash,
  passwordMatches,
  token,
} from "./security.mjs";

const problemIds = new Set(problems.map((p) => p.id));
function problem(value) {
  if (!problemIds.has(value)) fail(400, "Select an available problem.");
  return value;
}
const send = (body, status = 200, headers = {}) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
const between = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const authCookie = (value, age) =>
  `__Host-vouch_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const sessionToken = (req) =>
  (req.headers.get("cookie") || "").match(
    /(?:^|;\s*)__Host-vouch_session=([\w-]{43})(?:;|$)/,
  )?.[1] || "";
async function instructor(req) {
  const result = await database().query(
    "SELECT instructor_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",
    [hash(sessionToken(req))],
  );
  if (!result.rowCount) fail(401, "Sign in to see your cohorts.");
  return result.rows[0].instructor_id;
}
const cohortCols = 'id,name,problem,join_code AS "joinCode"';
async function accounts(req, action) {
  const db = database();
  if (action === "logout") {
    await db.query("DELETE FROM sessions WHERE token_hash=$1", [
      hash(sessionToken(req)),
    ]);
    return send({ ok: true }, 200, { "set-cookie": authCookie("", 0) });
  }
  const data = await jsonBody(req);
  const email = field(data.email, 254, 3).toLowerCase();
  const password = data.password;
  if (
    !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length > 128 ||
    password.length < 12
  )
    fail(400, "Enter an email and a password of 12–128 characters.");
  const raw = token();
  await transaction(async (client) => {
    let id;
    if (action === "register") {
      id = randomUUID();
      const result = await client.query(
        "INSERT INTO instructors(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id",
        [id, email, await passwordHash(password)],
      );
      if (!result.rowCount)
        fail(409, "Account could not be created with these details.");
    } else {
      const user = (
        await client.query(
          "SELECT id,password_hash FROM instructors WHERE email=$1",
          [email],
        )
      ).rows[0];
      const valid = await passwordMatches(
        password,
        user?.password_hash ||
          "00000000000000000000000000000000." + "0".repeat(128),
      );
      if (!user || !valid) fail(401, "Email or password is incorrect.");
      id = user.id;
    }
    await client.query(
      "INSERT INTO sessions(token_hash,instructor_id) VALUES($1,$2)",
      [hash(raw), id],
    );
  });
  return send({ email }, 200, { "set-cookie": authCookie(raw, 28800) });
}
const newJoinCode = () => randomBytes(6).toString("hex").toUpperCase();
function joinCode(input) {
  const code = field(input, 32).toUpperCase().replace(/[-\s]/g, "");
  if (!/^[0-9A-F]{12}$/.test(code)) fail(400, "Enter the 12-character cohort code.");
  return code;
}
async function cohorts(req, id, rotate) {
  const owner = await instructor(req),
    db = database();
  if (rotate) {
    if (req.method !== "POST") fail(405, "Method is unavailable.");
    const data = await jsonBody(req);
    const previous = joinCode(data.currentCode);
    const result = await db.query(
      `UPDATE cohorts SET join_code=$4 WHERE id=$1 AND instructor_id=$2 AND join_code=$3 RETURNING ${cohortCols}`,
      [id, owner, previous, newJoinCode()],
    );
    if (result.rowCount) return send(result.rows[0]);
    const owned = await db.query("SELECT id FROM cohorts WHERE id=$1 AND instructor_id=$2", [id, owner]);
    if (!owned.rowCount) fail(404, "Cohort unavailable.");
    fail(409, "The join code has already changed. Refresh the board to see it.");
  }
  if (req.method === "POST" && !id) {
    const data = await jsonBody(req);
    const result = await db.query(
      `INSERT INTO cohorts(id,instructor_id,name,problem,join_code) VALUES($1,$2,$3,$4,$5) RETURNING ${cohortCols}`,
      [
        randomUUID(),
        owner,
        field(data.name, 80),
        problem(data.problem),
        newJoinCode(),
      ],
    );
    return send(result.rows[0], 201);
  }
  if (req.method !== "GET") fail(405, "Method is unavailable.");
  if (!id)
    return send({
      cohorts: (
        await db.query(
          `SELECT ${cohortCols} FROM cohorts WHERE instructor_id=$1 ORDER BY created_at DESC`,
          [owner],
        )
      ).rows,
    });
  const cohort = (
    await db.query(
      `SELECT ${cohortCols} FROM cohorts WHERE id=$1 AND instructor_id=$2`,
      [id, owner],
    )
  ).rows[0];
  if (!cohort) fail(404, "Cohort unavailable.");
  const result = await db.query(
    `SELECT a.id,a.display_name AS "displayName",a.created_at AS "createdAt",a.issued_at,
    jsonb_array_length(a.probes) AS total,count(*) FILTER(WHERE b.correct)::int AS score,coalesce(sum(b.elapsed_ms),0)::bigint::text AS elapsed
    FROM attempts a LEFT JOIN answers b ON b.attempt_id=a.id WHERE cohort_id=$1 AND a.created_at>now()-interval '30 days'
    GROUP BY a.id ORDER BY a.created_at DESC LIMIT 1000`,
    [id],
  );
  return send({
    ...cohort,
    attempts: result.rows.map(({ issued_at, elapsed, ...a }) => ({
      ...a,
      elapsedMs: Number(elapsed),
      status: issued_at ? "completed" : "in-progress",
      band: issued_at ? grade(a.score, a.total) : null,
    })),
  });
}
function validateProbes(probes, key) {
  if (!Array.isArray(probes) || probes.length < 1 || probes.length > 5)
    fail(400, "Submit one to five probes.");
  return probes.map((p) => {
    if (!p || typeof p !== "object") fail(400, "Invalid probe.");
    const kind = field(p.kind, 24).toLowerCase();
    if (!["predict", "breaker", "line"].includes(kind))
      fail(400, "Invalid probe type.");
    if (typeof p.expected !== "string" || p.expected.length > 1024)
      fail(400, "Invalid expected answer.");
    return { kind, digest: keyed(key, "answer/" + p.expected) };
  });
}
async function createAttempt(req, key) {
  const data = await jsonBody(req),
    problemId = problem(data.problem);
  if (
    typeof data.codeHash !== "string" ||
    !/^([a-f0-9]{64})$/i.test(data.codeHash)
  )
    fail(400, "Invalid source fingerprint.");
  const probes = validateProbes(data.probes, key);
  const displayName = data.displayName
    ? field(data.displayName, 64)
    : "Anonymous learner";
  let cohortId = null;
  if (data.cohortCode) {
    const code = joinCode(data.cohortCode);
    await limit(database(), key, "join/" + code, 600);
    const cohort = (
      await database().query(
        "SELECT id,problem FROM cohorts WHERE join_code=$1",
        [code],
      )
    ).rows[0];
    if (!cohort) fail(404, "Check your cohort code.");
    if (cohort.problem !== problemId)
      fail(409, "Choose the problem assigned to this cohort.");
    cohortId = cohort.id;
  }
  const id = randomUUID(),
    raw = token();
  await database().query(
    "INSERT INTO attempts(id,token_hash,cohort_id,problem,code_hash,display_name,probes) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      id,
      hash(raw),
      cohortId,
      problemId,
      data.codeHash,
      displayName,
      JSON.stringify(probes),
    ],
  );
  return send({ id, token: raw }, 201);
}
async function attemptAction(req, key, id, index, action) {
  const raw = (req.headers.get("authorization") || "").match(
    /^Bearer ([\w-]{43})$/i,
  )?.[1];
  if (!raw) fail(401, "Attempt access token required.");
  const data = action === "answer" || (action === "finish" && req.body) ? await jsonBody(req) : null;
  let publicName;
  if (action === "finish" && data && Object.hasOwn(data, "publicName")) {
    publicName = data.publicName;
    if (publicName !== null) {
      publicName = field(publicName, 80);
      if (/[\p{C}]/u.test(publicName)) fail(400, "Use a printable name or initials.");
    }
  }
  return transaction(async (client) => {
    const a = (
      await client.query(
        "SELECT * FROM attempts WHERE id=$1 AND token_hash=$2 AND created_at>now()-interval '30 days' FOR UPDATE",
        [id, hash(raw)],
      )
    ).rows[0];
    if (!a) fail(404, "Attempt unavailable.");
    if (action === "delete") {
      if (a.certificate) {
        await client.query(
          "INSERT INTO revoked_records(code_hash,expires_at) SELECT $1,created_at+interval '30 days' FROM attempts WHERE id=$2 ON CONFLICT DO NOTHING",
          [hash(a.certificate), id],
        );
      }
      await client.query("DELETE FROM attempts WHERE id=$1", [id]);
      return send({ deleted: true });
    }
    if (action === "answer") {
      if (
        !between(index, 0, a.probes.length - 1) ||
        typeof data.answer !== "string" ||
        data.answer.length > 1024 ||
        !between(data.elapsedMs, 0, 86400000)
      )
        fail(400, "Invalid answer or timing.");
      const digest = keyed(key, "answer/" + data.answer);
      const saved = (
        await client.query(
          "SELECT correct,answer_hash FROM answers WHERE attempt_id=$1 AND position=$2",
          [id, index],
        )
      ).rows[0];
      if (saved) {
        if (saved.answer_hash !== digest)
          fail(409, "This probe already has a different answer.");
        return send({ correct: saved.correct });
      }
      if (a.issued_at) fail(409, "Attempt already completed.");
      const correct = digest === a.probes[index].digest;
      await client.query(
        "INSERT INTO answers(attempt_id,position,answer_hash,correct,elapsed_ms) VALUES($1,$2,$3,$4,$5)",
        [id, index, digest, correct, data.elapsedMs],
      );
      return send({ correct });
    }
    const { answered, score } = (
      await client.query(
        "SELECT count(*)::int AS answered,count(*) FILTER(WHERE correct)::int AS score FROM answers WHERE attempt_id=$1",
        [id],
      )
    ).rows[0];
    const total = a.probes.length;
    if (answered !== total) fail(409, "Answer every probe before finishing.");
    const code = a.certificate || certificate(key, id);
    if (!a.certificate)
      await client.query(
        "UPDATE attempts SET issued_at=now(),certificate=$2 WHERE id=$1",
        [id, code],
      );
    if (publicName !== undefined && publicName !== a.public_name) {
      await client.query("UPDATE attempts SET public_name=$2 WHERE id=$1", [id, publicName]);
    }
    return send({ code, score, total, band: grade(score, total), publicName: publicName === undefined ? a.public_name : publicName });
  });
}
async function verify(code) {
  const result = await database().query(
    `SELECT a.certificate AS code,a.problem,a.public_name AS "publicName",a.issued_at AS "issuedAt",p.item->>'kind' AS kind,b.correct,b.elapsed_ms AS "elapsedMs"
    FROM attempts a CROSS JOIN LATERAL jsonb_array_elements(a.probes) WITH ORDINALITY p(item,ord)
    JOIN answers b ON b.attempt_id=a.id AND b.position=p.ord-1
    WHERE certificate=$1 AND a.created_at>now()-interval '30 days' ORDER BY p.ord`,
    [code.toUpperCase()],
  );
  if (!result.rowCount) {
    const revoked = await database().query("SELECT 1 FROM revoked_records WHERE code_hash=$1 AND expires_at>now()", [hash(code.toUpperCase())]);
    if (revoked.rowCount) fail(410, "This record was revoked.");
    fail(404, "No current record matches this code.");
  }
  const { code: stored, problem, issuedAt } = result.rows[0];
  const outcomes = result.rows.map(({ kind, correct, elapsedMs }) => ({
    kind,
    correct,
    elapsedMs,
  }));
  const score = outcomes.filter((x) => x.correct).length,
    total = outcomes.length;
  return send({
    code: stored,
    publicName: result.rows[0].publicName,
    problem,
    issuedAt,
    outcomes,
    score,
    total,
    band: grade(score, total),
  });
}
const uuid =
  "([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})";
const attemptPattern = new RegExp(
  "^/attempts/" + uuid + "(?:/(finalize)|/answers/([0-4]))?$",
);
const cohortPattern = new RegExp("^/cohorts(?:/" + uuid + "(?:/(regenerate-code))?)?$");
export async function handle(req, context = {}) {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api(?=\/|$)/, "");
    const method = req.method;
    if (path === "/healthz" && method === "GET") return send({ status: "ok" });
    if (!["GET", "POST", "PUT", "DELETE"].includes(method))
      fail(405, "Method is unavailable.");
    if (
      method !== "GET" &&
      req.headers.has("origin") &&
      req.headers.get("origin") !== url.origin
    )
      fail(403, "Use the same origin.");
    if (path === "/readyz" && method === "GET") {
      await database().query("SELECT value FROM app_key WHERE singleton");
      return send({ status: "ready" });
    }
    const key = await getSigningKey();
    const auth = path.match(/^\/instructor\/(register|login|logout)$/);
    await limit(
      database(),
      key,
      (auth ? "auth/" : "requests/") + (context.ip || "unknown"),
      auth ? 15 : 300,
    );
    if (auth && method === "POST") return await accounts(req, auth[1]);
    if (path === "/attempts" && method === "POST")
      return await createAttempt(req, key);
    const a = path.match(attemptPattern);
    if (a) {
      if (a[2] && method === "POST")
        return await attemptAction(req, key, a[1], null, "finish");
      if (a[3] !== undefined && method === "PUT")
        return await attemptAction(req, key, a[1], Number(a[3]), "answer");
      if (!a[2] && a[3] === undefined && method === "DELETE")
        return await attemptAction(req, key, a[1], null, "delete");
      fail(405, "Method is unavailable.");
    }
    const c = path.match(cohortPattern);
    if (c) return await cohorts(req, c[1], c[2]);
    const v = path.match(/^\/verify\/(VCH(?:-[A-F0-9]{4}){4})$/i);
    if (v && method === "GET") return await verify(v[1]);
    fail(404, "Resource unavailable.");
  } catch (err) {
    const status = err.status || 503;
    return send(
      {
        error: err.status
          ? err.message
          : "Shared sessions are temporarily unavailable.",
      },
      status,
    );
  }
}
