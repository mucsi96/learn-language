# AGENTS.md

!IMPORTANT: Avoid using comments which are trivial or obvious. If comment is needed means the code is not clear enough.

## General Code style
- Avoid fallback values that hide missing data - prefer crashes over silent incorrect behavior
- Prefer functional programming over procedural
- Avoid variable mutations - create new values instead of modifying existing ones
- Never use imperative loops (`for`, `while`) - use functional methods instead
- Prefer immutable data transformations over in-place modifications

## Java Code style
- Prefer using lombok
- Prefer using builder for models
- Prefer constructor injection with lombok
- Use Stream API instead of loops (`stream().map()`, `filter()`, `reduce()`, `flatMap()`, `findFirst()`, `anyMatch()`, `allMatch()`, etc.)
- Never mutate collections - use `Stream.concat()` or create new collections instead of `add()`/`addAll()`
- Use `final` for variables
- Prefer JPA projection interfaces over `Object[]` for native query results

## TypeScript Code style
- Use `const` for all variables
- Never use `push` - use spread operator (`[...arr, newItem]`) or functional methods
- Use functional array methods (`map`, `filter`, `reduce`, `flatMap`, `find`, `some`, `every`, etc.)

## Testing Code style
- Try testing from users perspective.
- Use role based selectors and selectors based on accesibility
- Avoid using `page.locator` or `page.waitForSelector` in favor of semantic selectors (`getByRole`, `getByLabel`, `getByText`, etc.)
- Avoid asserting loading state as it is not reliable
- Prefer using Playwright for end-to-end tests with TypeScript in test folder
- Don't use assertion messages
- Test every feature using E2E tests with playwright inline with existing tests

## Angular Code style
- Make sure the UI is testable using role based selectors and selectors based on accesibility
- Follow functional programming patterns from TypeScript Code style section
- Prefer using Angular Material components
- Prefer using Angular signal / resource for state management
- Prefer putting styles and templates to separate files
- Use angular resources core method when necessary
- Do  not use ::ng-deep
- Avoid using enum in TS. Prefer using string literals
- Always using new Angular templates
- Using rxjs is not allowed

## Design guidelines
- Prefer using Angular Material components
- Avoid using "Loading..." in favor of skeleton loaders

## Project Overview

This is a language learning application that uses spaced repetition to help users learn languages through digital flashcards created from PDF documents. The app combines traditional spaced repetition with AI-powered features for translations, audio generation, and contextual examples.

## Architecture

**Backend**: Spring Boot 4 with Java 21 (built into a GraalVM native image), PostgreSQL database, local file storage, Azure cloud services, OpenAI API integration, Google Gemini API integration, ElevenLabs Voices integration
**Frontend**: Angular 20 with Material UI, Azure MSAL authentication, TypeScript

### Key Technologies
- **Spaced Repetition**: Uses FSRS (Free Spaced Repetition Scheduler) algorithm via ts-fsrs library
- **AI Integration**: OpenAI GPT-4.1 for translations, ElevenLabs Voices and Google Gemini TTS for audio, Google Gemini API for example images
- **Cloud Services**: Local file system for PDFs/assets storage, Azure AD for authentication
- **PDF Processing**: Apache PDFBox for text extraction and document processing

## Development Commands

### Frontend (Angular)
```bash
cd client/
npm run start       # Development server
npm run build       # Production build
npm run watch       # Development build with watch mode
```

### Backend (Spring Boot)
```bash
cd server/
./mvnw spring-boot:run              # Run development server
./mvnw test                         # Run tests
./mvnw clean compile               # Clean and compile
```

Local development still runs on a plain JVM. The native image is built only by
the container build - see **Native image and the baked-in Spring profile**
below.

### Testing
```bash
cd test/
npm test                    # Run all Playwright tests
npm run test:headed         # Run tests with browser visible
npm run test:ui             # Run tests with Playwright UI
npm run test:debug          # Run tests in debug mode
```

### Docker Development
```bash
docker-compose up           # Start all services
docker-compose up -d        # Start in background
```

## Native image and the baked-in Spring profile

The server is compiled ahead of time into a GraalVM native executable linked
against musl, so there is no JRE in the runtime image and startup is in the tens
of milliseconds rather than seconds.

Ahead-of-time processing resolves bean definitions at build time, which means
the active Spring profile is decided by the build, not by the environment:
Spring AOT emits an `EnvironmentPostProcessor` that activates the profile the
image was built with. `SPRING_PROFILES_ACTIVE` is no longer read at runtime, and
`test/test-pod.yaml` no longer sets it. Build one image per profile with the
`SPRING_PROFILE` build argument - `test` for the e2e pod, `prod` for the image
published to Docker Hub:

