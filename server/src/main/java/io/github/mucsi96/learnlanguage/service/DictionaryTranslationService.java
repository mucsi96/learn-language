package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryTranslationRequest;
import io.github.mucsi96.learnlanguage.model.DictionaryTranslationResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class DictionaryTranslationService {

    private static final Map<String, String> TARGET_LANGUAGE_NAMES = Map.of(
            "en", "English",
            "hu", "Hungarian");

    private final JsonMapper jsonMapper;
    private final ChatService chatService;
    private final ChatModelSettingService chatModelSettingService;

    public DictionaryTranslationResponse translate(DictionaryTranslationRequest request) {
        final String targetLanguageName = TARGET_LANGUAGE_NAMES.get(request.getTargetLanguage());
        if (targetLanguageName == null) {
            throw new IllegalArgumentException(
                    "Unsupported target language: " + request.getTargetLanguage());
        }

        final String primaryModelName = chatModelSettingService
                .getPrimaryModelByOperation()
                .get(OperationType.TRANSLATION);

        if (primaryModelName == null) {
            throw new IllegalStateException("No primary model configured for translation");
        }

        final ChatModel model = ChatModel.fromString(primaryModelName);
        final String systemPrompt = buildSystemPrompt(targetLanguageName);
        final String userMessage = buildUserMessage(request);

        return chatService.callWithLogging(
                model,
                OperationType.TRANSLATION,
                systemPrompt,
                userMessage,
                DictionaryTranslationResponse.class);
    }

    private String buildSystemPrompt(String targetLanguageName) {
        return """
                You are an expert German-to-%1$s dictionary and translation engine.
                You receive a German word highlighted within a sentence from a book.
                Use the book context (title, author) and the surrounding sentence to disambiguate meaning.

                Provide a dictionary entry as a JSON object with these fields, all written in %1$s:
                - "translatedWord": the best %1$s translation of the highlighted German word in this context
                - "definition": a clear, concise dictionary-style definition of the word in %1$s
                - "example": a natural %1$s example sentence using the translated word
                - "synonyms": array of %1$s synonyms for the translated word
                - "etymology": the etymological origin of the German word, explained in %1$s
                - "paraphrase": the full input sentence rephrased in simple %1$s, conveying the same meaning
                """
                .formatted(targetLanguageName);
    }

    private String buildUserMessage(DictionaryTranslationRequest request) {
        final var messageData = Map.of(
                "bookTitle", request.getBookTitle(),
                "author", request.getAuthor(),
                "sentence", request.getSentence(),
                "highlightedWord", request.getHighlightedWord());

        return jsonMapper.writeValueAsString(messageData);
    }
}
