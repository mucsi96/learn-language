package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Locale;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.NormalizeWordResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.service.DictionaryService.LookupResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DraftCardService {

    private final SourceService sourceService;
    private final ChatModelSettingService chatModelSettingService;
    private final WordNormalizationService wordNormalizationService;
    private final DraftCardFactory draftCardFactory;

    @Async
    public void createDraftCard(String bookTitle, String targetLanguage, String highlightedWord,
            String sentence, LookupResult lookupResult) {
        try {
            final ChatModel model = chatModelSettingService.getPrimaryModel(OperationType.LEMMATIZATION);
            final NormalizeWordResponse normalized = wordNormalizationService.normalize(highlightedWord, sentence, model);

            final Source source = getOrCreateSource(bookTitle);

            draftCardFactory.createVocabularyDraftCard(source, 1, normalized.getNormalizedWord(),
                    targetLanguage, lookupResult.translation(), normalized.getForms(),
                    lookupResult.germanExample());
        } catch (Exception e) {
            log.error("Failed to create draft card: {}", e.getMessage(), e);
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
                            .cardTypes(List.of(CardType.VOCABULARY))
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
