# React frontend migration

The frontend follows the React/Vite reference in `mucsi96/skeleton-app`, with
domain-specific feature modules for study, creation, sources, administration,
settings, word triage, and listening.

## Compatibility contracts

- API routes and persisted card data remain compatible with the existing server.
  Zod validates responses; loose card-data objects preserve additional persisted
  fields during editing.
- The gateway retains OAuth credentials. The browser retrieves profile data from
  `/oauth2/userinfo` and uses same-origin requests without bearer tokens.
- Vite produces `client/dist`; the existing static release and Blob preparation
  scripts consume that directory. Lazy module imports remain relative to their
  deployed asset origin.
- Study scheduling uses the same FSRS configuration and serialized field names.
  Timezone-less server card timestamps are interpreted as UTC, including in
  non-UTC browsers. Pomodoro state remains scoped to the browser tab.

## Visual review

`frontend-visual.spec.ts` covers desktop, tablet, and mobile overview, profile
menu, source list, empty states, source dialog, settings, API errors/retry, and a
deterministically held request. `study-card-strategies.spec.ts` covers the front
and back of all four card types at three viewport sizes, alongside geometry and
safe-area assertions.

The Angular baseline was captured before replacing the frontend. React snapshots
are reviewed as new baselines because the component library and theme changed;
behavioral assertions continue to check the application's contracts.

Observed improvements and library proposals are recorded in
[react-ui-feedback.md](react-ui-feedback.md).

## Verification workflow

Build the frontend before running browser tests against the test pod. Serialize
builds and Playwright runs: the static server reads `client/dist`, and rebuilding
during a test would remove chunks that an already-open page may still request.
The test database is also shared, so run its suites through one coordinator.

```sh
cd client
npm run lint
npm run build
cd ../test
npm test
```

After intentionally changing a visual baseline, inspect the generated images and
rerun the affected suites without `--update-snapshots`.

## Migration verification results

- Lint, TypeScript, production build, static Blob artifact preparation, and diff
  whitespace checks passed.
- The complete 635-test behavioral run passed 597 tests and exposed 38 failures.
  After fixes, the affected-suite run passed 127 of 129 tests, including all 37
  visual/geometry tests without updating snapshots. The final regression run
  passed all 16 tests, covering the last two failures and the entire triage suite.
- Every full-run failure passed on retest. These are cumulative results across
  the full run and targeted verification, not a single green full-suite run.
