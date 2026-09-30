package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.model.ApiTokenScope;
import io.github.mucsi96.learnlanguage.model.DictionaryRequest;
import io.github.mucsi96.learnlanguage.service.ApiTokenService;
import io.github.mucsi96.learnlanguage.service.DictionaryService;
import io.github.mucsi96.learnlanguage.service.DictionaryService.LookupResult;
import io.github.mucsi96.learnlanguage.service.DraftCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DictionaryController {

    private final ApiTokenService apiTokenService;
    private final DictionaryService dictionaryService;
    private final DraftCardService draftCardService;

    @PostMapping(value = "/dictionary", produces = MediaType.TEXT_PLAIN_VALUE)
    public String translate(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody DictionaryRequest request) {
        apiTokenService.validateBearerToken(authorizationHeader, ApiTokenScope.DICTIONARY);

        final Source source = draftCardService.getOrCreateSource(request.getBookTitle());
        if (source.getLanguageLevel() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a language level in the source settings before looking up words");
        }
        final LookupResult result = dictionaryService.lookup(request, source.getLanguageLevel());

        if (request.getHighlightedWord() != null && request.getSentence() != null) {
            draftCardService.createDraftCard(source,
                    request.getTargetLanguage(), result);
        }

        return result.formattedResponse();
    }
}
