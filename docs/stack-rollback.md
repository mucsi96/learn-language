# Restore Angular

The owner requested this rollback on 2026-11-09 because of visual regressions
and because Rust is not the target backend language.

Reverse PRs #518, #516, #514, #510, #508, #507 and #505, restoring the application,
build and tests to `1149998f`. The backend on main is still Java/Spring Boot;
the Rust branch was never merged and is not part of this rollback.

This retains Azure story discovery and collection paths, study-progress dots,
the bottom Pomodoro progress bar, voice-preview fixes, gateway authentication,
static hosting and the November 6 resource sizing. React-specific follow-up
layout/loading changes and the React avatar-menu timer redesign are removed.

No database or storage rollback is needed. In particular, do not undo the Azure
story access grant or restore references to the deleted legacy Azure assets.

The rollback is an ordinary forward commit and publishes a new client release.
CI must validate the native build and Playwright before merge. Production checks
include study/Pomodoro on phone and tablet, PDF rendering, voice previews, story
discovery, gateway login and the separately authenticated dictionary/export APIs.
