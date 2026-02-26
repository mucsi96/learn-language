package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DraftCardService {

    private final CardService cardService;
    private final SourceService sourceService;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final WordIdService wordIdService;
    private final ChatModelSettingService chatModelSettingService;

    @Async
    @Transactional
    public void createDraftCard(String bookTitle, String highlightedWord, String sentence) {
        try {
            final Source source = getOrCreateSource(bookTitle);

            final Map<OperationType, String> primaryModels = chatModelSettingService.getPrimaryModelByOperation();

            final ChatModel classificationModel = ChatModel
                    .fromString(primaryModels.get(OperationType.CLASSIFICATION));
            final ChatModel translationModel = ChatModel
                    .fromString(primaryModels.get(OperationType.TRANSLATION));

            final NormalizeWordResponse normalizeResponse = wordNormalizationService.normalize(
                    highlightedWord, sentence, classificationModel);

            final TranslationResponse translationResponse = translationService.translate(
                    TranslateWordRequest.builder()
                            .word(normalizeResponse.getNormalizedWord())
                            .examples(List.of(sentence))
                            .build(),
                    "hu", translationModel);

            final String cardId = wordIdService.generateWordId(
                    normalizeResponse.getNormalizedWord(),
                    translationResponse.getTranslation());

            if (cardService.getCardById(cardId).isPresent()) {
                return;
            }

            cardService.saveCard(Card.builder()
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
                    .build());
        } catch (Exception e) {
            log.error("Failed to create draft card for word '{}': {}", highlightedWord, e.getMessage(), e);
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
