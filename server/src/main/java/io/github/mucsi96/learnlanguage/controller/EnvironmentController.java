package io.github.mucsi96.learnlanguage.controller;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EnvironmentController {
  private final Environment environment;

  @Value("${tenant-id:}")
  private String tenantId;

  @Value("${api-client-id:}")
  private String clientId;

  @Value("${spa-client-id:}")
  private String uiClientId;

  @GetMapping("/environment")
  public ConfigResponse getConfig() {
    return new ConfigResponse(
        tenantId,
        uiClientId,
        clientId,
        environment.matchesProfiles("test"),
        Arrays.stream(ChatModel.values())
            .map(model -> new ChatModelInfo(
                model.getModelName(),
                model.isPrimary(),
                model.getInputPricePerMillionTokens(),
                model.getOutputPricePerMillionTokens()))
            .toList(),
        Arrays.stream(ImageGenerationModel.values()).map(ImageGenerationModel::getModelName).toList());
  }

  public record ChatModelInfo(
      String modelName,
      boolean primary,
      double inputPricePerMillionTokens,
      double outputPricePerMillionTokens) {
  }

  public record ConfigResponse(
      String tenantId,
      String clientId,
      String apiClientId,
      boolean mockAuth,
      List<ChatModelInfo> chatModels,
      List<String> imageModels) {
  }
}
