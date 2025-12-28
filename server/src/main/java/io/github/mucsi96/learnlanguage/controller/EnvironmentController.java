package io.github.mucsi96.learnlanguage.controller;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.service.AudioService;
import io.github.mucsi96.learnlanguage.service.ElevenLabsAudioService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EnvironmentController {
  private final Environment environment;
  private final AudioService audioService;
  private final ElevenLabsAudioService elevenLabsAudioService;

  @Value("${tenant-id:}")
  private String tenantId;

  @Value("${api-client-id:}")
  private String clientId;

  @Value("${spa-client-id:}")
  private String uiClientId;

  private static final List<SupportedLanguage> SUPPORTED_LANGUAGES = List.of(
      new SupportedLanguage("de", "German"),
      new SupportedLanguage("hu", "Hungarian")
  );

  @GetMapping("/environment")
  public ConfigResponse getConfig() {
    return new ConfigResponse(
        tenantId,
        uiClientId,
        clientId,
        environment.matchesProfiles("test"),
        Arrays.stream(ChatModel.values())
            .map(model -> new ChatModelInfo(model.getModelName(), model.isPrimary()))
            .toList(),
        Arrays.stream(ImageGenerationModel.values()).map(ImageGenerationModel::getModelName).toList(),
        audioService.getAvailableModels(),
        elevenLabsAudioService.getVoices(),
        SUPPORTED_LANGUAGES);
  }

  public record ChatModelInfo(String modelName, boolean primary) {
  }

  public record SupportedLanguage(String code, String displayName) {
  }

  public record ConfigResponse(
      String tenantId,
      String clientId,
      String apiClientId,
      boolean mockAuth,
      List<ChatModelInfo> chatModels,
      List<String> imageModels,
      List<AudioModelResponse> audioModels,
      List<VoiceResponse> voices,
      List<SupportedLanguage> supportedLanguages) {
  }
}
