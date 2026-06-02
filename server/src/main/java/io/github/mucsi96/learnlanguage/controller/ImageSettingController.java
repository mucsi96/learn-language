package io.github.mucsi96.learnlanguage.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.UseEnglishForImageGenerationRequest;
import io.github.mucsi96.learnlanguage.service.ImageSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/image-settings")
@RequiredArgsConstructor
public class ImageSettingController {

    private final ImageSettingService imageSettingService;

    @PutMapping("/use-english")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public void updateUseEnglishForImageGeneration(
            @Valid @RequestBody UseEnglishForImageGenerationRequest request) {
        imageSettingService.setUseEnglishForImageGeneration(request.isUseEnglish());
    }
}
