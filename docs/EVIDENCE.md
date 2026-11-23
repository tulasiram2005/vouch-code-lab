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
