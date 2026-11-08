# Voice Selection Dialog

Implement a voice selection dialog from the card audio actions.

Acceptance Criteria

- Use the application's dark theme and the look and feel of the card component.
- Try to limit the ammount of custom styling. Prefer using the builting controles with custom properies
- Use a React dialog with TanStack Query for fetched data.
- Open the dialog from the card audio actions.
- Follow existing components under `client/src/features/creation`.
- As input data use the current card audio map.
- Fetch /api/voices on init, show skeleton during load
- Group voices by supported languages (German then Hungarian) using the provided language labels and sort options alphabetically per group.
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

- Use `@mucsi96/react-ui` dialogs, typography, and theme tokens.
- Make the dialog large so we nicelty see all the cards
- Voice cards present name, selection status, action buttons, and tooltips.
- Playback uses accessible play/stop buttons and selection uses an outlined button.
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
