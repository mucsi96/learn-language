# Listening redesign previews

Captured from the Angular production build in Chromium using fixture API responses and a local preview session. These images show the rendered application, not a static mockup. They do not represent a full-stack E2E run.

- Desktop: 1440 × 1000 viewport
- Mobile: 390 × 844 viewport (full-page captures)
- Dark color scheme

## Home

![Desktop source cards](listening-home-desktop.png)

![Mobile source cards](listening-home-mobile.png)

## Story

![Desktop listening story](listening-story-desktop.png)

![Mobile listening story](listening-story-mobile.png)

## Preparation

![Story preparation in administration](listening-preparation-desktop.png)

## Alphabetical vocabulary

![Missing vocabulary and prerequisites in German alphabetical order](listening-vocabulary-desktop.png)

![Locked listening on mobile](listening-locked-mobile.png)

## Admin story states

All admin captures use `/sources/listening/content/brezel` with fixture responses for each state. Vocabulary selections and transcript expansion were performed through the UI.

| State | Desktop | Mobile |
| --- | --- | --- |
| Preparing transcript and vocabulary | [Screenshot](listening-preparation-desktop.png) | [Screenshot](admin-preparation-mobile.png) |
| Missing vocabulary, nothing selected | [Screenshot](listening-vocabulary-desktop.png) | — |
| Two words selected, transcript expanded, listening locked | [Screenshot](admin-vocabulary-selected-desktop.png) | [Screenshot](admin-vocabulary-selected-mobile.png) |
| All prerequisites satisfied, ready to listen | [Screenshot](admin-ready-desktop.png) | [Screenshot](admin-ready-mobile.png) |
| Preparation failed, retry available | [Screenshot](admin-failed-desktop.png) | [Screenshot](admin-failed-mobile.png) |

The preview checks confirmed that selecting two words enables both bulk actions, ready stories have no unresolved words, the retry action is available after preparation fails, and all captured layouts fit their viewport widths.
