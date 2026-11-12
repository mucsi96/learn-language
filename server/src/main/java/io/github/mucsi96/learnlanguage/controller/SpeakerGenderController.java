package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.SentenceTranslationRequest;
import io.github.mucsi96.learnlanguage.service.SpeakerGenderService;
import io.github.mucsi96.learnlanguage.service.SpeakerGenderService.SpeakerGenderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class SpeakerGenderController {
    private final SpeakerGenderService speakerGenderService;

    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    @PostMapping("/speaker-gender")
    public SpeakerGenderResponse classify(@Valid @RequestBody SentenceTranslationRequest request,
            @RequestParam ChatModel model) {
        return speakerGenderService.classify(request.getSentence(), model);
    }
}
