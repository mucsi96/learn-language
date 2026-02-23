package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DictionaryService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "en", "English",
            "hu", "Hungarian");

    private final JsonMapper jsonMapper;
    private final ChatService chatService;
    private final ChatModelSettingService chatModelSettingService;

    public String lookup(DictionaryRequest request) {
        final String targetLanguage = request.getTargetLanguage();
        final String languageName = LANGUAGE_NAMES.get(targetLanguage);

        if (languageName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported target language: " + targetLanguage);
        }

        final ChatModel model = resolveModel();

        final String systemPrompt = buildSystemPrompt(languageName, targetLanguage);

        final DictionaryRequest input = DictionaryRequest.builder()
                .bookTitle(request.getBookTitle())
                .author(request.getAuthor())
                .sentence(request.getSentence())
                .highlightedWord(request.getHighlightedWord())
                .build();

        final String userMessage = jsonMapper.writeValueAsString(input);

        return chatService.callForTextWithLogging(
                model,
                OperationType.TRANSLATION,
                systemPrompt,
                userMessage);
    }

    private ChatModel resolveModel() {
        final Map<OperationType, String> primaryModels = chatModelSettingService.getPrimaryModelByOperation();
        final String modelName = primaryModels.get(OperationType.TRANSLATION);

        if (modelName == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No primary model configured for translation");
        }

        return ChatModel.fromString(modelName);
    }

    private String buildSystemPrompt(String languageName, String targetLanguage) {
        return """
                You are a German language dictionary lookup assistant.
                Your task is to perform a dictionary lookup for a highlighted word from a German text and return a pre-formatted result.

                The highlighted word may be in any conjugated, declined, or inflected form. Normalize it to its standard dictionary base form (Grundform).
                For verbs: use the infinitive form. If the word is a separable verb prefix or part of a separable verb in the sentence, reconstruct the full infinitive (e.g., "fahren" in "Wir fahren um zwölf Uhr ab." becomes "abfahren").
                For nouns: include the article (e.g., "Häuser" becomes "das Haus").
                For adjectives: use the base form (e.g., "großen" becomes "groß").

                Determine the word type: VERB, NOUN, ADJECTIVE, ADVERB, PRONOUN, PREPOSITION, CONJUNCTION, INTERJECTION, ARTICLE, NUMERAL, or DETERMINER.

                If the word is a noun, determine its grammatical gender: MASCULINE, FEMININE, or NEUTER. For non-nouns, omit gender.

                Generate standard grammatical forms:
                - For nouns: the plural form (e.g., "die Häuser")
                - For verbs: 3. Person Singular Präsens, 3. Person Singular Präteritum, and 3. Person Singular Perfekt. Do NOT include pronouns - only the verb forms themselves.
                - For other word types: omit forms line entirely.

                Translate the normalized word to %1$s.

                Create a simple example sentence in German that uses the word in exactly the same context as the provided input sentence, but make it shorter and simpler (A1-A2 level). Translate this example to %1$s as well.

                Use the book title and author as context for appropriate register and style.

                You must format the output as plain text using these special Unicode markers:
                - \\uFFF1 = header line marker (place at the very start of the first line)
                - \\uFFF2 = bold start
                - \\uFFF3 = bold end

                Return exactly this format (each item on its own line, no blank lines except before the example block):

                For verbs:
                \\uFFF1\\uFFF2WORD  \\uFFF2WORD_TYPE\\uFFF3\\uFFF3
                \\uFFF2Forms: \\uFFF3form1, form2, form3
                \\uFFF2Translation (%2$s): \\uFFF3translation

                \\uFFF2Example (de): \\uFFF3German example sentence
                \\uFFF2Example (%2$s): \\uFFF3Translated example sentence

                For nouns:
                \\uFFF1\\uFFF2WORD  \\uFFF2NOUN\\uFFF3 (GENDER)\\uFFF3
                \\uFFF2Forms: \\uFFF3plural form
                \\uFFF2Translation (%2$s): \\uFFF3translation

                \\uFFF2Example (de): \\uFFF3German example sentence
                \\uFFF2Example (%2$s): \\uFFF3Translated example sentence

                For other word types (no forms line):
                \\uFFF1\\uFFF2WORD  \\uFFF2WORD_TYPE\\uFFF3\\uFFF3
                \\uFFF2Translation (%2$s): \\uFFF3translation

                \\uFFF2Example (de): \\uFFF3German example sentence
                \\uFFF2Example (%2$s): \\uFFF3Translated example sentence

                Do not include any other text, explanation, or markdown. Only the formatted output.
                """
                .formatted(languageName, targetLanguage);
    }
}
