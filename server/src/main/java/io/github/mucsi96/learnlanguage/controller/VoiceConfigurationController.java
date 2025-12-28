package io.github.mucsi96.learnlanguage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.VoiceConfigurationRequest;
import io.github.mucsi96.learnlanguage.model.VoiceConfigurationResponse;
import io.github.mucsi96.learnlanguage.service.VoiceConfigurationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/voice-configurations")
@RequiredArgsConstructor
public class VoiceConfigurationController {

    private final VoiceConfigurationService voiceConfigurationService;

    @GetMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<VoiceConfigurationResponse> getAllVoiceConfigurations() {
        return voiceConfigurationService.getAllVoiceConfigurations();
    }

    @GetMapping("/enabled")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public List<VoiceConfigurationResponse> getEnabledVoiceConfigurations() {
        return voiceConfigurationService.getEnabledVoiceConfigurations();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public VoiceConfigurationResponse createVoiceConfiguration(
            @Valid @RequestBody VoiceConfigurationRequest request) {
        return voiceConfigurationService.createVoiceConfiguration(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public VoiceConfigurationResponse updateVoiceConfiguration(
            @PathVariable Integer id,
            @Valid @RequestBody VoiceConfigurationRequest request) {
        return voiceConfigurationService.updateVoiceConfiguration(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ResponseEntity<Void> deleteVoiceConfiguration(@PathVariable Integer id) {
        voiceConfigurationService.deleteVoiceConfiguration(id);
        return ResponseEntity.noContent().build();
    }
}
