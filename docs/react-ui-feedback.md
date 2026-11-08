# React UI integration findings

## Adopted in 0.6.0

The library proposals below shipped in `@mucsi96/react-ui` 0.6.0 and the application
now uses its `NumberField` for source and provider limits, `CheckboxGroup` for
source card types, and the large dialog's fixed footer for source creation/editing.
Numeric settings save committed values; empty inputs remain invalid rather than
being converted to zero. Source limits use positive integer bounds.

Model usage uses library tabs, keeping the logs panel mounted to preserve its grid
while switching views. Shared query placeholders, answer generation, and content
discovery use skeleton primitives. Sources, the home dashboard, voices, and model
summaries use `EmptyState`. The small source card-type set uses visible checkboxes;
the new `MultiSelect` remains available for future larger selection fields.

The original migration findings follow for context.

The frontend migration used `@mucsi96/react-ui` 0.5.0. These suggestions came from
the source form, settings, and responsive screenshots, rather than hypothetical
components. They are proposals for the library; this repository does not publish
changes to `react-ui`.

## Recommended additions

1. **NumberField**: source limits and provider rate limits need integer values,
   minimums, and accessible validation. `TextField type="number"` does not expose
   native `min`/`max`/`step` props in its public type. A React Aria NumberField
   with the existing field appearance, bounds, and validation would remove
   repeated numeric parsing from applications.
2. **MultiSelect / CheckboxGroup**: card types are a small multi-selection field.
   The current Select supports one value, so the app composes a fieldset of
   checkboxes. A labelled checkbox group with errors/descriptions and a compact
   multi-select for larger sets would cover both use cases without hiding form
   semantics.
3. **Dialog layout slots and sizing**: the source form is long on a 390px screen.
   The public `className` styles the inner dialog while the outer modal limits
   width. A documented `size`/`maxWidth`, scrollable body, and fixed action footer
   would let applications keep Save/Cancel visible without reaching into private
   selectors. Test short and long forms with an on-screen keyboard and safe-area
   insets.

## Useful follow-ups

- **EmptyState**: source lists, known words, voices, and completed queues repeat
  a heading, explanatory text, and optional action. A composable primitive should
  leave all business wording and actions to the consumer.
- **Tabs**: model usage has tabbed detail views. A library wrapper around React
  Aria Tabs would supply consistent styling and keyboard behavior.

## Findings addressed in this application

- React UI 0.9.0's `LoadingArea` replaces skeletons and standalone loaders.
  Page layouts allocate the available space for `fill`; section and dialog
  loaders use the compact area with an accessible label and reduced-motion support.
- The first mobile source-table screenshot wrapped headings and names into single
  characters. A minimum table width and a local horizontal scroll container fix
  this; it is application table sizing, not a library defect.
- Unbounded validation text could overflow a dialog. Error content now wraps
  within its container, and invalid API payloads show a concise retry message
  while detailed validation errors go to telemetry.
- React Aria switches and checkboxes use a visually hidden native input. E2E
  tests use semantic keyboard activation where appropriate instead of trying to
  click that hidden input. This is not a reason to replace accessible controls.

Review appearance and behavior before proposing upstream changes; source-specific
flashcards, triage decks, and vocabulary progress belong in this application.
