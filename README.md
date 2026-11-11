# learn-language
Tools for language learning

## Gateway authentication and static hosting

The gateway signs users in before serving Angular documents. A per-app
oauth2-proxy keeps OAuth tokens in shared Redis and uses a Secure, HttpOnly,
host-only `__Host-session` cookie. The browser reads its display profile from
`/oauth2/userinfo`; it neither stores nor refreshes OAuth tokens. Legacy `oidc.*`
storage entries are removed on startup without clearing application preferences.

The API retains JWT issuer, audience, scope and role checks. All authenticated
mutation endpoints require an exact `Origin` match with `app-origin`, including
requests whose bearer token was supplied by the gateway. Missing, `null` and
foreign origins are rejected. Dictionary and known-card export keep their
separate scoped API-token authentication. `/api/environment` still supplies live
AI settings and voices and supports the loopback bootstrap-health check; it no
longer supplies OAuth or telemetry settings. The public gateway must authenticate
this endpoint along with the other browser APIs.

CI builds a static Angular artifact, tests it behind Traefik with stock nginx,
and publishes the same files to Azure Blob `assets` before publishing index HTML
to `$web`. Before uploading, deployment empties `$web` and `assets`, including any
old release directories. Only the latest build is published, without a release
prefix; downtime during deployment is intentional. Assets, including the manifest,
use `public, max-age=31536000, immutable`; index uploads last with `no-store`.
A failed deletion or upload stops deployment. Deleting blobs does not clear
browser caches for unchanged asset URLs.
The `static-client-app` chart authenticates documents, rewrites deep links, and
strips credentials before contacting the verified HTTPS storage website origin.
Browser assets load directly from Blob storage with anonymous CORS. Manifest
navigation remains on the app origin; Roboto and Material Icons are bundled.
Faro's `learn-language-client` name and same-origin `/_telemetry/collect` endpoint
are compiled into the client. Client releases contain `client-static.tar.gz`,
not a container image.

### Platform prerequisites and cutover

