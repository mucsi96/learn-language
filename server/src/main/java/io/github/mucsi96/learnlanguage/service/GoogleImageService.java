package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.ImageConfig;

import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private static final String MODEL_NAME = "gemini-3-pro-image-preview";
  private final Client googleAiClient;
  private final ModelUsageLoggingService usageLoggingService;

  public byte[] generateImage(String prompt) {
    final long startTime = System.currentTimeMillis();
    try {
      final GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .build())
          .build();

      final String fullPrompt = "Create a photorealistic image for the following context: " + prompt
          + ". Avoid using text.";

      final byte[] image = googleAiClient.models.generateContent(MODEL_NAME, fullPrompt, config)
          .candidates().orElseThrow().stream()
          .flatMap(candidate -> candidate.content().orElseThrow().parts().orElseThrow().stream())
          .filter(part -> part.inlineData().isPresent())
          .map(part -> part.inlineData().get().data().orElseThrow())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No image found in Gemini 3 Pro Image response"));

      final long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logImageUsage(MODEL_NAME, OperationType.IMAGE_GENERATION, 1, processingTime);

      return image;

    } catch (Exception e) {
      log.error("Failed to generate image with Gemini 3 Pro Image", e);
      throw new RuntimeException("Failed to generate image with Gemini 3 Pro Image: " + e.getMessage(), e);
    }
  }
}
