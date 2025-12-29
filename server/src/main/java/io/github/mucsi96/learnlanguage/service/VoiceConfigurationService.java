package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.entity.VoiceConfiguration;
import io.github.mucsi96.learnlanguage.model.VoiceConfigurationRequest;
import io.github.mucsi96.learnlanguage.model.VoiceConfigurationResponse;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.repository.VoiceConfigurationRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VoiceConfigurationService {

  private final VoiceConfigurationRepository voiceConfigurationRepository;
  private final ElevenLabsAudioService elevenLabsAudioService;

  public List<VoiceConfigurationResponse> getAllVoiceConfigurations() {
    Map<String, VoiceResponse> voicesMap = getVoicesMap();
    return voiceConfigurationRepository.findAll().stream()
        .map(config -> toResponse(config, voicesMap))
        .toList();
  }

  public List<VoiceConfigurationResponse> getEnabledVoiceConfigurations() {
    Map<String, VoiceResponse> voicesMap = getVoicesMap();
    return voiceConfigurationRepository.findByIsEnabledTrue().stream()
        .map(config -> toResponse(config, voicesMap))
        .toList();
  }

  public List<VoiceConfigurationResponse> getEnabledVoiceConfigurationsByLanguage(String language) {
    Map<String, VoiceResponse> voicesMap = getVoicesMap();
    return voiceConfigurationRepository.findByLanguageAndIsEnabledTrue(language).stream()
        .map(config -> toResponse(config, voicesMap))
        .toList();
  }

  private Map<String, VoiceResponse> getVoicesMap() {
    return elevenLabsAudioService.getVoices().stream()
        .collect(Collectors.toMap(VoiceResponse::getId, v -> v, (v1, v2) -> v1));
  }

  public VoiceConfigurationResponse createVoiceConfiguration(VoiceConfigurationRequest request) {
    VoiceConfiguration config = VoiceConfiguration.builder()
        .voiceId(request.getVoiceId())
        .model(request.getModel())
        .language(request.getLanguage())
        .displayName(request.getDisplayName())
        .isEnabled(request.getIsEnabled() != null ? request.getIsEnabled() : true)
        .build();

    Map<String, VoiceResponse> voicesMap = getVoicesMap();
    return toResponse(voiceConfigurationRepository.save(config), voicesMap);
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

    Map<String, VoiceResponse> voicesMap = getVoicesMap();
    return toResponse(voiceConfigurationRepository.save(config), voicesMap);
  }

  public void deleteVoiceConfiguration(Integer id) {
    voiceConfigurationRepository.deleteById(id);
  }

  private VoiceConfigurationResponse toResponse(VoiceConfiguration config, Map<String, VoiceResponse> voicesMap) {
    VoiceResponse voice = voicesMap.get(config.getVoiceId());
    return VoiceConfigurationResponse.builder()
        .id(config.getId())
        .voiceId(config.getVoiceId())
        .voiceName(voice != null ? voice.getDisplayName() : null)
        .model(config.getModel())
        .language(config.getLanguage())
        .displayName(config.getDisplayName())
        .isEnabled(config.getIsEnabled())
        .category(voice != null ? voice.getCategory() : null)
        .build();
  }
}
