# learn-language
Tools for language learning

## Source extensions

In **Sources → Add Source**, choose **Source Extension**, then select
**Deutsch lernen durch Hören A1–A2**. The extension discovers the 24 stories in
the publisher's [A1–A2 index](https://www.einfachdeutschlernen.com/en/niveau-a1-a2);
no URLs or file uploads are needed.

Choose its data model under **Settings → Data Models → Source Content Extraction**.
This operation discovers catalogue entries and extracts the requested story from
cleaned page HTML, independently of the model used for vocabulary extraction.
It does not depend on heading tags, Wix player classes, or story-page URL patterns.
Returned links and verbatim story paragraphs are validated against the page.
Upgrading initially copies the existing Extraction model settings into this new
operation; subsequent changes are independent. Without a configured primary
model, extraction fails explicitly rather than falling back to another operation.

- Open **Stories** from the source's actions menu to browse the catalogue.
- Opening a story retrieves its German HTML text and prepares vocabulary in the
  background. Vocabulary sections, exercises, other stories, and promotional
  content are excluded. Extracted text and successful AI results are cached
  persistently. Reopening a story does not repeat preparation. Failed jobs
  can be retried from their last successful stage.
- The catalogue is stored in PostgreSQL and reused across restarts without an
  expiry. Only **Refresh catalogue** repeats discovery after the first successful
  extraction; a failed refresh preserves the saved catalogue for subsequent visits.
  Changing the source-extraction model does not regenerate already prepared
  stories. Extracted story text is checkpointed before vocabulary generation, so
  a vocabulary retry does not repeat the source AI call.
- Select missing words to create drafts, then use the existing draft-card
  workflow to enrich and review them. Cards in the same source group are reused.
  Noun cards include their definite article (for example, `das Haus`).
- The home page's **Listen** action unlocks a story only when every extracted
  word is known or has a `READY` card reviewed at least twice. Listening progress is saved per
  user, including backward seeks, and restored on return. Recordings play in a
  YouTube embed using the official IFrame Player API; the server does not download
  or convert YouTube audio.

The provider's shortcut buttons and static player labels sometimes refer to
unrelated recordings. `server/src/main/resources/source-extensions/einfach-deutsch-a1-a2.json`
therefore records the 24 actual embedded video IDs, recording numbers, and
durations verified on September 25, 2026. New index entries without verified
recordings remain visible with an explicit issue. The publisher's **Zwillinge**
section currently contains a birthday story; preparation is blocked until its
transcript is corrected or verified. **Refresh catalogue** checks the index
without reprocessing prepared stories.

Progress is saved every five seconds during playback, on pause/completion and
detected seeks, and best-effort when leaving the page. A local pending-write
buffer retries unsent updates. The player can resume a saved position without
autoplaying. YouTube availability and browser shutdown can affect playback and
the final save; abrupt termination may lose the last unsaved interval. Locked
stories do not load the YouTube API or iframe. Progress writes recheck card
eligibility and stale playback sessions cannot overwrite newer progress.

Implement `SourceExtension` to add another provider. Discovery, RSS parsing,
metadata interpretation, and catalogue matching belong to the extension.
Core services handle persistent assets, preparation jobs, PDF/plain-text
extraction, vocabulary, group-wide card coverage, media delivery, and progress.
The test profile includes a text-only extension exercising the same core without
the publisher website or YouTube.

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
| Story catalogue | `ExtensionDiscovery` and `SourceContent` entities map the existing `extension_discovery` and `content_items` tables. Shared by extension, retained until explicitly refreshed; existing rows need no migration. |
| Story text and AI vocabulary | Checkpoints in `content_items.preparation`, retained across restarts and catalogue refreshes. Versioned migrations deliberately invalidate vocabulary when extraction rules change. Atomic SQL upserts and lease updates preserve preparation during concurrent discovery and background work. |
| Downloaded transcript/audio assets | URL-hashed files under `STORAGE_DIRECTORY/content-assets`, written by atomic rename and reused without expiry. The storage volume must persist across deployments. Website HTML is fetched only when discovery or story extraction is requested; the extracted result is saved in PostgreSQL. |
| Listening progress | PostgreSQL `listening_progress`, scoped to source, story, and user. The four-hour expiry applies to write sessions, not saved positions. Browser local storage buffers unsent writes until acknowledged. |
| Documents and saved card content | PostgreSQL document metadata/card entities; audio, images, and PDFs use the persistent storage volume. Audio/image responses advertise immutable caching. PDF page spans are extracted on request, not cached. Pending-photo previews use `no-store`. |
| Voice-setting previews | Component-local `audioCache`, keyed by text, voice, model, and language. It avoids repeat generation while the settings page is open; revisiting can generate a new preview. This is a disposable preview cache, not the storage for saved card audio. |
| UI lists and table pages | Angular resources and AG Grid's bounded row cache are transient views of backend data. Reloading fetches persisted data again. |
| Authentication and static frontend assets | OIDC state/tokens use browser local storage. Nginx caches fingerprinted bundles as immutable and revalidates the app shell/manifest so deployments are picked up. |

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
image for the e2e job and the prod image when publishing to Docker Hub. Running
the server on a JVM for local development is unaffected - `mvn spring-boot:run
-Dspring-boot.run.profiles=local` still selects the profile the usual way.
