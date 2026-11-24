# Vouch Code Lab

Vouch is a Python code-reading studio for learners and instructors. A learner edits a function, runs its examples, then answers questions about one-line changes to their implementation. An instructor can assign a problem to a cohort and review the recorded outcomes. [Exercise catalog](public/problems.json) · [Generator tests](tests/test_engine.py) · [Cohort and record integration tests](tests/api.test.mjs)

[Open the studio](https://vouch-code-lab.netlify.app/) · [Problem library](https://vouch-code-lab.netlify.app/#/library) · [Instructor desk](https://vouch-code-lab.netlify.app/#/instructor) · [Sample certificate](https://vouch-code-lab.netlify.app/v/VCH-SAMPLE)

## Try a round

Open **Count the positives**. Run the examples, then start a round. Compare the original and changed lines, choose an answer with A–D or 1–4, and select **Check answer**. On the result page, choose whether to share initials or a full name. Anyone with the link can look up the recorded round. The record cannot establish who wrote the code. [Browser journey](tests/browser.mjs) · [API contract](docs/API.md)

## Technology and verification

| Layer | Implementation | Evidence |
| --- | --- | --- |
| Interface | HTML, CSS and browser JavaScript. CodeMirror 6 supplies Python highlighting and line numbers. Gloock, Schibsted Grotesk and IBM Plex Mono are self-hosted. | [Editor setup](editor/) · [Theme and font checks](tests/browser.mjs) |
| Python | Pyodide runs in a Web Worker. The generator uses Python's AST to mutate code and compare executions. | [Shipped WebAssembly smoke test](tests/runtime-smoke.cjs) · [Generator evaluation](tests/evaluate.py) |
| Shared records | Node.js, Netlify Functions, node-postgres and Supabase PostgreSQL. The server uses a private database connection. | [Database integration tests](tests/api.test.mjs) · [Operations and privacy](docs/API.md) |
| Delivery | GitHub, GitHub Actions and Netlify. Browser checks use Playwright Chromium and axe-core. | [Browser workflow](.github/workflows/browser.yml) · [Six passing configurations](https://github.com/tulasiram2005/vouch-code-lab/actions/runs/45424534591) · [Recorded measurements](docs/EVIDENCE.md) |

## Run locally

Use Node 22, Python 3.11+ for tests, and PostgreSQL 16 for shared records. Run `npm ci` and `npm start`, then open http://127.0.0.1:4173. Set a server-side `DATABASE_URL` and run `npm run db:migrate` to enable the shared features. The database integration test uses a separate `TEST_DATABASE_URL`. [CI setup and commands](.github/workflows/browser.yml)

## Project links

[Release status](docs/STATUS.md) · [Remaining work](docs/REMAINING_WORK.md) · [Design references and licenses](docs/design/REFERENCES.md) · [CodeMirror](https://codemirror.net/) · [Pyodide](https://pyodide.org/) · [PostgreSQL](https://www.postgresql.org/) · [Supabase](https://supabase.com/) · [Netlify](https://www.netlify.com/) · [Playwright](https://playwright.dev/) · [axe-core](https://github.com/dequelabs/axe-core)
