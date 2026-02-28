package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.stream.IntStream;

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

  public List<byte[]> generateImages(String prompt, int imageCount) {
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

      final List<byte[]> images = IntStream.range(0, imageCount)
          .mapToObj(i -> googleAiClient.models.generateContent(MODEL_NAME, fullPrompt, config))
          .flatMap(response -> response.candidates().orElseThrow().stream())
          .flatMap(candidate -> candidate.content().orElseThrow().parts().orElseThrow().stream())
          .filter(part -> part.inlineData().isPresent())
          .map(part -> part.inlineData().get().data().orElseThrow())
          .toList();

      if (images.isEmpty()) {
        throw new RuntimeException("No images found in Gemini 3 Pro Image response");
      }

      final long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logImageUsage(MODEL_NAME, OperationType.IMAGE_GENERATION, images.size(), processingTime);

      return images;

    } catch (Exception e) {
      log.error("Failed to generate images with Gemini 3 Pro Image", e);
      throw new RuntimeException("Failed to generate images with Gemini 3 Pro Image: " + e.getMessage(), e);
    }
  }
}
