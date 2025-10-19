# Voice Selection Dialog

Implement a voice slection dialog on triggered from existing openVoiceSelection method

Acceptance Criteria

- Use a latest standalone Angular dialog component with resource-based state for fetched data.
- For implementation patterns take inspiration from edit-vocabulary-card.component.ts
- As input data use the current card audio map.
- Fetch /api/voices on init, show skeleton during load
- Group voices by supported languages (German then Hungarian) using the provided language labels, sort options alphabetically per group, and render headers with Material translate icon
- For voices that already have audio, enable preview playback (GET /api/audio/{id})
- expose “Use this voice” button that marks the audio as selected while ensuring only one selection per language
- For voices lacking audio show an empty card and allow the user to preview the adio in this voice. And allow to make the voice as selected
- Provide a close action that dismisses the dialog without mutating 
- Any action should not affect the real card until the dialog is closed with save button.
- The card audio selection dialog save button  is clicked the dialog closed, card audio map is updated and the word card is reloaded.


Design Spec

- Apply Angular Material typography/colors, using mat-dialog-title, mat-dialog-content, and mat-dialog-actions with system tokens for foreground/background 
- Make the dialog large so we nicelty see all the cards
- Voice cards present name, status chips (“Selected”), action buttons, and tooltips following Material tone; chips are pill-shaped with uppercase microtext
- Playback uses mat-icon-button (play/stop) and selection uses mat-stroked-button; 
- Language groups stack vertically with 24px spacing; voice cards render in responsive grid repeat(auto-fit, minmax(240px, 1fr))
- Voice cards include 20px internal padding, large radius, subtle border, hover elevation, and state modifiers for selected (primary border/background)
