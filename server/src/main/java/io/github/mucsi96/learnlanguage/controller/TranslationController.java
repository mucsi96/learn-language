package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.TranslateWordRequest;
import io.github.mucsi96.learnlanguage.service.TranslationService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class TranslationController {

    private final TranslationService translationService;

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PostMapping("/translate/{languageCode}")
    public TranslationResponse translate(
            @RequestBody TranslateWordRequest request,
            @PathVariable String languageCode,
            @RequestParam ChatModel model) {
        return translationService.translate(request, languageCode, model);
    }
}
