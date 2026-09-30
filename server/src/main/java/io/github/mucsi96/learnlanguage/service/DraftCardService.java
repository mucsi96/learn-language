package io.github.mucsi96.learnlanguage.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardData;
import io.github.mucsi96.learnlanguage.model.CardReadiness;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.ExampleData;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.service.DictionaryService.LookupResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class DraftCardService {

    private final CardService cardService;
    private final SourceService sourceService;
    private final WordIdService wordIdService;
    private final JdbcClient jdbc;

    @Async
    @Transactional
    public void createDraftCard(Source source, String targetLanguage, LookupResult lookupResult) {
        try {
            final String cardId = wordIdService.generateWordId(
                    lookupResult.normalizedWord(),
                    lookupResult.translation());

            if (cardService.getCardById(cardId).isPresent()) {
                return;
            }

            cardService.saveCard(Card.builder()
                    .id(cardId)
                    .source(source)
                    .sourcePageNumber(1)
                    .type(CardType.VOCABULARY)
                    .data(CardData.builder()
                            .word(lookupResult.normalizedWord())
                            .translation(Map.of(targetLanguage, lookupResult.translation()))
                            .forms(lookupResult.forms())
                            .examples(List.of(ExampleData.builder()
                                    .de(lookupResult.germanExample())
                                    .build()))
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
            log.error("Failed to create draft card: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public Source getOrCreateSource(String bookTitle) {
        if (bookTitle == null || bookTitle.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Book title is required to resolve the source language level");
        }
        final String sourceId = toSourceId(bookTitle);
        if (sourceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Book title must produce a valid source ID");
        }
        jdbc.sql("SELECT pg_advisory_xact_lock(hashtextextended(:scope, 0))")
                .param("scope", "ebook-source:" + sourceId).query().listOfRows();

        return sourceService.getSourceById(sourceId)
                .orElseGet(() -> {
                    final Source newSource = Source.builder()
                            .id(sourceId)
                            .name(bookTitle)
                            .sourceType(SourceType.EBOOK_DICTIONARY)
                            .startPage(1)
                            .languageLevel(LanguageLevel.A2)
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
