# Production-grounded prompt audit (#546)

Audit date: 2026-11-18. Baseline code: `566f58d2`.
Issue: https://github.com/mucsi96/learn-language/issues/546

## Evidence and limits

`baseline.sql` was run through `p07/scripts/postgres_shell.sh learn-language`
in a read-only, repeatable-read transaction. `baseline.json` contains the full
operation/model baseline: sample sizes, rating distribution (including null),
token coverage and averages, estimated cost, and median/p95 latency. The fixed
window is September 9 inclusive to November 19 exclusive, 2026. Timestamps are
application `LocalDateTime`, stored without a timezone; do not relabel them UTC.
The actual retained observations span September 9–November 12.

| Operation | Retained interactions |
|---|---:|
| Translation | 794 |
| Image description | 612 |
| Classification | 257 |
| Answer check | 172 |
| Extraction | 80 |
| Duplicate detection | 12 |
| Explanation | 5 |
| Retired source-content extraction | 5 |
| Image generation | 1,004 |
| Audio generation | 342 |
| Transcription | 5 |

All **3,288 interactions are unrated**. There are no low-rated responses to
sample, and no rating-based quality ranking is possible. The 1,937 chat logs
have no null/empty recorded responses and $6.209854 estimated cost in total.
This is not a success rate: failed provider calls are not recorded by
`ChatService`; structured responses are logged after conversion, not as raw
provider output. Missing observations cannot establish schema reliability.
Media logs have no response content for linguistic inspection.

`samples.sql` selects the first and last retained chat response per
operation/model, plus every rating <= 2. This yields **59 distinct logs** across
31 operation/model strata. Inspection used response excerpts up to 1,100
characters, with additional latest-response excerpts up to 2,200 characters.
This deterministic coverage sample is not random and cannot estimate error
prevalence. Raw responses remain outside the repository; IDs below support
reinspection with authorized production access.

Historical logs store model names but neither prompts, original inputs, model
options, deployed commit, nor card/source foreign keys. 811 chat logs have no
operation ID. The remaining IDs correlate requests from `MultiModelService`,
not durable card identities. `OperationIdFilter` only copies the request header;
there is no input archive to join. Responses can reveal some input content
(e.g. a rejected Vim key), but cannot reconstruct full original conversations,
PDF crops, selected CEFR level, or historical prompt versions. Current saved
cards would not prove what the model originally received. Evaluation fixtures
therefore label reconstructions and code-review gaps explicitly.

## Findings and priorities

1. **Extraction forms, medium severity (80 extraction logs).** Log 6495
   (`claude-sonnet-5`) returns empty forms for `das Sofa` and `die Speisekarte`.
   These ordinary nouns have plurals. The source crop is missing, so whether
   the original omitted the printed form is unknown. The current
   forms-and-examples prompt calls forms “extracted from the document”, while
   its next rules require generation. Clarify that missing printed hints do
   not mean missing grammatical forms. Conversely, log 8205 correctly leaves
   `das Wasser` without a plural in `Ein Glas Wasser, bitte.` A reconstructed
   page exposed inappropriate `Wasser/Wässer` plurals in live evaluation:
   baseline passed 5/9, the initial missing-hint candidate 0/9. The final rule
   generates forms for the contextual sense and preserves empty forms for
   uncountable substances/abstractions, rather than substituting plurals for
   varieties. Both omitted countable plurals and valid empty forms are tested.
   Do not infer a production failure frequency from these reconstructed cases.
2. **Contradictory extraction exemplar, medium severity.** All format variants
   request third-person present, past, perfect but exemplify
   `gehen → gehst, geht, ist gegangen`. Correct to `geht, ging, ist gegangen`.
   The prompt also requests a bare array despite `ExtractedWordList` requiring
   a `wordList` object. Make the prose agree with the existing schema. These
   are demonstrable code-review gaps, not attributed historical failures.
3. **Technical answer grading, high impact (172 checks).** Logs 6251, 9125,
   9306 and 9307 show Vim/Kubernetes learning, not just German prose. They
   include sensible rejected answers and valid alternatives; they are not
   evidence of misgrading. The blanket allowance for spelling mistakes is
   nonetheless underspecified for identifiers/flags. A candidate distinguished
   natural-language spelling from executable meaning and emphasized question
   constraints/data boundaries. **Rejected after live evaluation:** it falsely
   rejected a valid Vim alternative and increased input tokens. Later repeated
   checks also exposed that false rejection with the original prompt, so it
   cannot be attributed solely to the candidate. The final, smaller change
   explicitly treats the reference answer as one valid solution and prohibits
   inferring additional restrictions from its implementation. Code is judged
   by behavior; invalid syntax/identifiers are not harmless spelling mistakes.
   Fixtures retain paraphrases, negation, identifiers, dry-run and empty answers.
