package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DraftCardService {

    private final CardService cardService;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final WordIdService wordIdService;
    private final ChatModelSettingService chatModelSettingService;

    public void createDraftCard(Source source, String highlightedWord, String sentence) {
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
    }
}