```bash
podman build --build-arg SPRING_PROFILE=test \
  -t localhost/learn-language-server:test server
```

Build-time details that live in `server/pom.xml` and are easy to trip over:

- AOT processing refreshes the application context, so every placeholder an
  auto-configuration condition reads has to resolve during the build. The
  `process-aot` execution supplies build-time stand-ins for them and turns the
  Key Vault property source off, so the build never reaches out to Azure. The
  stand-ins are not baked into the image; they only have to make the same
  conditions match as the real values do at runtime. A new required environment
  placeholder read by a condition means adding it there too. Placeholders that
  are only read while creating beans (`${db-url}`, the AI API keys and base
  URLs, `${STORAGE_DIRECTORY}`) are resolved at runtime as before and need
  nothing. `MOCK_OAUTH2_SERVER_URI` is the one test-profile placeholder a
  condition reads (Spring Security's `IssuerUriCondition`), which is why it has
  a stand-in.
- Spring AOT generates bean-definition classes into the packages of the
  configuration classes it processes, including the signed Spring Cloud Azure
  jars. Mixing generated (unsigned) and signed classes in one package makes the
  native-image builder throw `SecurityException: ... signer information does not
  match`, so the builder is pointed at `server/native-image.security`, which
  disables jar signature verification.
- Jars can ship a `META-INF/native-image/.../native-image.properties` that forces
  classes to build-time initialization. When such a class holds on to objects of
  types that are still initialized at run time, the builder fails with
  `UnsupportedFeatureException: An object of type ... was found in the image
  heap`. `--initialize-at-build-time` in the `native-maven-plugin` config covers
  the Jackson core classes `azure-core` leaves behind that way. Note that a build
  cannot undo such a directive: `exclude-config` does not apply to
  `native-image.properties`, and `initialize-at-run-time` for the same class is
  rejected outright. That is why `azure-core` is pinned ahead of the version the
  Azure BOM selects - the BOM's 1.58.0 forces SLF4J and logback to build-time
  initialization, which is irreconcilable with Spring Boot setting logging up at
  run time. Check this again when the Azure BOM moves.
- The Azure SDK's `ExpandableStringEnum` constants are built by instantiating the
  subclass reflectively, and `fromString` returns `null` rather than failing when
  it cannot. Missing reflection metadata therefore surfaces as every constant of
  a class being `null` and a `NullPointerException` far from the cause.
  `AzureNativeHints` registers the subclasses azure-identity does not ship
  metadata for.
- azure-core decides how to read a response body by asking the model class
  whether it declares the `fromXml` / `fromJson` pair azure-xml and azure-json
  generate, and it asks with `Class.getDeclaredMethods()`. In a native image that
  returns nothing for a class with no reachability metadata, so the answer is
  silently "no" and azure-core falls back to Jackson - for XML that means an
  `XmlMapper`, and jackson-dataformat-xml is not on the classpath, so the call
  dies with a `NoClassDefFoundError`. The SDK ships metadata for most of its
  models but not all. `AzureNativeHints` scans `com.azure` and registers every
  `XmlSerializable`, `JsonSerializable` and `HttpResponseException` instead of
  naming the ones missing today, so an SDK upgrade cannot reintroduce this.
- The Key Vault property source is configured by an `EnvironmentPostProcessor`
  that runs before there is an application context and reads its own settings
  with a plain `Binder` over `AzureKeyVaultSecretProperties`. Nothing in the
  framework infers that, and the auto-configuration that would otherwise
  contribute the binding metadata for that type never matches here - it is
  conditional on `spring.cloud.azure.keyvault[.secret].endpoint`, while this
  application configures the endpoint under `...secret.property-sources[0]`. With
  no members in the image the binder binds nothing, and an absent binding is
  indistinguishable from an empty configuration, so the post-processor quietly
  concludes there is no property source to add. Nothing fails at that point: the
  image starts and then dies much later on the first secret-backed placeholder.
  `KeyVaultPropertySourceNativeHints` supplies the metadata. Only the prod
  profile reads secrets from Key Vault, so no test covers this - after changing
  anything about the Key Vault configuration, check that the generated
  `target/spring-aot/main/resources/META-INF/native-image/**/reachability-metadata.json`
  still carries `AzureKeyVaultSecretProperties` and
  `AzureKeyVaultPropertySourceProperties` with their accessors.
- The Anthropic and OpenAI SDKs are Kotlin, and their Jackson mapper binds
  Kotlin classes through `kotlin-reflect`. Without reflection metadata that
  fails not as a missing-reflection error but as
  `KotlinReflectionInternalError: Could not compute caller for function`, at
  request time, on every call to the model. `AnthropicNativeHints` and
  `OpenAiNativeHints` register the SDK model packages this application and
  Spring AI use; the beta, assistants, realtime and admin surfaces stay out of
  the image. The OpenAI SDK does ship its own agent-recorded metadata, but it
  registers all 25k of its classes and by itself exhausts the builder's heap,
  so the build excludes it (`--exclude-config` in `native-maven-plugin`). The
  Google GenAI SDK's metadata is generated per type and complete, so it is
  used as shipped. `ApplicationModelNativeHints` covers this application's
  own Jackson-bound types: the JSONB payloads, the structured-output records the
  services declare, and the records third-party REST responses are read into.
  All of them scan packages rather than naming classes, so a new model type or
  response record needs no hint of its own.
- Every reflectively registered class is reachable, and the builder's memory
  and time grow with the reachable set. When a build starts failing with the
  image generator watchdog aborting on "no activity" next to a nearly full
  heap, that is memory, not a deadlock: look at the "types registered for
  reflection" line and find which jar's shipped metadata or which hint grew.
- The fonts embedded in the study-session PDF and the glyph lists, AFM metrics,
  CMaps and ICC profile PDFBox and FontBox load lazily are classpath resources
  nothing registers by itself; `ClassPathResourceNativeHints` does.
- PDF rendering and photo preprocessing go through Java2D, whose native half
  (`libawt`, `libfontmanager`, `libjavajpeg`, ...) the native-image builder
  copies next to the executable. The Dockerfile ships those `.so` files
  alongside the binary and installs `freetype` and `fontconfig`, which they
  link against.

Spring Cloud Azure needs one workaround in application code:
`AzureGlobalPropertiesConfiguration` re-declares the `AzureGlobalProperties`
bean. Spring Cloud Azure registers it from an `ImportBeanDefinitionRegistrar`
using a lambda instance supplier, which AOT cannot turn into generated code, so
it drops the bean and the image fails to start with "required a bean of type
AzureGlobalProperties that could not be found". See the class comment for why it
uses its own bean name. That workaround turns on Spring Cloud Azure's
registration order, which is not a public contract, so smoke-test the image
whenever `spring-cloud-azure-dependencies` moves - a change there could drop the
bean again with no compile-time signal.

The image is deliberately not built with `--static`. A fully static binary links
but then segfaults the moment it starts in the container - before GraalVM
installs its own segfault handler, so with no output whatsoever, which looks
exactly like a container that silently never starts.

### Reproducing AOT problems without a native build

Most AOT problems reproduce without waiting for a native compile (which takes
several minutes). Run the AOT-processed application on a normal JVM:

```bash
cd server
mvn -Pnative package -DskipTests -Dapp.profile=test
java -Dspring.aot.enabled=true -jar target/learnlanguage-0.0.1-SNAPSHOT.jar
```

That exercises the generated context - missing bean definitions, profile and
condition mismatches - in seconds. Only class-initialization and reflection
problems need the real `mvn -Pnative native:compile`. The container build links
against musl; to compile on a regular Linux workstation with a GraalVM JDK on
the `PATH`, pass `-Dnative.libc=glibc`.

Types that are only ever bound reflectively need explicit hints. Controller
request/response types, JPA entities and Spring Data repositories are covered by
the framework's own AOT processing and need nothing. Types read with a plain
`ObjectMapper` want `@RegisterReflectionForBinding` - or, here, to live in the
`model` package or as a nested record of a service, which
`ApplicationModelNativeHints` registers wholesale; types bound by a `Binder`
rather than Jackson want `BindableRuntimeHintsRegistrar`, which registers exactly
what `JavaBeanBinder` looks for over the whole class hierarchy - see
`KeyVaultPropertySourceNativeHints`.

### Release and image publishing

`publish-server` and `publish-client` each ask `mucsi96/get-next-version` for a
version. It answers from the newest `server-N` / `client-N` tag: no changes under
the component's directory since that tag means no version, and every publish step
is skipped. The release step must therefore tag the commit its image was built
from - `target_commitish: ${{ github.sha }}` - because the action otherwise tags
whatever the default branch points at when the release is created, and the
server's native build takes long enough that another push can land first. A tag
left on a commit that was never built makes the next run believe that commit is
already released, so nothing is published for it. That is silent: `deploy`
resolves the newest tag on Docker Hub by `last_updated` and succeeds, deploying
the previous commit's image, so a fix can look deployed while the running image
predates it. When a change does not reach production, check that a release tag
exists on the commit and that `publish-server` did not skip its build steps.

## Core Entities

### Card
Primary entity representing flashcards with JSONB data containing:
- Word information (translation, gender, word type, examples)
- FSRS scheduling data (stability, difficulty, due date, state)
- Multilingual content (German base + English, Swiss German, Hungarian)
- Audio references and example images

### Source  
Represents PDF documents with metadata (name, fileName, startPage, bookmarkedPage)

### ReviewLog
Tracks review history and performance metrics for spaced repetition

## Key Services

### Backend Services
- **CardService**: Core flashcard CRUD operations, spaced repetition scheduling, statistics
- **TranslationService**: OpenAI-powered multilingual translations with context awareness
- **AudioService**: TTS audio generation and management  
- **DocumentProcessorService**: PDF text extraction and processing
- **FileStorageService**: Local file system storage for PDFs and assets

### Frontend Services
- **CardService**: Angular service for card state management and API interactions
- **SourcesService**: PDF source management and page navigation
- **BatchAudioCreationService**: Bulk audio generation with progress tracking
- **BulkCardCreationService**: Batch card creation workflows

## API Routes

### Key Endpoints
- `GET /api/sources` - List PDF sources
- `GET /api/sources/{id}/pages/{pageNumber}` - Process PDF page content
- `GET/POST/PUT/DELETE /api/cards` - Card CRUD operations
- `POST /api/translations` - AI-powered translations
- `POST /api/audio` - Generate pronunciation audio
- `GET /api/cards/due` - Spaced repetition due cards query
- `GET /api/source/{sourceId}/study-session` - Get today's existing study session (204 if none)
- `POST /api/source/{sourceId}/study-session` - Create or resume today's study session (idempotent)
- `GET /api/source/{sourceId}/study-session/current-card` - Get next card for today's session
- `POST /api/source/{sourceId}/word-import` - Stage word candidates from an analyzer JSON word list (word triage sources only)
- `GET /api/source/{sourceId}/word-import` - Pending word candidates and triage stats
- `POST /api/source/{sourceId}/word-import/candidates/{id}/known|card|undo` - Decide or revert a candidate

### Frontend Routes
- `/` - Home dashboard with study overview
- `/sources` - Admin panel for managing PDF sources
- `/sources/:sourceId/page/:pageNumber` - PDF page viewer with word selection
- `/sources/:sourceId/study` - Flashcard study mode
- `/sources/:sourceId/word-import` - Swipe triage of imported word candidates
- `/in-review-cards` - Cards pending review

## Development Patterns

### Data Storage
- Uses JSONB for flexible card data structure in PostgreSQL
- Resource-based reactive patterns in Angular for efficient data loading
- Batch operations for bulk card and audio creation

### Authentication
- Azure Active Directory integration with role-based access control
- Scopes: `readDecks`, `createDeck`
- Roles: `DeckReader`, `DeckCreator`

### AI Integration
- Context-aware translations between German, English, Swiss German, Hungarian
- Intelligent audio pronunciation generation
- Contextual example image generation

## Testing Strategy

The test suite uses Playwright for end-to-end testing covering:
- Bulk card/audio creation workflows
- Card editing and review functionality  
- Source management and page processing
- Study mode and spaced repetition logic
- User profile and authentication flows

Tests are located in the `test/tests/` directory with supporting utilities in `test/utils.ts`.

## Language Learning Features

### Spaced Repetition
- Cards have states: New, Learning, Review, Relearning
- FSRS algorithm tracks stability, difficulty, repetitions, lapses
- Due card queries optimized for study session efficiency

### Daily Study Sessions
- Study sessions are day-based: one session per source per day
- Sessions automatically resume when returning to the study page on the same day
- No session IDs in browser URLs - sessions are resolved server-side by source and date
- POST to create session is idempotent - returns existing today's session if one exists
- Sessions older than 1 day are automatically cleaned up

### Multilingual Support
- German as primary language with smart context-aware translations
- Proper grammar handling for gender, cases, word types
- Audio pronunciation support for all supported languages

### Content Creation
- Interactive PDF page viewer for word selection
- Bulk operations for efficient card creation
- Word triage sources (`wordTriage` source type) hold no document and accept vocabulary cards only; their words come from an imported analyzer JSON
- Word list import with swipe/keyboard triage: known words go to the known words table, unknown ones become draft vocabulary cards
- AI-generated contextual examples and images
