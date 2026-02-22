package io.github.mucsi96.learnlanguage.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.DictionaryTranslationRequest;
import io.github.mucsi96.learnlanguage.model.DictionaryTranslationResponse;
import io.github.mucsi96.learnlanguage.service.DictionaryTranslationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class DictionaryTranslationController {

    private final DictionaryTranslationService dictionaryTranslationService;

    @PostMapping("/dictionary/translate")
    public DictionaryTranslationResponse translate(
            @Valid @RequestBody DictionaryTranslationRequest request,
            @RequestParam ChatModel model) {
        return dictionaryTranslationService.translate(request, model);
    }
}
