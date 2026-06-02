package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ImageModelResponse;
import io.github.mucsi96.learnlanguage.model.ImageModelSettingRequest;
import io.github.mucsi96.learnlanguage.service.ImageModelSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/image-model-settings")
@RequiredArgsConstructor
public class ImageModelSettingController {

    private final ImageModelSettingService imageModelSettingService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<ImageModelResponse> getAllSettings() {
        return imageModelSettingService.getImageModelsWithSettings();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ImageModelResponse updateSetting(@Valid @RequestBody ImageModelSettingRequest request) {
        return imageModelSettingService.updateSetting(request);
    }
}
