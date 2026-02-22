package io.github.mucsi96.learnlanguage.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.model.DictionaryTranslationRequest;
import io.github.mucsi96.learnlanguage.model.DictionaryTranslationResponse;
import io.github.mucsi96.learnlanguage.service.DictionaryTranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DictionaryTranslationController {

    private static final String BEARER_PREFIX = "Bearer ";

    private final DictionaryTranslationService dictionaryTranslationService;

    @Value("${dictionary-api-token}")
    private final String apiToken;

    @PostMapping("/dictionary/translate")
    public DictionaryTranslationResponse translate(
            @Valid @RequestBody DictionaryTranslationRequest request,
            @RequestHeader("Authorization") String authHeader) {

        if (!authHeader.startsWith(BEARER_PREFIX) || !apiToken.equals(authHeader.substring(BEARER_PREFIX.length()))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return dictionaryTranslationService.translate(request);
    }
}
