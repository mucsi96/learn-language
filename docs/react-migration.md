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

## Responsive layout coverage

`study-card-strategies.spec.ts` checks all four card types at three viewport
sizes, including geometry, safe-area, and long-content scrolling assertions.

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
