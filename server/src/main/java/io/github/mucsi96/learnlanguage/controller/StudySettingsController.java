package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.StudySettingsRequest;
import io.github.mucsi96.learnlanguage.model.StudySettingsResponse;
import io.github.mucsi96.learnlanguage.service.StudySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/study-settings")
@RequiredArgsConstructor
public class StudySettingsController {

    private final StudySettingsService studySettingsService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public StudySettingsResponse getStudySettings() {
        return studySettingsService.getStudySettings();
    }

    @PutMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public StudySettingsResponse updateStudySettings(
            @Valid @RequestBody StudySettingsRequest request) {
        return studySettingsService.updateStudySettings(request);
    }
}
