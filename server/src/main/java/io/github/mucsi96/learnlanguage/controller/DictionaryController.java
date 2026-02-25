package io.github.mucsi96.learnlanguage.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import io.github.mucsi96.learnlanguage.service.CardService;
import io.github.mucsi96.learnlanguage.service.ChatModelSettingService;
import io.github.mucsi96.learnlanguage.service.DictionaryService;
import io.github.mucsi96.learnlanguage.service.SourceService;
import io.github.mucsi96.learnlanguage.service.TranslationService;
import io.github.mucsi96.learnlanguage.service.WordIdService;
import io.github.mucsi96.learnlanguage.service.WordNormalizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequiredArgsConstructor
@Slf4j
public class DictionaryController {

    private final ApiTokenService apiTokenService;
    private final DictionaryService dictionaryService;
    private final SourceService sourceService;
    private final CardService cardService;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final WordIdService wordIdService;
    private final ChatModelSettingService chatModelSettingService;

    @PostMapping(value = "/dictionary", produces = MediaType.TEXT_PLAIN_VALUE)
    @Transactional
    public String translate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody DictionaryRequest request) {
        apiTokenService.validateBearerToken(authorizationHeader);

        if (request.getBookTitle() != null && request.getHighlightedWord() != null
                && request.getSentence() != null) {
            final Source source = getOrCreateSource(request.getBookTitle());
            createDraftCard(source, request.getHighlightedWord(), request.getSentence());
        }

        return dictionaryService.lookup(request);
    }

    private void createDraftCard(Source source, String highlightedWord, String sentence) {
        try {
            final Map<OperationType, String> primaryModels = chatModelSettingService.getPrimaryModelByOperation();

            final String classificationModelName = primaryModels.get(OperationType.CLASSIFICATION);
            final String translationModelName = primaryModels.get(OperationType.TRANSLATION);

            if (classificationModelName == null || translationModelName == null) {
                log.warn("Primary models not configured for classification or translation");
                return;
            }

            final ChatModel classificationModel = ChatModel.fromString(classificationModelName);
            final ChatModel translationModel = ChatModel.fromString(translationModelName);

            final NormalizeWordResponse normalizeResponse = wordNormalizationService.normalize(
                    highlightedWord, sentence, classificationModel);

            final TranslateWordRequest translateRequest = TranslateWordRequest.builder()
                    .word(normalizeResponse.getNormalizedWord())
                    .examples(List.of(sentence))
                    .build();

            final TranslationResponse translationResponse = translationService.translate(
                    translateRequest, "hu", translationModel);

            final String cardId = wordIdService.generateWordId(
                    normalizeResponse.getNormalizedWord(),
                    translationResponse.getTranslation());

            if (cardId == null || cardService.getCardById(cardId).isPresent()) {
                return;
            }

            final Card card = Card.builder()
                    .id(cardId)
                    .source(source)
                    .sourcePageNumber(1)
                    .data(CardData.builder()
                            .word(normalizeResponse.getNormalizedWord())
                            .translation(Map.of("hu", translationResponse.getTranslation()))
                            .build())
                    .readiness(CardReadiness.DRAFT)
                    .state("NEW")
                    .due(LocalDateTime.now())
                    .stability(0f)
                    .difficulty(0f)
                    .elapsedDays(0f)
                    .scheduledDays(0f)
                    .learningSteps(0)
                    .reps(0)
                    .lapses(0)
                    .build();

            cardService.saveCard(card);
        } catch (Exception e) {
            log.warn("Failed to create draft card for '{}': {}", highlightedWord, e.getMessage());
        }
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
}
