package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.GenerateImagesConfig;
import com.google.genai.types.GenerateImagesResponse;
import com.google.genai.types.Image;
import com.google.genai.types.ImageConfig;
import com.google.genai.types.Part;

import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleImageService {

  private static final String IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";
  private static final String NANO_BANANA_PRO_MODEL = "gemini-3-pro-image-preview";

  private final Client googleAiClient;

  public byte[] generateImage(String prompt, ImageGenerationModel model) {
    if (model == ImageGenerationModel.NANO_BANANA_PRO) {
      return generateImageWithNanoBananaPro(prompt);
    } else {
      return generateImageWithImagen(prompt);
    }
  }

  private byte[] generateImageWithImagen(String prompt) {
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

  private byte[] generateImageWithNanoBananaPro(String prompt) {
    try {
      GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .build())
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          NANO_BANANA_PRO_MODEL,
          Content.fromParts(Part.fromText(prompt)),
          config);

      if (response.candidates().isEmpty() ||
          response.candidates().get().isEmpty() ||
          response.candidates().get().get(0).content().isEmpty() ||
          response.candidates().get().get(0).content().get().parts().isEmpty()) {
        throw new RuntimeException("No image generated from Nano Banana Pro API");
      }

      return response.candidates().get().get(0).content().get().parts().get()
          .stream()
          .filter(part -> part.inlineData().isPresent())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No image data found in response"))
          .inlineData().get().data().get();

    } catch (Exception e) {
      log.error("Failed to generate image with Nano Banana Pro", e);
      throw new RuntimeException("Failed to generate image with Nano Banana Pro: " + e.getMessage(), e);
    }
  }
}
