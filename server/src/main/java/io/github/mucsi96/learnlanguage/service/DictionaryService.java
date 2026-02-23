package io.github.mucsi96.learnlanguage.service;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.model.DictionaryResult;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DictionaryService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "en", "English",
            "hu", "Hungarian");

    private static final String PTF_HEADER = "\uFFF1";
    private static final String PTF_BOLD_START = "\uFFF2";
    private static final String PTF_BOLD_END = "\uFFF3";

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

        final String systemPrompt = buildSystemPrompt(languageName);

        final DictionaryRequest input = DictionaryRequest.builder()
                .bookTitle(request.getBookTitle())
                .author(request.getAuthor())
                .sentence(request.getSentence())
                .highlightedWord(request.getHighlightedWord())
                .build();

        final String userMessage = jsonMapper.writeValueAsString(input);

        final DictionaryResult result = chatService.callWithLogging(
                model,
                OperationType.TRANSLATION,
                systemPrompt,
                userMessage,
                DictionaryResult.class);

        return formatForDisplay(result, targetLanguage);
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

    private String buildSystemPrompt(String languageName) {
        return """
                You are a German language dictionary expert.
                Your task is to perform a dictionary lookup for a highlighted word from a German text.

                The highlighted word may be in any conjugated, declined, or inflected form. You MUST normalize it to its standard dictionary base form (Grundform).
                For verbs: use the infinitive form. If the word is a separable verb prefix or part of a separable verb in the sentence, reconstruct the full infinitive (e.g., "fahren" in "Wir fahren um zwölf Uhr ab." becomes "abfahren").
                For nouns: include the article (e.g., "Häuser" becomes "das Haus").
                For adjectives: use the base form (e.g., "großen" becomes "groß").

                Determine the word type: VERB, NOUN, ADJECTIVE, ADVERB, PRONOUN, PREPOSITION, CONJUNCTION, INTERJECTION, ARTICLE, NUMERAL, or DETERMINER.

                If the word is a noun, determine its grammatical gender: MASCULINE, FEMININE, or NEUTER. For non-nouns, set gender to null.

                Generate standard grammatical forms:
                - For nouns: the plural form (e.g., "die Häuser")
                - For verbs: 3. Person Singular Präsens, 3. Person Singular Präteritum, and 3. Person Singular Perfekt. Do NOT include pronouns - only the verb forms themselves.
                - For other word types: leave forms as an empty array.

                Translate the normalized word to %s.
                Also translate the provided sentence to %s.

                Use the book title and author as context for appropriate register and style.

                Respond in JSON with exactly these fields:
                {
                  "word": "normalized dictionary form",
                  "type": "WORD_TYPE",
                  "gender": "MASCULINE/FEMININE/NEUTER or null",
                  "forms": ["form1", "form2"],
                  "translation": "translation in target language",
                  "exampleDe": "the original German sentence",
                  "exampleTranslation": "translated sentence in target language"
                }
                """
                .formatted(languageName, languageName);
    }

    private static String bold(String text) {
        return PTF_BOLD_START + text + PTF_BOLD_END;
    }

    private static String formatForDisplay(DictionaryResult result, String targetLanguage) {
        final String word = result.getWord() != null ? result.getWord() : "";
        final String typeStr = result.getType() != null ? "  " + bold(result.getType()) : "";
        final String genderStr = result.getGender() != null ? " (" + result.getGender() + ")" : "";
        final String headerLine = PTF_HEADER + bold(word + typeStr + genderStr);

        final Stream<String> formsLine = result.getForms() != null && !result.getForms().isEmpty()
                ? Stream.of(bold("Forms: ") + String.join(", ", result.getForms()))
                : Stream.empty();

        final Stream<String> translationLine = result.getTranslation() != null
                ? Stream.of(bold("Translation (" + targetLanguage + "): ") + result.getTranslation())
                : Stream.empty();

        final Stream<String> exampleLines = Stream.of(
                result.getExampleDe() != null
                        ? Stream.of("", bold("Example (de): ") + result.getExampleDe())
                        : Stream.<String>empty(),
                result.getExampleTranslation() != null
                        ? Stream.of(bold("Example (" + targetLanguage + "): ") + result.getExampleTranslation())
                        : Stream.<String>empty())
                .flatMap(Function.identity());

        return Stream.of(
                Stream.of(headerLine),
                formsLine,
                translationLine,
                exampleLines).flatMap(Function.identity()).collect(Collectors.joining("\n"));
    }
}
