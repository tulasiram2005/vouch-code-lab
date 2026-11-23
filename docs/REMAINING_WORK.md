# Follow-up work

The hosted learner round, instructor API, cohort persistence, certificate lookup and revocation passed release smoke tests. Production is deployed from main.

- Run the full automated browser and axe suite on a runner that supports Playwright Chromium. The manual production browser walkthrough and API integration tests are recorded in EVIDENCE.md.
- Benchmark sustained concurrent traffic on a disposable environment before setting a classroom capacity target.
- Validate question clarity with learners and instructors. The synthetic generator evaluation measures question yield.
- Rehearse data recovery and validate scheduled expiry after records reach the retention window.
