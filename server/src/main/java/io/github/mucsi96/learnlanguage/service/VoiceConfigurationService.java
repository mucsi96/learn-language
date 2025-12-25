package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.VoiceConfiguration;
import io.github.mucsi96.learnlanguage.model.VoiceConfigurationRequest;
import io.github.mucsi96.learnlanguage.model.VoiceConfigurationResponse;
import io.github.mucsi96.learnlanguage.repository.VoiceConfigurationRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VoiceConfigurationService {

    private final VoiceConfigurationRepository voiceConfigurationRepository;

    public List<VoiceConfigurationResponse> getAllVoiceConfigurations() {
        return voiceConfigurationRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<VoiceConfigurationResponse> getEnabledVoiceConfigurations() {
        return voiceConfigurationRepository.findByIsEnabledTrue().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<VoiceConfigurationResponse> getEnabledVoiceConfigurationsByLanguage(String language) {
        return voiceConfigurationRepository.findByLanguageAndIsEnabledTrue(language).stream()
                .map(this::toResponse)
                .toList();
    }

    public VoiceConfigurationResponse createVoiceConfiguration(VoiceConfigurationRequest request) {
        VoiceConfiguration config = VoiceConfiguration.builder()
                .voiceId(request.getVoiceId())
                .model(request.getModel())
                .language(request.getLanguage())
                .displayName(request.getDisplayName())
                .isEnabled(request.getIsEnabled() != null ? request.getIsEnabled() : true)
                .build();

        return toResponse(voiceConfigurationRepository.save(config));
    }

    public VoiceConfigurationResponse updateVoiceConfiguration(Integer id, VoiceConfigurationRequest request) {
        VoiceConfiguration config = voiceConfigurationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voice configuration not found: " + id));

        config.setVoiceId(request.getVoiceId());
        config.setModel(request.getModel());
        config.setLanguage(request.getLanguage());
        config.setDisplayName(request.getDisplayName());
        if (request.getIsEnabled() != null) {
            config.setIsEnabled(request.getIsEnabled());
        }

        return toResponse(voiceConfigurationRepository.save(config));
    }

    public void deleteVoiceConfiguration(Integer id) {
        voiceConfigurationRepository.deleteById(id);
    }

    private VoiceConfigurationResponse toResponse(VoiceConfiguration config) {
        return VoiceConfigurationResponse.builder()
                .id(config.getId())
                .voiceId(config.getVoiceId())
                .model(config.getModel())
                .language(config.getLanguage())
                .displayName(config.getDisplayName())
                .isEnabled(config.getIsEnabled())
                .build();
    }
}
