package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ExampleData;
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

    private static final List<String> LANGUAGES = List.of("hu", "en", "ch");

    private final CardService cardService;
    private final SourceService sourceService;
    private final WordNormalizationService wordNormalizationService;
    private final TranslationService translationService;
    private final WordTypeService wordTypeService;
    private final GenderDetectionService genderDetectionService;
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

            final String normalizedWord = normalizeResponse.getNormalizedWord();
            final List<String> germanExamples = List.of(sentence);

            final String wordType = wordTypeService.detectWordType(normalizedWord, classificationModel);

            final String gender = "NOUN".equals(wordType)
                    ? genderDetectionService.detectGender(normalizedWord, classificationModel)
                    : null;

            final Map<String, TranslationResponse> translations = LANGUAGES.stream()
                    .collect(Collectors.toMap(
                            lang -> lang,
                            lang -> translationService.translate(
                                    TranslateWordRequest.builder()
                                            .word(normalizedWord)
                                            .examples(germanExamples)
                                            .build(),
                                    lang, translationModel)));

            final Map<String, String> translationMap = translations.entrySet().stream()
                    .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().getTranslation()));

            final List<ExampleData> examples = IntStream.range(0, germanExamples.size())
                    .mapToObj(i -> ExampleData.builder()
                            .de(germanExamples.get(i))
                            .hu(getExampleAt(translations.get("hu"), i))
                            .en(getExampleAt(translations.get("en"), i))
                            .ch(getExampleAt(translations.get("ch"), i))
                            .isSelected(i == 0)
                            .build())
                    .toList();

            final String cardId = wordIdService.generateWordId(
                    normalizedWord,
                    translationMap.get("hu"));

            if (cardService.getCardById(cardId).isPresent()) {
                return;
            }

            cardService.saveCard(Card.builder()
                    .id(cardId)
                    .source(source)
                    .sourcePageNumber(1)
                    .data(CardData.builder()
                            .word(normalizedWord)
                            .type(wordType)
                            .gender(gender)
                            .translation(translationMap)
                            .forms(normalizeResponse.getForms())
                            .examples(examples)
                            .translationModel(translationModel.getModelName())
                            .classificationModel(classificationModel.getModelName())
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

    private static String getExampleAt(TranslationResponse response, int index) {
        final List<String> examples = response.getExamples();
        return (examples != null && index < examples.size()) ? examples.get(index) : null;
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
