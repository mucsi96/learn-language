# React styling audit (#506)

Compared the pre-migration Angular frontend (`5d295c79^1`) with React on
`6c97c2c1`, using the same local test gateway, database fixtures, viewport and
mock identity. Both frontends were built locally; the baseline's static assets
were served through Playwright routing, without changing the running backend.

## Findings and fixes

- The CSS assets load successfully. The reported appearance comes from lost
  application layout rules and global element styles interfering with components.
- Profile menu links inherited the application's blue link color and the browser's
  underline. Give semantic menu links neutral, undecorated styling, with low
  specificity so component tones still win.
- The global `:focus-visible` rule overrode the menu's own outline handling,
  drawing an outline around the entire popup. Make the global focus rule a
  zero-specificity default; native links keep a focus ring and React Aria keeps
  its keyboard-focused item treatment.
- Restore the home overview's constrained width, centered wrapping titles and
  badges, equal-height grid rows, hover treatment, and separated right-aligned
  Listen actions. Sparse groups retain the same column widths as larger groups.
- Count badges have circular minimum dimensions and expand into pills for larger
  counts, while count-free study progress dots retain their compact sizing.
- Cards and model-usage grids had reverted to AG Grid's unrelated gray palette.
  Bind their shared theme to the application's surface, text, outline and font
  tokens.
- Give card-filter selects a usable flex basis so their labels and selected
  values do not collapse to the width of “All”; allow the readiness group to
  wrap within mobile screens.
- Use the light link token for the selected settings navigation item so it is
  readable against its raised background.
- PDF spans used a default 16px font because the page API does not return the
  optional font-size property the React renderer expected. On mobile, their
  positions shrank but their text did not, causing severe overlap. Scale text
  from the API's bounding-box height using the page's container-query width.

## Visual comparison coverage

The desktop comparison covers 17 states: home, profile menu, sources, add-source
dialog, empty review queue, voices, data models, image models, source groups,
learning partners, grammar topics, known words, API tokens, daily sessions,
model usage, cards grid, and PDF page selection. The current React screens are
also captured at 390px mobile width. Populated home coverage includes grouped
sources, due-card badges, a long audio-collection name, disabled study links,
and an enabled Listen action. Existing study layout tests capture all four card
types in both tablet orientations and on mobile, including long content.

The React UI library supplies its current system font, form controls, menus and
dialogs. The comparison is about layout and usability, not pixel equality with
Angular Material. PDF selection still displays original document colors on a
white page; settings use the current responsive sidebar and stacked panels.
Provider-backed playback, billing failures and every populated editor combination
are not included in this screenshot audit.

## Reproduce

Verification: frontend lint, TypeScript checks and production build passed.
The styling, visual-audit, profile, study-card-strategies, cards-table-page,
model-usage-page and page-selection suites passed (98 distinct tests across
focused runs). The pre-migration desktop capture also passed. Vite retains its
existing large-chunk advisory for AG Grid; there are no blocking check failures.

With the test pod running and `client/dist` built:

```sh
cd test
npx playwright test styling.spec.ts visual-audit.spec.ts study-card-strategies.spec.ts profile.spec.ts
```

Screenshots are written to each test's output directory. The visual audit checks
that each screen's content has rendered before capturing it. To compare another
locally built frontend against the same fixtures:

```sh
VISUAL_BASELINE_ROOT=/absolute/path/to/angular/dist npx playwright test visual-audit.spec.ts --grep '1440px' --output=/tmp/opencode/angular-audit
```

The baseline directory must contain `index.html` and its generated static assets.
The local test fixtures reset test data; use only the project's test pod.
