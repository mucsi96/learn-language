package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.ImageConfig;
import com.google.genai.types.Part;

import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private static final String GEMINI_3_PRO_IMAGE_PREVIEW_MODEL = "gemini-3-pro-image-preview";

  private final Client googleAiClient;
  private final ModelUsageLoggingService usageLoggingService;

  public List<byte[]> generateImage(String prompt) {
    long startTime = System.currentTimeMillis();
    try {
      GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .build())
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          GEMINI_3_PRO_IMAGE_PREVIEW_MODEL,
          prompt + ". Avoid using text.",
          config);

      if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
        throw new RuntimeException("No response from Gemini 3 Pro API");
      }

      for (Part part : response.candidates().get().get(0).content().get().parts().get()) {
        if (part.inlineData().isPresent()) {
          long processingTime = System.currentTimeMillis() - startTime;
          usageLoggingService.logImageUsage(GEMINI_3_PRO_IMAGE_PREVIEW_MODEL, OperationType.IMAGE_GENERATION, 1, processingTime);
          return List.of(part.inlineData().get().data().get());
        }
      }

      throw new RuntimeException("No image found in Gemini 3 Pro response");

    } catch (Exception e) {
      log.error("Failed to generate image with Gemini 3 Pro", e);
      throw new RuntimeException("Failed to generate image with Gemini 3 Pro: " + e.getMessage(), e);
    }
  }
}
