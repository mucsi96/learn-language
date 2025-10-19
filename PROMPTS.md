# Voice Selection Dialog

Implement a voice slection dialog on triggered from existing openVoiceSelection method

Acceptance Criteria

- Use modern looking angular material dark theme inline with client/src/styles.css and the look and feel of the card component.
- Try to limit the ammount of custom styling. Prefer using the builting controles with custom properies
- Use a latest standalone Angular dialog component with resource-based state for fetched data.
- The dialog should open from card-actions.component.ts openVoiceSelection method
- For implementation patterns take inspiration from edit-vocabulary-card.component.ts
- As input data use the current card audio map.
- Fetch /api/voices on init, show skeleton during load
- Group voices by supported languages (German then Hungarian) using the provided language labels, sort options alphabetically per group, and render headers with Material translate icon
- For voices that already have audio, enable preview playback (GET /api/audio/{id})
- expose “Use this voice” button that marks the audio as selected while ensuring only one selection per language
- For voices lacking audio show an empty card and allow the user to preview the adio in this voice. And allow to make the voice as selected
- The generation or playback should only include the single group language for word and example.
- For generation create 2 audios. One for the word and one for example.
- For playback play the word then the example in sequince with small delay in between.
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

Here is the example response from http://localhost:4200/api/voices

[
    {
        "id": "Dme3o25EiC1DfrBQd73f",
        "displayName": "Aggie",
        "languages": [
            {
                "name": "es"
            },
            {
                "name": "en"
            },
            {
                "name": "cs"
            },
            {
                "name": "pl"
            },
            {
                "name": "pt"
            },
            {
                "name": "it"
            },
            {
                "name": "hi"
            },
            {
                "name": "ru"
            },
            {
                "name": "tr"
            },
            {
                "name": "ko"
            },
            {
                "name": "hr"
            },
            {
                "name": "ro"
            },
            {
                "name": "nl"
            },
            {
                "name": "el"
            },
            {
                "name": "id"
            },
            {
                "name": "sv"
            },
            {
                "name": "sk"
            },
            {
                "name": "ta"
            },
            {
                "name": "hu"
            }
        ]
    },
    {
        "id": "Jvf6TAXwMUVTSR20U0f9",
        "displayName": "Klaus: classic, genuine, and unmistakably German.",
        "languages": [
            {
                "name": "en"
            }
        ]
    },
    {
        "id": "TumdjBNWanlT3ysvclWh",
        "displayName": "Magyar Férfi - Hungarian Male",
        "languages": [
            {
                "name": "es"
            },
            {
                "name": "pl"
            },
            {
                "name": "el"
            },
            {
                "name": "hi"
            },
            {
                "name": "cs"
            },
            {
                "name": "hr"
            },
            {
                "name": "ar"
            },
            {
                "name": "ro"
            },
            {
                "name": "tr"
            },
            {
                "name": "ru"
            },
            {
                "name": "nl"
            },
            {
                "name": "pt"
            },
            {
                "name": "id"
            },
            {
                "name": "ta"
            },
            {
                "name": "fr"
            },
            {
                "name": "sv"
            },
            {
                "name": "it"
            },
            {
                "name": "hu"
            }
        ]
    },
    {
        "id": "ZQFCSsF1tIcjtMZJ6VCA",
        "displayName": "Louisa ",
        "languages": [
            {
                "name": "hi"
            },
            {
                "name": "it"
            },
            {
                "name": "pl"
            },
            {
                "name": "pt"
            },
            {
                "name": "es"
            },
            {
                "name": "fil"
            },
            {
                "name": "cs"
            },
            {
                "name": "fr"
            },
            {
                "name": "ar"
            },
            {
                "name": "tr"
            },
            {
                "name": "hu"
            },
            {
                "name": "ro"
            },
            {
                "name": "ms"
            },
            {
                "name": "hr"
            },
            {
                "name": "ta"
            },
            {
                "name": "sv"
            },
            {
                "name": "no"
            },
            {
                "name": "da"
            },
            {
                "name": "de"
            }
        ]
    },
    {
        "id": "ghgFyr7gmpr57xyTgX9q",
        "displayName": "Emilia - Sweet German Soul",
        "languages": [
            {
                "name": "de"
            }
        ]
    },
    {
        "id": "iOLZqmXTaFktMrY5oZ2z",
        "displayName": "Nadja - Professional ",
        "languages": [
            {
                "name": "de"
            }
        ]
    },
    {
        "id": "xQ7QVYmweeFQQ6autam7",
        "displayName": "Balazs -  Calm",
        "languages": [
            {
                "name": "hu"
            }
        ]
    },
    {
        "id": "z1EhmmPwF0ENGYE8dBE6",
        "displayName": "Christian Plasa - Conversational v2 Clean",
        "languages": [
            {
                "name": "hu"
            },
            {
                "name": "tr"
            },
            {
                "name": "cs"
            },
            {
                "name": "hr"
            },
            {
                "name": "ro"
            },
            {
                "name": "ko"
            },
            {
                "name": "de"
            },
            {
                "name": "it"
            },
            {
                "name": "da"
            }
        ]
    }
]
