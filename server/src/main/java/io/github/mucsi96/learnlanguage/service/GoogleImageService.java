package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GenerateImagesConfig;
import com.google.genai.types.GenerateImagesResponse;
import com.google.genai.types.Image;
import com.google.genai.types.Modality;
import com.google.genai.types.Part;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private static final String IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";
  private static final String NANO_BANANA_PRO_MODEL = "gemini-3-pro-image-preview";

  private final Client googleAiClient;

  public byte[] generateImageWithImagen(String prompt) {
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

  public byte[] generateImageWithNanoBananaPro(String prompt) {
    try {
      GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities(Modality.Known.IMAGE)
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          NANO_BANANA_PRO_MODEL,
          prompt + ". Avoid using text.",
          config);

      if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
        throw new RuntimeException("No response from Nano Banana Pro API");
      }

      for (Part part : response.candidates().get().get(0).content().get().parts().get()) {
        if (part.inlineData().isPresent()) {
          return part.inlineData().get().data().get();
        }
      }

      throw new RuntimeException("No image found in Nano Banana Pro response");

    } catch (Exception e) {
      log.error("Failed to generate image with Nano Banana Pro", e);
      throw new RuntimeException("Failed to generate image with Nano Banana Pro: " + e.getMessage(), e);
    }
  }
}
