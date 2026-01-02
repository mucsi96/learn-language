package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.AiModelSettingsRequest;
import io.github.mucsi96.learnlanguage.model.AiModelSettingsResponse;
import io.github.mucsi96.learnlanguage.model.OperationTypeResponse;
import io.github.mucsi96.learnlanguage.service.AiModelSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/ai-model-settings")
@RequiredArgsConstructor
public class AiModelSettingsController {

    private final AiModelSettingsService aiModelSettingsService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<AiModelSettingsResponse> getAllSettings() {
        return aiModelSettingsService.getAllSettings();
    }

    @GetMapping("/operation-types")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<OperationTypeResponse> getOperationTypes() {
        return aiModelSettingsService.getOperationTypes();
    }

    @PutMapping("/{operationType}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public AiModelSettingsResponse updateSetting(
            @PathVariable String operationType,
            @Valid @RequestBody AiModelSettingsRequest request) {
        return aiModelSettingsService.updateSetting(operationType, request.getModelName());
    }

    @DeleteMapping("/{operationType}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteSetting(@PathVariable String operationType) {
        aiModelSettingsService.deleteSetting(operationType);
        return ResponseEntity.noContent().build();
    }
}
