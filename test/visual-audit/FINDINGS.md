# Pre-React visual audit — 2026-11-08

## Versions and method

- Angular baseline: `1149998f64d7e00ce61dee329b399619b7d00c09` (parent of the React migration).
- Original React comparison: `4277281b` (PR #510's initial header fix on top of `36893fc5`).
- Repaired comparison: this branch's production build.
- Chromium at 1440×1000 and 390×844; the same backend, database fixtures, mock AI
  services and stored images for both clients. No backend changes exist between
  the baseline and original React revision.
- Original React build retained separately before rebuilding fixes. Screenshots
  wait for network/font readiness; study fronts and source-edit forms additionally
  assert loaded content. Earlier loading-skeleton captures were replaced.

## Confirmed regressions repaired

Selected evidence (columns: Angular baseline / original React / repaired React):

- [Vocabulary editor and thumbnails](examples/editor-vocabulary.webp)
- [Data-model matrix](examples/settings-data-models-empty.webp)
- [Mobile study card and bottom controls](examples/study-no-image-back.webp)
- [Mobile JSON dialog](examples/json-import-dialog.webp)

| Area | Observed defect | Repair |
| --- | --- | --- |
| Source navigation | Source switcher missing from JSON and card-list headers; page switcher moved into content | Shared header source navigation preserving route-appropriate destinations |
| Study viewport | Fixed header-height subtraction leaves the card incorrectly sized when header controls wrap | Flex layout uses the actual remaining viewport, respects safe areas, restores 1200px maximum card width |
| Study metadata | State reduced to an unlabeled dot; word type/category/topic lost badge presentation | Visible state text and themed badges |
| Pomodoro | Visible progress label overlays bottom study controls | Visually hidden accessible label retaining the thin bottom progress bar |
| Vocabulary editor | Translation fields stack across the entire desktop width; form actions stretch; Update is below long content | Responsive translation grids, expanding form inputs with compact actions, Update in the editor header |
| Editor images | Tiny source images collapse to effectively invisible thumbnails | Explicit full-width square preview buttons, working image preview |
| Editor fields | Grammar/page inputs fall back to native black surfaces | Theme surface and outline tokens |
| JSON import | Native textarea, long example lines, footer scrolls away | Themed multiline field, wrapped example JSON, fixed action footer |
| Photo sources | Upload area has no visible drop-target boundary | Sized, dashed, themed upload region |
| Page navigation | Long previous/next labels and unconstrained page input consume multiple mobile rows | Accessible compact previous/next controls and bounded page input |
| Review | Full-width sticky progress strip overlays the form; form actions consume input space | Compact floating counter, responsive form rows and bounded page width |
| Audio completion notification | Success appears before generated cards are added to the study queue | Wait for queue update before announcing success; exposed by the broader session-limit regression test |
| Model matrix | Model identifiers and headers crush into character-width columns | Readable column minimums, sticky model-name column, aligned switch/radio controls |
| Voice settings | Voice and model names break into character-width fragments on mobile | Natural word wrapping within the existing scrollable table |
| Chat | Messages lose surface grouping and spacing; highlighted German text has poor contrast | Themed message bubbles, form spacing and readable highlight color |
| Chat keyboard dismissal | Sending disables the focused control and drops focus outside the dialog, preventing Escape dismissal | Return focus to the question field before sending and retain focus during pending requests |
| Usage/listening tables | Mobile headings and model names wrap into narrow broken fragments | Readable minimum table widths within horizontal scrolling containers |
| Word triage | Card surface falls back to native Canvas instead of the application theme | Theme surface token |

## Coverage

The matrix produces **88 named screenshots per viewport** for React (176 total),
with **173 paired Angular/React screenshots** and three documented missing mobile
Angular counterparts. The repaired capture run passed all **66 scenarios**.

The executable matrix covers dashboard empty/due states and profile menu; all six
source-type forms, type options, edit/delete/actions; all nine settings sections,
populated named lists, voice configuration/options/preview; four study card types
(welcome/front/back/actions/editor); no-image and flagged vocabulary cards; empty,
completed and resumed study; chat empty/response and voice selection; empty and
populated card tables/review; PDF/photo/JSON creation, JSON empty/invalid/valid
dialogs; image context/preview; extraction/duplicate review/creation progress;
word triage empty/front/back/completed; usage empty/populated/expanded/summary;
listening catalogue/prerequisites/locked/player.

The generated `inventory.json` lists exact paired states, viewport widths and
missing baseline counterparts. Full screenshots must be inspected alongside the
cropped contact sheets.

## Verification

- Client lint and production build (including TypeScript compilation) passed.
- The full application run completed with **629 passed and 2 failed out of 631**.
  The audio session-limit failure exposed the notification ordering race fixed
  above. The grammar extraction failure occurred during fixture setup with a
  duplicate `sources_pkey`, before the UI scenario ran.
- Final targeted verification passed **58/58 tests**, including both failed
  scenarios, responsive layouts, voice configuration, image-model settings and
  review workflows. The grammar fixture failure did not reproduce.
- The repaired visual matrix passed 66 scenarios; the subsequent study/chat/
  listening refresh passed 18 scenarios. Both baseline and original React
  listening-player refreshes passed two scenarios each.
- Final settings/voice screenshot refresh passed **20/20 scenarios**; the
  regenerated comparison inventory reports no React document-level horizontal
  overflow at either viewport.

## Accepted differences and limits

- Responsive settings navigation fixes substantial Angular mobile overflow.
  The rendered PDF background and readable PDF text improve on the old text
  overlay. Accessible control/typography changes are not pixel-match failures.
- Angular mobile PDF region selection did not expose Confirm selection in this
  fixture. Its downstream extracted/duplicate/progress screenshots therefore
  have desktop baseline coverage only. React captures cover both widths.
- This is a finite reproducible state matrix. It does not exhaust arbitrary
  user content, every validation permutation, real microphone/device permissions,
  live provider/network failures, or all browser/OS combinations. Functional
  Playwright coverage complements the visual captures.
- `react-ui` was independently cloned at `cd4376e` and checked: formatting, lint, typecheck,
  build, 17 unit tests and 80 Chromium layout/accessibility tests passed. The
  confirmed defects above originated in application composition/styles; no new
  library defect was demonstrated by this audit.

See [README](README.md) for reproduction. Full artifacts are written outside the
repository under the configured `AUDIT_OUTPUT`, including baseline, original and
repaired PNGs, DOM metadata, paired comparisons and inventories.
