# Learn Language frontend

React 19, Vite, TypeScript, TanStack Query, Zod, and `@mucsi96/react-ui`.
Use Node 24 or newer.

```sh
npm ci
npm start          # http://localhost:4270
npm run lint
npm run typecheck
npm run build     # static files in dist/
npm run preview
```

The development proxy forwards same-origin API, profile, and telemetry requests
to the local test gateway on port 8170. Supply a gateway-authenticated session
for interactive development; browser OAuth tokens are never used.

Feature pages live under `src/features`, common UI under `src/components`, and
validated API contracts under `src/api`. Server state belongs in TanStack Query;
forms, selection, and transient presentation state use React hooks. Styles are
colocated CSS Modules. The FSRS scheduler remains a domain module independent of
React. Persisted card data keeps its existing schema.

The Vite base is relative for Blob-hosted module imports. The document base keeps
deep-link navigation working with the local static server; `prepare-client.mjs`
rewrites document asset references to the public Blob origin for deployment.
The build output and release artifact contracts remain `client/dist` and
`client-static.tar.gz`.

Behavior and visual regression tests are Playwright E2E tests in `../test`.
With the test pod running and this client built:

```sh
cd ../test
npm test
npx playwright test frontend-visual.spec.ts
```

Review visual changes before updating snapshots with `--update-snapshots`.
