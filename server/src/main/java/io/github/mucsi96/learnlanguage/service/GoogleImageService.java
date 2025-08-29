package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateImagesConfig;
import com.google.genai.types.GenerateImagesResponse;
import com.google.genai.types.Image;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private static final String IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";

  private final Client googleAiClient;

  public byte[] generateImage(String prompt) {
    try {
      GenerateImagesConfig generateImagesConfig = GenerateImagesConfig.builder()
          .numberOfImages(1)
          .outputMimeType("image/jpeg")
          .build();

      GenerateImagesResponse generatedImagesResponse = googleAiClient.models.generateImages(
          IMAGEN_MODEL,
          prompt + ". Avoid using text.",
          generateImagesConfig);

      if (generatedImagesResponse.generatedImages().isEmpty() ||
          generatedImagesResponse.generatedImages().get().isEmpty()) {
        throw new RuntimeException("No image generated from Google Imagen API");
      }

      Image generatedImage = generatedImagesResponse.generatedImages().get().get(0).image().get();

      return generatedImage.imageBytes().get();

    } catch (Exception e) {
      log.error("Failed to generate image with Google Imagen", e);
      throw new RuntimeException("Failed to generate image with Google Imagen: " + e.getMessage(), e);
    }
  }
}
