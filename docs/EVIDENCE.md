# Verification evidence

Local checks on macOS, 21 November 2026, Node 22.19.0.

| Check | Observed result |
|---|---|
| python3 -m unittest discover -s tests -p 'test_*.py' | Nine tests passed at the initial engine checkpoint. |
| node tests/runtime-smoke.cjs | Self-hosted WebAssembly runtime generated five probes for each of six shipped starters. |
| npm run test:api with a disposable TEST_DATABASE_URL | Six tests passed. The database test exercised concurrent answer and finalization retries, isolation, public lookup and deletion against real PostgreSQL. |
| npm audit --omit=dev | Zero reported vulnerabilities in the locked production npm graph at check time. Vendored WebAssembly and fonts are outside npm audit coverage. |
| Interactive local browser | Ran all four examples for Count the positives, answered five generated questions, reviewed score and explanations. Local fallback correctly identified a round without shared storage. |
