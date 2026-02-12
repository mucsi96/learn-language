package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
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

  public List<byte[]> generateImages(String prompt) {
    final long startTime = System.currentTimeMillis();
    try {
      final GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .numberOfImages(2)
              .build())
          .build();

      final GenerateContentResponse response = googleAiClient.models.generateContent(
          MODEL_NAME,
          prompt + ". Avoid using text.",
          config);

      if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
        throw new RuntimeException("No response from Gemini image generation API");
      }

      final List<byte[]> images = response.candidates().get().get(0).content().get().parts().get().stream()
          .filter(part -> part.inlineData().isPresent())
          .map(part -> part.inlineData().get().data().get())
          .toList();

      if (images.isEmpty()) {
        throw new RuntimeException("No images found in Gemini response");
      }

      final long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logImageUsage(MODEL_NAME, OperationType.IMAGE_GENERATION, images.size(), processingTime);

      return images;

    } catch (Exception e) {
      log.error("Failed to generate images with Gemini", e);
      throw new RuntimeException("Failed to generate images with Gemini: " + e.getMessage(), e);
    }
  }
}
