# Chromium migration comparison

The baseline is `1149998f64d7e00ce61dee329b399619b7d00c09`, the parent of
the React migration. Both production builds use the same test backend and
fixtures. Only frontend documents and static assets are intercepted.

Start the project's test services, then build the baseline in a separate clone:

```bash
git clone https://github.com/mucsi96/learn-language.git /tmp/opencode/learn-language-pre-react
git -C /tmp/opencode/learn-language-pre-react checkout 1149998f64d7e00ce61dee329b399619b7d00c09
cd /tmp/opencode/learn-language-pre-react/client
npm ci
npm run build
```

From this repository's `test` directory:

```bash
AUDIT_OUTPUT=/tmp/opencode/visual-audit AUDIT_VERSION=baseline \
  AUDIT_DIST=/tmp/opencode/learn-language-pre-react/client/dist \
  npx playwright test --config visual-audit/playwright.config.ts

# Build the current client first. Keep a copy of dist to preserve pre-fix captures.
AUDIT_OUTPUT=/tmp/opencode/visual-audit AUDIT_VERSION=repaired \
  AUDIT_DIST="$PWD/../client/dist" \
  npx playwright test --config visual-audit/playwright.config.ts
```

Run sequentially: each scenario resets the shared database and mock servers.
Do not run this audit concurrently with the application test suite.

Each capture writes a full-page PNG and JSON containing visible text, document
width, and off-screen control metadata at 1440×1000 and 390×844. Off-screen
controls in intentionally scrollable tables are not automatically defects.

To produce paired screenshots, six-state contact sheets and a coverage inventory,
copy `compare.mjs` to a scratch directory with `sharp` installed and run:

```bash
AUDIT_OUTPUT=/tmp/opencode/visual-audit node compare.mjs repaired
```

Open `comparisons/repaired/index.html` for a browsable gallery. Pairs place Angular
on the left and React on the right. Inspect full images as
well as contact sheets, which crop tall pages. Pixel differences alone are not
failures: typography, accessible controls, responsive settings navigation, and
the rendered PDF background intentionally differ.

This is a reproducible finite state matrix, not an exhaustive enumeration of
arbitrary content, concurrent operations, devices, or third-party failures.