Before merging/deploying this migration, provision the learn-language equivalents
of [the shared platform pattern](https://github.com/mucsi96/skeleton-app/issues/105):

The application infrastructure lives in
[`p07/learn_language.tf`](https://github.com/mucsi96/p07/blob/main/learn_language.tf).
At implementation time it still uses the SPA registration and does not provision
the gateway session or static storage resources below.

- A per-app Entra web client/oauth2-proxy with the existing API audience, scope
  and role assignments, shared Redis, and narrow OAuth routes. Publish Key Vault
  `forward-auth-config` with `release_name` and
  `auth: {proxyService, proxyPort: 80, mode: "api-token"}`.
- Preserve **exact** session-gate exclusions for `POST /api/dictionary` and
  `GET /api/known-cards`, routing directly to the backend and retaining their
  caller bearer headers. These endpoints validate their own scoped tokens.
  Do not exclude `/api/environment` or the whole API prefix.
- Azure static website storage and a public-read `assets` container. Publish
  `client-storage-config` with `account_name`, website `hostname`, and
  `assets_base_url` (`https://<account>.blob.core.windows.net/assets/`). Restrict
  Blob CORS to the app's exact origin and GET/HEAD/OPTIONS.
- Give the existing federated deployment identity read access to those secrets,
  Storage Blob Data Contributor scoped to `$web` and `assets`, and namespace-only
  permissions for chart Middleware/TraefikService resources. No storage keys or
  SAS tokens are used.
- Route exact same-origin telemetry POST/OPTIONS to the Faro collector with
  credential stripping and existing origin/rate controls.

Deployment pins published `spring-app` 37.0.0 and `static-client-app` 5.0.0 and
uses `--reset-values` to remove old chart configuration. The API image, workload
identity, persistent volume, resource limits and release names are preserved.
Coordinate the gateway cutover with the app deployment; older browser bundles
need a reload and a fresh gateway sign-in. Platform provisioning and production
rollout are separate from this repository's implementation.

Local verification (test pod running):

```bash
cd test
npx playwright test gateway-auth.spec.ts profile.spec.ts sources.spec.ts dictionary.spec.ts extract-known-cards.spec.ts
```

App tests supply a mock gateway identity using real JWTs from the mock issuer;
they do not implement oauth2-proxy/Redis. Actual session redirects, cookie
isolation and gateway policies are covered by the shared chart integration suite.
After provisioning, smoke-test signed-out document redirects/API 401s, signed-in
deep links, role denial, mutation origins, dictionary/export tokens, and telemetry.
For local Angular development, provide a gateway session/proxy in front of the
dev server; the app no longer performs a direct Entra login.

CI runs the browser in Microsoft's prebuilt Playwright container, with its version
read from the installed test dependency. This includes the browser's Linux
dependencies without installing Ubuntu packages on the runner. The browser server
binds to loopback port 3075 using host networking; tests still run on the host so
database helpers and Podman restart tests retain access to the test stack.
`PLAYWRIGHT_WS_ENDPOINT` selects this remote browser connection; local tests use
their installed browser when the variable is unset.

## JSON card sources

In **Sources → Add Source**, choose **JSON** and select the card types to import:
Vocabulary, Speech, Grammar, or Simple. Open **Pages → Import JSON** and choose
one of that source's card types. The example and validation update with the selection.
Imports create drafts; existing matching IDs in the same source and card type update
their content while retaining scheduling and review history.

Each entry requires a unique string `id`. The type-specific fields are:

- **Vocabulary:** required `word`; optional `hu`, `en`, `ch` translations and a
  German `example` sentence.
- **Speech:** required German `sentence`; optional `hu`, `en`, `ch` translations.
- **Grammar:** required German `sentence`; optional `hu`, `grammarTopic`, and `hint`.
- **Simple:** required `frontText` and `backText` (Markdown); optional `topic` and `category`.

All fields are strings. Unknown fields and duplicate IDs within a batch are rejected.
Use the existing draft completion workflow to generate missing translations and media.

Regression coverage: `cd test && npx playwright test json-source.spec.ts`.

## FSRS scheduling

The client uses the ts-fsrs v6 `defineScheduler` API with **FSRS-6** and its
default 21 weights. The explicit middleware preserves 90% desired retention,
disabled fuzzing, 1/10-minute learning steps, a 10-minute relearning step,
UTC calendar-day intervals, and a 36,500-day maximum interval.

Existing database cards and review history retain their application schema.
The client validates cards at the scheduler boundary, reuses their IDs, and
maps scheduling results to the existing API. `elapsedDays` is derived from the
previous and current review timestamps; reset/new cards use zero. Stored review
logs are application records, not v6 rollback snapshots.

Migration reference: https://open-spaced-repetition.github.io/ts-fsrs/guide/migration.html
Regression coverage: `cd test && npx playwright test study-page.spec.ts -g 'v6 scheduling'`.

## Bootstrap health

Spring readiness includes a `bootstrap` indicator alongside `readinessState` and
`db`. Every 15 seconds, it requests `/api/environment` over loopback on the actual
application port, exercising the same configuration and voice-loading path used
by the frontend. A non-200 response or a three-second timeout reports `DOWN`.
The health endpoint reads the cached result, so Kubernetes probes do not each
trigger a provider request. Missing results and results older than 45 seconds
also report `DOWN`; successful checks restore readiness automatically.

Liveness remains independent of bootstrap dependencies. This detects backend
bootstrap failures, including native failures surfaced as HTTP 500; it does not
test JavaScript rendering or external ingress. The local native-stack regression
test is `cd test && npx playwright test bootstrap-health.spec.ts`.

## ElevenLabs v4 audio

New ElevenLabs voice configurations default to **Eleven v4** (`eleven_v4`) in
**Settings → Voices**. Existing v3 and Turbo v2.5 configurations keep their model;
add a v4 configuration and disable the old one to opt in. Preview and card audio
generation use the selected model, with an estimated v4 cost of $0.08 per 1,000
characters ([API pricing](https://elevenlabs.io/pricing/api)).

V4 receives the original text and the target language code, retaining punctuation
and any audio tags. It uses native target-language pronunciation rather than the
v3-specific language prompting workaround. No SSML or speed/style overrides are
added. Compare your chosen voices in Preview: v4's cross-language accent handling
and cloning differ from v3 ([model guide](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4)).

Voice previews use up to ten vocabulary cards with nonblank words, prioritizing
recently reviewed cards over unreviewed cards. Other card types do not displace
these samples. The preview reads the word/translation and selected example in the
voice's language; Play is disabled when that language has no text. If there are
no eligible vocabulary cards, the preview explains why it is empty.

## Study progress

The study grading area reports due cards as colored dots, one per card: blue for New,
green for Learning, amber for Review, and red for Relearning. Each dot has a state
label for assistive technology and a hover title. Dots update after grading and
switching sources; large queues wrap within a bounded scrollable area. On desktop
and tablet (768px and wider), dots are left-aligned and fill the space before the
Incorrect and Correct buttons. On smaller screens, they occupy a full-width row
below the buttons. Dots remain visible while the answer is hidden.

## Study Pomodoro

Starting or continuing a study session automatically starts a
25-minute Pomodoro if there is no active countdown, including when the previous
timer has expired. An already-running timer keeps its deadline; a paused timer
stays paused. A linear progress
bar fills along the bottom of the screen over 25 minutes instead of displaying
remaining time. The bar,
its controls, and the break announcement appear only on study routes. Switching sources,
returning home, and reloading the page all keep its deadline. The countdown is
stored for the current browser tab. At zero, the
full bar blinks and announces that it is time for a break; studying can continue.
Reduced-motion settings disable the blinking.

On study routes, the avatar menu offers **Pause Pomodoro** while running and
**Resume Pomodoro** while paused. Pausing freezes the progress bar and preserves
the remaining time across navigation, source changes, and reloads in this tab.
Resuming counts down only that remaining time.

Choose **Reset Pomodoro** in the avatar menu while studying to
**start a new study session** and reset the countdown to 25 minutes.
A failed session restart keeps
the existing countdown. This replaces that source's current queue with currently due
cards using its card limits and partner settings.
Card progress and review history are preserved. Other sources' sessions are
unaffected.
Reset is available for running, paused, and expired timers. Outside an active
study session it resets only the timer. The partner turn indicator remains in the
header beside the source selector.

The installed iPad app uses the non-overlay system status bar, keeping the clock
and battery indicators above the application header. Safe-area padding is retained
for devices with display cutouts. After updating, reopen the installed app to pick
up the status-bar setting.

Study pages keep the header outside the scrolling content. All card types use
the remaining viewport height, including safe-area insets, with grading controls
below the card. Vocabulary and speech images share responsive sizing with a
minimum mobile height. Images fill their panel in both iPad orientations; unusually long
content remains scrollable without moving the header into the system status bar.

Cross-card layout coverage: `cd test && npx playwright test study-card-strategies.spec.ts`.
The tests save top/scrolled screenshots for each card type and viewport. Set
`STUDY_SCREENSHOT_IMAGE` to an absolute image path to capture the vocabulary and
speech examples with a realistic illustration instead of the test image.

## Audio collections

In **Sources → Add Source**, choose **Audio Collection**, enter a name, language
level, and **Collection folder** within the private Azure container
`ibari/learn-language`. For example, name a source **Deutsch lernen durch Hören
A1–A2** and set its folder to `stories/deutsch-lernen-durch-hoeren-a1-a2/`.
Collection paths use lowercase slug folders and a trailing slash; nested folders
are supported. A source's collection is fixed after creation. Additional
collections require only uploaded files and a new source, with no provider code.
Each story is a numbered folder such as `209-brezel/` containing `audio.mp3` and
UTF-8 `text.txt` (title on the first line, followed by the story).
Stories sort by their three-digit folder number. Incomplete pairs fail discovery.

The backend uses `DefaultAzureCredential`: its workload identity needs **Storage
Blob Data Reader** on this container. Local development uses `az login`.
Storage remains private; credentials and direct storage URLs never reach the
browser. The app performs no website scraping, source-extraction AI calls, or
YouTube requests. Only vocabulary generation uses the **Extraction** data model.

- Open **Stories** from the source's actions menu to browse the catalogue.
- Opening a story prepares vocabulary directly from its stored text in the
  background. Text and successful AI results are cached persistently. Reopening
  a story does not repeat preparation. Failed vocabulary jobs resume from the
  cached transcript, without another download or text-isolation AI call.
- Every catalogue request lists the Azure container under the source's collection
  folder and reads current story titles directly from storage. New and removed
  stories appear on the next visit or **Refresh catalogue**; storage failures are
  reported instead of serving a saved catalogue. Stable story IDs, preparation,
  and listening progress remain persisted, including for temporarily removed stories.
- Select missing words to create drafts, then use the existing draft-card
  workflow to enrich and review them. Cards in the same source group are reused.
  Noun cards include their definite article (for example, `das Haus`).
- The home page's **Listen** action unlocks a story only when every extracted
  word is known or has a `READY` card reviewed at least twice. Listening progress is saved per
  user, including backward seeks, and restored on return. Recordings use native
  HTML audio through a same-origin, session-protected endpoint with byte-range
  support. Audio downloads once to persistent server storage, when first played.
  Playback duration comes from the audio file rather than an external catalogue.

The upgrade migrates existing numbered story IDs in place, preserving content
UUIDs, prepared vocabulary, cards, and listening positions. It retires the source
extraction model setting while retaining historical usage logs.
Existing extension sources become `audioCollection` sources with a
`collectionPath`. The extension registry, descriptors, capability API, and
provider implementations have been removed. Vocabulary uses ordinary vocabulary
cards; listening progress remains separate from spaced-repetition reviews.

Progress is saved every five seconds during playback, on pause/completion and
detected seeks, and best-effort when leaving the page. A local pending-write
buffer retries unsent updates. The player can resume a saved position without
autoplaying. Abrupt browser termination may lose the last unsaved interval. Locked
stories do not download audio. Progress writes recheck card
eligibility and stale playback sessions cannot overwrite newer progress.

`AudioCollectionService` reads catalogue metadata and plain story text. Core services
handle vocabulary jobs, group-wide card coverage, media delivery, and progress.
The test profile exercises the Azure SDK against a paginated local Blob REST
fixture with real MP3 audio and two independent collections.

Focused E2E coverage:

```bash
npm test -- source-content.spec.ts
```

Run this from `test/` with the test pod running. The restart-persistence scenario
uses Podman to restart `learn-language-test-server`.

### Cache storage and lifetime

Application cache audit for [#454](https://github.com/mucsi96/learn-language/issues/454):

| Data | Storage and lifetime |
|------|----------------------|
| Story catalogue | Discovered live from the Azure container and collection folder on every listing, including current titles. `content_items` preserves stable identities and preparation, but saved rows do not determine catalogue membership. |
| Story text and AI vocabulary | Checkpoints in `content_items.preparation`, retained across restarts and catalogue refreshes. Versioned migrations deliberately invalidate vocabulary when extraction rules change. Atomic SQL upserts and lease updates preserve preparation during concurrent discovery and background work. |
| Downloaded transcript/audio assets | Container-and-blob-name-hashed files under `STORAGE_DIRECTORY/content-assets`, written by atomic rename and reused without expiry. Treat published story files as immutable; the storage volume must persist across deployments. |
| Listening progress | PostgreSQL `listening_progress`, scoped to source, story, and user. The four-hour expiry applies to write sessions, not saved positions. Browser local storage buffers unsent writes until acknowledged. |
| Documents and saved card content | PostgreSQL document metadata/card entities; audio, images, and PDFs use the persistent storage volume. Audio/image responses advertise immutable caching. PDF page spans are extracted on request, not cached. Pending-photo previews use `no-store`. |
| Voice-setting previews | Component-local `audioCache`, keyed by text, voice, model, and language. It avoids repeat generation while the settings page is open; revisiting can generate a new preview. This is a disposable preview cache, not the storage for saved card audio. |
| UI lists and table pages | Angular resources and AG Grid's bounded row cache are transient views of backend data. Reloading fetches persisted data again. |
| Authentication and static frontend assets | OAuth tokens stay in gateway Redis with a host-only HttpOnly session cookie. Azure serves public Blob assets with one-year immutable caching; gateway documents are authenticated and no-store. Deployment deletes old static files before publishing the latest build. |

## Adjective comparison forms

Adjective forms contain the comparative and the `am` superlative, for example
`gut` → `besser, am besten`. Dictionary lookup, normalization, PDF extraction,
and story vocabulary generation use the same rule. Non-gradable adjectives in
their given sense receive no invented degrees.

Focused E2E coverage (with the test pod running):

```bash
npm test -- dictionary.spec.ts
```

## Port Mapping

All host-bound ports use the 70-79 range to avoid conflicts.

| Port | Service | Context |
|------|---------|---------|
| 3070 | Mock OpenAI API | Test pod |
| 3071 | Mock Google AI API | Test pod |
| 3072 | Mock ElevenLabs API | Test pod |
| 3073 | Mock Anthropic API | Test pod |
| 4270 | Angular dev server | Local dev |
| 5470 | PostgreSQL | Test pod |
| 5471 | PostgreSQL | Dev pod |
| 8073 | Spring Boot server | Local dev |
| 8074 | Spring Boot server | Test pod (internal, behind Traefik) |
| 8079 | Mock OAuth2 provider | Test pod |
| 8170 | Traefik HTTP | Test pod |
| 8171 | Traefik dashboard | Test pod |
| 8172 | Spring Boot actuator | Test pod / Local dev |

## One image per Spring profile

The server is shipped as a GraalVM native executable. Bean definitions are
resolved during ahead-of-time processing at build time, so the active Spring
profile is baked into the executable and cannot be chosen at startup any more.
The server image is therefore built once per profile, via the `SPRING_PROFILE`
build argument:

```bash
podman build --build-arg SPRING_PROFILE=test -t learn-language-server:test server   # e2e pod
podman build --build-arg SPRING_PROFILE=prod -t learn-language-server:prod server   # published image
```

`SPRING_PROFILES_ACTIVE` is not read at runtime; the pipeline builds the test
image for the e2e job and the prod image when publishing to GHCR. Running
the server on a JVM for local development is unaffected - `mvn spring-boot:run
-Dspring-boot.run.profiles=local` still selects the profile the usual way.
