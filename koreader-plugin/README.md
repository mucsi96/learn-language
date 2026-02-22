# AI Dictionary KOReader Plugin

KOReader plugin that looks up highlighted German words using the learn-language server's dictionary endpoint. Returns translations, grammatical forms, and example sentences.

## Installation

1. Copy the `ai-dictionary.koplugin` folder into KOReader's `plugins/` directory:

   ```
   koreader/
     plugins/
       ai-dictionary.koplugin/
         _meta.lua
         main.lua
         ai-dictionary.json        <-- you create this
         ai-dictionary.token       <-- downloaded from the app
   ```

2. Create `ai-dictionary.json` inside the plugin folder (see `ai-dictionary.json.template`):

   ```json
   {
       "serverUrl": "https://your-server.example.com",
       "targetLanguage": "en"
   }
   ```

   | Field            | Required | Description                                      |
   |------------------|----------|--------------------------------------------------|
   | `serverUrl`      | yes      | Base URL of the learn-language server (no trailing slash) |
   | `targetLanguage` | no       | `"en"` (English) or `"hu"` (Hungarian). Defaults to `"en"` |

3. Download the token file from the learn-language app:
   - Go to the API Tokens page in the web UI
   - Create a new token — the browser will download `ai-dictionary.token`
   - Place this file inside the `ai-dictionary.koplugin/` folder

4. Restart KOReader.

5. Disable KOReader's built-in dictionary popup on single-word selection — otherwise the default dictionary opens before you can reach the plugin buttons. To do that:
   - Tap the top of the screen to open the top menu
   - Go to **Settings** (gear icon)
   - Select **Long-press on text**
   - Disable **Dictionary on single word selection**

## Usage

1. Open a German book in KOReader
2. Long-press a word or select a phrase to bring up the highlight dialog
3. Tap **AI Dictionary**
4. The plugin sends the highlighted word with surrounding context to the server and displays the result
