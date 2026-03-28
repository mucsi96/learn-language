package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    record DictionaryLookupResponse(String translation, String germanExample,
            String translatedExample, List<String> forms) {
    }

    public record LookupResult(String formattedResponse, String translation,
            String germanExample, String translatedExample, List<String> forms) {
    }

    public LookupResult lookup(DictionaryRequest request) {
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

        final DictionaryLookupResponse response = chatService.callWithLogging(
                model,
                OperationType.TRANSLATION,
                systemPrompt,
                userMessage,
                DictionaryLookupResponse.class);

        final String formattedResponse = formatResponse(response);

        return new LookupResult(formattedResponse, response.translation(),
                response.germanExample(), response.translatedExample(), response.forms());
    }

    private static String formatResponse(DictionaryLookupResponse response) {
        final StringBuilder sb = new StringBuilder();
        sb.append("\uFFF1\uFFF2").append(response.translation()).append("\uFFF3\n");
        sb.append("\n");
        sb.append(response.germanExample()).append("\n");
        sb.append(response.translatedExample());

        if (response.forms() != null && !response.forms().isEmpty()) {
            sb.append("\n\n");
            sb.append(response.forms().stream().collect(Collectors.joining(", ")));
        }

        return sb.toString();
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
                You are a German language dictionary lookup assistant.
                Your task is to perform a dictionary lookup for a highlighted word from a German text.

                The highlighted word may be in any conjugated, declined, or inflected form. Normalize it to its standard dictionary base form (Grundform).
                For verbs: use the infinitive form. If the word is a separable verb prefix or part of a separable verb in the sentence, reconstruct the full infinitive (e.g., "fahren" in "Wir fahren um zwölf Uhr ab." becomes "abfahren").
                For nouns: include the article (e.g., "Häuser" becomes "das Haus").
                For adjectives: use the base form (e.g., "großen" becomes "groß").

                Translate the normalized word to %s.

                Generate standard grammatical forms:
                - For nouns: the plural form (e.g., "die Häuser")
                - For verbs: 3. Person Singular Präsens, 3. Person Singular Präteritum, and 3. Person Singular Perfekt. Do NOT include pronouns - only the verb forms themselves.
                - For other word types: return an empty forms list.

                Create a simple example sentence in German that uses the word in exactly the same context as the provided input sentence, but make it shorter and simpler (A1-A2 level). Translate this example to %s as well.

                Use the book title and author as context for appropriate register and style.
                """
                .formatted(languageName, languageName);
    }
}
