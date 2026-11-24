# Vouch delivery log

| Milestone | Evidence |
|---|---|
| Repository | Private GitHub repository created and linked to local main. |
| Browser practice | Six exercises, editable examples, local WebAssembly, executable mutation questions, review and device drafts implemented. |
| Shared records | Real PostgreSQL integration checks passed for instructor accounts, cohorts, attempts, verification and deletion. |
| Interface | Responsive dark and light interface, self-hosted fonts, keyboard controls and printable result. |
| Release | See REMAINING_WORK.md for deployment and remaining evaluation. |

Resume by fetching main, reading EVIDENCE.md and REMAINING_WORK.md, and checking whether the active hosting workflow has completed.

## Production release · 23 November 2026

The Git-backed production site is live at https://vouch-code-lab.netlify.app/. Netlify serves the frontend and API. A dedicated Supabase Free PostgreSQL project stores instructor, cohort and certificate records. The earlier manual Netlify deployment is a frontend-only preview. Use the Git-backed address for sharing.

Changes on main trigger production deployment. The build checks JavaScript syntax, runs the API and Python unit suites, and boots the vendored WebAssembly runtime. The integration test uses a separate disposable PostgreSQL database when TEST_DATABASE_URL is supplied.

## Polish release · 24 November 2026

Commit `ef37aea` passed all six Chromium configurations and is live on the production site. The release includes the Python editor and test diffs, keyboard round navigation, instructor invitation controls, opt-in public names, printable records, and the public verification updates. See [verification evidence](EVIDENCE.md) for coverage and limits, and [remaining work](REMAINING_WORK.md) for follow-up.
