package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.AiLanguage;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.repository.CardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioStreamWordService {

    private static final Map<AiLanguage, String> LANGUAGE_CODES = Map.of(
            AiLanguage.HUNGARIAN, "hu",
            AiLanguage.ENGLISH, "en");

    private final SourceService sourceService;
    private final CardRepository cardRepository;
    private final WordIdService wordIdService;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final ChatModelSettingService chatModelSettingService;
    private final DraftCardFactory draftCardFactory;

    @Async
    public void processWord(String sourceId, String word, String sentence) {
        try {
            final Source source = sourceService.getSourceById(sourceId).orElse(null);
            if (source == null) {
                return;
            }

            final Set<String> detectionSourceIds = sourceService.getDetectionSourceIds(sourceId);

            if (isKnown(word, detectionSourceIds)) {
                return;
            }

            final ChatModel lemmatizationModel = chatModelSettingService
                    .getPrimaryModel(OperationType.LEMMATIZATION);
            final NormalizeWordResponse normalized = wordNormalizationService.normalize(
                    word, sentence, lemmatizationModel);

            if (!normalized.isSuitableForCard()) {
                return;
            }

            if (isKnown(normalized.getNormalizedWord(), detectionSourceIds)) {
                return;
            }

            final String languageCode = LANGUAGE_CODES.get(source.getAiLanguage());
            final ChatModel translationModel = chatModelSettingService
                    .getPrimaryModel(OperationType.TRANSLATION);
            final TranslationResponse translation = translationService.translate(
                    TranslateWordRequest.builder()
                            .word(normalized.getNormalizedWord())
                            .examples(List.of(sentence))
                            .build(),
                    languageCode,
                    translationModel);

            draftCardFactory.createVocabularyDraftCard(
                    source,
                    source.getStartPage(),
                    normalized.getNormalizedWord(),
                    languageCode,
                    translation.getTranslation(),
                    normalized.getForms(),
                    sentence);
        } catch (Exception e) {
            log.error("Failed to process audio stream word '{}': {}", word, e.getMessage(), e);
        }
    }

    private boolean isKnown(String germanWord, Set<String> detectionSourceIds) {
        final String prefix = wordIdService.normalizeGermanWord(germanWord) + "-";
        return cardRepository.existsByIdStartingWithAndSource_IdIn(prefix, detectionSourceIds);
    }
}
