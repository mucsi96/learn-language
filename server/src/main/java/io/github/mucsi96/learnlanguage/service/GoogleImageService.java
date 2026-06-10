package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateImagesConfig;
import com.google.genai.types.ImageConfig;

import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private final Client googleAiClient;
  private final ModelUsageLoggingService usageLoggingService;

  public byte[] generateGeminiImage(String input, String context, String modelName) {
    final long startTime = System.currentTimeMillis();
    try {
      final GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .build())
          .build();

      final String fullPrompt = ImagePromptBuilder.build(input, context);

      final byte[] image = googleAiClient.models.generateContent(modelName, fullPrompt, config)
          .candidates().orElseThrow(() -> new RuntimeException("No candidates in Gemini response")).stream()
          .flatMap(candidate -> candidate.content().stream()
              .flatMap(content -> content.parts().stream())
              .flatMap(java.util.List::stream))
          .flatMap(part -> part.inlineData().stream())
          .flatMap(data -> data.data().stream())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No image found in " + modelName + " response"));

      final long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logImageUsage(modelName, OperationType.IMAGE_GENERATION, 1, processingTime);

      return image;

    } catch (Exception e) {
      log.error("Failed to generate image with {}", modelName, e);
      throw new RuntimeException("Failed to generate image with " + modelName + ": " + e.getMessage(), e);
    }
  }

  public byte[] generateImagenImage(String input, String context, String modelName) {
    final long startTime = System.currentTimeMillis();
    try {
      final GenerateImagesConfig config = GenerateImagesConfig.builder()
          .numberOfImages(1)
          .aspectRatio("1:1")
          .build();

      final String fullPrompt = ImagePromptBuilder.build(input, context);

      final byte[] image = googleAiClient.models.generateImages(modelName, fullPrompt, config)
          .generatedImages().orElseThrow(() -> new RuntimeException("No images in Imagen response")).stream()
          .flatMap(generatedImage -> generatedImage.image().stream())
          .flatMap(img -> img.imageBytes().stream())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No image found in " + modelName + " response"));

      final long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logImageUsage(modelName, OperationType.IMAGE_GENERATION, 1, processingTime);

      return image;

    } catch (Exception e) {
      log.error("Failed to generate image with {}", modelName, e);
      throw new RuntimeException("Failed to generate image with " + modelName + ": " + e.getMessage(), e);
    }
  }
}
