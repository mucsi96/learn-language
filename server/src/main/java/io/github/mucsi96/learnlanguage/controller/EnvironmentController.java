package io.github.mucsi96.learnlanguage.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.ImageModelResponse;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.SourceFormatType;
import io.github.mucsi96.learnlanguage.model.SourceType;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.config.ModelPricingConfig;
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
  private final ModelPricingConfig modelPricingConfig;

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
    final boolean isTestProfile = environment.matchesProfiles("test");
    Map<OperationType, List<String>> enabledModelsByOperation = chatModelSettingService.getEnabledModelsByOperation();
    Map<OperationType, String> primaryModelByOperation = chatModelSettingService.getPrimaryModelByOperation();

    List<OperationTypeInfo> operationTypes = Arrays.stream(OperationType.values())
        .filter(OperationType::isChatOperation)
        .map(op -> new OperationTypeInfo(op.getCode(), op.getDisplayName()))
        .toList();

    List<LanguageLevelInfo> languageLevels = Arrays.stream(LanguageLevel.values())
        .map(level -> new LanguageLevelInfo(level.getCode(), level.getDisplayName()))
        .toList();

    List<SourceFormatTypeInfo> sourceFormatTypes = Arrays.stream(SourceFormatType.values())
        .map(type -> new SourceFormatTypeInfo(type.getCode(), type.getDisplayName()))
        .toList();

    List<SourceTypeInfo> sourceTypes = Arrays.stream(SourceType.values())
        .map(type -> new SourceTypeInfo(type.getCode(), type.getDisplayName()))
        .toList();

    Map<String, Integer> imageProviderRateLimits = Arrays.stream(ModelProvider.values())
        .collect(Collectors.toMap(
            ModelProvider::getCode,
            provider -> isTestProfile ? 10000 : modelPricingConfig.getImageProviderRateLimit(provider)
        ));

    return new ConfigResponse(
        tenantId,
        uiClientId,
        clientId,
        isTestProfile,
        Arrays.stream(ChatModel.values())
            .map(model -> new ChatModelInfo(model.getModelName(), model.getProvider().getCode()))
            .toList(),
        Arrays.stream(ImageGenerationModel.values())
            .map(model -> new ImageModelResponse(
                model.getModelName(),
                model.getDisplayName(),
                model.getProvider().getCode()))
            .toList(),
        audioService.getAvailableModels(),
        elevenLabsAudioService.getVoices(),
        SUPPORTED_LANGUAGES,
        enabledModelsByOperation,
        primaryModelByOperation,
        operationTypes,
        languageLevels,
        sourceFormatTypes,
        sourceTypes,
        imageProviderRateLimits);
  }

  public record ChatModelInfo(String modelName, String provider) {
  }

  public record SupportedLanguage(String code, String displayName) {
  }

  public record OperationTypeInfo(String code, String displayName) {
  }

  public record LanguageLevelInfo(String code, String displayName) {
  }

  public record SourceFormatTypeInfo(String code, String displayName) {
  }

  public record SourceTypeInfo(String code, String displayName) {
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
      Map<OperationType, List<String>> enabledModelsByOperation,
      Map<OperationType, String> primaryModelByOperation,
      List<OperationTypeInfo> operationTypes,
      List<LanguageLevelInfo> languageLevels,
      List<SourceFormatTypeInfo> sourceFormatTypes,
      List<SourceTypeInfo> sourceTypes,
      Map<String, Integer> imageProviderRateLimits) {
  }
}