4. **Previously addressed / no new change.** Logs 6943/8688 omit adjective
   degrees; the current shared adjective rule already explicitly requires
   them. Samples 6416/6893/7970/8893 contain plausible contextual translations;
   absent inputs preclude judging lost senses or sentence alignment. Image
   descriptions span historical string and current object response shapes
   (6264 versus 8035); this is schema evolution, not malformed output evidence.
   Long descriptions may cost more but source constraints/counts are missing.
   Do not shorten them without a controlled quality comparison.

## Complete prompt inventory and disposition

Paths below are relative to
`server/src/main/java/io/github/mucsi96/learnlanguage/service/`.
Every call goes through `ChatService` unless explicitly noted. Structured
contracts are derived from the Java response types using `BeanOutputConverter`
and provider structured output; explanation is free text with conversation
history. “Keep” means reviewed without sufficient evidence for a change, not
that production quality has been proven.

| Prompt / call site | Variants, purpose and output contract | Decision |
|---|---|---|
| `TranslationService.translate` | Vocabulary; `en`, `ch`, `hu` (unknown language currently falls back to English); headword/examples → `TranslationResponse {translation, examples}`. HU appends recall rules. | Keep: contextual samples plausible; exact inputs/order and Swiss dialect unavailable. |
| `SentenceTranslationService.translateToHungarian/translateToEnglish` | Speech/grammar sentence; HU recall rules or EN; `{translation}`. | Keep: latest EN greetings coherent (9503/9510/9517); no paired source to justify wording changes. |
| `DictionaryService.lookup` | Highlighted word/sentence/book context; EN/HU × A1–C2; `{normalizedWord, translation, germanExample, translatedExample, forms}` with new contextual example. | Keep: already specifies separable/reflexive constructions, sense preservation, level and data boundaries; operation logs do not distinguish dictionary calls. |
| `WordNormalizationService.normalize` | Inflected German + sentence → `{normalizedWord, forms}`; nouns without article, full separable infinitives. | Keep: explicit contextual contract; classification aggregates do not identify historical inputs. |
| `WordTypeService.detectWordType` | German word → `{type}` from 13 uppercase categories, including EXPRESSION/OTHER. | Keep: responses are labels without original words; cannot assess misclassification from a label. |
| `GenderDetectionService.detectGender` | German noun → `{gender}` MASCULINE/FEMININE/NEUTER. | Keep: grammatical gender is distinct from voice gender; inputs absent. |
| `VoiceGenderService.classify` | German sentence → `{voiceGenderHint}` male/female/unknown; unknown becomes absent hint. | Keep: conservative speaker-only rule already excludes noun gender, stereotypes and ambiguous quotations; latest unknowns (9515/9523/9528) cannot be scored without inputs. |
| `AreaWordsService.getAreaWords` | PDF/photo crop; three formats × A1–C2, null format follows flowing-text branch; `{wordList:[{word,forms,examples}]}`. Listed examples copied; flowing-text examples generated at level. | **Revise** inconsistent wrapper, conjugation example and missing form hints; require contextual noun senses so mass nouns do not acquire unrelated plurals. Preserve all format/CEFR branches. |
| `AreaSentenceService.getAreaSentences` | Speech crop × A1–C2 → `{sentences:[string]}`; complete sentences only, empty for fragments. | Keep: explicit non-fabrication contract; no identifiable crop/fragment failure. |
| `AreaGrammarService.getAreaGrammarSentences` | Grammar crop × A1–C2 → `{sentences:[string]}`; fills printed gaps in brackets, skips handwriting/fragments. | Keep: generation of gap answers is intentional, unlike sentence extraction; no paired page evidence. |
| `LessonDescriptionService.describe` | One/two grammar photos × A1–C2 prior → `LessonDescription {title, level, summary, examples}`. | Keep: German summary, level correction and handwriting exclusions explicit; zero dedicated operation logs. |
| `PhotoGrammarConceptService.generateConceptCards` | Lesson description × A1–C2 × requested count → `{sentences:[{sentence,hint}]}`; bracketed answers and optional German disambiguation. | Keep: already handles ambiguous sie/Sie and multiple gaps; zero dedicated operation logs. Nullable schema versus omitted-hint prose deserves future live evaluation; no unrelated contract rewrite here. |
| `ContentTextService.vocabulary` | Stored story text, fixed beginner exclusions (no source-level parameter); `{words:[{lemma,wordType,article,forms,examples,surfaceForms}]}`. Masculine person lemmas and verbatim evidence are intentional. | Keep: source evidence validated in code; historical extraction sample is PDF word lists, not proof about this workflow. |
| `DuplicateDetectionService.detectDuplicates` | Prefix-filtered existing/new IDs → `{duplicates:[{newId,existingId,reason}]}`, English reasons; exact IDs excluded. | Keep: sampled empty results (12 total logs) have no original ID pairs; no basis for relaxing conservatism. |
| `AnswerCheckService.checkAnswer` | Typing-enabled front/back cards; EN/HU explanation × card content × enabled model → `{correct:boolean, explanation:string}`, empty explanation when correct. | **Revise after experiment**: reject broad stricter candidate; explicitly accept valid alternative implementations without inventing constraints, while preserving syntax/identifier meaning. |
| `CardExplanationService.explain` | Full card JSON + conversation history; EN/HU; prose with German spans bolded. Vocabulary/speech/grammar/simple all share teacher persona. | Keep: 7135 successfully explains Kubernetes despite German persona; 8926/9262/9264/9266 give useful grammatical explanations. Small sample; no evidence for a persona overhaul. |
| `ImageService.describeScenes` | Input or preferred nonblank context × count → `{descriptions:[string]}`; distinct photorealistic English scenes, no text. | Keep: current exact-count/nonblank/duplicate validation and diversity contract are explicit; no rated or input-linked image quality evidence. |
| `HungarianTranslationPrompt.RECALL_GUIDELINES` | Shared HU word/sentence translation suffix; natural recall cues preserve participants, action, negation, modality, tense. | Keep: already addresses lexical drift; do not replace idiomatic Hungarian with literal calques. |
| `AdjectiveFormsPrompt.RULE` | Shared dictionary/normalization/PDF/story suffix; comparative then am-superlative, non-gradable empty. | Keep: already addresses missing historical degrees; retain irregular/non-gradable examples. |
| `ImagePromptBuilder.build` | OpenAI/Google/Ideogram image calls; same photorealism/no-text wrapper around scene. Not a chat system message. | Keep: media bytes not in usage logs; no visual quality comparison possible from usage counters. |
| `ElevenLabsAudioService.generateAudio` | v3 DE/HU single-word/sentence tags; other models (including v4) native language code and optional previous text. Not a chat system message. | Keep: intentionally model-specific pronunciation workaround; no audio samples in logs. |

