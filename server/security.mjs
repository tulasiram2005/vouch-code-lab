import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const keyed = (key, value) =>
  createHmac("sha256", key).update(value).digest("hex");
export const token = () => randomBytes(32).toString("base64url");
export function certificate(key, id) {
  const h = keyed(key, "certificate/" + id)
    .slice(0, 16)
    .toUpperCase();
  return "VCH-" + h.match(/.{4}/g).join("-");
}
export function grade(score, total) {
  const ratio = score / total;
  return ratio >= 0.8 ? "Solid" : ratio >= 0.4 ? "Partial" : "Shaky";
}
export function field(value, max = 100, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max
  )
    fail(400, "Check the submitted fields.");
  return value.trim();
}
export async function passwordHash(
  password,
  salt = randomBytes(16).toString("hex"),
) {
  const key = await derive(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return salt + "." + key.toString("hex");
}
export async function passwordMatches(password, stored) {
  const [salt] = stored.split(".");
  const actual = await passwordHash(password, salt);
  return (
    actual.length === stored.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(stored))
  );
}
export async function limit(db, key, scope, max) {
  const result = await db.query(
    `INSERT INTO rate_windows AS w(scope_hash,hits) VALUES($1,1)
    ON CONFLICT(scope_hash) DO UPDATE SET
    hits=CASE WHEN w.started_at < now()-interval '10 minutes' THEN 1 ELSE least(w.hits+1,1000000) END,
    started_at=CASE WHEN w.started_at < now()-interval '10 minutes' THEN now() ELSE w.started_at END
    RETURNING hits`,
    [keyed(key, "quota/" + scope)],
  );
  if (result.rows[0].hits > max) fail(429, "Please try again in ten minutes.");
}
export async function jsonBody(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers.get("content-type") || ""))
    fail(415, "Send a JSON body.");
  const reader = req.body?.getReader();
  if (!reader) fail(400, "A JSON object is required.");
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 16384) {
      await reader.cancel();
      fail(413, "Request is too large.");
    }
    chunks.push(Buffer.from(value));
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    fail(400, "Invalid JSON.");
  }
  if (!data || Array.isArray(data) || typeof data !== "object")
    fail(400, "A JSON object is required.");
  return data;
}
