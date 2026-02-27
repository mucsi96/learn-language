package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.RateLimitSettingRequest;
import io.github.mucsi96.learnlanguage.service.RateLimitSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/rate-limit-settings")
@RequiredArgsConstructor
public class RateLimitSettingController {

    private final RateLimitSettingService rateLimitSettingService;

    @PutMapping("/image-per-minute")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public Integer updateImageRateLimit(@Valid @RequestBody RateLimitSettingRequest request) {
        return rateLimitSettingService.updateImageRateLimit(request.getValue());
    }

    @PutMapping("/audio-per-minute")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public Integer updateAudioRateLimit(@Valid @RequestBody RateLimitSettingRequest request) {
        return rateLimitSettingService.updateAudioRateLimit(request.getValue());
    }
}
