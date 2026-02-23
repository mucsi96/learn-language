package io.github.mucsi96.learnlanguage.controller;

import java.util.Locale;

import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.CardType;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import io.github.mucsi96.learnlanguage.service.DictionaryService;
import io.github.mucsi96.learnlanguage.service.HighlightService;
import io.github.mucsi96.learnlanguage.service.SourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DictionaryController {

    private final ApiTokenService apiTokenService;
    private final DictionaryService dictionaryService;
    private final SourceService sourceService;
    private final HighlightService highlightService;

    @PostMapping(value = "/dictionary", produces = MediaType.TEXT_PLAIN_VALUE)
    @Transactional
    public String translate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody DictionaryRequest request) {
        apiTokenService.validateBearerToken(authorizationHeader);

        if (request.getBookTitle() != null && request.getHighlightedWord() != null
                && request.getSentence() != null) {
            final Source source = getOrCreateSource(request.getBookTitle());
            highlightService.persistHighlight(source, request.getHighlightedWord(), request.getSentence());
        }

        return dictionaryService.lookup(request);
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
