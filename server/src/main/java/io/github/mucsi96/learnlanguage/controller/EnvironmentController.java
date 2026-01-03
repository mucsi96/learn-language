package io.github.mucsi96.learnlanguage.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ChatOperationType;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ImageModelResponse;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.service.AudioService;
import io.github.mucsi96.learnlanguage.service.ChatModelSettingService;
import io.github.mucsi96.learnlanguage.service.ElevenLabsAudioService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EnvironmentController {
  private final Environment environment;
  private final AudioService audioService;
  private final ElevenLabsAudioService elevenLabsAudioService;
  private final ChatModelSettingService chatModelSettingService;

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
    Map<String, List<String>> enabledModelsByOperation = chatModelSettingService.getEnabledModelsByOperation();
    Map<String, String> primaryModelByOperation = chatModelSettingService.getPrimaryModelByOperation();

    List<OperationTypeInfo> operationTypes = Arrays.stream(ChatOperationType.values())
        .map(op -> new OperationTypeInfo(op.getCode(), op.getDisplayName()))
        .toList();

    return new ConfigResponse(
        tenantId,
        uiClientId,
        clientId,
        environment.matchesProfiles("test"),
        Arrays.stream(ChatModel.values())
            .map(model -> new ChatModelInfo(model.getModelName(), model.getProvider().getCode()))
            .toList(),
        Arrays.stream(ImageGenerationModel.values())
            .map(model -> new ImageModelResponse(model.getModelName(), model.getDisplayName()))
            .toList(),
        audioService.getAvailableModels(),
        elevenLabsAudioService.getVoices(),
        SUPPORTED_LANGUAGES,
        enabledModelsByOperation,
        primaryModelByOperation,
        operationTypes);
  }

  public record ChatModelInfo(String modelName, String provider) {
  }

  public record SupportedLanguage(String code, String displayName) {
  }

  public record OperationTypeInfo(String code, String displayName) {
  }

  public record ConfigResponse(
      String tenantId,
      String clientId,
      String apiClientId,
      boolean mockAuth,
      List<ChatModelInfo> chatModels,
      List<ImageModelResponse> imageModels,
      List<AudioModelResponse> audioModels,
      List<VoiceResponse> voices,
      List<SupportedLanguage> supportedLanguages,
      Map<String, List<String>> enabledModelsByOperation,
      Map<String, String> primaryModelByOperation,
      List<OperationTypeInfo> operationTypes) {
  }
}
