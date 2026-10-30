# Application availability

`application_health.yml` checks production every ten minutes using Chromium.
It fetches the actual document, JavaScript and `/api/environment`, and requires
the rendered Angular shell without an error alert. The check has no credentials
and does not invoke test fixtures, cleanup endpoints or authenticated features.
It blocks the outgoing Microsoft sign-in navigation only so the rendered shell
can be inspected. It does not certify that sign-in or authenticated features work.

Run it manually with:

```sh
cd test
npx playwright test --config playwright.availability.config.ts
```

Observatory consumes the latest main-branch workflow result. A successful run
expires after 30 minutes; GitHub schedule delays may therefore produce unknown
availability. Failed runs retain screenshots and traces for seven days.

Bootstrap errors render an accessible error and retry button. Regression tests
can run against a built client without backend services:

```sh
APPLICATION_URL=http://localhost:8190 npx playwright test --config playwright.startup.config.ts
```

The native backend requires `-H:+SharedArenaSupport`: Netty's Java 25 cleaner
uses `Arena.ofShared` when the ElevenLabs voice client opens its connection.
Without this build flag the native backend can pass database readiness checks
while `/api/environment` fails and prevents Angular startup. Verify this path
against a native image, since JVM tests cannot detect that missing support.
