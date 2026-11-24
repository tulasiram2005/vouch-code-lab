// Read-only checks against the published site. No accounts, tokens or test records.
import assert from "node:assert/strict";
const origin = "https://vouch-code-lab.netlify.app";
async function check(path, status) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, path);
  assert.ok(response.headers.get("strict-transport-security"), path);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
  if (path.startsWith("/api/")) assert.match(response.headers.get("cache-control") || "", /\bno-store\b/);
  console.log(status, path);
  return response;
}
const landing = await check("/", 200);
assert.match(landing.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
assert.match(await landing.text(), /Vouch/);
for (const [path, expected] of [["/api/healthz","ok"], ["/api/readyz","ready"]]) {
  assert.equal((await (await check(path, 200)).json()).status, expected);
}
await check("/api/cohorts", 401);
assert.match(await (await check("/v/VCH-SAMPLE", 200)).text(), /id="main"/);
