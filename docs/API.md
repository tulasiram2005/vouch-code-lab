# Shared rounds and cohorts

Vouch serves its browser app and API on one origin. The API accepts JSON and returns an error object with an `error` string on failure. Passwords, access tokens, source fingerprints and expected answers belong outside logs.

## Running the full stack

Use Node 22 and PostgreSQL 16 or later. Install the pinned dependencies with `npm ci`. For an external PostgreSQL instance, provide its connection string through a server-only `DATABASE_URL`, run `npm run db:migrate`, then `npm start`. The local default is http://127.0.0.1:4173. Set `PORT` to select another port. An HTTPS reverse proxy should supply the intended public `APP_ORIGIN`. Production Netlify routing uses the request origin directly.

Netlify Functions use a server-only DATABASE_URL. The deploy migration lives under `db/migrations/`. A missing or unmigrated database produces HTTP 503 for shared features. The landing page and the browser's local practice mode still work. The initial migration creates a random, persistent HMAC signing key in the database. There is no client API key. Restrict database access to the server.

To run the database integration suite, set `TEST_DATABASE_URL` to a disposable PostgreSQL database where the user can create schemas. Run `npm run test:api`. The test creates and removes its own unique schema and covers simultaneous retries, conflicting answers, cross-instructor access, public certificate redaction, deletion and session revocation. The suite skips the integration case when the variable is absent.

## Resources

| Method and path | Purpose |
| --- | --- |
| GET /api/healthz | Return process health |
| GET /api/readyz | Check access to the migrated database |
| POST /api/attempts | Create an attempt from a problem ID, SHA-256 source fingerprint, probe kinds and expected choice strings, plus optional cohort code and display name |
| PUT /api/attempts/:id/answers/:index | Record a choice and elapsed milliseconds using the learner's bearer token |
| POST /api/attempts/:id/finalize | Issue or retrieve the completed attempt's certificate |
| DELETE /api/attempts/:id | Delete with the bearer token and immediately revoke the verification link |
| GET /api/verify/:code | Return problem, score, band, issue time and per-probe correctness and elapsed time |
| POST /api/instructor/register | Create an instructor account |
| POST /api/instructor/login | Open an instructor session |
| POST /api/instructor/logout | Revoke the current session |
| GET or POST /api/cohorts | List owned cohorts or create a cohort with a name and an assigned problem |
| GET /api/cohorts/:id | Read a board for an owned cohort, capped at the newest 1,000 attempts |
| POST /api/cohorts/:id/regenerate-code | Replace the owned cohort’s join code. Submit `currentCode` to prevent a stale tab from replacing a newly issued code. |

## Integrity and privacy

The database stores keyed digests of learner and expected answers and a SHA-256 source fingerprint. Each attempt has a high-entropy bearer token whose digest is stored. A row lock serializes answer writes and finalization on each attempt. Retrying an identical answer returns its original correctness. A changed answer returns 409. Finalization requires every answer, issues one certificate, and returns the same certificate on retry.

Expected answers originate in the learner-controlled browser. A modified client can fabricate a round. Public verification attests that Vouch recorded this result. It does not establish authorship or independently validate client-side execution. The public response excludes names, source, source fingerprints, answers, email addresses, course codes and account identifiers. Anyone given the verification link can view the reported timings and outcomes.

Instructor passwords use scrypt (N=32768, r=8, p=1) with independent random salts. Session cookies are Secure, HttpOnly, SameSite=Strict, and expire after eight hours. Database-backed rate windows count requests by a keyed IP digest and cohort joins by a keyed code digest. Dynamic responses use no-store caching so account data and revoked certificates cannot be reused by shared caches. All database values use parameters.

Attempts cease to be accessible after 30 days. A daily Netlify scheduled function deletes expired attempts with cascading answers, expired sessions and old rate-limit records. Physical removal can lag the cutoff until the next successful run. For a non-Netlify installation schedule `node --input-type=module -e "import('./server/db.mjs').then(m => m.purgeExpired())"` daily. Instructor accounts and cohorts persist independently.
