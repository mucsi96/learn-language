package io.github.mucsi96.learnlanguage.service;

import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.json.JsonMapper;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

@Service
@RequiredArgsConstructor
@Slf4j
public class DictionaryService {

    private static final Map<String, String> LANGUAGE_NAMES = Map.of(
            "en", "English",
            "hu", "Hungarian");

    private final JsonMapper jsonMapper;
    private final ChatService chatService;
    private final ChatModelSettingService chatModelSettingService;
    private final SourceService sourceService;
    private final HighlightService highlightService;

    @Transactional
    public void persistHighlightIfPresent(DictionaryRequest request) {
        if (request.getBookTitle() == null || request.getHighlightedWord() == null
                || request.getSentence() == null) {
            return;
        }

        final Source source = getOrCreateSource(request.getBookTitle());
        highlightService.persistHighlight(source, request.getHighlightedWord(), request.getSentence());
    }

    public Flux<String> streamLookup(DictionaryRequest request) {
        final String targetLanguage = request.getTargetLanguage();
        final String languageName = LANGUAGE_NAMES.get(targetLanguage);

        if (languageName == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported target language: " + targetLanguage);
        }

        final ChatModel model = resolveModel(request.getModel());
        final String systemPrompt = buildSystemPrompt(languageName, targetLanguage);

        final DictionaryRequest input = DictionaryRequest.builder()
                .bookTitle(request.getBookTitle())
                .author(request.getAuthor())
                .sentence(request.getSentence())
                .highlightedWord(request.getHighlightedWord())
                .build();

        final String userMessage = jsonMapper.writeValueAsString(input);

        return chatService.streamForText(model, OperationType.TRANSLATION, systemPrompt, userMessage)
                .map(this::replacePlaceholdersWithUnicode);
    }

    private String replacePlaceholdersWithUnicode(String text) {
        return text
                .replace("<<H>>", "\uFFF1")
                .replace("<<B>>", "\uFFF2")
                .replace("<</B>>", "\uFFF3");
    }

    private ChatModel resolveModel(String requestModel) {
        if (requestModel != null && !requestModel.isBlank()) {
            try {
                return ChatModel.fromString(requestModel);
            } catch (IllegalArgumentException e) {
                log.warn("Unknown model requested: {}, falling back to primary", requestModel);
            }
        }

        final Map<OperationType, String> primaryModels = chatModelSettingService.getPrimaryModelByOperation();
        final String modelName = primaryModels.get(OperationType.TRANSLATION);

        if (modelName == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "No primary model configured for translation");
        }

        return ChatModel.fromString(modelName);
    }

    private Source getOrCreateSource(String bookTitle) {
        final String sourceId = toSourceId(bookTitle);

        return sourceService.getSourceById(sourceId)
                .orElseGet(() -> {
                    final Source newSource = Source.builder()
                            .id(sourceId)
                            .name(bookTitle)
                            .sourceType(SourceType.EBOOK_DICTIONARY)
                            .startPage(1)
                            .languageLevel(LanguageLevel.B1)
                            .cardType(CardType.VOCABULARY)
                            .formatType(SourceFormatType.WORD_LIST_WITH_EXAMPLES)
                            .build();
                    return sourceService.saveSource(newSource);
                });
    }

    private static String toSourceId(String bookTitle) {
        return bookTitle.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
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

                You must format the output as plain text using these special markers:
                - <<H>> = header line marker (place at the very start of the first line)
                - <<B>> = bold start
                - <</B>> = bold end

                Return exactly this format (each item on its own line, no blank lines except before the example block):

                For verbs:
                <<H>><<B>>WORD  <<B>>WORD_TYPE<</B>><</B>>
                <<B>>Forms: <</B>>form1, form2, form3
                <<B>>Translation (%2$s): <</B>>translation

                <<B>>Example (de): <</B>>German example sentence
                <<B>>Example (%2$s): <</B>>Translated example sentence

                For nouns:
                <<H>><<B>>WORD  <<B>>NOUN<</B>> (GENDER)<</B>>
                <<B>>Forms: <</B>>plural form
                <<B>>Translation (%2$s): <</B>>translation

                <<B>>Example (de): <</B>>German example sentence
                <<B>>Example (%2$s): <</B>>Translated example sentence

                For other word types (no forms line):
                <<H>><<B>>WORD  <<B>>WORD_TYPE<</B>><</B>>
                <<B>>Translation (%2$s): <</B>>translation

                <<B>>Example (de): <</B>>German example sentence
                <<B>>Example (%2$s): <</B>>Translated example sentence

                Do not include any other text, explanation, or markdown. Only the formatted output.
                """
                .formatted(languageName, targetLanguage);
    }
}