The retired source-content scraping operation has five retained logs and no
current prompt/call site. Transcription sends audio to the provider without an
application system prompt. No client-owned system prompts were found.

### Model variants

Prompt text has no per-chat-model branches. `ChatClientService` sends the same
service prompt to enabled OpenAI, Anthropic, Gemini or xAI models. GPT-6.1 Sol
uses low reasoning effort; other OpenAI/xAI models use their configured
defaults. Anthropic allows 16,000 tokens. Gemini uses its defaults. Selection
is request-driven for multi-model calls and operation-primary for dictionary,
images, lesson description, concept cards and story extraction. Logs record
the selected model but not these options. Current provider structured-output
handling and the historical image-description schema differ; historical
records must not be validated indiscriminately against today's schema.

## Reproduce

Production statistics (requires p07's documented Azure/Kubernetes/psql setup):

```bash
bash ../p07/scripts/postgres_shell.sh learn-language < docs/prompt-audit/baseline.sql
bash ../p07/scripts/postgres_shell.sh learn-language < docs/prompt-audit/samples.sql
```

Live evaluation uses synthetic/reconstructed fixtures in `cases.json`; it
does not replay private production inputs or write application records.
`PromptEvaluationExportTest` exports actual Java-built prompts for both
languages and all 18 extraction format/level combinations, plus actual Spring
schemas. It runs only with `-Dprompt.export=ABSOLUTE_PATH`. For the baseline,
use a separate checkout of `566f58d2`, copy this exporter test into it and run
the same Maven command there. Export the revised branch separately:

```bash
cd server
./mvnw -q -Dtest=PromptEvaluationExportTest -Dprompt.export=/tmp/opencode/prompt-revised.json test
```

From the repository root, with `OPENAI_API_KEY` provided in the environment:

```bash
python3 -m venv /tmp/opencode/prompt-eval-venv
/tmp/opencode/prompt-eval-venv/bin/pip install Pillow==12.2.0 jsonschema==4.26.0
/tmp/opencode/prompt-eval-venv/bin/python scripts/evaluate-prompts.py \
  --baseline /tmp/opencode/prompt-baseline.json \
  --revised /tmp/opencode/prompt-revised.json \
  --models gpt-5.6-luna gpt-6.1-sol gpt-6-sol --repetitions 3 \
  --output /tmp/opencode/prompt-evaluation-results.json
```

This makes paid API calls. The runner uses provider JSON schemas, validates
each response, checks exact linguistic forms/example preservation and grading
outcomes, and records prompt hashes, responses, token usage and wall-clock
latency. It reports provider/schema errors as failures rather than silently
retrying or excluding them. No fixed seed is supported; repeated results may
vary. Image cases render fixture text using DejaVu Sans into PNG crops; they
test actual media input, not text masquerading as a PDF crop. Automatic checks
do not grade all prose quality: inspect explanation language/usefulness and
generated CEFR examples manually as well.

## Evaluation results

`evaluation.jsonl` contains **306 responses**: 17 cases × 3 repetitions ×
3 models × 2 variants. The final comparison combines two labeled batches:
five extraction cases from the noun-sense experiment and twelve answer cases
after the final grading revision. Each batch compares the same inputs/models
before and after; every response's prompt SHA-256 was verified against the
baseline/final Java exports. It is not an independent third experiment.
All 306 responses validate against the Java-derived schemas; no provider errors
occurred in these batches.

The models represent the most common historical answer checker
(`gpt-5.6-luna`, 135/172 checks) and recent production use (`gpt-6.1-sol`,
`gpt-6-sol`), with application-equivalent reasoning options. Baseline passes
**147/153**; final prompts pass **153/153**. Extraction improves **39/45 →
45/45**: five inappropriate mass-noun plurals and one excess generated-example
case disappear. The mass-noun case specifically improves **4/9 → 9/9**, while
ordinary countable plurals, verb/adjective forms and verbatim examples remain
correct. The final answer-only batch passes 108/108 for both versions; the
earlier intermittent alternative-answer failures are documented below.

| Model | Baseline / final pass | Baseline / final input tokens | Baseline / final output tokens | Baseline / final estimated USD | Baseline / final median ms |
|---|---|---|---|---|---|
| GPT-5.6 Luna | 47/51 → 51/51 | 24,072 → 28,002 | 4,363 → 4,122 | .050250 → .052734 | 1,499 → 1,378 |
| GPT-6.1 Sol | 51/51 → 51/51 | 24,072 → 28,002 | 2,407 → 2,209 | .072214 → .078094 | 2,897 → 2,899 |
| GPT-6 Sol | 49/51 → 51/51 | 24,072 → 28,002 | 3,393 → 3,090 | .082074 → .086904 | 1,496 → 1,388 |

Total estimated cost increases **$0.204538 → $0.217732 (+6.45%)**; input
tokens increase 72,216 → 84,006 (+16.33%) and output tokens decrease
10,163 → 9,421. Extraction alone costs $0.123567 → $0.128785 (+4.22%), with
median latency 2,439 → 2,171 ms. The modest token cost buys explicit semantic
constraints. Estimates use repository `ModelPricingConfig` rates per million
input/output tokens: Luna $1/$6; Sol $2/$10. These are not invoices; cache
discounts are not applied, matching application accounting. Timing and output
token differences are stochastic and cannot establish a speed improvement.

### Retained unsuccessful experiments

- `grading-experiment.jsonl` contains 288 responses on the first 16 cases.
  Baseline passed 144/144; the broad stricter candidate passed 143/144. Its
  exact templates are in `rejected-answer-prompts.json`. GPT-5.6 Luna rejected
  valid Vim `:1` by inferring a normal-mode requirement from reference `gg`.
- `mass-noun-experiment.jsonl` adds 18 responses on the reconstructed water
  case: baseline 5/9, initial missing-hint candidate 0/9. The candidate
  returned unrelated plurals to fill the forms list; its A1 prompt is retained
  in `rejected-word-prompt.txt`. This led to the explicit contextual mass-noun
  rule, not removal of the failing fixture.
- `noun-sense-experiment.jsonl` contains 306 responses: baseline 146/153,
  revised extraction plus original grading 151/153. Extraction passed all
  45 revised checks. The unchanged original answer prompt also rejected `:1`
  intermittently (one baseline and two revised-label calls with identical
  prompt hashes). Thus the first rejection cannot be attributed exclusively
  to the stricter candidate. A smaller final rule explicitly accepts valid
  alternative implementations without inferring restrictions; its paired
  answer rerun is included in `evaluation.jsonl`.

Earlier exploratory runs: one attempt aborted on HTTP 500 before saving
results (call count/cost cannot be recovered from the runner). After adding
error recording, 60-call and 270-call runs passed both variants on 15 cases.
Later failing experiments are retained rather than replaced by those earlier
passing runs. The final score is a small, deliberately selected regression
set, not a statistically demonstrated production error-rate reduction.

Manual inspection of representative responses across all three models found
Hungarian negation explanations in Hungarian, concise technical explanations,
preserved list examples, and simple grammatical generated German sentences.
This is an author review, not a blinded or independent linguistic evaluation.
The automated score covers the explicit fixture assertions, not every possible
linguistic property. All six CEFR levels are exported, but only A1/A2/B1 are
exercised by these media fixtures.

Untested Anthropic/Gemini/xAI models, noisy handwritten crops, and retained
prompts without input-linked evidence remain limitations. The corrected schema
description/conjugation exemplar removes definite contradictions, but its
individual contribution is not isolated from the noun-sense change. Neither
the head-to-head results nor the absence of historical ratings proves that all
production output is correct. Follow-up remains necessary.

The Playwright command-identifier case exercises the real study UI/API and
incorrect-answer presentation with the existing mock provider. It does not
measure model judgment; the live evaluator is the behavioral prompt regression
check. Existing bulk-card tests cover the extraction workflow and schema
integration.

## Build and integration verification

- `cd server && ./mvnw -q clean package`: 122 tests passed; the opt-in export
  test was skipped in the normal build and passed separately with
  `-Dprompt.export=...`.
- `cd test && npx playwright test json-source.spec.ts bulk-card-creation.spec.ts`:
  56 passed against the JVM test-profile server during implementation.
- After the final noun/answer changes, rebuilt the JAR and repeated the four
  focused extraction/data/answer tests against that exact artifact:
  `npx playwright test json-source.spec.ts bulk-card-creation.spec.ts -g 'bulk card creation includes word data|regions from different pages are combined|typed answer matching the back text|incorrect command identifier'`:
  4 passed. The temporary JVM container used the existing mock/gateway/database
  pod; the original native test server was restored afterward.
- `git diff --check`: passed.
- `cd test && npx tsc --noEmit`: blocked by existing TS5108
  (`moduleResolution=node10` removed in the installed TypeScript). The
  Playwright runner itself completed successfully.
- An intermediate native image build was canceled after its candidate source
  became obsolete. Final native-image verification is left to CI; the final
  changes were compiled and exercised on the JVM.

## Production follow-up

After release, review at 7 and 30 days, using the same grouped SQL with explicit
new time windows. Record the deployment commit and model settings alongside
the report. Seek at least 30 rated examples per changed operation; if fewer
exist, report the sample size and defer conclusions. Rate both accepted and
rejected technical answers and inspect missing noun/verb forms with original
inputs available during review. Record the proportion unrated and the count
of provider errors separately; neither may count as success.

Compare disagreement rates (false accepts/rejects), malformed response errors,
missing/incorrect forms, and median/p95 tokens, cost and latency by operation
and model. Re-run this fixed evaluation after any prompt/model change. Require
no regression on valid alternatives, schema, source-example preservation or
explanation language. Investigate >20% increases in matched-case cost/latency;
production aggregate shifts alone may reflect different card sizes/models.
If failures recur, retain a minimal reviewed reproduction with its prompt
version/model/options, extend the evaluation, and revise or revert the
responsible rule. Historical absence of inputs/ratings remains an explicit
limit, rather than a reason to claim improvement without evidence.
