package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.SentenceTranslationRequest;
import io.github.mucsi96.learnlanguage.service.VoiceGenderService;
import io.github.mucsi96.learnlanguage.service.VoiceGenderService.VoiceGenderResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class VoiceGenderController {
    private final VoiceGenderService voiceGenderService;

    @PreAuthorize("hasAuthority('APPROLE_createDeck')")
    @PostMapping("/voice-gender")
    public VoiceGenderResponse classify(@Valid @RequestBody SentenceTranslationRequest request,
            @RequestParam ChatModel model) {
        return voiceGenderService.classify(request.getSentence(), model);
    }
}
