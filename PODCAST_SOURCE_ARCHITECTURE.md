# Source extensions and podcast learning

Status: historical proposal, with the adopted implementation scope below. The
RSS/PDF-specific workflow in the original sections is superseded by the user's
later website-first / embedded-YouTube decision.

## Adopted implementation

- Discover the 24 stories in the publisher's A1–A2 website index.
- Extract the German story text from its HTML section lazily; exclude vocabulary,
  exercises, other stories, and promotional content before AI extraction.
- Use the actual embedded video IDs verified for this collection, stored in an
  extension-owned recording manifest. Copied social/download buttons and stale
  player labels are not used as recording identity.
- Play through the official YouTube IFrame Player API. Do not scrape or download
  YouTube audio. Gate player creation on the existing all-word prerequisites.
- Persist per-user progress, resume offsets, backward seeks, and completion on
  our side; use periodic/event-triggered saves and a local pending-write buffer.
- Retain generic extension contracts, durable preparation caching/jobs,
  group-wide card coverage, vocabulary drafts, and reusable playback/progress
  services. Existing PDF and plain-text core extraction remains available.
- Surface the known incorrect `Zwillinge` transcript and any newly indexed story
  without a verified recording as explicit source-data issues.

See [README.md](README.md#source-extensions) for usage and current limitations.

## 1. Confirmed requirements

- Add a source by selecting a supported podcast. Its extension supplies all feed and transcript discovery details; the user supplies no URLs.
- First provider: **Deutsch lernen durch Hören**, from einfachdeutschlernen.com.
- Admins can browse all episodes with title, episode number, duration, and language level.
- Opening an episode lazily downloads its PDF and extracts normalized vocabulary with original sentence context using AI.
- **Only the story/dialogue is input to vocabulary extraction. Ignore the PDF's vocabulary section**, its definitions and example sentences, exercises, instructions, headers, footers, and promotional content.
- Candidates offered for draft creation exclude words already represented by vocabulary cards in the source's group, regardless of those cards' readiness.
- **Every extracted transcript word is a listening prerequisite**, not only selected candidates. Leaving a word unselected leaves it unresolved. Marking a word as known does not bypass this requirement.
- A prerequisite is satisfied by a matching card in the same source group that is `READY` and has been studied at least once.
- Listening can stop at any point; returning offers to resume from saved progress.
- Processing results survive page navigation, browser sessions, and server restarts. Opening a processed episode does not download its PDF or call AI again.

## 2. Findings from the current app and provider

### Existing app

- `SourceType` is a fixed enum; the frontend also has a source-type union and type-dependent navigation. Add one generic extension-backed type rather than a new enum member for each extension or content category.
- `SourceService.getDetectionSourceIds()` already resolves the group-wide detection scope, falling back to the source itself when ungrouped.
- `WordImportService` already handles candidate-to-draft conversion, but its queue has a 14-day retention policy and filters known words. Podcast prerequisites need their own persistent records and different rules.
- `AreaWordsService` extracts from images and may generate example sentences. Podcast extraction needs a separate text-based contract with verbatim transcript evidence.
- `ChatService` provides structured AI responses and usage logging; `ChatModelSettingService` chooses models by operation.
- `Card.readiness`, `reps`, and `lastReview` describe different things. The editorial `REVIEWED` readiness value does **not** mean a flashcard was studied.
- Cards and review history are currently shared, with learning-partner support but no authenticated-user ownership on `ReviewLog`. The first version should use the current app's shared study state for unlocks and authenticated-user-specific listening progress.
- Card IDs are globally unique and often derived from German/Hungarian text. Duplicate handling must explicitly account for an identical word in an unrelated source group.
- `FileStorageService` supplies persistent local asset storage. Its current methods read/write entire byte arrays; long audio files need streaming and atomic publication.
- The server is a GraalVM native executable. Extension implementations must be available during the build.

### Live provider observations

Checked on 2026-09-25:

- RSS: <https://anchor.fm/s/fee008e0/podcast/rss>
- PDF catalogue: <https://www.einfachdeutschlernen.com/materialien-zum-download>
- The RSS had **372 items**, all with unique GUIDs and durations.
- `#372 Voll Vertrauen` has RSS `itunes:episode` **102**, season **7**, and duration **00:04:16**. Display the provider's title number, retaining season and RSS episode number separately.
- RSS descriptions often link to the general download catalogue. Some items also expose Spotify SRT transcripts; these should not silently replace the requested PDF workflow.
- The catalogue provides title links and CEFR ranges such as `A1-A2` and `B1-B2`. Keep the published range instead of forcing it into the existing single-level enum.
- Catalogue numbering can refer to another medium, so matching by episode number alone is unreliable.
- The catalogue contains some inconsistent labels/links. For example, the inspected page linked both “Nachtmensch” and “Die duale Ausbildung” to the same PDF. Title matching needs validation against the downloaded document.
- In the sample **Was ist typisch deutsch?**, the story continues on page 2, then `WORTSCHATZ:` starts on that same page. Vocabulary continues onto page 3 alongside `FRAGEN ZUM TEXT:`. Whole-page exclusion is insufficient.
- In the sample **Gewohnheiten**, the story spans two pages and includes surrounding instructions and promotional blocks without a vocabulary appendix. A missing `WORTSCHATZ` heading must not mean the entire PDF is story text.

These checks establish the integration shape, not verified transcript coverage for all 372 episodes. Measuring matching coverage is an implementation acceptance step.

## 3. Extension model

Use registered, build-time source extensions that compose reusable application-core capabilities. Core processing and learning services are independent of podcast types and provider implementations.

```text
Source extensions
  ├── existing document/image source adapters
  ├── EinfachDeutschLernenExtension
  │     ├── RSS fetching/parsing and episode metadata interpretation
  │     ├── download catalogue discovery and synchronization
  │     └── episode-to-PDF matching and provider layout policies
  └── future source extensions
        │ supply content references, metadata, and extraction policies
        ▼
Application core
  ├── content registry and capability-based workflow orchestration
  ├── asset fetching, persistent caching, and durable preparation jobs
  ├── PDF block extraction and transcript/content isolation
  ├── normalized vocabulary extraction with original context
  ├── group-wide card coverage and vocabulary draft creation
  └── audio delivery, playback eligibility, and listening progress

```

RSS parsing, episode metadata interpretation, and catalogue synchronization are owned by the EinfachDeutschLernen extension. Core has no feed format, podcast metadata schema, or catalogue synchronization algorithm. Another extension may use an API, scrape a differently structured website, accept uploads, or discover content by another mechanism entirely.

### Source extension contract

An extension descriptor contains:

- Stable ID, e.g. `einfach-deutsch-lernen`.
- Display name, description, content language, and attribution URL.
- Optional presentation category, e.g. `podcast`, and content labels such as “Episodes” or “Chapters”; these do not determine the extension interface.
- Supported capabilities, e.g. content browsing, text preparation, vocabulary drafts, and audio listening. Capabilities can differ between content items within a source.
- Configuration schema/defaults; this provider requires no user-entered connection settings.
- Provider adapter version, separate from shared processing versions.

The backend registry discovers implementations of a single `SourceExtension` contract as Spring beans, validates unique IDs, and serves descriptors to Angular. Persist `Source.extensionId`; add the generic `EXTENSION` source type for extension-backed sources. New providers and categories do not require further `SourceType` enum/union changes. Creation validates the selected extension's configuration and supported capabilities/card types. The extension's display name supplies a default source name; group and study settings remain editable.

The frontend has a capability UI registry defining creation fields, content views, and learning actions. Extensions compose existing views through their descriptors: a browsable audio collection with PDF transcripts uses the content list, transcript preview, vocabulary picker, and player. A genuinely new capability adds its backend implementation and frontend renderer in the build. Avoid provider-name or podcast-category conditionals in shared UI and services.

The generic contract exposes operations equivalent to:

1. `descriptor()` — identity, capabilities, configuration requirements, and presentation metadata.
2. `discoverContent(configuration, cursor)` — lightweight, paginated, normalized content descriptors with stable external IDs and display metadata. The extension owns discovery, upstream parsing, pagination/cursor interpretation, metadata mapping, and synchronization semantics. No document downloads or AI preparation.
3. `resolveContent(configuration, externalId)` — lazily resolve available asset references, relationships, and any missing or ambiguous associations for one item.
4. `preparationPolicy(content)` — supply applicable isolation rules and options for the supported core preparation stages.

Content descriptors and resolved assets use generic roles and media types, such as `primaryAudio`, `transcriptDocument`, or `primaryText`. An extension can return a PDF, audio plus PDF, plain text, or another supported combination. Optional capabilities are explicit; a text-only extension has no obligation to provide audio, episodes, durations, or a feed.

The core can schedule discovery calls, persist returned content, and provide generic HTTP/cache primitives. The extension decides what remote resources to query and how to interpret changes, removals, incomplete listings, and pagination. Refreshing a source delegates to the extension; it does not invoke a core RSS/catalogue synchronizer. Provider-specific state is opaque, versioned, and namespaced by extension/configuration identity.

Existing source types can be wrapped by descriptors incrementally. Keep existing source records and routes compatible while moving navigation and creation rules behind the registry.

### Core capability contracts

Core services accept generic content and asset references, not `PodcastEpisode` or provider-specific objects. An episode is one kind of content item; a PDF chapter, uploaded recording, or future extension's lesson can use the same contracts.

| Core capability | Input and output |
| --- | --- |
| PDF block extraction | A versioned PDF asset → positioned text blocks with stable evidence references. |
| Transcript/content isolation | Extracted blocks and an isolation policy → included story/dialogue text, excluded blocks, and validation results. |
| Normalized vocabulary extraction | Isolated text revision, language, and extraction options → normalized lexical items with original occurrence/context evidence. |
| Group-wide card coverage | Source scope and vocabulary revision → matching cards, missing candidates, and prerequisite statuses. |
| Vocabulary draft creation | Source, selected lexical items, and idempotent request → draft cards and per-item results. |
| Audio delivery | Versioned audio asset and authorized playback session → cached, range-capable media delivery. |
| Listening progress | User, source-content association, media revision, and playback events → saved position and resume information. |

The core also owns cache keys, processing revisions, retries, job leases, and persistence for these capabilities. Their use must not require enabling RSS support or creating a podcast record. For example, an uploaded recording with an accompanying PDF can use the same isolation, vocabulary, coverage, and listening services without an RSS feed.

Extensions provide declarative layout/section policies where possible. The einfachdeutschlernen extension supplies its `WORTSCHATZ` boundaries and catalogue matching rules; the core executes isolation, validates the output, and caches the result. Another extension can supply a different layout policy or already-isolated text and enter the workflow at the corresponding stage.

Playback eligibility is a core policy evaluation over content prerequisites. This source uses the confirmed “all extracted words have ready, studied cards” policy. Provider adapters do not implement their own card queries, unlock checks, media endpoints, or progress stores.

### EinfachDeutschLernen source extension

`EinfachDeutschLernenExtension` implements the same `SourceExtension` contract as every other provider. Its internal implementation:

1. Fetches and parses this provider's RSS feed using its built-in feed location and extension-owned parsing rules.
2. Maps RSS items into generic content descriptors using its title, numbering, and metadata rules.
3. Reads its download catalogue to enrich titles, levels, and PDF references.
4. Resolves each item's audio and matching transcript assets, reporting missing or ambiguous matches with evidence.
5. Supplies its story-boundary and excluded-section policies to core transcript isolation.

RSS parsing, episode metadata mapping, and catalogue synchronization live in this extension's package/module, with its own fixtures and tests. They may use parsing libraries, but are not core capabilities or a `PodcastExtension` subtype. If another extension later needs compatible behavior, shared integration code can be extracted separately from core without making it a requirement for other sources.

Core owns generic asset transport/storage, persistent cache mechanisms, job execution, PDF parsing/isolation, AI vocabulary extraction, card coverage, draft orchestration, audio delivery, and progress persistence. The extension owns discovery I/O orchestration and provider-specific cache/refresh policy, using those generic facilities where useful. Core receives normalized content and asset references, not RSS items or catalogue rows.

Register structured DTOs under the app's model package, or extend native hints for new extension packages. Avoid runtime class loading. Adding an extension requires rebuilding the application.

## 4. Data model

Separate provider metadata, generic core content/artifacts, and source-specific learning state. Core tables and foreign keys must not depend on podcast tables.

| Record | Responsibility and important constraints |
| --- | --- |
| `Source.extensionId` | Selects the registered source extension; mandatory for extension-backed sources. |
| `ContentItem` | Core content identity: extension ID, external ID, title, language, supported capabilities, and normalized display metadata. Unique identity includes the configuration namespace when needed. The extension defines external IDs; EinfachDeutschLernen uses RSS GUIDs. Core does not interpret upstream episode numbering or feed fields. |
| `EinfachDeutschLernenEpisodeMetadata` | Extension-owned metadata linked to a `ContentItem`: raw RSS fields, provider episode number, RSS season/episode, enclosure reference, catalogue match evidence, and synchronization timestamps. The extension maps display values such as episode number, duration, and CEFR range into normalized content descriptors. |
| `ExtensionDiscoveryState` | Opaque, versioned, extension/configuration-scoped state backed by generic persistence/cache facilities. EinfachDeutschLernen can store feed/catalogue snapshots and validators here; their schema, interpretation, and synchronization rules belong to the extension. Core tracks invocation status/errors without interpreting the payload. |
| `ContentPreparation` | Core immutable successful processing revision: content/asset references and hashes, extracted PDF blocks, isolated text and hash, included/excluded block IDs, extraction versions, model/prompt provenance, vocabulary result, timestamps. |
| `ContentPreparationJob` | Core durable stage, target cache key, lease/fencing token, retries, error, and result revision. At most one active job per processing key. |
| `ContentWord` | Core revision-owned normalized lemma, lexical key, word type/article/forms, occurrences, and original context sentences with text-block references. All extracted words persist, including those with existing cards. |
| `SourceContent` | Core source-to-content association and active preparation revision. Unique `(source_id, content_item_id)`. Enables reuse of preparation artifacts without sharing source-specific decisions. |
| `VocabularyDraftRequest` | Core idempotent draft-creation operation for selected word IDs in a source, with per-word result/error and created card ID. |
| `ListeningProgress` | Core authenticated user, source-content association, audio revision, position in seconds, observed duration, completion timestamp, last activity, and concurrency version. Unique `(user_id, source_content_id, audio_revision)`. |
| `ContentAsset` | Core persisted PDF/audio location, content hash, byte length, content type, HTTP validators, and revision identity. |

Store searchable relationships/status in PostgreSQL. JSONB is suitable for extraction evidence and versioned structured output. Persist PDF/audio bytes in local file storage, using internal IDs/content hashes for paths.

Group coverage is derived from current cards, not permanently embedded in `ContentWord`. A source moving groups or a card being deleted must immediately change the effective prerequisites without AI re-extraction.

## 5. Lazy processing and persistent caching

### Cache policy

The following durations are proposed defaults and should be configurable. The RSS/catalogue refresh policies are specific to the EinfachDeutschLernen extension. Core supplies persistent cache mechanisms and processing-artifact policies without imposing an upstream discovery format or refresh strategy on other extensions.

| Artifact | When obtained | Retention / refresh policy |
| --- | --- | --- |
| RSS episode metadata | First episode-list request | Store persistently; refresh after 24 hours or explicit “Refresh catalogue.” Use ETag/Last-Modified where available. |
| Catalogue titles, levels, PDF references | First metadata enrichment request | Same 24-hour policy, shared per provider. No PDF downloads or AI required. |
| Downloaded episode PDF | First prepare request | Retain while referenced. No expiry-driven download when an episode opens. |
| Raw PDF blocks | First PDF processing | Keyed by PDF content hash and PDF parser version. Reusable across segmentation retries. |
| Isolated transcript | First preparation | Keyed by PDF hash, provider layout-policy version, and segmentation version. Retain included/excluded block evidence. |
| AI vocabulary | First preparation | Keyed by isolated transcript hash, extraction prompt/schema version, and configured model identity/options. Retain while referenced; no TTL. |
| Audio | First authorized playback | Download/cache once on demand. Retain while referenced by listening progress; never preload all episodes. |
| Candidate visibility / unlock status | Each relevant read/action | Query current group/card state. Do not use long-lived caches for correctness. |
| Listening progress | During listening | Persistent user data, not an expiring processing cache. |

Opening an already prepared episode returns the active revision and recomputes current card coverage. It causes **zero PDF downloads, zero transcript parsing, and zero AI calls**.

Catalogue refresh may discover changed PDF references or a newer processing version. Mark that an update is available; keep the active successful revision until explicit reprocessing succeeds. A deployment or model-setting change does not automatically rerun AI for previously processed episodes.

Provide distinct actions:

- **Refresh catalogue:** update lightweight metadata only.
- **Retry preparation:** reuse successful cached stages and retry the failed stage.
- **Reprocess transcript:** explicitly check/download the current PDF and run changed stages, normally reusing unchanged artifacts.
- **Regenerate vocabulary:** explicitly request a new AI revision, including when prompt/model/content are unchanged. Record a generation ID so this action is not swallowed by the cache key.

Publish a successful new revision atomically. Keep previous revisions referenced by existing source episodes until those source episodes adopt the update. Never delete existing cards when a revision changes; recompute their matches. Newly extracted words can relock an episode. Replacing a transcript does not reset playback position if the audio revision is unchanged.

### Preparation flow

```text
not prepared
  → queued
  → resolving transcript
  → downloading PDF
  → extracting PDF blocks
  → isolating story/dialogue
  → extracting normalized vocabulary
  → validating evidence
  → prepared
```

Each stage stores its successful output before the next begins. Missing/ambiguous matches and invalid transcript isolation have distinct actionable states; they are not successful empty results.

Use a PostgreSQL-backed job worker with a bounded executor and lease-based claiming. HTTP prepare returns a cached result or a job reference promptly; Angular polls while a job is active. Leaving the page does not cancel the job. Expired leases are recoverable after restart. A fencing token prevents an old worker publishing after its lease was reclaimed.

Concurrent clicks/tabs join one active job. Do not hold database transactions open during network or AI calls. Persist AI results before publishing the revision. A crash between an external AI response and persistence can still require a repeat call unless the provider supports idempotency; record operation IDs and use provider idempotency where supported rather than claiming exactly-once billing.

Cached catalogue data stays usable during refresh failures, with its timestamp and refresh error visible. Missing assets or broken cache references produce repairable errors, not silent empty lists. Publish assets with temporary writes and atomic moves. Cleanup removes only unreferenced artifacts; deleting one source cannot remove shared content another source still uses.

## 6. Transcript matching and vocabulary-section exclusion

### Matching

Use the RSS GUID as episode identity. The einfachdeutschlernen adapter extracts the visible `#number` and removes only known podcast branding from titles.

Normalize catalogue/episode titles for whitespace, Unicode normalization, typographic punctuation, and known provider decorations. Prefer exact normalized matches. Retain original titles and match evidence. Explicit provider aliases can resolve verified exceptions. Fuzzy similarity may suggest a match but must not silently select a PDF.

Catalogue language level can be displayed before downloading the PDF. If unavailable, show “Level unavailable” rather than an invented CEFR level. Validate the matched PDF's story heading before accepting it. Missing, ambiguous, and contradictory matches remain visible in the episode list.

Support a list of transcript documents for genuinely multi-story episodes. A partial transcript must not be treated as full episode coverage. Provider-specific composite mapping needs explicit evidence; unresolved compilations remain blocked until their complete mapping is supplied.

### Isolating story content

1. Use PDFBox to extract positioned text blocks, with page/block IDs and reading order.
2. Apply the provider's layout rules to identify narrative/dialogue blocks and remove repeated page furniture and line numbers.
3. Exclude `WORTSCHATZ`, vocabulary/glossary tables, definitions and their example sentences, `FRAGEN ZUM TEXT`, `AUFGABEN`, answer sections, app/download promotions, and credits. Vocabulary continuations remain excluded on subsequent pages even without a repeated heading.
4. Handle boundaries within a page. A heading may be earlier/later in raw PDF extraction order than its visual position, so a plain string split on the first heading is insufficient.
5. If deterministic isolation is uncertain, a structured AI segmentation step can identify **existing block IDs** as story or excluded material. It must not rewrite text. Cache that classification independently and validate the selected spans.
6. If completeness or separation cannot be established, record `needs_attention` and show the transcript preview/boundaries for correction. Do not generate vocabulary or unlock listening from uncertain text.
7. Pass **only the isolated story text** to vocabulary extraction. Excluded text must never be available as vocabulary context in that call.

The admin episode detail includes a “Transcript used” preview and PDF provenance. A corrected block selection creates a new transcript revision and invalidates only dependent vocabulary output.

A word appearing both in the story and the PDF glossary is eligible because of its story occurrence. A word occurring only in the glossary is never a candidate or a prerequisite.

### AI vocabulary contract

Return all distinct German lexical items present in the isolated transcript, without a difficulty-based shortlist. Normalize inflected forms to dictionary lemmas: noun singular, verb infinitive with separable/reflexive parts preserved, adjective base form. Retain articles and grammatical forms separately.

Each result contains:

- Lemma, word type, article when applicable, and grammatical forms.
- Original surface forms and their transcript occurrences.
- One or more **verbatim original context sentences**, with block/offset references.
- A deterministic lexical identity computed by the application from validated normalized output.

Repeated occurrences share a prerequisite; meaningful lexical distinctions must not be collapsed by ASCII-only slugification. Preserve German characters and full multiword expressions in lexical keys. Validate that every context and surface occurrence is present in included story blocks; a normalized lemma itself need not appear verbatim. Reject malformed/truncated output and unexplained empty extraction.

For longer transcripts, chunk at sentence boundaries with stable chunk hashes, cache each result, and merge duplicate lexemes while retaining contexts. Check that every transcript chunk was processed before publishing the revision. AI completeness is not mathematically guaranteed; retain transcript/word previews and corrections rather than presenting extraction as proof of perfect linguistic coverage.

## 7. Cards, candidates, and unlocking

### Coverage rules

For each word in the active preparation revision:

1. Resolve current detection source IDs using `SourceService.getDetectionSourceIds()`.
2. Find matching **vocabulary** cards using normalized `CardData.word`/lexical identity, with word type where needed to avoid false matches. Do not infer identity solely from card-ID prefixes.
3. If at least one matching card exists in scope, hide the word from draft candidates.
4. The prerequisite is satisfied only if at least one matching card is currently `READY` and has `reps > 0`.

`reps > 0` follows the app's current study state. Editorial `REVIEWED`, `KNOWN`, or a global known-word record alone does not satisfy it. A failed first study answer still counts as having reviewed once; no successful-recall threshold was requested.

```text
unlocked = preparation is valid and complete
           AND every extracted word has a READY, studied matching card
```

An unprepared, failed, or unexpectedly empty extraction is locked. Group changes, card edits/deletions, readiness changes, and study updates affect coverage dynamically. A previously matched card that no longer qualifies cannot leave a stale unlock behind.

Show separate counts for missing cards, existing cards not ready, ready cards not yet studied, and satisfied words. Existing cards that are not ready remain visible in the prerequisite status list even though they are excluded from the candidate picker.

### Draft creation

The admin selects missing words and chooses “Create drafts.” Keep unselected words as missing prerequisites. Recheck group coverage server-side immediately before creating each draft, and make retries/double-clicks idempotent. Serialize overlapping podcast draft creation by group/source scope and lexical key using short database locks plus persisted request results.

Extract shared vocabulary draft construction from existing services, using source language settings, existing translation/model logging, and original story examples. Record episode provenance separately from PDF page navigation; avoid pretending an episode is a PDF page.

Existing globally unique card IDs require special handling: reuse an existing card only when it is in the detection scope. If the canonical text-derived ID belongs to another group, allocate a stable source-qualified ID for the new card. Match by lexical data, not this ID suffix. Audit prefix-based duplicate checks in affected card flows so unrelated groups neither suppress new cards nor accidentally satisfy prerequisites.

Legacy card words with inflected/ambiguous forms may require one-time lexical enrichment or explicit matching. Never silently bind an uncertain word to a different lexeme. Persist validated lexical enrichment on card changes so opening an episode does not invoke AI to normalize the same cards repeatedly.

## 8. Listening and progress

The home dashboard exposes separate **Study vocabulary** and **Listen** actions for podcast sources. Listening remains reachable even when no flashcards are due. Its episode list shows locked reasons, available episodes, and in-progress episodes, prioritizing the most recently listened unfinished episode.

On “Listen” or “Continue from 03:24”:

1. The backend checks the current active revision and all prerequisites.
2. It creates an authorized playback session and lazily obtains the episode audio asset.
3. The player uses the stable cached audio revision, restores position after media metadata is available, and offers “Start over” explicitly.

Serve cached MP3 files with streaming and HTTP byte-range support so seeking/resuming does not require reading the whole file into JVM/browser memory. Native HTML audio requests do not pass through Angular's bearer-token interceptor; the implementation must include a dedicated playback-session mechanism. Proposed approach: an authenticated API request issues a short-lived HttpOnly playback cookie scoped to that source episode's media path. The media endpoint validates the session and rechecks eligibility on each request. Renew an active session through the authenticated API.

Unlock checks are enforced by the backend when issuing/renewing playback and serving media; the frontend also stops offering playback when coverage changes. Already buffered audio cannot be retroactively recalled. Admins can inspect transcript metadata independently of learning eligibility.

Persist progress every five seconds while playing, immediately on pause, seek, completion, and route departure, and best-effort on visibility/page-hide events. Do not depend solely on an unload request. Keep a local write-ahead copy for unsent progress and retry authenticated writes when connectivity returns. Display saving failures; abrupt device termination can still lose the interval since the last durable save.

Use server-issued playback sessions, monotonically increasing event sequences, and optimistic concurrency to reject stale/out-of-order writes. Starting playback in another tab/device supersedes the older writing session. Positions can legitimately decrease after seeking; never merge with `max(position)`.

Use the media element's observed duration to validate/clamp position; RSS duration is display metadata and can differ from the served file. Mark completion on the player's `ended` event and keep it distinct from pause. Store progress against an audio revision: changed audio must not inherit an old offset silently. Pinning downloaded audio also keeps a session's timeline stable when upstream audio contains dynamically inserted ads.

## 9. API and UI shape

Proposed source-extension API paths below use the public `/api` prefix and generic content identities. The same endpoints serve every extension; capabilities determine which operations are supported. Shared Angular transcript, candidate-selection, prerequisite-summary, and audio-player components likewise take generic content models. For this extension, the UI labels content items as episodes.

| Method and route | Purpose |
| --- | --- |
| `GET /api/source-extensions` | Creation descriptors and capabilities. |
| Existing `POST /api/source` | Create a source with `sourceType: extension` and `extensionId`. No remote processing. |
| `GET /api/source/{id}/content` | Cached content metadata, match/preparation states, and current prerequisite summaries. |
| `POST /api/source/{id}/content/refresh` | Delegate lightweight discovery refresh to the selected extension; persist its normalized results. |
| `GET /api/source/{id}/content/{contentId}` | Cached active detail, missing candidates, and all-word coverage. |
| `POST /api/source/{id}/content/{contentId}/prepare` | Idempotently return existing preparation or enqueue it. |
| `GET /api/content-preparation-jobs/{jobId}` | Core job stage, result, and error; verify access to the requesting source. |
| `POST /api/source/{id}/content/{contentId}/reprocess` | Explicit transcript refresh or vocabulary regeneration with expected revision. |
| `POST /api/source/{id}/content/{contentId}/drafts` | Create selected missing-word drafts; accepts revision and idempotency key. |
| `POST /api/source/{id}/content/{contentId}/playback` | Check prerequisites and create/renew media session. |
| `GET /api/source/{id}/content/{contentId}/media` | Authorized, range-capable cached audio. |
| `PUT /api/source/{id}/content/{contentId}/progress` | Save progress against playback session/audio revision and sequence. |

Use existing `APPROLE_createDeck` for preparation, corrections, catalogue refresh, and drafts. Use `APPROLE_readDecks` for learning views/playback/progress. Never accept source IDs, card IDs, or preparation revision references without validating their relationships. User identity comes from authentication, not request bodies.

Admin route: `/sources/:sourceId/content`, with a content detail route beneath it. Learner route for sources with audio-listening capability: `/sources/:sourceId/listen`, optionally followed by a content ID. For this provider, lists support sorting/filtering by episode number, duration, level, and status, with pagination/search for the full catalogue. Descriptors supply the labels and available metadata columns.

Use Angular signals/resources, separate Material templates/styles, accessible controls, skeletons, and short-lived job polling without RxJS. The episode-detail component reads cached state first and calls prepare only when needed. Backend idempotency remains authoritative even if the component repeats a request.

Compute list-wide prerequisite summaries in batched projection queries; avoid one card query per episode or loading every card's full JSON/audio payload. Stable word-to-lexical-key indexes can support these queries without caching mutable unlock decisions.

## 10. Implementation stages and acceptance tests

1. **Extension foundation and schema**
   - Add the generic `SourceExtension` contract and registry, core content/capability contracts, extension-backed source type, source extension selection, and persistence migrations.
   - Introduce frontend capability-based actions while preserving existing source flows.
   - Verify native binding hints for new DTOs and dependencies.
2. **Provider catalogue adapter**
   - Implement RSS parsing, episode metadata mapping, catalogue synchronization, and title/PDF matching inside the EinfachDeutschLernen extension, using generic transport/cache facilities as needed.
   - Keep raw feed/catalogue schemas and synchronization tests in the extension; core contracts accept normalized content only.
   - Measure matches across the actual feed; report unique, missing, ambiguous, and composite matches.
   - Add fixture-backed feed/catalogue tests including the title-number/RSS-number discrepancy.
3. **Durable lazy preparation**
   - Implement core asset storage, restart-safe jobs, PDF block extraction/content isolation, versioned AI vocabulary extraction, and cache reuse against generic content contracts.
   - Integrate the podcast adapter through these contracts, with provider rules supplied as policies.
   - Validate same-page glossary boundaries, multi-page vocabulary continuation, exercises, and PDFs without a glossary heading.
4. **Admin episode and draft workflow**
   - Add episode list/detail, transcript preview, candidate selection, draft operation results, and processing retry/reprocess actions.
   - Integrate group-wide lexical matching and explicit card-ID collision behavior.
5. **Learning and resumable audio**
   - Implement core group-wide prerequisite evaluation, backend-enforced playback sessions, lazy audio cache/ranges, and saved progress; compose them into podcast views and dashboard actions.
6. **End-to-end and native verification**
   - Use Playwright in `test/tests/podcast-sources.spec.ts`, with semantic selectors and deterministic feed/catalogue/PDF/audio/AI fixtures.
   - Add mock request counters so cache behavior is proven by absence of extra downstream requests, not just matching UI text.
   - Run frontend build, relevant JVM tests, podcast/source-group/source-creation Playwright regressions, and a native-image smoke test of preparation and playback.

Required scenarios:

- A non-podcast test extension uses the same core PDF isolation, vocabulary extraction, group coverage, audio delivery, and progress services with no RSS data or podcast records. Verify cache reuse and resume through the shared contracts.
- A text-only test extension implements the same `SourceExtension` contract and generic content API without audio/feed/episode fields; the UI exposes only its supported capabilities.
- A second audio-source test extension discovers content through a non-RSS API and uses the same core processing/listening workflow without importing EinfachDeutschLernen discovery code or supplying its metadata schema.
- Create a podcast source by selecting its name, with no feed/PDF URL fields and no immediate download/AI work.
- List all fixture episodes and correct durations, CEFR ranges, provider numbers, and unmatched statuses.
- First episode open prepares only that episode; second open, browser refresh, and server restart reuse the successful result.
- Parallel prepare requests share one job; a failed AI stage retries without redownloading/reparsing the PDF.
- Glossary-only words and glossary example sentences are absent; genuine story occurrences of the same word remain eligible.
- A page containing both story and glossary retains the complete story and excludes the glossary continuation.
- Cached candidates react to new/deleted/moved/edited cards in the source group without rerunning extraction.
- Existing drafts suppress duplicate candidates but keep listening locked; cards in another group do neither.
- Deselecting a word or marking it known cannot unlock the episode.
- `READY` with zero studies stays locked; editorial `REVIEWED` stays locked; `READY` with at least one study satisfies that word.
- Empty, partial, ambiguous, or failed preparation never unlocks playback.
- Creating drafts twice does not duplicate cards; cross-group global ID collisions do not reuse unrelated cards.
- Reprocessing publishes only complete validated revisions and preserves existing cards/progress appropriately.
- Locked media/playback requests fail server-side even if the UI is bypassed.
- Pause, route departure, browser refresh, seeking backwards, completion, network interruption, and stale-tab writes preserve the intended resume behavior.
- Audio is fetched lazily, served with correct byte ranges, and uses a stable revision for saved offsets.

## 11. Decisions proposed for review

The confirmed requirements in section 1 are fixed. The following are implementation defaults proposed by this design:

- One generic `SourceExtension` contract, implemented as build-time Spring/Angular integrations, with no runtime-installed JARs or scripts. Discovery, upstream parsing, episode metadata interpretation, and catalogue synchronization belong to each extension; generic processing, caching mechanisms, and learning capabilities belong to core.
- A 24-hour metadata refresh interval; persistent non-expiring prepared artifacts while referenced.
- Explicit adoption of transcript/extraction updates instead of automatic AI reprocessing on open or deploy.
- User-specific listening progress with the app's current shared card-study semantics for prerequisites.
- Five-second periodic progress saves plus event-triggered saves and local retry buffering.
- Locally cached, revision-pinned audio obtained on first eligible playback.

Full provider transcript coverage and handling of unmatched/multi-story episodes must be verified during adapter implementation. This design makes those gaps explicit rather than pairing uncertain content or silently relaxing the listening prerequisite.
