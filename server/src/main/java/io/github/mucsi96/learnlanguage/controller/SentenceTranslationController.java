package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.SentenceTranslationRequest;
import io.github.mucsi96.learnlanguage.model.SentenceTranslationResponse;
import io.github.mucsi96.learnlanguage.service.SentenceTranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SentenceTranslationController {

    private final SentenceTranslationService sentenceTranslationService;

    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    @PostMapping("/translate-sentence/{languageCode}")
    public SentenceTranslationResponse translateSentence(
            @Valid @RequestBody SentenceTranslationRequest request,
            @PathVariable String languageCode,
            @RequestParam ChatModel model) {

        final String translation = switch (languageCode) {
            case "hu" -> sentenceTranslationService.translateToHungarian(request.getSentence(), model);
            case "en" -> sentenceTranslationService.translateToEnglish(request.getSentence(), model);
            default -> throw new IllegalArgumentException("Unsupported language code: " + languageCode);
        };

        return SentenceTranslationResponse.builder()
                .translation(translation)
                .build();
    }
}
