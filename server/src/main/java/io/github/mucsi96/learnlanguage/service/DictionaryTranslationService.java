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
                You are an expert German-to-%s dictionary and translation engine.
                You receive a German word highlighted within a sentence from a book.
                Use the book context (title, author) and the surrounding sentence to disambiguate meaning.

                Provide a comprehensive dictionary entry as a JSON object with these fields:
                - "translatedWord": the best %s translation of the highlighted German word in this context
                - "translatedSentence": the full sentence translated to %s
                - "wordType": grammatical category (noun, verb, adjective, adverb, preposition, conjunction, pronoun, article, particle, interjection)
                - "gender": grammatical gender if noun (masculine, feminine, neuter), null otherwise
                - "plural": plural form of the German word if noun, null otherwise
                - "ipaTranscription": IPA pronunciation of the German word
                - "meanings": array of distinct %s meanings/definitions of the German word (not just this context, but all common meanings)
                - "synonyms": array of %s synonyms for the translated word
                - "antonyms": array of %s antonyms for the translated word (empty array if none apply)
                - "usageExamples": array of objects with "german" and "translated" fields, each showing a common usage of the German word with its %s translation (2-3 examples different from the input sentence)
                - "collocations": array of common German phrases or word combinations using this word, translated to %s in parentheses
                - "register": the register/style level (formal, informal, colloquial, literary, technical, standard)
                - "languageLevel": CEFR level (A1, A2, B1, B2, C1, C2)
                """
                .formatted(
                        targetLanguageName, targetLanguageName, targetLanguageName,
                        targetLanguageName, targetLanguageName, targetLanguageName,
                        targetLanguageName, targetLanguageName);
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
