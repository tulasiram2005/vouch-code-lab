# Verification evidence

Local checks on macOS, 21 November 2026, Node 22.19.0.

| Check | Observed result |
|---|---|
| python3 -m unittest discover -s tests -p 'test_*.py' | Nine tests passed at the initial engine checkpoint. |
| node tests/runtime-smoke.cjs | Self-hosted WebAssembly runtime generated five probes for each of six shipped starters. |
| npm run test:api with a disposable TEST_DATABASE_URL | Six tests passed. The database test exercised concurrent answer and finalization retries, isolation, public lookup and deletion against real PostgreSQL. |
| npm audit --omit=dev | Zero reported vulnerabilities in the locked production npm graph at check time. Vendored WebAssembly and fonts are outside npm audit coverage. |
| Interactive local browser | Ran all four examples for Count the positives, answered five generated questions, reviewed score and explanations. Local fallback correctly identified a round without shared storage. |

On 23 November 2026, `python3 tests/evaluate.py` generated 300 probes across 60 synthetic implementations (five for each implementation). Across these runs the engine examined 337 mutants, including 22 equivalent on the tested input pool. These results measure generator behavior on the supplied fixtures. Classroom learning outcomes require a separate study.

Production checks on 23 November 2026 used the Git-backed vouch-code-lab.netlify.app site. The health and readiness endpoints returned HTTP 200. A browser ran the starter tests, generated a five-question round, submitted answers and opened its issued certificate. A separate HTTPS smoke test registered a disposable instructor, signed out and back in, created a cohort, recorded five answers, finalized the result, checked the cohort board and certificate, then deleted the attempt and verified HTTP 404 on its former certificate. The disposable account was removed after testing.

The production learner screenshot and live round screenshot are in docs/screens. The database connector uses TLS with hostname and provider root certificate verification. The app role is restricted to the private vouch schema and has read-only access to the signing key table.

## Polish release · 24 November 2026

[GitHub Actions run 45424534591](https://github.com/tulasiram2005/vouch-code-lab/actions/runs/45424534591) tested commit `ef37aea`. All six Chromium jobs passed with a disposable PostgreSQL 16 service over HTTPS. Each visited 14 states at one viewport and theme, for 84 axe scans. Axe reported zero violations, and the page-width check found no horizontal overflow above its one-pixel tolerance.

| Viewport | Light | Dark |
| --- | --- | --- |
| 360 × 900 | 14 clean scans | 14 clean scans |
| 768 × 900 | 14 clean scans | 14 clean scans |
| 1440 × 900 | 14 clean scans | 14 clean scans |

The journeys exercised live Python execution, a deliberately failing implementation, keyboard answers, a round reload, an instructor invitation rotation, opt-in initials, print-media visibility and certificate revocation. Each job checked the loaded Gloock face, the inline code font, CodeMirror Python tokens and line numbers, and 44-pixel step targets. Print checks used Chromium print emulation. Physical printing, Safari, Firefox and assistive-technology walkthroughs were outside this matrix.

The API suite passed all six tests, including PostgreSQL integration. All nine Python tests passed. The vendored runtime generated five probes on each of six starters. A local production dependency audit reported zero known vulnerabilities, and Gitleaks found no secrets in its Git history scan.

After deployment, ten production files matched the local release byte for byte, including the app, page markup, social card, favicons and sitemap. The database readiness endpoint and sample route responded successfully. An HTTPS smoke check created a disposable five-answer attempt, published initials, verified the score and initials, deleted the attempt and observed HTTP 410 on the revoked code.

## Repository and deployment review · 24 November 2026

A fresh install, migration and startup on a disposable PostgreSQL database returned readiness. All six API and nine Python tests passed, and each starter generated five probes in the shipped WebAssembly runtime. Rebuilding the editor from source with esbuild 0.28.1 produced a byte-identical bundle.

Gitleaks reported zero findings across all fetched Git refs and in an exported tracked tree with archive inspection enabled to one level. The npm audit of the locked graph reported zero known vulnerabilities. The separate Pyodide distribution is outside npm audit coverage. Deployment checks observed HSTS, a restrictive document CSP, no-store caching on API responses, and HTTP 401 for unauthenticated cohort access. The checked deploy preview returned HTTP 503 with shared sessions unavailable. [Repeat the read-only production check](../tests/live.mjs)
